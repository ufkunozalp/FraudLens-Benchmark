const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  storageType: { type: String, enum: ['cloud', 'local'], default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

const appStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  theme: { type: String, default: 'light' },
  updatedAt: { type: Date, default: Date.now }
});

const galleryItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: String,
  url: { type: String, required: true },
  imageId: String,
  isThumbnail: Boolean,
  source: { type: String, required: true },
  prompt: String,
  modelId: String,
  latency: Number,
  timestamp: { type: Number, required: true }
});
galleryItemSchema.index({ userId: 1, timestamp: -1 });

const detectionResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: String,
  imageUrl: String,
  imageId: String,
  isThumbnail: Boolean,
  label: String,
  confidence: Number,
  explanation: String,
  heatmapUrl: String,
  fakeType: String,
  modelId: String,
  latencyMs: Number,
  sourceType: String,
  feedback: String,
  timestamp: { type: Number, required: true }
});

const imageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hash: { type: String, required: true },
  data: { type: String, required: true },
  mimeType: String
});
imageSchema.index({ userId: 1, hash: 1 }, { unique: true });

module.exports = {
  userSchema,
  appStateSchema,
  galleryItemSchema,
  detectionResultSchema,
  imageSchema
};
