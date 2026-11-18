const mongoose = require('mongoose');

const customerCheckinSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreCustomer',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    totalSpend: {
      type: Number,
      default: 0
    },
    visitCount: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 1
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    acknowledgedByAdmin: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// 24-hour TTL index: automatically deletes check-in documents after 24 hours (86,400 seconds)
customerCheckinSchema.index({ checkedInAt: 1 }, { expireAfterSeconds: 86400 });

// Compound query index for admin polling and unacknowledged alerts
customerCheckinSchema.index({ acknowledgedByAdmin: 1, checkedInAt: -1 });
customerCheckinSchema.index({ customerId: 1, checkedInAt: -1 });

module.exports = mongoose.model('CustomerCheckin', customerCheckinSchema);

