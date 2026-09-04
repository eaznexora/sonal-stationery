const Order = require('../models/Order');
const Category = require('../models/Category');

exports.getDashboardStats = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const endDate = new Date();
    const startDate = new Date();

    if (period === '7d') startDate.setDate(endDate.getDate() - 7);
    else if (period === '90d') startDate.setDate(endDate.getDate() - 90);
    else if (period === '1y') startDate.setFullYear(endDate.getFullYear() - 1);
    else startDate.setDate(endDate.getDate() - 30); // Default 30d

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
    const nonCancelledFilter = { ...dateFilter, orderStatus: { $ne: 'cancelled' } };

    // 1. KPIs
    const ordersInPeriod = await Order.find(dateFilter);
    const nonCancelledOrders = ordersInPeriod.filter(o => o.orderStatus !== 'cancelled');
    
    const totalOrders = ordersInPeriod.length;
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = ordersInPeriod.filter(o => o.orderStatus === 'pending').length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const uniqueCustomers = new Set();
    ordersInPeriod.forEach(o => {
      const id = o.customer?.email || o.customer?.phone;
      if (id) uniqueCustomers.add(id);
    });
    const totalCustomers = uniqueCustomers.size;

    // 2. Timeline Aggregation
    const timelineAgg = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$totalAmount', 0] } },
          orders: { $sum: 1 },
          customersSet: { $addToSet: { $ifNull: ['$customer.email', '$customer.phone'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const timeline = timelineAgg.map(t => ({
      date: t._id,
      revenue: t.revenue,
      orders: t.orders,
      customers: t.customersSet.length,
      aov: t.orders > 0 ? t.revenue / t.orders : 0
    }));

    // 3. Sales By Category
    // Get all active categories first to ensure 0 sales fallbacks
    const categories = await Category.find();
    const categoryNames = categories.map(c => c.name);

    const salesByCategoryAgg = await Order.aggregate([
      { $match: nonCancelledFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products', // collection name
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$productDetails.category', 'Uncategorized'] },
          sold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { sold: -1 } }
    ]);

    const salesByCategoryMap = {};
    salesByCategoryAgg.forEach(s => {
      salesByCategoryMap[s._id] = { sold: s.sold, revenue: s.revenue };
    });

    const salesByCategory = categoryNames.map(name => ({
      category: name,
      sold: salesByCategoryMap[name]?.sold || 0,
      revenue: salesByCategoryMap[name]?.revenue || 0
    })).sort((a, b) => b.sold - a.sold); // Sort by sold desc

    // Add uncategorized if it has sales
    if (salesByCategoryMap['Uncategorized']) {
      salesByCategory.push({
        category: 'Uncategorized',
        sold: salesByCategoryMap['Uncategorized'].sold,
        revenue: salesByCategoryMap['Uncategorized'].revenue
      });
    }

    // 4. Customer Retention (New vs Returning)
    // We'll evaluate all customers who placed an order in the period,
    // and count their LIFETIME orders to determine New vs Returning.
    
    // Get all lifetime orders for the unique customers in this period
    const customerIdentifiers = Array.from(uniqueCustomers);
    
    const lifetimeOrdersAgg = await Order.aggregate([
      { 
        $match: { 
          $or: [
            { 'customer.email': { $in: customerIdentifiers } },
            { 'customer.phone': { $in: customerIdentifiers } }
          ],
          orderStatus: { $ne: 'cancelled' }
        } 
      },
      {
        $group: {
          _id: { $ifNull: ['$customer.email', '$customer.phone'] },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const customerRetention = {
      newCustomers: { count: 0, orders: 0, revenue: 0 },
      returningCustomers: { count: 0, orders: 0, revenue: 0 }
    };

    lifetimeOrdersAgg.forEach(c => {
      if (!c._id) return; // Skip if somehow undefined
      
      if (c.totalOrders === 1) {
        customerRetention.newCustomers.count += 1;
        customerRetention.newCustomers.orders += c.totalOrders;
        customerRetention.newCustomers.revenue += c.totalRevenue;
      } else if (c.totalOrders > 1) {
        customerRetention.returningCustomers.count += 1;
        customerRetention.returningCustomers.orders += c.totalOrders;
        customerRetention.returningCustomers.revenue += c.totalRevenue;
      }
    });

    res.json({
      success: true,
      kpis: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        pendingOrders,
        averageOrderValue
      },
      timeline,
      salesByCategory,
      customerRetention
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching dashboard stats' });
  }
};
