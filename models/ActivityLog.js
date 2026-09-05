const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: String, // email
      required: true
    },
    role: {
      type: String, // 'superadmin' or 'employee'
      required: true
    },
    action: {
      type: String, // 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'UPDATE_ORDER_STATUS', 'INVITE_EMPLOYEE', 'UPDATE_EMPLOYEE'
      required: true
    },
    target: {
      type: String, // 'Product: Classmate 200pg', 'Order: #ORD-9281'
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed // JSON object of changes or simple string
    },
    ip: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Optimize sorting
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ user: 1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
