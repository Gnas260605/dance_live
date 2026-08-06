require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/backend/routes');
const { getTenant, saveStreamConfig } = require('./src/backend/store');
const { processNewCommentForTenant } = require('./src/backend/tiktokManager');

const app = express();
const PORT = process.env.PORT || 3001;


app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Graceful JSON error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON payload in request body' });
    }
    next();
});

// Mount Backend API Routes
app.use('/api', apiRoutes);

// Serve Production Static Web Dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Legacy single-tenant fallback routes for backward compatibility with old test buttons
app.post('/api/mock-comment', async (req, res) => {
    const defaultApiKey = req.query.apiKey || 'demo-api-key-sg-music';
    const { tiktokUsername, comment, isVIP } = req.body;
    if (!comment) return res.status(400).json({ error: 'comment is required' });

    const result = await processNewCommentForTenant(
        defaultApiKey,
        tiktokUsername || 'viewer_' + Math.floor(Math.random() * 100),
        comment,
        isVIP || false,
        isVIP ? { giftName: 'Rose (Test)', giftCount: 1 } : null
    );

    if (!result) {
        return res.status(400).json({ error: 'Comment không hợp lệ hoặc username không tồn tại trên Roblox!' });
    }

    res.json({ success: true, playerData: result });
});

app.post('/api/add-music', async (req, res) => {
    const defaultApiKey = req.query.apiKey || 'demo-api-key-sg-music';
    const { name, musicId } = req.body;
    if (!musicId) return res.status(400).json({ error: 'musicId is required' });

    let formattedId = musicId.trim();
    if (!formattedId.startsWith('rbxassetid://')) {
        formattedId = 'rbxassetid://' + formattedId;
    }

    const tenant = getTenant(defaultApiKey);
    tenant.currentMusicId = formattedId;
    await saveStreamConfig(defaultApiKey);
    res.json({ success: true, currentMusicId: formattedId });
});

app.post('/api/add-dance', async (req, res) => {
    const defaultApiKey = req.query.apiKey || 'demo-api-key-sg-music';
    const { name, danceId } = req.body;
    if (!danceId) return res.status(400).json({ error: 'danceId is required' });

    let formattedId = danceId.trim();
    if (!formattedId.startsWith('rbxassetid://')) {
        formattedId = 'rbxassetid://' + formattedId;
    }

    const tenant = getTenant(defaultApiKey);
    tenant.selectedDanceId = formattedId;
    await saveStreamConfig(defaultApiKey);
    res.json({ success: true, selectedDanceId: formattedId });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🎵 S&G Music Roblox TikTok Auto-Dance SaaS Server`);
    console.log(`  🌐 Production Web UI: http://localhost:${PORT}`);
    console.log(`  🤖 Multi-Tenant Roblox Endpoint: http://localhost:${PORT}/api/v1/streamer/API_KEY/current-player`);
    console.log(`====================================================`);
});
