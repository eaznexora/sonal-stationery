const mongoose = require('mongoose');

const whatsappTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true // e.g. "first_purchase", "repeat_purchase", "rank_drop", "custom_*"
    },
    body: {
      type: String,
      required: true // Placeholders supported: {name}, {amount}, {total}, {rank}, {visits}
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);

