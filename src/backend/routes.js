// routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { 
    TIKTOK_GIFTS,
    DEFAULT_COIN_MILESTONES,
    DEFAULT_ACTION_DEFS,
    DEFAULT_EVENT_MAPPINGS,
    VERIFIED_DANCE_LIBRARY,
    VERIFIED_DANCE_IDS,
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
    processNewCommentForTenant,
    processGiftEventForTenant
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

function normalizeDanceId(danceId) {
    if (!danceId || !danceId.trim()) return '';
    let formattedId = danceId.trim();
    if (!formattedId.startsWith('rbxassetid://')) formattedId = 'rbxassetid://' + formattedId;
    return formattedId;
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

// =========================================================
// Roblox Bridge API Endpoints (Polling, ACK, Heartbeat)
// =========================================================
router.get('/v1/streamer/:apiKey/current-player', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const tenant = getTenant(apiKey);
    res.json({
        success: true,
        player: tenant.activePlayer,
        queueLength: tenant.playerQueue.length,
        currentMusicId: tenant.currentMusicId,
        selectedDanceId: tenant.selectedDanceId,
        selectedDanceStyle: tenant.selectedDanceStyle || 'bounce',
        selectedDanceName: tenant.selectedDanceName || 'Bounce Starter',
        lastDanceVerification: tenant.lastDanceVerification || null,
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
        selectedDanceStyle: tenant.selectedDanceStyle || 'bounce',
        selectedDanceName: tenant.selectedDanceName || 'Bounce Starter',
        lastDanceVerification: tenant.lastDanceVerification || null,
        overlayTitle: tenant.overlayTitle || "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵",
        overlayColor: tenant.overlayColor || "#ff007f",
        danceDuration: tenant.danceDuration || 12,
        timestamp: Date.now()
    });
});

// GET: Roblox Game Events Polling Endpoint (Returns pending QUEUED events for Roblox execution)
router.get('/v1/streamer/:apiKey/game-events', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const tenant = getTenant(apiKey);
    const now = Date.now();

    // Filter unexpired queued events
    const pendingEvents = (tenant.gameEventQueue || []).filter(e => e.status === 'QUEUED' && new Date(e.expiresAt).getTime() > now);

    // Mark delivered
    pendingEvents.forEach(e => {
        e.status = 'DELIVERED';
        e.deliveryAttempts = (e.deliveryAttempts || 0) + 1;
    });

    res.json({
        success: true,
        events: pendingEvents,
        count: pendingEvents.length,
        timestamp: now
    });
});

// POST: Roblox ACK Endpoint (Receives ACK execution status from Lua script)
router.post('/v1/streamer/:apiKey/game-events/:eventId/ack', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const { eventId } = req.params;
    const { success = true, error = null } = req.body;
    const tenant = getTenant(apiKey);

    const event = (tenant.gameEventsHistory || []).find(e => e.eventId === eventId);
    if (event) {
        event.status = success ? 'ACKED' : 'FAILED';
        event.ackedAt = new Date().toISOString();
        if (error) event.lastError = error;
    }

    // Remove from active queue
    tenant.gameEventQueue = (tenant.gameEventQueue || []).filter(e => e.eventId !== eventId);

    addTenantLog(apiKey, `✅ Roblox ACK [${eventId}]: ${success ? 'Thành công' : 'Lỗi: ' + error}`);
    res.json({ success: true, eventId, status: event ? event.status : 'ACKED' });
});

// POST: Roblox Heartbeat Endpoint
router.post('/v1/streamer/:apiKey/heartbeat', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const { placeId, jobId, scriptVer } = req.body;
    const tenant = getTenant(apiKey);

    tenant.robloxHeartbeat = {
        lastHeartbeat: new Date().toISOString(),
        isOnline: true,
        placeId: placeId || null,
        jobId: jobId || null,
        scriptVer: scriptVer || '1.0.0'
    };

    res.json({ success: true, isOnline: true, timestamp: Date.now() });
});

