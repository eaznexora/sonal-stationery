const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    sku: {
      type: String,
      unique: true,
    },
    description: String,
    shortDescription: String,
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: String,
    tags: [String],
    images: {
      type: [String],
      default: ['/logo.png']
    },
    stock: {
      type: Number,
      default: 0,
    },
    batchQuantity: String,
    weight: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: 'cm' }
    },
    variants: [String],
    colors: [
      {
        name: String,
        hex: String,
      }
    ],
    isGiftWrapAvailable: {
      type: Boolean,
      default: false,
    },
    keyFeatures: [String],
    faqs: [
      {
        question: String,
        answer: String,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'published', 'draft', 'hidden'],
      default: 'active',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
