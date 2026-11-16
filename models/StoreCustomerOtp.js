const mongoose = require('mongoose');

const storeCustomerOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    otp: {
      type: String,
      required: true
    },
    lastSentAt: {
      type: Date,
      default: Date.now
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600 // Automatically purged by MongoDB after 10 minutes (TTL)
    }
  }
);

module.exports = mongoose.model('StoreCustomerOtp', storeCustomerOtpSchema);

