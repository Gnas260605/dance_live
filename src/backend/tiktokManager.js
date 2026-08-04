// tiktokManager.js
const { WebcastPushConnection } = require('tiktok-live-connector');
const { getTenant, addTenantLog, TIKTOK_GIFTS } = require('./store');

const activeConnections = new Map();
const userCooldowns = new Map();
const COOLDOWN_MS = 15000;

function extractRobloxUsername(text) {
    if (!text) return null;
    const danceCmdMatch = text.match(/!dance\s+([a-zA-Z0-9_]{3,20})/i);
    if (danceCmdMatch) return danceCmdMatch[1];
    const standaloneMatch = text.trim().match(/^([a-zA-Z0-9_]{3,20})$/);
    if (standaloneMatch) return standaloneMatch[1];
    return null;
}

async function validateRobloxUsername(username) {
    try {
        const res = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
        });
        const data = await res.json();
        if (data && data.data && data.data.length > 0) return data.data[0];
    } catch (err) {
        console.error('[RobloxAPI] Validation error:', err.message);
    }
    return { name: username };
}

// Resolve music from coin milestones (Tikfanny-style)
// Returns the musicId of the highest milestone whose minCoins <= coins
function resolveMusicByCoins(tenant, coins) {
    if (!coins || isNaN(coins) || coins <= 0) return null;
    const milestones = tenant.coinMilestones || [];
    // Sort descending by minCoins, pick first match
    const sorted = [...milestones].sort((a, b) => b.minCoins - a.minCoins);
    const match = sorted.find(m => coins >= m.minCoins);
    return match ? match.musicId : null;
}

async function processNewCommentForTenant(apiKey, tiktokUsername, commentText, isVIP = false, giftDetails = null) {
    const tenant = getTenant(apiKey);
    const rawUsername = extractRobloxUsername(commentText);
    if (!rawUsername) {
        return { success: false, reason: 'INVALID_SYNTAX', error: 'Cú pháp không hợp lệ. Vui lòng nhập: !dance Username' };
    }

    const now = Date.now();
    const cooldownKey = `${apiKey}_${tiktokUsername}`;

    if (!isVIP && userCooldowns.has(cooldownKey)) {
        const lastTime = userCooldowns.get(cooldownKey);
        if (now - lastTime < COOLDOWN_MS) {
            addTenantLog(apiKey, `[Bỏ qua] @${tiktokUsername} comment quá nhanh (chờ 15s).`);
            return { success: false, reason: 'COOLDOWN', error: `@${tiktokUsername} đang trong thời gian chờ 15 giây.` };
        }
    }

    const robloxAccount = await validateRobloxUsername(rawUsername);
    const verifiedUsername = robloxAccount ? robloxAccount.name : rawUsername;

    const isCurrentlyActive = tenant.activePlayer && tenant.activePlayer.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase();
    const isAlreadyQueued = tenant.playerQueue.some(p => p.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase());

    if (isCurrentlyActive || isAlreadyQueued) {
        addTenantLog(apiKey, `[Bỏ qua] "${verifiedUsername}" đã có trên sân nhảy hoặc trong hàng đợi.`);
        return {
            success: false,
            reason: 'ALREADY_QUEUED',
            error: `"${verifiedUsername}" đã có trên sân nhảy! Nhập tên khác hoặc bấm Next ⏭️`
        };
    }

    userCooldowns.set(cooldownKey, now);

    // Gift → Music: resolve coin value from gift name → find matching milestone
    if (giftDetails && (giftDetails.giftName || giftDetails.coins)) {
        // Lookup coins from catalogue by gift name, or use coins passed directly
        let giftCoins = giftDetails.coins || 0;
        if (!giftCoins && giftDetails.giftName) {
            const catalogueEntry = TIKTOK_GIFTS.find(g =>
                g.name.toLowerCase() === giftDetails.giftName.toLowerCase() ||
                g.id === giftDetails.giftName.toLowerCase().replace(/[^a-z0-9]/g, '_')
            );
            if (catalogueEntry) giftCoins = catalogueEntry.coins;
        }

        const mappedMusicId = resolveMusicByCoins(tenant, giftCoins);
        if (mappedMusicId) {
            tenant.currentMusicId = mappedMusicId;
            const milestone = (tenant.coinMilestones || []).find(m => giftCoins >= m.minCoins && giftCoins <= m.maxCoins);
            const label = milestone ? milestone.label : `${giftCoins} xu`;
            addTenantLog(apiKey,
                `🎁 Quà "${giftDetails.giftName}" (${giftCoins}🪙) → ${label} → 🎵 ${mappedMusicId}`, true
            );
        } else {
            addTenantLog(apiKey, `🎁 Quà "${giftDetails.giftName}" không khớp milestone nào (${giftCoins} xu).`);
        }
    }

    const playerData = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
        robloxUsername: verifiedUsername,
        tiktokUsername: tiktokUsername,
        commentText: commentText,
        animationId: tenant.selectedDanceId || 'rbxassetid://507771019',
        isVIP: isVIP,
        giftDetails: giftDetails,
        timestamp: now
    };

    if (isVIP) {
        tenant.playerQueue.unshift(playerData);
        addTenantLog(apiKey, `🎉 [VIP] @${tiktokUsername} → "${verifiedUsername}" lên VIP Slot #1!`, true);
    } else {
        tenant.playerQueue.push(playerData);
        addTenantLog(apiKey, `💬 Comment: "${commentText}" → Roblox: "${verifiedUsername}" (@${tiktokUsername})`);
    }

    tenant.activePlayer = playerData;
    if (tenant.playerQueue.length > 50) tenant.playerQueue.shift();

    return { success: true, playerData };
}

