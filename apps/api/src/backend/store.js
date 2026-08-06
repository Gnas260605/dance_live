// store.js
// Production Multi-Tenant Data Store with persistent Database storage (via Prisma)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('./db');

let users = [];
let tenantConfigs = {};

const DEFAULT_THEMES = {
    PHONK: {
        name: "⚡ Phonk",
        music: ["rbxassetid://1837879082"],
        dances: ["rbxassetid://507771019"]
    },
    KPOP: {
        name: "🔥 K-Pop",
        music: ["rbxassetid://1837879082"],
        dances: ["rbxassetid://507770453"]
    }
};

const DEFAULT_DANCE_LIBRARY = [
    { id: 'dance_nhay_trend_tungtung', name: '🔥 Nhảy Trend TungTung', danceId: 'rbxassetid://86539981118136', genre: 'HYPE', danceStyle: 'bounce', addedAt: '2026-08-06T00:00:00.000Z' },
    { id: 'dance_endless_aura', name: '✨ Endless Aura Floating', danceId: 'rbxassetid://106708015414624', genre: 'PHONK', danceStyle: 'hype', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_aura_farming', name: '🌾 Aura Farming', danceId: 'rbxassetid://133113167814737', genre: 'CHILL', danceStyle: 'bounce', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_kawaii_anime', name: '🌸 Kawaii Anime Dance', danceId: 'rbxassetid://91147141356012', genre: 'KPOP', danceStyle: 'kpop', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_jamal_brazil', name: '🇧🇷 Jamal Brazil Groove', danceId: 'rbxassetid://104131847054135', genre: 'FUNK', danceStyle: 'funk', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_phonk_hype', name: '⚡ Phonk Hype Dance', danceId: 'rbxassetid://507771019', genre: 'PHONK', danceStyle: 'bounce', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_kpop_sync', name: '🔥 K-Pop Sync Routine', danceId: 'rbxassetid://507771959', genre: 'KPOP', danceStyle: 'kpop', addedAt: '2026-08-05T00:00:00.000Z' }
];

const VERIFIED_DANCE_LIBRARY = [
    { id: 'dance_nhay_trend_tungtung', name: '🔥 Nhảy Trend TungTung', danceId: 'rbxassetid://86539981118136', genre: 'HYPE', danceStyle: 'bounce', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-06T00:00:00.000Z' },
    { id: 'dance_phonk_hype', name: 'Phonk Hype Dance', danceId: 'rbxassetid://507771019', genre: 'PHONK', danceStyle: 'bounce', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_breakdance_bboy', name: 'Breakdance B-Boy', danceId: 'rbxassetid://507772104', genre: 'HIPHOP', danceStyle: 'hiphop', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_chill_wave', name: 'Chill Wave Motion', danceId: 'rbxassetid://507770238', genre: 'CHILL', danceStyle: 'wave', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_idol_point', name: 'Idol Point Routine', danceId: 'rbxassetid://507770453', genre: 'KPOP', danceStyle: 'kpop', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_stadium_hype', name: 'Stadium Hype', danceId: 'rbxassetid://507771520', genre: 'PHONK', danceStyle: 'hype', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_hands_up_jump', name: 'Hands Up Jump', danceId: 'rbxassetid://507770677', genre: 'PHONK', danceStyle: 'shuffle', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_sway_groove', name: 'Sway Groove', danceId: 'rbxassetid://507770897', genre: 'CHILL', danceStyle: 'wave', verificationStatus: 'verified', verificationMode: 'asset', addedAt: '2026-08-05T00:00:00.000Z' },
    { id: 'dance_proc_bounce', name: 'Procedural Bounce', danceId: '', genre: 'PHONK', danceStyle: 'bounce', verificationStatus: 'verified', verificationMode: 'procedural', addedAt: '2026-08-05T00:00:00.000Z' }
];

const VERIFIED_DANCE_IDS = new Set(
    VERIFIED_DANCE_LIBRARY
        .map((dance) => dance.danceId)
        .filter(Boolean)
);

const TIKTOK_GIFTS = [
    { id: 'rose',           name: 'Rose',            emoji: '🌹', coins: 1,      category: 'tier1' },
    { id: 'like',           name: 'TikTok Like',     emoji: '👍', coins: 1,      category: 'tier1' },
    { id: 'ice_cream',      name: 'Ice Cream',       emoji: '🍦', coins: 1,      category: 'tier1' },
    { id: 'sunglasses',     name: 'Sunglasses',      emoji: '😎', coins: 1,      category: 'tier1' },
    { id: 'hat',            name: 'Cowboy Hat',      emoji: '🤠', coins: 1,      category: 'tier1' },
    { id: 'bell',           name: 'Bell',            emoji: '🔔', coins: 1,      category: 'tier1' },
    { id: 'heart',          name: 'Finger Heart',    emoji: '🤞', coins: 5,      category: 'tier1' },
    { id: 'chocolate',      name: 'Chocolate',       emoji: '🍫', coins: 5,      category: 'tier1' },
    { id: 'hands',          name: 'Two Clapping',    emoji: '👏', coins: 5,      category: 'tier1' },
    { id: 'lollipop',       name: 'Lollipop',        emoji: '🍭', coins: 10,     category: 'tier2' },
    { id: 'perfume',        name: 'Perfume',         emoji: '🌸', coins: 20,     category: 'tier2' },
    { id: 'donut',          name: 'Donut',           emoji: '🍩', coins: 30,     category: 'tier2' },
    { id: 'mic',            name: 'Mic',             emoji: '🎤', coins: 50,     category: 'tier2' },
    { id: 'balloon',        name: 'Balloon',         emoji: '🎈', coins: 65,     category: 'tier2' },
    { id: 'cake',           name: 'Birthday Cake',   emoji: '🎂', coins: 69,     category: 'tier2' },
    { id: 'paper_crane',    name: 'Paper Crane',     emoji: '🕊️', coins: 99,     category: 'tier2' },
    { id: 'cap',            name: 'TikTok Cap',      emoji: '🧢', coins: 99,     category: 'tier2' },
    { id: 'hand_heart',     name: 'Hand Heart',      emoji: '🫶', coins: 100,    category: 'tier3' },
    { id: 'friendship',     name: 'Friendship',      emoji: '🤝', coins: 100,    category: 'tier3' },
    { id: 'gem',            name: 'Gem',             emoji: '💎', coins: 200,    category: 'tier3' },
    { id: 'boxing',         name: 'Boxing Gloves',   emoji: '🥊', coins: 200,    category: 'tier3' },
    { id: 'star_meteor',    name: 'Shooting Star',   emoji: '🌠', coins: 299,    category: 'tier3' },
    { id: 'diamond',        name: 'Diamond',         emoji: '💍', coins: 300,    category: 'tier3' },
    { id: 'thunder',        name: 'Thunder',         emoji: '⚡', coins: 400,    category: 'tier3' },
    { id: 'concert',        name: 'Concert',         emoji: '🎸', coins: 500,    category: 'tier3' },
    { id: 'fire',           name: 'Fire',            emoji: '🔥', coins: 500,    category: 'tier3' },
    { id: 'galaxy',         name: 'Galaxy',          emoji: '🌌', coins: 1000,   category: 'tier4' },
    { id: 'fireworks',      name: 'Fireworks',       emoji: '🎆', coins: 1088,   category: 'tier4' },
    { id: 'crown',          name: 'Crown',           emoji: '👑', coins: 1500,   category: 'tier4' },
    { id: 'submarine',      name: 'Submarine',       emoji: '⚓', coins: 5199,   category: 'tier4' },
    { id: 'sports_car',     name: 'Sports Car',      emoji: '🏎️', coins: 7000,   category: 'tier4' },
    { id: 'planet',         name: 'Planet',          emoji: '🪐', coins: 15000,  category: 'tier5' },
    { id: 'rocket',         name: 'Rocket',          emoji: '🚀', coins: 20000,  category: 'tier5' },
    { id: 'castle',         name: 'Castle',          emoji: '🏰', coins: 20000,  category: 'tier5' },
    { id: 'phoenix',        name: 'Phoenix',         emoji: '🦅', coins: 25999,  category: 'tier5' },
    { id: 'dragon',         name: 'Dragon',          emoji: '🐉', coins: 26999,  category: 'tier5' },
    { id: 'lion',           name: 'Lion',            emoji: '🦁', coins: 29999,  category: 'tier5' },
    { id: 'lion_king',      name: 'Lion King',       emoji: '🦁', coins: 29999,  category: 'tier5' },
    { id: 'tiktok_universe',name: 'TikTok Universe', emoji: '💫', coins: 44999,  category: 'tier5' },
];

const DEFAULT_COIN_MILESTONES = [
    { id: 'milestone_1', label: '🌸 Nhỏ xinh', description: 'Quà 1–9 xu', minCoins: 1, maxCoins: 9, emoji: '🌸', color: '#ff007f', musicId: 'rbxassetid://1837879082', musicName: 'K-Pop High Beat' },
    { id: 'milestone_2', label: '⚡ Vừa phải', description: 'Quà 10–99 xu', minCoins: 10, maxCoins: 99, emoji: '⚡', color: '#00f2fe', musicId: 'rbxassetid://1837879082', musicName: 'Cyber EDM Drop' },
    { id: 'milestone_3', label: '💜 Sang chảnh', description: 'Quà 100–999 xu', minCoins: 100, maxCoins: 999, emoji: '💜', color: '#a78bfa', musicId: 'rbxassetid://1837879082', musicName: 'Phonk Bass' },
    { id: 'milestone_4', label: '⭐ Khủng', description: 'Quà 1000–9999 xu', minCoins: 1000, maxCoins: 9999, emoji: '⭐', color: '#f59e0b', musicId: 'rbxassetid://1837879082', musicName: 'Boss Phonk Drop' },
    { id: 'milestone_5', label: '👑 Siêu Khủng', description: 'Quà 10000–29998 xu', minCoins: 10000, maxCoins: 29998, emoji: '👑', color: '#ec4899', musicId: 'rbxassetid://1837879082', musicName: 'Superstar Fanfare' },
    { id: 'milestone_6', label: '💎 Legendary', description: 'Quà 29999+ xu (Lion, Universe...)', minCoins: 29999, maxCoins: Infinity, emoji: '💎', color: '#00f2fe', musicId: 'rbxassetid://1837879082', musicName: 'Legendary Anthem' }
];

const DEFAULT_ACTION_DEFS = [
    {
        id: 'act_flower_rain',
        name: '🌸 Mưa Hoa Hồng (Flower Rain)',
        type: 'FLOWER_RAIN',
        enabled: true,
        defaultDelayMs: 0,
        defaultDurationMs: 5000,
        parameters: { target: 'DANCE_STAGE', count: 30, radius: 15 }
    },
    {
        id: 'act_heart_burst',
        name: '🫶 Trái Tim Bùng Nổ (Heart Burst)',
        type: 'HEART_BURST',
        enabled: true,
        defaultDelayMs: 0,
        defaultDurationMs: 4000,
        parameters: { target: 'ACTIVE_DANCER', count: 20, size: 1.5 }
    },
    {
        id: 'act_boss_lights',
        name: '🌌 Đổi Đèn Vũ Trụ (Stage Light Shift)',
        type: 'CHANGE_STAGE_LIGHT',
        enabled: true,
        defaultDelayMs: 0,
        defaultDurationMs: 8000,
        parameters: { palette: 'NEON', pattern: 'FLASH' }
    },
    {
        id: 'act_show_msg',
        name: '💬 Banner Thông Báo Quà',
        type: 'SHOW_MESSAGE',
        enabled: true,
        defaultDelayMs: 0,
        defaultDurationMs: 4000,
        parameters: { template: '🎁 {tiktokUsername} vừa tặng {giftName} x{repeatCount}!' }
    }
];

const DEFAULT_EVENT_MAPPINGS = [
    {
        id: 'map_rose',
        name: '🌹 Rose → Mưa hoa hồng',
        description: 'Tặng Rose (1 xu) sẽ kích hoạt mưa hoa rơi trên sân khấu Roblox',
        enabled: true,
        priority: 10,
        trigger: {
            type: 'TIKTOK_GIFT',
            giftId: 'rose',
            giftName: 'Rose',
            minRepeatCount: 1,
            minTotalCoins: 1,
            userFilter: 'ANY'
        },
        actions: [
            { actionId: 'act_flower_rain', delayMs: 0, durationMs: 5000 },
            { actionId: 'act_show_msg', delayMs: 0, durationMs: 4000 }
        ],
        cooldownMs: 500,
        queueMode: 'QUEUE',
        stopProcessingAfterMatch: true
    },
    {
        id: 'map_hand_heart',
        name: '🫶 Hand Heart → Trái tim quanh Dancer',
        description: 'Tặng Hand Heart (100 xu) sẽ bắn trái tim xoay quanh avatar đang nhảy',
        enabled: true,
        priority: 10,
        trigger: {
            type: 'TIKTOK_GIFT',
            giftId: 'hand_heart',
            giftName: 'Hand Heart',
            minRepeatCount: 1,
            minTotalCoins: 100,
            userFilter: 'ANY'
        },
        actions: [
            { actionId: 'act_heart_burst', delayMs: 0, durationMs: 4000 },
            { actionId: 'act_show_msg', delayMs: 0, durationMs: 4000 }
        ],
        cooldownMs: 1000,
        queueMode: 'QUEUE',
        stopProcessingAfterMatch: true
    },
    {
        id: 'map_galaxy',
        name: '🌌 Galaxy → Show ánh sáng hoành tráng',
        description: 'Tặng Galaxy (1000 xu) đổi đèn sân khấu và thông báo toàn máy chủ',
        enabled: true,
        priority: 20,
        trigger: {
            type: 'TIKTOK_GIFT',
            giftId: 'galaxy',
            giftName: 'Galaxy',
            minRepeatCount: 1,
            minTotalCoins: 1000,
            userFilter: 'ANY'
        },
        actions: [
            { actionId: 'act_boss_lights', delayMs: 0, durationMs: 8000 },
            { actionId: 'act_show_msg', delayMs: 0, durationMs: 5000 }
        ],
        cooldownMs: 2000,
        queueMode: 'QUEUE',
        stopProcessingAfterMatch: true
    }
];

function initTenantConfig(apiKey) {
    if (!tenantConfigs[apiKey]) {
        tenantConfigs[apiKey] = {
            tiktokUsername: 'sandg.music',
            isConnected: false,
            activePlayer: null,
            playerQueue: [],
            currentTheme: 'PHONK',
            currentMusicId: '',
            selectedDanceId: 'rbxassetid://86539981118136',
            selectedDanceStyle: 'bounce',
            selectedDanceName: '⚡ Nhảy Trend TungTung',
            overlayTitle: '🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵',
            overlayColor: '#ff007f',
            danceDuration: 12,
            coinMilestones: DEFAULT_COIN_MILESTONES.map(m => ({ ...m })),
            actionDefs: JSON.parse(JSON.stringify(DEFAULT_ACTION_DEFS)),
            eventMappings: JSON.parse(JSON.stringify(DEFAULT_EVENT_MAPPINGS)),
            gameEventQueue: [],
            gameEventsHistory: [],
            robloxHeartbeat: { lastHeartbeat: null, isOnline: false, placeId: null, jobId: null },
            customMusic: [],
            customDances: JSON.parse(JSON.stringify(VERIFIED_DANCE_LIBRARY)),
            lastDanceVerification: {
                playerId: null,
                robloxUsername: null,
                success: false,
                mode: 'pending',
                danceId: 'rbxassetid://86539981118136',
                danceStyle: 'bounce',
                message: 'Chua nhan xac minh nhan vat dang nhay tu Roblox.',
                verifiedAt: null
            },
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Tenant workspace & Event Engine initialized.', isImportant: true }]
        };
    }
    return tenantConfigs[apiKey];
}

async function seedDatabase() {
    if (!prisma) return;
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log('🌱 Seeding database with default admin creator...');
            const demoApiKey = 'demo-api-key-sg-music';
            const salt = bcrypt.genSaltSync(10);
            const passwordHash = bcrypt.hashSync('admin123', salt);
            
            const admin = await prisma.user.create({
                data: {
                    id: 'usr_demo_1',
                    email: 'admin@sgmusic.com',
                    name: 'S&G Music Official',
                    passwordHash,
                    apiKey: demoApiKey,
                    role: 'ADMIN',
                    planTier: 'PRO'
                }
            });

            await prisma.streamConfig.create({
                data: {
                    userId: admin.id,
                    tiktokUsername: 'sandg.music',
                    activeTheme: 'PHONK',
                    currentMusicId: '',
                    selectedDanceId: 'rbxassetid://86539981118136',
                    overlayTitle: '🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵',
                    overlayColor: '#ff007f',
                    maxQueueSize: 10,
                    danceDuration: 12,
                    isLive: false
                }
            });

            // Seed default mappings
            for (const map of DEFAULT_EVENT_MAPPINGS) {
                await prisma.eventMapping.create({
                    data: {
                        userId: admin.id,
                        name: map.name,
                        description: map.description,
                        enabled: map.enabled,
                        priority: map.priority,
                        triggerType: map.trigger.type,
                        giftId: map.trigger.giftId,
                        giftName: map.trigger.giftName,
                        minRepeatCount: map.trigger.minRepeatCount,
                        minTotalCoins: map.trigger.minTotalCoins,
                        actionsJson: JSON.stringify(map.actions),
                        cooldownMs: map.cooldownMs,
                        queueMode: map.queueMode,
                        stopProcessingAfterMatch: map.stopProcessingAfterMatch
                    }
                });
            }

            // Seed default action definitions
            for (const act of DEFAULT_ACTION_DEFS) {
                await prisma.actionDefinition.create({
                    data: {
                        userId: admin.id,
                        name: act.name,
                        type: act.type,
                        enabled: act.enabled,
                        defaultDelayMs: act.defaultDelayMs,
                        defaultDurationMs: act.defaultDurationMs,
                        parametersJson: JSON.stringify(act.parameters)
                    }
                });
            }
            console.log('✅ Seeding completed!');
        }
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
    }
}

async function loadStore() {
    if (!prisma) return;
    try {
        await seedDatabase();
        
        console.log('🔄 Loading multi-tenant config store from database...');
        const dbUsers = await prisma.user.findMany({
            include: {
                streamConfig: true,
                musicTracks: true,
                danceEmotes: true,
                eventMappings: true,
                actionDefs: true,
                robloxSession: true
            }
        });

        users = dbUsers.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            passwordHash: u.passwordHash,
            apiKey: u.apiKey,
            planTier: u.planTier,
            createdAt: u.createdAt
        }));

        for (const u of dbUsers) {
            const apiKey = u.apiKey;
            const config = u.streamConfig || {};
            const tenant = initTenantConfig(apiKey);

            tenant.tiktokUsername = config.tiktokUsername || 'sandg.music';
            tenant.currentMusicId = config.currentMusicId || '';
            tenant.selectedDanceId = config.selectedDanceId || 'rbxassetid://86539981118136';
            tenant.overlayTitle = config.overlayTitle || '🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵';
            tenant.overlayColor = config.overlayColor || '#ff007f';
            tenant.danceDuration = config.danceDuration || 12;
            tenant.isConnected = config.isLive || false;

            if (u.eventMappings && u.eventMappings.length > 0) {
                tenant.eventMappings = u.eventMappings.map(m => ({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    enabled: m.enabled,
                    priority: m.priority,
                    trigger: {
                        type: m.triggerType,
                        giftId: m.giftId,
                        giftName: m.giftName,
                        minRepeatCount: m.minRepeatCount,
                        minTotalCoins: m.minTotalCoins,
                        userFilter: 'ANY'
                    },
                    actions: JSON.parse(m.actionsJson || '[]'),
                    cooldownMs: m.cooldownMs,
                    queueMode: m.queueMode,
                    stopProcessingAfterMatch: m.stopProcessingAfterMatch
                }));
            }

            if (u.actionDefs && u.actionDefs.length > 0) {
                tenant.actionDefs = u.actionDefs.map(a => ({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    enabled: a.enabled,
                    defaultDelayMs: a.defaultDelayMs,
                    defaultDurationMs: a.defaultDurationMs,
                    parameters: JSON.parse(a.parametersJson || '{}')
                }));
            }

            if (u.musicTracks && u.musicTracks.length > 0) {
                tenant.customMusic = u.musicTracks.map(t => ({
                    id: t.id,
                    name: t.title,
                    musicId: t.soundId,
                    addedAt: t.createdAt
                }));
            }

            if (u.danceEmotes && u.danceEmotes.length > 0) {
                const dbDances = u.danceEmotes.map(d => ({
                    id: d.id,
                    name: d.title,
                    danceId: d.animationId,
                    genre: d.genre,
                    danceStyle: 'bounce',
                    verificationStatus: 'verified',
                    verificationMode: 'asset',
                    addedAt: d.createdAt
                }));
                tenant.customDances = [...VERIFIED_DANCE_LIBRARY, ...dbDances];
            }
        }
        console.log(`✅ Loaded ${dbUsers.length} tenants configuration workspaces from DB.`);
    } catch (err) {
        console.error('❌ Error loading store from DB:', err.message);
    }
}

