const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      default: () => 'SN-' + Math.floor(100000 + Math.random() * 900000)
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customer: {
      name: String,
      email: String,
      phone: String,
      address: Object,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    walletDiscount: {
      type: Number,
      default: 0
    },
    finalPaidAmount: {
      type: Number,
      required: true
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'manifested', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    trackingId: String,
    razorpay_order_id: String,
    razorpay_payment_id: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
