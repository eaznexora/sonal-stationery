const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const lowStockCount = await Product.countDocuments({ stock: { $lt: 10 } }); // Assuming < 10 is low stock

    const orders = await Order.find();
    const totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('customer');

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      pendingOrders,
      averageOrderValue,
      lowStockCount,
      recentOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
