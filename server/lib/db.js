const mongoose = require('mongoose');
const {
  userSchema,
  appStateSchema,
  galleryItemSchema,
  detectionResultSchema,
  imageSchema
} = require('./schemas');

let cloudConnection = null;
let localConnection = null;

const cloudModels = {};
const localModels = {};

function registerModels(connection, targetModels) {
  targetModels.User = connection.model('User', userSchema);
  targetModels.AppState = connection.model('AppState', appStateSchema);
  targetModels.GalleryItem = connection.model('GalleryItem', galleryItemSchema);
  targetModels.DetectionResult = connection.model('DetectionResult', detectionResultSchema);
  targetModels.Image = connection.model('Image', imageSchema);
}

async function initConnections() {
  try {
    cloudConnection = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
    console.log('✓ Connected to MongoDB Atlas (Cloud)');
    registerModels(cloudConnection, cloudModels);

    if (process.env.LOCAL_MONGODB_URI) {
      try {
        localConnection = await mongoose.createConnection(process.env.LOCAL_MONGODB_URI).asPromise();
        console.log('✓ Connected to MongoDB Local (localhost:27017)');
        registerModels(localConnection, localModels);
      } catch (localErr) {
        console.warn('⚠ Local MongoDB not available:', localErr.message);
        console.warn('  Local storage users will not work. Start MongoDB with: brew services start mongodb-community');
      }
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

function getModels(storageType) {
  if (storageType === 'local') {
    if (!localConnection) {
      throw new Error('Local MongoDB is not available. Please start MongoDB locally.');
    }
    return localModels;
  }
  return cloudModels;
}

async function getUserWithStorage(userId) {
  return cloudModels.User.findById(userId);
}

function getConnectionHealth() {
  return {
    cloudDb: cloudConnection ? 'connected' : 'disconnected',
    localDb: localConnection ? 'connected' : 'disconnected'
  };
}

module.exports = {
  initConnections,
  getModels,
  getUserWithStorage,
  getConnectionHealth,
  cloudModels
};
