// store.js
// Production Multi-Tenant Data Store with persistent JSON storage
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '../../data/store.json');

const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let users = [];
let tenantConfigs = {};

const DEFAULT_THEMES = {
    PHONK: {
        name: "⚡ Phonk",
        music: ["rbxassetid://1847648398"],
        dances: ["rbxassetid://507771019"]
    },
    KPOP: {
        name: "🔥 K-Pop",
        music: ["rbxassetid://1837879082"],
        dances: ["rbxassetid://507771959"]
    }
};

// Full TikTok Live Gift Catalogue with coin values and categories
const TIKTOK_GIFTS = [
    // Tier 1 - Free/Very Small (1-9 coins)
    { id: 'rose',           name: 'Rose',            emoji: '🌹', coins: 1,      category: 'tier1' },
    { id: 'heart',          name: 'Finger Heart',    emoji: '🤞', coins: 1,      category: 'tier1' },
    { id: 'rainbow_puke',   name: 'Rainbow Puke',    emoji: '🌈', coins: 1,      category: 'tier1' },
    { id: 'like',           name: 'TikTok Like',     emoji: '👍', coins: 1,      category: 'tier1' },
    { id: 'sunglasses',     name: 'Sunglasses',      emoji: '😎', coins: 1,      category: 'tier1' },
    { id: 'hat',            name: 'Cowboy Hat',      emoji: '🤠', coins: 1,      category: 'tier1' },
    { id: 'bell',           name: 'Bell',            emoji: '🔔', coins: 1,      category: 'tier1' },
    { id: 'chocolate',      name: 'Chocolate',       emoji: '🍫', coins: 5,      category: 'tier1' },
    { id: 'hands',          name: 'Two Clapping',    emoji: '👏', coins: 5,      category: 'tier1' },

    // Tier 2 - Small (10-99 coins)
    { id: 'donut',          name: 'Donut',           emoji: '🍩', coins: 30,     category: 'tier2' },
    { id: 'ice_cream',      name: 'Ice Cream',       emoji: '🍦', coins: 30,     category: 'tier2' },
    { id: 'lollipop',       name: 'Lollipop',        emoji: '🍭', coins: 30,     category: 'tier2' },
    { id: 'perfume',        name: 'Perfume',         emoji: '🌸', coins: 35,     category: 'tier2' },
    { id: 'cap',            name: 'TikTok Cap',      emoji: '🧢', coins: 49,     category: 'tier2' },
    { id: 'mic',            name: 'Mic',             emoji: '🎤', coins: 50,     category: 'tier2' },
    { id: 'soccer',         name: 'Soccer Ball',     emoji: '⚽', coins: 55,     category: 'tier2' },
    { id: 'hand_heart',     name: 'Hand Heart',      emoji: '🫶', coins: 55,     category: 'tier2' },
    { id: 'balloon',        name: 'Balloon',         emoji: '🎈', coins: 65,     category: 'tier2' },
    { id: 'cake',           name: 'Birthday Cake',   emoji: '🎂', coins: 69,     category: 'tier2' },
    { id: 'paper_crane',    name: 'Paper Crane',     emoji: '🕊️', coins: 99,     category: 'tier2' },

    // Tier 3 - Medium (100-499 coins)
    { id: 'friendship',     name: 'Friendship',      emoji: '🤝', coins: 100,    category: 'tier3' },
    { id: 'concert',        name: 'Concert',         emoji: '🎸', coins: 100,    category: 'tier3' },
    { id: 'planet',         name: 'Planet',          emoji: '🪐', coins: 100,    category: 'tier3' },
    { id: 'elephant',       name: 'Elephant',        emoji: '🐘', coins: 100,    category: 'tier3' },
    { id: 'cheer',          name: 'Cheer',           emoji: '🥂', coins: 150,    category: 'tier3' },
    { id: 'crown',          name: 'Crown',           emoji: '👑', coins: 200,    category: 'tier3' },
    { id: 'gem',            name: 'Gem',             emoji: '💎', coins: 200,    category: 'tier3' },
    { id: 'boxing',         name: 'Boxing Gloves',   emoji: '🥊', coins: 200,    category: 'tier3' },
    { id: 'dj_decks',       name: 'DJ Decks',        emoji: '🎧', coins: 200,    category: 'tier3' },
    { id: 'star_meteor',    name: 'Shooting Star',   emoji: '🌠', coins: 299,    category: 'tier3' },
    { id: 'diamond',        name: 'Diamond',         emoji: '💍', coins: 399,    category: 'tier3' },
    { id: 'thunder',        name: 'Thunder',         emoji: '⚡', coins: 400,    category: 'tier3' },
    { id: 'football',       name: 'Football',        emoji: '🏈', coins: 499,    category: 'tier3' },

    // Tier 4 - Big (500-1999 coins)
    { id: 'galaxy',         name: 'Galaxy',          emoji: '🌌', coins: 500,    category: 'tier4' },
    { id: 'fire',           name: 'Fire',            emoji: '🔥', coins: 500,    category: 'tier4' },
    { id: 'transformer',    name: 'Transformer',     emoji: '🤖', coins: 500,    category: 'tier4' },
    { id: 'eagle',          name: 'Eagle',           emoji: '🦅', coins: 500,    category: 'tier4' },
    { id: 'rainbow',        name: 'Rainbow',         emoji: '🌈', coins: 699,    category: 'tier4' },
    { id: 'tiger',          name: 'Tiger',           emoji: '🐯', coins: 999,    category: 'tier4' },
    { id: 'buffalo',        name: 'Buffalo',         emoji: '🐃', coins: 999,    category: 'tier4' },
    { id: 'gorilla',        name: 'Gorilla',         emoji: '🦍', coins: 1000,   category: 'tier4' },
    { id: 'castle',         name: 'Castle',          emoji: '🏰', coins: 1000,   category: 'tier4' },
    { id: 'sports_car',     name: 'Sports Car',      emoji: '🏎️', coins: 1000,   category: 'tier4' },
    { id: 'jet',            name: 'Jet',             emoji: '✈️', coins: 1000,   category: 'tier4' },
    { id: 'moon_crystal',   name: 'Moon Crystal',    emoji: '🌙', coins: 1500,   category: 'tier4' },
    { id: 'boxing_king',    name: 'Boxing King',     emoji: '🥇', coins: 1999,   category: 'tier4' },

    // Tier 5 - VIP Boss (2000+ coins)
    { id: 'rose_bouquet',   name: 'Rose Bouquet',    emoji: '💐', coins: 2000,   category: 'tier5' },
    { id: 'cruise',         name: 'Cruise Ship',     emoji: '🚢', coins: 2999,   category: 'tier5' },
    { id: 'dragon',         name: 'Dragon',          emoji: '🐉', coins: 3000,   category: 'tier5' },
    { id: 'lion',           name: 'Lion',            emoji: '🦁', coins: 3000,   category: 'tier5' },
    { id: 'rocket',         name: 'Rocket',          emoji: '🚀', coins: 5000,   category: 'tier5' },
    { id: 'phoenix',        name: 'Phoenix',         emoji: '🦅', coins: 5000,   category: 'tier5' },
    { id: 'universe',       name: 'Universe',        emoji: '🌌', coins: 10000,  category: 'tier5' },
    { id: 'tiktok_universe',name: 'TikTok Universe', emoji: '💫', coins: 10000,  category: 'tier5' },
    { id: 'lion_king',      name: 'Lion King',       emoji: '🦁', coins: 15000,  category: 'tier5' },
    { id: 'spaceship',      name: 'Spaceship',       emoji: '🛸', coins: 20000,  category: 'tier5' },
];

