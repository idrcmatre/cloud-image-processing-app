const mongoose = require('mongoose');

const imageMetadataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalFilename: String,
  originalImageUrl: String,
  enhancedImageUrl: String,
  analysis: Object,
  userSettings: {
    enhancementLevel: Number,
    preferredAnalysis: String
  },
  processedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ImageMetadata', imageMetadataSchema);