// Database Persistence Sync Helpers
async function saveStreamConfig(apiKey) {
    if (!prisma) return;
    const tenant = tenantConfigs[apiKey];
    const user = users.find(u => u.apiKey === apiKey);
    if (!tenant || !user) return;
    try {
        await prisma.streamConfig.upsert({
            where: { userId: user.id },
            update: {
                tiktokUsername: tenant.tiktokUsername,
                currentMusicId: tenant.currentMusicId || '',
                selectedDanceId: tenant.selectedDanceId || '',
                overlayTitle: tenant.overlayTitle || '',
                overlayColor: tenant.overlayColor || '',
                danceDuration: tenant.danceDuration || 12,
                isLive: tenant.isConnected || false
            },
            create: {
                userId: user.id,
                tiktokUsername: tenant.tiktokUsername,
                currentMusicId: tenant.currentMusicId || '',
                selectedDanceId: tenant.selectedDanceId || '',
                overlayTitle: tenant.overlayTitle || '',
                overlayColor: tenant.overlayColor || '',
                danceDuration: tenant.danceDuration || 12,
                isLive: tenant.isConnected || false
            }
        });
    } catch (err) {
        console.error('[DB Sync] StreamConfig error:', err.message);
    }
}

async function saveEventMappings(apiKey) {
    if (!prisma) return;
    const tenant = tenantConfigs[apiKey];
    const user = users.find(u => u.apiKey === apiKey);
    if (!tenant || !user) return;
    try {
        // Simple transaction: clear and recreate
        await prisma.$transaction([
            prisma.eventMapping.deleteMany({ where: { userId: user.id } }),
            ...tenant.eventMappings.map(map => prisma.eventMapping.create({
                data: {
                    id: map.id.startsWith('map_') && map.id.length > 10 ? map.id : undefined,
                    userId: user.id,
                    name: map.name,
                    description: map.description || '',
                    enabled: map.enabled || true,
                    priority: map.priority || 10,
                    triggerType: map.trigger?.type || 'TIKTOK_GIFT',
                    giftId: map.trigger?.giftId || '',
                    giftName: map.trigger?.giftName || '',
                    minRepeatCount: map.trigger?.minRepeatCount || 1,
                    minTotalCoins: map.trigger?.minTotalCoins || 0,
                    actionsJson: JSON.stringify(map.actions || []),
                    cooldownMs: map.cooldownMs || 500,
                    queueMode: map.queueMode || 'QUEUE',
                    stopProcessingAfterMatch: map.stopProcessingAfterMatch || true
                }
            }))
        ]);
    } catch (err) {
        console.error('[DB Sync] EventMappings error:', err.message);
    }
}

