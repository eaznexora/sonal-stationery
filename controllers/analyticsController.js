const Order = require('../models/Order');
const Product = require('../models/Product');

exports.getAnalytics = async (req, res) => {
  try {
    const period = req.query.period || '30d';
    const startDate = new Date();
    
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    else if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    else if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setDate(startDate.getDate() - 30); // 30d default

    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(startDate);
    if (period === '7d') prevStartDate.setDate(prevStartDate.getDate() - 7);
    else if (period === '90d') prevStartDate.setDate(prevStartDate.getDate() - 90);
    else if (period === '1y') prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
    else prevStartDate.setDate(prevStartDate.getDate() - 30);

    // Current period stats
    const currentStatsAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, orderStatus: { $in: ['delivered', 'completed'] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
    ]);
    
    // Previous period stats for % growth
    const prevStatsAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: prevStartDate, $lt: prevEndDate }, orderStatus: { $in: ['delivered', 'completed'] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
    ]);

    const currentStats = currentStatsAgg[0] || { totalRevenue: 0, totalOrders: 0 };
    const prevStats = prevStatsAgg[0] || { totalRevenue: 0, totalOrders: 0 };

    const kpis = {
      totalRevenue: currentStats.totalRevenue,
      totalOrders: currentStats.totalOrders,
      averageOrderValue: currentStats.totalOrders > 0 ? currentStats.totalRevenue / currentStats.totalOrders : 0,
      revenueGrowth: prevStats.totalRevenue > 0 ? ((currentStats.totalRevenue - prevStats.totalRevenue) / prevStats.totalRevenue) * 100 : 0
    };

    // Sales over time timeline
    const timelineAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, orderStatus: { $in: ['delivered', 'completed'] } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    const timeline = timelineAgg.map(t => ({ date: t._id, revenue: t.revenue, orders: t.orders }));

    // Top Products
    const topProductsAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, orderStatus: { $in: ['delivered', 'completed'] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Order Status Distribution (all statuses)
    const statusAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
    ]);
    const orderStatusDistribution = statusAgg.map(s => ({ status: s._id, count: s.count }));

    // Category Breakdown
    // (Requires lookup because category is on Product model, not Order items)
    const categoryAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, orderStatus: { $in: ['delivered', 'completed'] } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDoc"
        }
      },
      { $unwind: "$productDoc" },
      {
        $group: {
          _id: "$productDoc.category",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          unitsSold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    const categoryBreakdown = categoryAgg.map(c => ({ category: c._id || 'Uncategorized', revenue: c.revenue, unitsSold: c.unitsSold }));

    res.json({
      success: true,
      kpis,
      timeline,
      topProducts: topProductsAgg,
      categoryBreakdown,
      orderStatusDistribution
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
