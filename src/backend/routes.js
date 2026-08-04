// routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { 
    TIKTOK_GIFTS,
    DEFAULT_COIN_MILESTONES,
    createUser, 
    findUserByEmail, 
    getTenant, 
    addTenantLog, 
    DEFAULT_THEMES,
    saveStore
} = require('./store');

const { 
    authenticateToken, 
    authenticateApiKey, 
    generateToken 
} = require('./authMiddleware');
const { 
    connectTikTokForTenant, 
    disconnectTikTokForTenant, 
    processNewCommentForTenant 
} = require('./tiktokManager');
const { 
    authLimiter, 
    dashboardLimiter, 
    robloxApiLimiter 
} = require('../middleware/rateLimiter');

function getApiKeyFromReq(req) {
    if (req.user && req.user.apiKey) return req.user.apiKey;
    return 'demo-api-key-sg-music';
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./authMiddleware');
    const { findUserById } = require('./store');

    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (!err && userPayload) {
            const user = findUserById(userPayload.id);
            if (user) req.user = user;
        }
        next();
    });
}

// Auth Endpoints
router.post('/auth/register', authLimiter, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const user = await createUser(name, email, password);
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                apiKey: user.apiKey,
                planTier: user.planTier
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                apiKey: user.apiKey,
                planTier: user.planTier
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/auth/me', optionalAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({
        success: true,
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            apiKey: req.user.apiKey,
            planTier: req.user.planTier
        }
    });
});

// Roblox Studio Polling Endpoint
router.get('/v1/streamer/:apiKey/current-player', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const tenant = getTenant(apiKey);
    res.json({
        success: true,
        player: tenant.activePlayer,
        queueLength: tenant.playerQueue.length,
        currentMusicId: tenant.currentMusicId,
        selectedDanceId: tenant.selectedDanceId,
        overlayTitle: tenant.overlayTitle || "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵",
        overlayColor: tenant.overlayColor || "#ff007f",
        danceDuration: tenant.danceDuration || 12,
        timestamp: Date.now()
    });
});

router.get('/current-player', (req, res) => {
    const defaultApiKey = req.query.apiKey || 'demo-api-key-sg-music';
    const tenant = getTenant(defaultApiKey);
    res.json({
        success: true,
        player: tenant.activePlayer,
        queueLength: tenant.playerQueue.length,
        currentMusicId: tenant.currentMusicId,
        selectedDanceId: tenant.selectedDanceId,
        overlayTitle: tenant.overlayTitle || "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵",
        overlayColor: tenant.overlayColor || "#ff007f",
        danceDuration: tenant.danceDuration || 12,
        timestamp: Date.now()
    });
});

// Streamer Dashboard Endpoints
router.get('/v1/dashboard/status', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({
        success: true,
        user: req.user ? {
            name: req.user.name,
            email: req.user.email,
            apiKey: req.user.apiKey,
            planTier: req.user.planTier
        } : {
            name: 'Demo Workspace',
            email: 'admin@sgmusic.com',
            apiKey: 'demo-api-key-sg-music',
            planTier: 'PRO'
        },
        tenantStatus: {
            isConnected: tenant.isConnected,
            tiktokUsername: tenant.tiktokUsername,
            activePlayer: tenant.activePlayer,
            queue: tenant.playerQueue,
            currentTheme: tenant.currentTheme,
            currentMusicId: tenant.currentMusicId,
            selectedDanceId: tenant.selectedDanceId,
            overlayTitle: tenant.overlayTitle || "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵",
            overlayColor: tenant.overlayColor || "#ff007f",
            danceDuration: tenant.danceDuration || 12,
            customMusic: tenant.customMusic,
            customDances: tenant.customDances,
            logs: tenant.logs
        }
    });
});

router.post('/v1/dashboard/connect', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { tiktokUsername } = req.body;
    if (!tiktokUsername) return res.status(400).json({ error: 'tiktokUsername is required' });

    connectTikTokForTenant(apiKey, tiktokUsername);
    res.json({ success: true, message: `Khởi chạy kết nối tới @${tiktokUsername}` });
});

router.post('/v1/dashboard/disconnect', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    disconnectTikTokForTenant(apiKey);
    res.json({ success: true, message: 'Đã ngắt kết nối' });
});

