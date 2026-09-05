const Order = require('../models/Order');
const { logActivity } = require('../utils/auditLogger');

// @desc    Fetch all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};

    // Search by orderId or customer name/email
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Public/Private
exports.createOrder = async (req, res) => {
  try {
    const { customer, items, totalAmount, paymentStatus, trackingId } = req.body;

    if (items && items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // Generate unique order ID
    const orderId = 'ORD' + Math.floor(100000 + Math.random() * 900000);

    const order = new Order({
      orderId,
      customer,
      items,
      totalAmount,
      paymentStatus,
      trackingId,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order and payment status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, trackingId } = req.body;
    
    const order = await Order.findById(req.params.id);

    if (order) {
      if (orderStatus) order.orderStatus = orderStatus;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      if (trackingId) order.trackingId = trackingId;

      const updatedOrder = await order.save();

      logActivity({
        req,
        action: 'UPDATE_ORDER_STATUS',
        target: `Order: ${updatedOrder.orderId}`,
        details: { 
          orderStatus: updatedOrder.orderStatus, 
          paymentStatus: updatedOrder.paymentStatus 
        }
      });

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
