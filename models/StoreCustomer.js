const mongoose = require('mongoose');

const purchaseRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    recordedBy: {
      type: String,
      default: 'Admin'
    }
  },
  { _id: true }
);

const storeCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Clean 10-digit Indian mobile number
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    totalSpent: {
      type: Number,
      default: 0,
      index: -1 // Indexed descending for high-speed live leaderboard sorting
    },
    visitCount: {
      type: Number,
      default: 0
    },
    lastPurchaseDate: {
      type: Date,
      default: null
    },
    lastPurchaseAmount: {
      type: Number,
      default: 0
    },
    purchaseHistory: [purchaseRecordSchema],
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for quick lookup
storeCustomerSchema.index({ phone: 1, email: 1 });

module.exports = mongoose.model('StoreCustomer', storeCustomerSchema);