async function saveActionDefinitions(apiKey) {
    if (!prisma) return;
    const tenant = tenantConfigs[apiKey];
    const user = users.find(u => u.apiKey === apiKey);
    if (!tenant || !user) return;
    try {
        await prisma.$transaction([
            prisma.actionDefinition.deleteMany({ where: { userId: user.id } }),
            ...tenant.actionDefs.map(act => prisma.actionDefinition.create({
                data: {
                    id: act.id.startsWith('act_') && act.id.length > 10 ? act.id : undefined,
                    userId: user.id,
                    name: act.name,
                    type: act.type,
                    enabled: act.enabled || true,
                    defaultDelayMs: act.defaultDelayMs || 0,
                    defaultDurationMs: act.defaultDurationMs || 5000,
                    parametersJson: JSON.stringify(act.parameters || {})
                }
            }))
        ]);
    } catch (err) {
        console.error('[DB Sync] ActionDefinitions error:', err.message);
    }
}

async function saveMusicLibrary(apiKey) {
    if (!prisma) return;
    const tenant = tenantConfigs[apiKey];
    const user = users.find(u => u.apiKey === apiKey);
    if (!tenant || !user) return;
    try {
        await prisma.$transaction([
            prisma.musicTrack.deleteMany({ where: { userId: user.id } }),
            ...tenant.customMusic.map(track => prisma.musicTrack.create({
                data: {
                    id: track.id.length > 10 ? track.id : undefined,
                    userId: user.id,
                    title: track.name,
                    soundId: track.musicId,
                    genre: 'PHONK',
                    isPublic: false
                }
            }))
        ]);
    } catch (err) {
        console.error('[DB Sync] MusicLibrary error:', err.message);
    }
}

