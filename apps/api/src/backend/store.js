// store.js
// Production Multi-Tenant Data Store with persistent JSON storage
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '../../../../data/store.json');

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

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

// Official TikTok Live Gift Catalogue with exact Coin values
const TIKTOK_GIFTS = [
    // Tier 1 - Very Small (1-9 xu)
    { id: 'rose',           name: 'Rose',            emoji: '🌹', coins: 1,      category: 'tier1' },
    { id: 'like',           name: 'TikTok Like',     emoji: '👍', coins: 1,      category: 'tier1' },
    { id: 'ice_cream',      name: 'Ice Cream',       emoji: '🍦', coins: 1,      category: 'tier1' },
    { id: 'sunglasses',     name: 'Sunglasses',      emoji: '😎', coins: 1,      category: 'tier1' },
    { id: 'hat',            name: 'Cowboy Hat',      emoji: '🤠', coins: 1,      category: 'tier1' },
    { id: 'bell',           name: 'Bell',            emoji: '🔔', coins: 1,      category: 'tier1' },
    { id: 'heart',          name: 'Finger Heart',    emoji: '🤞', coins: 5,      category: 'tier1' },
    { id: 'chocolate',      name: 'Chocolate',       emoji: '🍫', coins: 5,      category: 'tier1' },
    { id: 'hands',          name: 'Two Clapping',    emoji: '👏', coins: 5,      category: 'tier1' },

    // Tier 2 - Small (10-99 xu)
    { id: 'lollipop',       name: 'Lollipop',        emoji: '🍭', coins: 10,     category: 'tier2' },
    { id: 'perfume',        name: 'Perfume',         emoji: '🌸', coins: 20,     category: 'tier2' },
    { id: 'donut',          name: 'Donut',           emoji: '🍩', coins: 30,     category: 'tier2' },
    { id: 'mic',            name: 'Mic',             emoji: '🎤', coins: 50,     category: 'tier2' },
    { id: 'balloon',        name: 'Balloon',         emoji: '🎈', coins: 65,     category: 'tier2' },
    { id: 'cake',           name: 'Birthday Cake',   emoji: '🎂', coins: 69,     category: 'tier2' },
    { id: 'paper_crane',    name: 'Paper Crane',     emoji: '🕊️', coins: 99,     category: 'tier2' },
    { id: 'cap',            name: 'TikTok Cap',      emoji: '🧢', coins: 99,     category: 'tier2' },

    // Tier 3 - Medium (100-999 xu)
    { id: 'hand_heart',     name: 'Hand Heart',      emoji: '🫶', coins: 100,    category: 'tier3' },
    { id: 'friendship',     name: 'Friendship',      emoji: '🤝', coins: 100,    category: 'tier3' },
    { id: 'gem',            name: 'Gem',             emoji: '💎', coins: 200,    category: 'tier3' },
    { id: 'boxing',         name: 'Boxing Gloves',   emoji: '🥊', coins: 200,    category: 'tier3' },
    { id: 'star_meteor',    name: 'Shooting Star',   emoji: '🌠', coins: 299,    category: 'tier3' },
    { id: 'diamond',        name: 'Diamond',         emoji: '💍', coins: 300,    category: 'tier3' },
    { id: 'thunder',        name: 'Thunder',         emoji: '⚡', coins: 400,    category: 'tier3' },
    { id: 'concert',        name: 'Concert',         emoji: '🎸', coins: 500,    category: 'tier3' },
    { id: 'fire',           name: 'Fire',            emoji: '🔥', coins: 500,    category: 'tier3' },

    // Tier 4 - Big (1000-9999 xu)
    { id: 'galaxy',         name: 'Galaxy',          emoji: '🌌', coins: 1000,   category: 'tier4' },
    { id: 'fireworks',      name: 'Fireworks',       emoji: '🎆', coins: 1088,   category: 'tier4' },
    { id: 'crown',          name: 'Crown',           emoji: '👑', coins: 1500,   category: 'tier4' },
    { id: 'submarine',      name: 'Submarine',       emoji: '⚓', coins: 5199,   category: 'tier4' },
    { id: 'sports_car',     name: 'Sports Car',      emoji: '🏎️', coins: 7000,   category: 'tier4' },

    // Tier 5 - VIP / Boss (10000+ xu)
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

// Pre-seeded Action Definitions
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

// Pre-seeded Event Mappings
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

function loadStore() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(raw);
            users = data.users || [];
        }
    } catch (err) {
        console.error('[Store] Error loading data:', err.message);
    }

    if (users.length === 0) {
        const demoApiKey = 'demo-api-key-sg-music';
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync('admin123', salt);
        users.push({
            id: 'usr_demo_1',
            email: 'admin@sgmusic.com',
            name: 'S&G Music Official',
            passwordHash,
            apiKey: demoApiKey,
            planTier: 'PRO',
            createdAt: new Date().toISOString()
        });
        saveStore();
    }

    users.forEach(user => initTenantConfig(user.apiKey));
}

function saveStore() {
    try {
        const data = {
            users: users.map(u => ({
                id: u.id, email: u.email, name: u.name,
                passwordHash: u.passwordHash, apiKey: u.apiKey,
                planTier: u.planTier, createdAt: u.createdAt
            }))
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Store] Error saving store:', err.message);
    }
}

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
    const newUser = { id, email: email.toLowerCase(), name, passwordHash, apiKey, planTier, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveStore();
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
}

loadStore();

module.exports = {
    DEFAULT_THEMES, TIKTOK_GIFTS, DEFAULT_COIN_MILESTONES,
    DEFAULT_ACTION_DEFS, DEFAULT_EVENT_MAPPINGS, VERIFIED_DANCE_LIBRARY, VERIFIED_DANCE_IDS,
    users, findUserByEmail, findUserByApiKey, findUserById,
    createUser, getTenant, addTenantLog, saveStore
};