router.post('/v1/streamer/:apiKey/dance-status', (req, res) => {
    const apiKey = req.params.apiKey || 'demo-api-key-sg-music';
    const tenant = getTenant(apiKey);
    const {
        playerId = null,
        robloxUsername = null,
        danceId = '',
        danceStyle = 'bounce',
        success = false,
        mode = 'pending',
        message = ''
    } = req.body || {};

    const verification = {
        playerId,
        robloxUsername,
        success: !!success,
        mode,
        danceId: danceId || '',
        danceStyle: danceStyle || 'bounce',
        message: message || (success ? 'Nhan vat da bat dau nhay.' : 'Khong xac nhan duoc nhan vat dang nhay.'),
        verifiedAt: new Date().toISOString()
    };

    tenant.lastDanceVerification = verification;

    if (tenant.activePlayer && (!playerId || tenant.activePlayer.id === playerId || tenant.activePlayer.robloxUsername === robloxUsername)) {
        tenant.activePlayer.danceVerification = verification;
    }

    addTenantLog(
        apiKey,
        `${verification.success ? '💃' : '⚠️'} Dance verification: ${verification.robloxUsername || 'Unknown'} -> ${verification.mode} (${verification.message})`,
        true
    );

    res.json({ success: true, verification });
});

// =========================================================
// Streamer Dashboard API Endpoints
// =========================================================
router.get('/v1/dashboard/status', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);

    // Check heartbeat freshness (online if heartbeat received in last 25s)
    const hb = tenant.robloxHeartbeat || {};
    const isRobloxOnline = hb.lastHeartbeat && (Date.now() - new Date(hb.lastHeartbeat).getTime() < 25000);

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
            selectedDanceStyle: tenant.selectedDanceStyle || 'bounce',
            selectedDanceName: tenant.selectedDanceName || 'Bounce Starter',
            lastDanceVerification: tenant.lastDanceVerification || null,
            overlayTitle: tenant.overlayTitle || "🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵",
            overlayColor: tenant.overlayColor || "#ff007f",
            danceDuration: tenant.danceDuration || 12,
            isRobloxOnline,
            robloxHeartbeat: { ...hb, isOnline: isRobloxOnline },
            customMusic: tenant.customMusic,
            customDances: tenant.customDances,
            eventMappingsCount: (tenant.eventMappings || []).length,
            actionDefsCount: (tenant.actionDefs || []).length,
            pendingGameEventsCount: (tenant.gameEventQueue || []).length,
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

// Event Mappings Endpoints (CRUD & Test)
router.get('/v1/dashboard/event-mappings', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, eventMappings: tenant.eventMappings || DEFAULT_EVENT_MAPPINGS });
});

router.post('/v1/dashboard/event-mappings', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const mapping = req.body;

    if (!mapping.name) return res.status(400).json({ error: 'Mapping name is required' });

    mapping.id = mapping.id || 'map_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
    mapping.enabled = mapping.enabled !== undefined ? mapping.enabled : true;
    mapping.createdAt = new Date().toISOString();
    mapping.updatedAt = new Date().toISOString();

    if (!tenant.eventMappings) tenant.eventMappings = [];
    tenant.eventMappings.unshift(mapping);
    addTenantLog(apiKey, `🎯 Đã tạo Event Mapping mới: "${mapping.name}"`, true);

    res.json({ success: true, mapping, eventMappings: tenant.eventMappings });
});

router.put('/v1/dashboard/event-mappings/:id', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;
    const updates = req.body;

    const idx = (tenant.eventMappings || []).findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Event mapping not found' });

    tenant.eventMappings[idx] = { ...tenant.eventMappings[idx], ...updates, updatedAt: new Date().toISOString() };
    addTenantLog(apiKey, `🎯 Đã cập nhật Event Mapping: "${tenant.eventMappings[idx].name}"`);

    res.json({ success: true, mapping: tenant.eventMappings[idx], eventMappings: tenant.eventMappings });
});

router.delete('/v1/dashboard/event-mappings/:id', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;

    const idx = (tenant.eventMappings || []).findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Event mapping not found' });

    const deleted = tenant.eventMappings.splice(idx, 1)[0];
    addTenantLog(apiKey, `🗑️ Đã xóa Event Mapping: "${deleted.name}"`);

    res.json({ success: true, eventMappings: tenant.eventMappings });
});