async function saveDanceLibrary(apiKey) {
    if (!prisma) return;
    const tenant = tenantConfigs[apiKey];
    const user = users.find(u => u.apiKey === apiKey);
    if (!tenant || !user) return;
    try {
        // Exclude system default dances
        const customDances = tenant.customDances.filter(d => !VERIFIED_DANCE_LIBRARY.some(v => v.id === d.id));
        await prisma.$transaction([
            prisma.danceAnimation.deleteMany({ where: { userId: user.id } }),
            ...customDances.map(dance => prisma.danceAnimation.create({
                data: {
                    id: dance.id.length > 10 ? dance.id : undefined,
                    userId: user.id,
                    title: dance.name,
                    animationId: dance.danceId || '',
                    genre: dance.genre || 'PHONK',
                    isPublic: false
                }
            }))
        ]);
    } catch (err) {
        console.error('[DB Sync] DanceLibrary error:', err.message);
    }
}

function findUserByEmail(email) { return users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
function findUserByApiKey(apiKey) { return users.find(u => u.apiKey === apiKey); }
function findUserById(id) { return users.find(u => u.id === id); }

async function createUser(name, email, password, planTier = 'PRO') {
    const existing = findUserByEmail(email);
    if (existing) throw new Error('Email already registered');
    
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const apiKey = 'sk_live_' + crypto.randomBytes(16).toString('hex');
    const id = 'usr_' + Date.now().toString(36);
    
    // Save to DB
    const dbUser = await prisma.user.create({
        data: {
            id,
            email: email.toLowerCase(),
            name,
            passwordHash,
            apiKey,
            role: 'CREATOR',
            planTier
        }
    });

    // Initialize StreamConfig in DB
    await prisma.streamConfig.create({
        data: {
            userId: dbUser.id,
            tiktokUsername: 'sandg.music',
            activeTheme: 'PHONK',
            currentMusicId: '',
            selectedDanceId: 'rbxassetid://86539981118136',
            overlayTitle: '🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵',
            overlayColor: '#ff007f',
            maxQueueSize: 10,
            danceDuration: 12,
            isLive: false
        }
    });

    const newUser = { 
        id: dbUser.id, 
        email: dbUser.email, 
        name: dbUser.name, 
        passwordHash: dbUser.passwordHash, 
        apiKey: dbUser.apiKey, 
        planTier: dbUser.planTier, 
        createdAt: dbUser.createdAt 
    };

    users.push(newUser);
    initTenantConfig(apiKey);
    return newUser;
}

function getTenant(apiKey) { return initTenantConfig(apiKey); }

function addTenantLog(apiKey, message, isImportant = false) {
    const tenant = getTenant(apiKey);
    const logItem = { timestamp: new Date().toLocaleTimeString(), message, isImportant };
    tenant.logs.push(logItem);
    if (tenant.logs.length > 150) tenant.logs.shift();
    console.log(`[TenantLog - ${apiKey.substring(0, 10)}] ${message}`);

    if (tenant.currentSessionId && prisma) {
        prisma.streamLog.create({
            data: {
                sessionId: tenant.currentSessionId,
                level: isImportant ? 'IMPORTANT' : 'INFO',
                message
            }
        }).catch(err => console.warn('[Log DB Error]', err.message));
    }
}

function saveStore() {
    // Legacy support: store is automatically saved via DB transactions, keeping it for backward compatibility
}

// Bootstrap load
loadStore();

module.exports = {
    DEFAULT_THEMES, TIKTOK_GIFTS, DEFAULT_COIN_MILESTONES,
    DEFAULT_ACTION_DEFS, DEFAULT_EVENT_MAPPINGS, VERIFIED_DANCE_LIBRARY, VERIFIED_DANCE_IDS,
    users, findUserByEmail, findUserByApiKey, findUserById,
    createUser, getTenant, addTenantLog, saveStore,
    saveStreamConfig, saveEventMappings, saveActionDefinitions, saveMusicLibrary, saveDanceLibrary
};