// POST /v1/dashboard/music — set currently playing track (immediate playback in Roblox)
router.post('/v1/dashboard/music', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, musicId } = req.body;
    if (!musicId) return res.status(400).json({ error: 'musicId is required' });

    let formattedId = musicId.trim();
    if (!formattedId.startsWith('rbxassetid://')) {
        formattedId = 'rbxassetid://' + formattedId;
    }

    const tenant = getTenant(apiKey);
    tenant.currentMusicId = formattedId;
    addTenantLog(apiKey, `🎵 Đã phát ngay: ${name || formattedId}`, true);

    res.json({ success: true, currentMusicId: formattedId });
});

// GET /v1/dashboard/music-library — list all saved tracks
router.get('/v1/dashboard/music-library', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, tracks: tenant.customMusic || [], currentMusicId: tenant.currentMusicId });
});

// POST /v1/dashboard/music-library — add a track to the library (does NOT auto-play)
router.post('/v1/dashboard/music-library', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, musicId } = req.body;
    if (!musicId) return res.status(400).json({ error: 'musicId is required' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    let formattedId = musicId.trim();
    if (!formattedId.startsWith('rbxassetid://')) {
        formattedId = 'rbxassetid://' + formattedId;
    }

    const tenant = getTenant(apiKey);
    if (!tenant.customMusic) tenant.customMusic = [];

    // Prevent duplicate Sound IDs
    const exists = tenant.customMusic.find(t => t.musicId === formattedId);
    if (exists) return res.status(409).json({ error: `Sound ID "${formattedId}" đã có trong library.` });

    const track = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
        name: name.trim(),
        musicId: formattedId,
        addedAt: new Date().toISOString()
    };
    tenant.customMusic.unshift(track);
    addTenantLog(apiKey, `📚 Đã thêm vào Music Library: "${name.trim()}" (${formattedId})`);

    res.json({ success: true, track, tracks: tenant.customMusic });
});

// DELETE /v1/dashboard/music-library/:trackId — remove a track
router.delete('/v1/dashboard/music-library/:trackId', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { trackId } = req.params;
    const tenant = getTenant(apiKey);
    if (!tenant.customMusic) return res.status(404).json({ error: 'Track not found' });

    const idx = tenant.customMusic.findIndex(t => t.id === trackId);
    if (idx === -1) return res.status(404).json({ error: 'Track not found' });

    const removed = tenant.customMusic.splice(idx, 1)[0];
    addTenantLog(apiKey, `🗑️ Đã xóa khỏi Library: "${removed.name}"`);
    res.json({ success: true, tracks: tenant.customMusic });
});

router.post('/v1/dashboard/dance', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, danceId, genre } = req.body;
    if (!danceId) return res.status(400).json({ error: 'danceId is required' });

    let formattedId = danceId.trim();
    if (!formattedId.startsWith('rbxassetid://')) {
        formattedId = 'rbxassetid://' + formattedId;
    }

    const tenant = getTenant(apiKey);
    tenant.selectedDanceId = formattedId;
    tenant.customDances.unshift({ id: Date.now().toString(), name: name || formattedId, danceId: formattedId, genre: genre || 'PHONK' });
    addTenantLog(apiKey, `💃 Đã chuyển điệu nhảy mới: ${name || formattedId}`, true);

    res.json({ success: true, selectedDanceId: formattedId, dances: tenant.customDances });
});

// Update Stream Overlay Branding
router.post('/v1/dashboard/overlay', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { overlayTitle, overlayColor } = req.body;
    const tenant = getTenant(apiKey);

    if (overlayTitle) tenant.overlayTitle = overlayTitle;
    if (overlayColor) tenant.overlayColor = overlayColor;

    addTenantLog(apiKey, `🎨 Đã cập nhật nhận diện thương hiệu Stream Overlay!`, true);
    res.json({ success: true, overlayTitle: tenant.overlayTitle, overlayColor: tenant.overlayColor });
});