router.post('/v1/dashboard/event-mappings/:id/test', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;

    const mapping = (tenant.eventMappings || []).find(m => m.id === id);
    if (!mapping) return res.status(404).json({ error: 'Event mapping not found' });

    const result = processGiftEventForTenant(apiKey, {
        giftId: mapping.trigger?.giftId || 'test_gift',
        giftName: mapping.trigger?.giftName || 'Rose (Test)',
        repeatCount: mapping.trigger?.minRepeatCount || 1,
        singleCoinValue: mapping.trigger?.minTotalCoins || 1,
        totalCoins: mapping.trigger?.minTotalCoins || 1,
        tiktokUsername: 'Tester_VIP',
        nickname: 'VIP Tester'
    });

    res.json({ success: true, message: `Thử nghiệm Event Mapping "${mapping.name}" thành công!`, result });
});

// Actions Endpoints (CRUD & Test)
router.get('/v1/dashboard/actions', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, actionDefs: tenant.actionDefs || DEFAULT_ACTION_DEFS });
});

router.post('/v1/dashboard/actions', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const action = req.body;

    if (!action.name || !action.type) return res.status(400).json({ error: 'Action name and type are required' });

    action.id = action.id || 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5);
    action.enabled = action.enabled !== undefined ? action.enabled : true;
    action.createdAt = new Date().toISOString();
    action.updatedAt = new Date().toISOString();

    if (!tenant.actionDefs) tenant.actionDefs = [];
    tenant.actionDefs.unshift(action);
    addTenantLog(apiKey, `⚡ Đã thêm Action mới vào thư viện: "${action.name}" (${action.type})`, true);

    res.json({ success: true, action, actionDefs: tenant.actionDefs });
});

router.put('/v1/dashboard/actions/:id', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;
    const updates = req.body;

    const idx = (tenant.actionDefs || []).findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Action definition not found' });

    tenant.actionDefs[idx] = { ...tenant.actionDefs[idx], ...updates, updatedAt: new Date().toISOString() };
    addTenantLog(apiKey, `⚡ Đã cập nhật Action: "${tenant.actionDefs[idx].name}"`);

    res.json({ success: true, action: tenant.actionDefs[idx], actionDefs: tenant.actionDefs });
});

router.delete('/v1/dashboard/actions/:id', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;

    // Check dependency in Event Mappings
    const isUsed = (tenant.eventMappings || []).some(m => (m.actions || []).some(a => a.actionId === id));
    if (isUsed) return res.status(400).json({ error: 'Không thể xóa Action đang được dùng trong Event Mapping!' });

    const idx = (tenant.actionDefs || []).findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Action definition not found' });

    const deleted = tenant.actionDefs.splice(idx, 1)[0];
    addTenantLog(apiKey, `🗑️ Đã xóa Action: "${deleted.name}"`);

    res.json({ success: true, actionDefs: tenant.actionDefs });
});

// Event Monitor & History Endpoints
router.get('/v1/dashboard/events', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({
        success: true,
        queued: tenant.gameEventQueue || [],
        history: tenant.gameEventsHistory || []
    });
});

router.post('/v1/dashboard/events/:eventId/retry', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { eventId } = req.params;

    const event = (tenant.gameEventsHistory || []).find(e => e.eventId === eventId);
    if (!event) return res.status(404).json({ error: 'Event not found in history' });

    // Create new retried GameEvent with unique ID
    const newEvent = {
        ...JSON.parse(JSON.stringify(event)),
        eventId: 'evt_retry_' + Date.now().toString(36),
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        deliveryAttempts: 0
    };

    tenant.gameEventQueue.push(newEvent);
    tenant.gameEventsHistory.unshift(newEvent);
    addTenantLog(apiKey, `🔄 Replay Event [${eventId}] thành [${newEvent.eventId}]`, true);

    res.json({ success: true, message: `Đã phát lại sự kiện [${newEvent.eventId}]`, event: newEvent });
});

