const mongoose = require('mongoose');

const storeProTipSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Default seed tips for customer engagement
storeProTipSchema.statics.DEFAULT_TIPS = [
  {
    text: 'Quote your mobile number {phone} at the store counter whenever you shop to climb the ranks!',
    order: 1,
    isActive: true
  },
  {
    text: 'Top 3 monthly leaderboard holders unlock exclusive stationery & gift hampers!',
    order: 2,
    isActive: true
  },
  {
    text: 'Every in-store purchase gets recorded in real-time on your live leaderboard card!',
    order: 3,
    isActive: true
  }
];

// Helper method to ensure default tips exist
storeProTipSchema.statics.ensureDefaults = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(this.DEFAULT_TIPS);
    console.log('[Store Pro Tips] Seeded default pro tips.');
  }
};

module.exports = mongoose.model('StoreProTip', storeProTipSchema);