function connectTikTokForTenant(apiKey, uniqueId) {
    if (!uniqueId) return;
    disconnectTikTokForTenant(apiKey);
    const tenant = getTenant(apiKey);
    tenant.tiktokUsername = uniqueId;
    addTenantLog(apiKey, `Đang kết nối tới TikTok Live: @${uniqueId}...`, true);

    const connection = new WebcastPushConnection(uniqueId, {
        processInitialData: false,
        enableExtendedGiftInfo: true
    });
    activeConnections.set(apiKey, connection);

    connection.connect().then(state => {
        tenant.isConnected = true;
        addTenantLog(apiKey, `🟢 Kết nối thành công tới TikTok Live ID: ${state.roomId}`, true);
    }).catch(err => {
        tenant.isConnected = false;
        addTenantLog(apiKey, `❌ Lỗi kết nối @${uniqueId}: ${err.message}`, true);
    });

    connection.on('chat', data => {
        processNewCommentForTenant(apiKey, data.uniqueId, data.comment);
    });

    connection.on('gift', data => {
        if (data.giftType === 1 && data.repeatEnd === false) return;
        const giftName = data.giftName || 'TikTok Gift';
        const giftCount = data.repeatCount || 1;
        // giftDiamondCount = coin value of ONE gift; total = coins * count
        const singleCoinValue = data.giftDetails?.diamondCount || data.diamondCount || 0;
        const totalCoins = singleCoinValue * giftCount;
        addTenantLog(apiKey, `🎁 @${data.uniqueId} tặng ${giftCount}x ${giftName} (${singleCoinValue}🪙 mỗi quà = ${totalCoins}🪙 tổng)!`, true);
        processNewCommentForTenant(apiKey, data.uniqueId, data.uniqueId, true, {
            giftName,
            giftCount,
            coins: singleCoinValue, // use per-gift coin value for milestone matching
            totalCoins
        });
    });

    connection.on('streamEnd', () => {
        tenant.isConnected = false;
        addTenantLog(apiKey, `Stream TikTok Live đã kết thúc.`, true);
    });

    connection.on('disconnected', () => {
        tenant.isConnected = false;
        addTenantLog(apiKey, `Đã ngắt kết nối khỏi TikTok Live.`, true);
    });
}

function disconnectTikTokForTenant(apiKey) {
    if (activeConnections.has(apiKey)) {
        const conn = activeConnections.get(apiKey);
        try { conn.disconnect(); } catch (e) {}
        activeConnections.delete(apiKey);
    }
    const tenant = getTenant(apiKey);
    tenant.isConnected = false;
    addTenantLog(apiKey, `Đã ngắt kết nối TikTok.`);
}

module.exports = { connectTikTokForTenant, disconnectTikTokForTenant, processNewCommentForTenant };