// Pre-live Checklist Diagnostics Endpoint
router.post('/v1/dashboard/preflight', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);

    const hb = tenant.robloxHeartbeat || {};
    const isRobloxOnline = hb.lastHeartbeat && (Date.now() - new Date(hb.lastHeartbeat).getTime() < 25000);

    const checks = [
        { name: 'Backend API Service', pass: true, detail: 'Server Express đang lắng nghe và phản hồi mượt mà.' },
        { name: 'TikTok Live Connector', pass: tenant.isConnected, detail: tenant.isConnected ? `Đã kết nối kênh @${tenant.tiktokUsername}` : 'Chưa kết nối TikTok Live (Bấm Connect)' },
        { name: 'Roblox Heartbeat', pass: isRobloxOnline, detail: isRobloxOnline ? `Roblox Online (PlaceId: ${hb.placeId || 'N/A'})` : 'Roblox chưa gửi heartbeat (Hãy chạy Lua script trong Roblox Studio)' },
        { name: 'Event Mappings Engine', pass: (tenant.eventMappings || []).length > 0, detail: `Đã thiết lập ${(tenant.eventMappings || []).length} quy tắc sự kiện` },
        { name: 'Music & Sound Engine', pass: !!tenant.currentMusicId, detail: `Current Music SoundID: ${tenant.currentMusicId}` }
    ];

    const allPassed = checks.every(c => c.pass);
    res.json({ success: true, allPassed, checks });
});

// Emergency Stop
router.post('/v1/dashboard/emergency-stop', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);

    tenant.gameEventQueue = [];
    tenant.playerQueue = [];
    tenant.activePlayer = null;

    addTenantLog(apiKey, `🚨 DỪNG KHẨN CẤP (EMERGENCY STOP): Đã xóa sạch hàng chờ nhảy và hiệu ứng game!`, true);
    res.json({ success: true, message: 'Đã kích hoạt dừng khẩn cấp. Toàn bộ hàng chờ đã được làm sạch!' });
});

// Music & Dance Dashboard Endpoints
router.post('/v1/dashboard/music', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, musicId } = req.body;
    if (!musicId) return res.status(400).json({ error: 'musicId is required' });

    let formattedId = musicId.trim();
    if (!formattedId.startsWith('rbxassetid://')) formattedId = 'rbxassetid://' + formattedId;

    const tenant = getTenant(apiKey);
    tenant.currentMusicId = formattedId;
    addTenantLog(apiKey, `🎵 Đã phát ngay: ${name || formattedId}`, true);

    res.json({ success: true, currentMusicId: formattedId });
});

router.get('/v1/dashboard/music-library', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, tracks: tenant.customMusic || [], currentMusicId: tenant.currentMusicId });
});

