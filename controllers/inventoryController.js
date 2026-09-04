const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getInventoryStats = async (req, res) => {
  try {
    const products = await Product.find({}, 'stock');
    const totalInventory = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    const inventoryAddedThisMonth = await Product.countDocuments({ createdAt: { $gte: startOfMonth } });
    
    const ordersPending = await Order.countDocuments({ orderStatus: 'pending' });
    const ordersCompleted = await Order.countDocuments({ orderStatus: { $in: ['delivered', 'completed'] } });

    res.json({
      success: true,
      stats: {
        totalInventory,
        inventoryAddedThisMonth,
        ordersPending,
        ordersCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const { search, status, tab, sortBy } = req.query;

    let query = {};
    
    if (tab === 'hidden') {
      query.status = 'hidden';
    } else {
      query.status = { $ne: 'hidden' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      if (status === 'instock') query.stock = { $gt: 10 };
      else if (status === 'low') query.stock = { $gt: 0, $lte: 10 };
      else if (status === 'out') query.stock = 0;
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'stock_asc') sortOption = { stock: 1 };
    else if (sortBy === 'stock_desc') sortOption = { stock: -1 };
    else if (sortBy === 'name_asc') sortOption = { name: 1 };

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .select('_id name sku category stock images status batchQuantity updatedAt');
    
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    let { stock } = req.body;
    
    stock = parseInt(stock, 10);
    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: 'Invalid stock value' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: { stock } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