// Update Stream Settings (Dance Duration)
router.post('/v1/dashboard/settings', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { danceDuration } = req.body;
    const tenant = getTenant(apiKey);

    if (danceDuration && !isNaN(danceDuration)) {
        tenant.danceDuration = Math.max(5, Math.min(120, parseInt(danceDuration)));
    }

    addTenantLog(apiKey, `⏱️ Đã cập nhật thời gian nhảy: ${tenant.danceDuration} giây/người`, true);
    res.json({ success: true, danceDuration: tenant.danceDuration });
});

router.post('/v1/dashboard/mock-comment', optionalAuth, async (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { tiktokUsername, comment, isVIP } = req.body;
    if (!comment) return res.status(400).json({ error: 'comment is required' });

    const result = await processNewCommentForTenant(
        apiKey,
        tiktokUsername || 'viewer_' + Math.floor(Math.random() * 100),
        comment,
        isVIP || false,
        isVIP ? { giftName: 'Rose (Test)', giftCount: 1 } : null
    );

    if (!result || result.success === false) {
        return res.status(400).json({ 
            error: (result && result.error) ? result.error : 'Comment không hợp lệ hoặc username không tồn tại trên Roblox!' 
        });
    }

    res.json({ success: true, playerData: result.playerData });
});

router.post('/v1/dashboard/clear-queue', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    tenant.playerQueue = [];
    tenant.activePlayer = null;
    res.json({ success: true, message: 'Đã xóa hàng đợi' });
});

router.post('/v1/dashboard/skip-player', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    if (tenant.playerQueue.length > 0) {
        tenant.activePlayer = tenant.playerQueue.shift();
    } else {
        tenant.activePlayer = null;
    }
    res.json({ success: true, activePlayer: tenant.activePlayer });
});

// POST: Save overlay settings
router.post('/v1/dashboard/overlay', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { overlayTitle, overlayColor } = req.body;
    const tenant = getTenant(apiKey);
    if (overlayTitle) tenant.overlayTitle = overlayTitle;
    if (overlayColor) tenant.overlayColor = overlayColor;
    addTenantLog(apiKey, `🎨 Overlay updated: "${overlayTitle}" / ${overlayColor}`);
    res.json({ success: true, overlayTitle: tenant.overlayTitle, overlayColor: tenant.overlayColor });
});

// POST: Save dance duration and other settings
router.post('/v1/dashboard/settings', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { danceDuration } = req.body;
    const tenant = getTenant(apiKey);
    if (danceDuration && !isNaN(danceDuration)) {
        tenant.danceDuration = Math.max(5, Math.min(120, parseInt(danceDuration)));
        addTenantLog(apiKey, `⏱️ Dance duration set to ${tenant.danceDuration}s`, true);
    }
    res.json({ success: true, danceDuration: tenant.danceDuration });
});

// GET: TikTok Gift Catalogue (full list for reference)
router.get('/v1/gifts', (req, res) => {
    res.json({ success: true, gifts: TIKTOK_GIFTS });
});

// GET: Coin Milestones (Tikfanny-style: tier → music)
router.get('/v1/dashboard/coin-milestones', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, milestones: tenant.coinMilestones || DEFAULT_COIN_MILESTONES });
});

// POST: Save a single milestone's music (by milestone id)
router.post('/v1/dashboard/coin-milestones', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { milestoneId, musicId, musicName } = req.body;
    if (!milestoneId) return res.status(400).json({ error: 'milestoneId required' });

    const tenant = getTenant(apiKey);
    if (!tenant.coinMilestones) tenant.coinMilestones = DEFAULT_COIN_MILESTONES.map(m => ({ ...m }));

    const target = tenant.coinMilestones.find(m => m.id === milestoneId);
    if (!target) return res.status(404).json({ error: 'Milestone not found' });

    if (musicId) {
        let formatted = musicId.trim();
        if (!formatted.startsWith('rbxassetid://')) formatted = 'rbxassetid://' + formatted;
        target.musicId = formatted;
        if (musicName) target.musicName = musicName.trim();
        addTenantLog(apiKey, `🎁 Milestone "${target.label}" (${target.minCoins}–${target.maxCoins === Infinity ? '∞' : target.maxCoins} xu) → nhạc: ${formatted}`, true);
    }

    res.json({ success: true, milestones: tenant.coinMilestones });
});

module.exports = router;
