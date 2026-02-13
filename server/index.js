require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const {
    initConnections,
    getModels,
    getUserWithStorage,
    getConnectionHealth,
    cloudModels
} = require('./lib/db');
const {
    EXACT_DETECTOR_MODELS,
    EXACT_UNAVAILABLE_DETECTORS,
    runExactWorkerInference
} = require('./lib/exactWorker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// --- API Routes ---

// 1. Users Handlers (Always use cloud connection for user registry)
app.get('/api/users', async (req, res) => {
    try {
        const users = await cloudModels.User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, storageType } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Check if local storage is available
        const { localDb } = getConnectionHealth();
        if (storageType === 'local' && localDb !== 'connected') {
            return res.status(503).json({
                error: 'Local MongoDB is not running. Please start it with: brew services start mongodb-community'
            });
        }

        let user = await cloudModels.User.findOne({ name });
        if (user) return res.status(409).json({ error: 'User already exists', user });

        user = new cloudModels.User({ name, storageType: storageType || 'local' });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get user to determine storage type
        const user = await cloudModels.User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        // Cascade delete: Remove ALL user data from appropriate database
        await Promise.all([
            cloudModels.User.findByIdAndDelete(id), // User always from cloud
            models.AppState.findOneAndDelete({ userId: id }),
            models.GalleryItem.deleteMany({ userId: id }),
            models.DetectionResult.deleteMany({ userId: id }),
            models.Image.deleteMany({ userId: id })
        ]);

        console.log(`Deleted user ${id} (${user.storageType}) and all associated data`);
        res.json({ message: 'User and all data deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// 2. Data Handlers (Route to correct database based on user's storageType)

// Load ALL user data (on login)
app.get('/api/user-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await getUserWithStorage(userId);

        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        const [state, gallery, history] = await Promise.all([
            models.AppState.findOne({ userId }),
            models.GalleryItem.find({ userId }).sort({ timestamp: -1 }),
            models.DetectionResult.find({ userId }).sort({ timestamp: -1 })
        ]);

        console.log(`Loaded data for ${user.name} from ${user.storageType}: ${gallery.length} gallery, ${history.length} history`);

        res.json({
            theme: state?.theme || 'light',
            gallery: gallery || [],
            detectionHistory: history || []
        });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Gallery Handlers
app.post('/api/gallery', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await getUserWithStorage(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        console.log(`Saving gallery item to ${user.storageType} for ${user.name}`);
        const item = new models.GalleryItem(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        console.error('Gallery Save Error:', error);
        res.status(500).json({ error: 'Failed to save gallery item: ' + error.message });
    }
});

app.delete('/api/gallery/:id', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const user = await getUserWithStorage(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);
        await models.GalleryItem.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// History Handlers
app.post('/api/history', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await getUserWithStorage(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        console.log(`Saving history item to ${user.storageType} for ${user.name}`);
        const item = new models.DetectionResult(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        console.error('History Save Error:', error);
        res.status(500).json({ error: 'Failed to save result: ' + error.message });
    }
});

// --- Image Store (Deduplication) ---
app.post('/api/images', async (req, res) => {
    try {
        const { hash, data, userId, mimeType } = req.body;
        if (!hash || !data || !userId) return res.status(400).json({ error: 'Missing fields' });

        const user = await getUserWithStorage(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        try {
            const newImage = new models.Image({ hash, data, userId, mimeType });
            await newImage.save();
            res.status(201).json({ id: newImage._id, reused: false });
        } catch (saveError) {
            if (saveError.code === 11000) {
                const existing = await models.Image.findOne({ userId, hash });
                if (existing) {
                    return res.json({ id: existing._id, reused: true });
                }
            }
            throw saveError;
        }
    } catch (e) {
        console.error("Image Upload Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/images/:id', async (req, res) => {
    try {
        const { storageType } = req.query;
        const models = getModels(storageType || 'cloud');

        const img = await models.Image.findById(req.params.id);
        if (!img) return res.status(404).send('Not found');
        res.json(img);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Settings Handler
app.post('/api/settings', async (req, res) => {
    try {
        const { userId, theme } = req.body;
        const user = await getUserWithStorage(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const models = getModels(user.storageType);

        const state = await models.AppState.findOneAndUpdate(
            { userId },
            { theme, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        res.json(state);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Exact detector inference via Hugging Face Inference API
app.post('/api/detect-exact', async (req, res) => {
    try {
        const { modelId, imageBase64 } = req.body || {};
        if (!modelId || !imageBase64) {
            return res.status(400).json({ error: 'modelId and imageBase64 are required' });
        }

        if (EXACT_UNAVAILABLE_DETECTORS[modelId]) {
            return res.status(422).json({
                error: EXACT_UNAVAILABLE_DETECTORS[modelId],
                modelId
            });
        }

        const modelRepo = EXACT_DETECTOR_MODELS[modelId];
        if (!modelRepo) {
            return res.status(404).json({ error: `No exact detector mapping found for ${modelId}` });
        }

        const parsed = await runExactWorkerInference(modelId, imageBase64);

        if (!parsed?.ok) {
            return res.status(502).json({
                error: parsed?.error || 'Exact detector failed',
                modelId,
                modelRepo
            });
        }

        return res.json({
            label: parsed.label,
            confidence: parsed.confidence,
            explanation: parsed.explanation,
            rawPredictions: parsed.predictions,
            modelRepo: parsed.modelRepo
        });
    } catch (error) {
        console.error('Exact detect error:', error);
        return res.status(500).json({ error: `Exact detector failed: ${error.message}` });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json(getConnectionHealth());
});

// Initialize and Start Server
initConnections().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