router.post('/v1/dashboard/music-library', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, musicId } = req.body;
    if (!musicId) return res.status(400).json({ error: 'musicId is required' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    let formattedId = musicId.trim();
    if (!formattedId.startsWith('rbxassetid://')) formattedId = 'rbxassetid://' + formattedId;

    const tenant = getTenant(apiKey);
    if (!tenant.customMusic) tenant.customMusic = [];

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

router.get('/v1/dashboard/dance', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({
        success: true,
        selectedDanceId: tenant.selectedDanceId,
        selectedDanceStyle: tenant.selectedDanceStyle || 'bounce',
        selectedDanceName: tenant.selectedDanceName || 'Bounce Starter',
        lastDanceVerification: tenant.lastDanceVerification || null,
        dances: tenant.customDances || [],
        verifiedDances: VERIFIED_DANCE_LIBRARY
    });
});

router.post('/v1/dashboard/dance', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { name, danceId, genre, danceStyle, setActive = true } = req.body;
    const normalizedStyle = (danceStyle || genre || 'bounce').toString().trim().toLowerCase();
    const formattedId = normalizeDanceId(danceId);
    const verificationStatus = formattedId ? (VERIFIED_DANCE_IDS.has(formattedId) ? 'verified' : 'pending') : 'verified';
    const verificationMode = formattedId ? 'asset' : 'procedural';

    const tenant = getTenant(apiKey);
    if (!tenant.customDances) tenant.customDances = [];

    let savedDance = tenant.customDances.find(d => formattedId && d.danceId === formattedId);
    if (!savedDance) {
        savedDance = tenant.customDances.find(d => !formattedId && d.danceStyle === normalizedStyle && d.name === ((name && name.trim()) || d.name));
    }

    if (!savedDance) {
        savedDance = {
            id: Date.now().toString(),
            name: (name && name.trim()) || normalizedStyle,
            danceId: formattedId,
            genre: genre || normalizedStyle.toUpperCase(),
            danceStyle: normalizedStyle,
            verificationStatus,
            verificationMode
        };
        tenant.customDances.unshift(savedDance);
    } else {
        savedDance.name = (name && name.trim()) || savedDance.name;
        savedDance.danceId = formattedId;
        savedDance.genre = genre || savedDance.genre;
        savedDance.danceStyle = normalizedStyle;
        savedDance.verificationStatus = verificationStatus;
        savedDance.verificationMode = verificationMode;
    }

    if (setActive !== false) {
        if (formattedId && verificationStatus !== 'verified') {
            return res.status(400).json({
                error: 'Dance asset nay chua nam trong danh sach emote da xac minh. Hay verify trong Roblox truoc khi kich hoat.'
            });
        }
        tenant.selectedDanceId = formattedId;
        tenant.selectedDanceStyle = normalizedStyle;
        tenant.selectedDanceName = savedDance.name;
        tenant.lastDanceVerification = {
            playerId: tenant.activePlayer ? tenant.activePlayer.id : null,
            robloxUsername: tenant.activePlayer ? tenant.activePlayer.robloxUsername : null,
            success: false,
            mode: 'pending',
            danceId: formattedId,
            danceStyle: normalizedStyle,
            message: 'Dang cho Roblox xac nhan nhan vat bat dau nhay.',
            verifiedAt: new Date().toISOString()
        };
    }

    addTenantLog(apiKey, `???? ???? c??i ??i???u nh???y: ${savedDance.name}${formattedId ? ' ??? ' + formattedId : ' ??? procedural only'}`, true);

    res.json({
        success: true,
        selectedDanceId: tenant.selectedDanceId,
        selectedDanceStyle: tenant.selectedDanceStyle || normalizedStyle,
        selectedDanceName: tenant.selectedDanceName || savedDance.name,
        lastDanceVerification: tenant.lastDanceVerification || null,
        dance: savedDance,
        dances: tenant.customDances
    });
});

router.delete('/v1/dashboard/dance/:id', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    const { id } = req.params;

    const idx = (tenant.customDances || []).findIndex(d => d.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Dance emote not found' });

    const removed = tenant.customDances.splice(idx, 1)[0];
    addTenantLog(apiKey, `🗑️ Đã xóa điệu nhảy: "${removed.name}"`);
    res.json({ success: true, dances: tenant.customDances });
});

