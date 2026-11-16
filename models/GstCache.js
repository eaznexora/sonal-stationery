const mongoose = require('mongoose');

const gstCacheSchema = new mongoose.Schema(
  {
    gstin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    legalName: {
      type: String,
      default: '',
      trim: true
    },
    tradeName: {
      type: String,
      default: '',
      trim: true
    },
    displayName: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    stateCode: {
      type: String,
      default: '',
      trim: true
    },
    stateName: {
      type: String,
      default: '',
      trim: true
    },
    pan: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    status: {
      type: String,
      default: 'Active',
      trim: true
    },
    taxpayerType: {
      type: String,
      default: 'Regular',
      trim: true
    },
    constitution: {
      type: String,
      default: '',
      trim: true
    },
    registrationDate: {
      type: String,
      default: '',
      trim: true
    },
    natureOfBusiness: [
      {
        type: String,
        trim: true
      }
    ],
    source: {
      type: String,
      default: 'public',
      trim: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// 60-Day TTL Index: automatically refreshes/purges cached GST records after 60 days
gstCacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('GstCache', gstCacheSchema);

