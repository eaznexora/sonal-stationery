const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      default: '',
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    profilePhoto: String,
    picture: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    addresses: {
      type: Array,
      default: [],
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      default: () => 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase()
    },
    referralEarnings: {
      type: Number,
      default: 0
    },
    walletHistory: [{
      amount: Number,
      type: { type: String, enum: ['credit', 'debit'] },
      description: String,
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      createdAt: { type: Date, default: Date.now }
    }],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