// Auto-Fetch Roblox Animations API Endpoint
router.post('/v1/dashboard/dance/auto-fetch-roblox', optionalAuth, async (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { input, setActive = true } = req.body;
    if (!input || !input.trim()) return res.status(400).json({ error: 'Vui lòng nhập Asset ID hoặc Username Roblox' });

    const cleanInput = input.trim();
    const assetIdMatch = cleanInput.match(/(\d{8,16})/);
    const tenant = getTenant(apiKey);
    if (!tenant.customDances) tenant.customDances = [];

    try {
        if (assetIdMatch) {
            const assetId = assetIdMatch[1];
            const formattedId = `rbxassetid://${assetId}`;

            let fetchedName = `Roblox Animation (${assetId})`;
            let creatorName = 'Roblox Creator';

            try {
                const apiRes = await fetch(`https://economy.roblox.com/v2/assets/${assetId}/details`);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    if (data && data.Name && !data.Name.includes('###')) {
                        fetchedName = data.Name;
                    }
                    if (data && data.Creator && data.Creator.Name) {
                        creatorName = data.Creator.Name;
                    }
                }
            } catch (err) {
                console.warn('[AutoFetch] Roblox Economy API warning:', err.message);
            }

            let dance = tenant.customDances.find(d => d.danceId === formattedId);
            if (!dance) {
                dance = {
                    id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
                    name: `🔥 ${fetchedName}`,
                    danceId: formattedId,
                    genre: 'TRENDING',
                    danceStyle: 'bounce',
                    verificationStatus: 'verified',
                    verificationMode: 'asset',
                    creator: creatorName,
                    addedAt: new Date().toISOString()
                };
                tenant.customDances.unshift(dance);
            }

            if (setActive) {
                tenant.selectedDanceId = dance.danceId;
                tenant.selectedDanceStyle = dance.danceStyle;
                tenant.selectedDanceName = dance.name;
            }

            addTenantLog(apiKey, `🔍 Auto-Fetch Roblox API: Đã tự động thêm & kích hoạt điệu nhảy "${dance.name}" (${formattedId})`, true);
            return res.json({ success: true, message: `Đã tự động lấy thành công điệu nhảy "${dance.name}"!`, dance, dances: tenant.customDances, selectedDanceId: tenant.selectedDanceId });
        } else {
            const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [cleanInput], excludeBannedUsers: true })
            });
            const userData = await userRes.json();
            if (!userData || !userData.data || userData.data.length === 0) {
                return res.status(404).json({ error: `Không tìm thấy tài khoản Roblox "${cleanInput}".` });
            }

            const userId = userData.data[0].id;
            const verifiedName = userData.data[0].name;

            const invRes = await fetch(`https://inventory.roblox.com/v2/users/${userId}/inventory/24?limit=25&sortOrder=Desc`);
            let userDancesAdded = [];

            if (invRes.ok) {
                const invData = await invRes.json();
                if (invData && invData.data && invData.data.length > 0) {
                    for (const item of invData.data) {
                        const itemAssetId = item.assetId || item.id;
                        if (!itemAssetId) continue;
                        const formattedId = `rbxassetid://${itemAssetId}`;
                        const itemName = item.name || `Animation ${itemAssetId}`;

                        let dance = tenant.customDances.find(d => d.danceId === formattedId);
                        if (!dance) {
                            dance = {
                                id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
                                name: `💃 ${itemName} (@${verifiedName})`,
                                danceId: formattedId,
                                genre: 'CUSTOM',
                                danceStyle: 'bounce',
                                verificationStatus: 'verified',
                                verificationMode: 'asset',
                                creator: verifiedName,
                                addedAt: new Date().toISOString()
                            };
                            tenant.customDances.unshift(dance);
                            userDancesAdded.push(dance);
                        }
                    }
                }
            }

            if (userDancesAdded.length > 0 && setActive) {
                tenant.selectedDanceId = userDancesAdded[0].danceId;
                tenant.selectedDanceStyle = userDancesAdded[0].danceStyle;
                tenant.selectedDanceName = userDancesAdded[0].name;
            }

            addTenantLog(apiKey, `🔍 Auto-Fetch Roblox: Quét tài khoản @${verifiedName} → Tìm thấy & thêm ${userDancesAdded.length} điệu nhảy.`, true);
            return res.json({
                success: true,
                message: `Đã quét tài khoản @${verifiedName} và tự động lấy ${userDancesAdded.length} điệu nhảy!`,
                addedCount: userDancesAdded.length,
                dances: tenant.customDances,
                selectedDanceId: tenant.selectedDanceId
            });
        }
    } catch (err) {
        return res.status(500).json({ error: `Lỗi kết nối Roblox API: ${err.message}` });
    }
});

router.post('/v1/dashboard/overlay', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const { overlayTitle, overlayColor } = req.body;
    const tenant = getTenant(apiKey);

    if (overlayTitle) tenant.overlayTitle = overlayTitle;
    if (overlayColor) tenant.overlayColor = overlayColor;

    addTenantLog(apiKey, `🎨 Đã cập nhật nhận diện thương hiệu Stream Overlay!`, true);
    res.json({ success: true, overlayTitle: tenant.overlayTitle, overlayColor: tenant.overlayColor });
});

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

router.get('/v1/gifts', (req, res) => {
    res.json({ success: true, gifts: TIKTOK_GIFTS });
});

router.get('/v1/dashboard/coin-milestones', optionalAuth, (req, res) => {
    const apiKey = getApiKeyFromReq(req);
    const tenant = getTenant(apiKey);
    res.json({ success: true, milestones: tenant.coinMilestones || DEFAULT_COIN_MILESTONES });
});

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
