const ActivityLog = require('../models/ActivityLog');

// @desc    Get activity logs
// @route   GET /api/admin/activity
// @access  Private/Admin
exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, user, action } = req.query;
    const query = {};

    if (user) {
      query.user = user;
    }
    
    if (action) {
      query.action = action;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('getActivityLogs Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching activity logs' });
  }
};