// =========================================================
// COIN MILESTONE → MUSIC MAP (Tikfanny-style)
// Each milestone fires when gift.coins >= minCoins.
// The highest matching milestone wins.
// =========================================================
const DEFAULT_COIN_MILESTONES = [
    {
        id: 'milestone_1',
        label: '🌸 Nhỏ xinh',
        description: 'Quà 1–9 xu (Rose, Heart, Bell…)',
        minCoins: 1,
        maxCoins: 9,
        emoji: '🌸',
        color: '#9ca3af',
        musicId: 'rbxassetid://1837879082',
        musicName: 'K-Pop Chill',
    },
    {
        id: 'milestone_2',
        label: '💙 Dễ thương',
        description: 'Quà 10–99 xu (Donut, Mic, Cake…)',
        minCoins: 10,
        maxCoins: 99,
        emoji: '💙',
        color: '#60a5fa',
        musicId: 'rbxassetid://9043887091',
        musicName: 'EDM Festival',
    },
    {
        id: 'milestone_3',
        label: '💜 Sang chảnh',
        description: 'Quà 100–499 xu (Crown, Diamond, Thunder…)',
        minCoins: 100,
        maxCoins: 499,
        emoji: '💜',
        color: '#a78bfa',
        musicId: 'rbxassetid://1847648398',
        musicName: 'Phonk Bass',
    },
    {
        id: 'milestone_4',
        label: '⭐ Khủng',
        description: 'Quà 500–1999 xu (Tiger, Dragon, Jet…)',
        minCoins: 500,
        maxCoins: 1999,
        emoji: '⭐',
        color: '#f59e0b',
        musicId: 'rbxassetid://1847648398',
        musicName: 'Boss Phonk Drop',
    },
    {
        id: 'milestone_5',
        label: '🔥 VIP Boss',
        description: 'Quà 2000–9999 xu (Cruise, Dragon, Lion…)',
        minCoins: 2000,
        maxCoins: 9999,
        emoji: '🔥',
        color: '#ff007f',
        musicId: 'rbxassetid://1837879082',
        musicName: 'VIP Hype Track',
    },
    {
        id: 'milestone_6',
        label: '💎 Legendary',
        description: 'Quà 10000+ xu (Universe, Lion King, Spaceship…)',
        minCoins: 10000,
        maxCoins: Infinity,
        emoji: '💎',
        color: '#00f2fe',
        musicId: 'rbxassetid://1847648398',
        musicName: 'Legendary Anthem',
    },
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
            currentMusicId: 'rbxassetid://1847648398',
            selectedDanceId: 'rbxassetid://507771019',
            overlayTitle: '🎵 S&G MUSIC - ROBLOX TIKTOK DANCE LIVE 🎵',
            overlayColor: '#ff007f',
            danceDuration: 12,
            // Tikfanny-style: coin milestones (customizable per tenant)
            coinMilestones: DEFAULT_COIN_MILESTONES.map(m => ({ ...m })),
            customMusic: [],
            customDances: [],
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Tenant workspace initialized.', isImportant: true }]
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
    users, findUserByEmail, findUserByApiKey, findUserById,
    createUser, getTenant, addTenantLog, saveStore
};
