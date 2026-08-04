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

function resolveMusicByCoins(tenant, coins) {
    if (!coins || isNaN(coins) || coins <= 0) return null;
    const milestones = tenant.coinMilestones || [];
    const sorted = [...milestones].sort((a, b) => b.minCoins - a.minCoins);
    const match = sorted.find(m => coins >= m.minCoins);
    return match ? match.musicId : null;
}

function renderTemplateVariables(template, context) {
    if (typeof template !== 'string') return template;
    return template
        .replace(/\{tiktokUsername\}/g, context.tiktokUsername || 'Khán giả')
        .replace(/\{nickname\}/g, context.nickname || context.tiktokUsername || 'Khán giả')
        .replace(/\{giftName\}/g, context.giftName || 'Quà')
        .replace(/\{repeatCount\}/g, context.repeatCount || 1)
        .replace(/\{singleCoinValue\}/g, context.singleCoinValue || 0)
        .replace(/\{totalCoins\}/g, context.totalCoins || 0)
        .replace(/\{robloxUsername\}/g, context.robloxUsername || 'Roblox User');
}

/**
 * Core Gift Event Processor according to Section 21 of Spec.
 * Decouples gift actions from comment queue into unique GameEvents with ACK tracking.
 */
function processGiftEventForTenant(apiKey, giftPayload) {
    const tenant = getTenant(apiKey);
    const { giftId, giftName, repeatCount = 1, singleCoinValue = 0, totalCoins = 0, tiktokUsername, nickname } = giftPayload;

    const context = {
        tiktokUsername: tiktokUsername || 'Anonymous',
        nickname: nickname || tiktokUsername || 'Anonymous',
        giftId: giftId || 'gift',
        giftName: giftName || 'TikTok Gift',
        repeatCount,
        singleCoinValue,
        totalCoins
    };

    const activeMappings = (tenant.eventMappings || []).filter(m => m.enabled);
    const sortedMappings = [...activeMappings].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let matchedAnyMapping = false;

    for (const mapping of sortedMappings) {
        const trigger = mapping.trigger || {};
        if (trigger.type !== 'TIKTOK_GIFT') continue;

        // Check Gift ID / Gift Name match
        const idMatch = trigger.giftId && (trigger.giftId.toLowerCase() === (giftId || '').toLowerCase() || trigger.giftId.toLowerCase() === (giftName || '').toLowerCase());
        const nameMatch = trigger.giftName && trigger.giftName.toLowerCase() === (giftName || '').toLowerCase();
        
        if (!idMatch && !nameMatch && trigger.giftId) continue;

        // Check Repeat & Coin thresholds
        if (trigger.minRepeatCount && repeatCount < trigger.minRepeatCount) continue;
        if (trigger.minTotalCoins && totalCoins < trigger.minTotalCoins) continue;

        // Resolve actions for this mapping
        const resolvedActions = [];
        for (const actionRef of (mapping.actions || [])) {
            const actionDef = (tenant.actionDefs || []).find(a => a.id === actionRef.actionId && a.enabled);
            if (!actionDef) continue;

            const parsedParams = typeof actionDef.parameters === 'string' ? JSON.parse(actionDef.parameters) : (actionDef.parameters || {});
            const renderedParams = {};

            for (const [key, val] of Object.entries(parsedParams)) {
                if (typeof val === 'string') {
                    renderedParams[key] = renderTemplateVariables(val, context);
                } else {
                    renderedParams[key] = val;
                }
            }

            resolvedActions.push({
                actionId: actionDef.id,
                name: actionDef.name,
                type: actionDef.type,
                delayMs: actionRef.delayMs || actionDef.defaultDelayMs || 0,
                durationMs: actionRef.durationMs || actionDef.defaultDurationMs || 5000,
                parameters: renderedParams
            });
        }

        if (resolvedActions.length > 0) {
            const gameEvent = {
                eventId: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
                tenantId: apiKey,
                mappingId: mapping.id,
                mappingName: mapping.name,
                eventType: 'gift_effect',
                actions: resolvedActions,
                context: context,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60000).toISOString(), // 60s TTL
                status: 'QUEUED',
                deliveryAttempts: 0
            };

            tenant.gameEventQueue.push(gameEvent);
            tenant.gameEventsHistory.unshift(gameEvent);
            if (tenant.gameEventsHistory.length > 100) tenant.gameEventsHistory.pop();

            addTenantLog(apiKey, `🎯 Event Match: "${mapping.name}" → Tạo GameEvent [${gameEvent.eventId}] (${resolvedActions.length} actions)`, true);
            matchedAnyMapping = true;

            if (mapping.stopProcessingAfterMatch) break;
        }
    }

    // Fallback: Coin Milestone Music Switch if no exact mapping matched or if coin value > 0
    let giftCoins = singleCoinValue || totalCoins;
    if (!giftCoins && giftName) {
        const catalogueEntry = TIKTOK_GIFTS.find(g =>
            g.name.toLowerCase() === giftName.toLowerCase() ||
            g.id === giftName.toLowerCase().replace(/[^a-z0-9]/g, '_')
        );
        if (catalogueEntry) giftCoins = catalogueEntry.coins;
    }

    if (giftCoins > 0) {
        const mappedMusicId = resolveMusicByCoins(tenant, giftCoins);
        if (mappedMusicId) {
            tenant.currentMusicId = mappedMusicId;
            const milestone = (tenant.coinMilestones || []).find(m => giftCoins >= m.minCoins && giftCoins <= m.maxCoins);
            const label = milestone ? milestone.label : `${giftCoins} xu`;
            addTenantLog(apiKey, `🎵 Quà "${giftName}" (${giftCoins}🪙) → Milestone: ${label} → 🎵 ${mappedMusicId}`, true);
        }
    }

    return { matchedAnyMapping, queueLength: tenant.gameEventQueue.length };
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
        if (data.giftType === 1 && data.repeatEnd === false) return; // Streak packet intermediate skip
        const giftName = data.giftName || 'TikTok Gift';
        const giftId = (data.giftId || giftName).toString().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const giftCount = data.repeatCount || 1;
        const singleCoinValue = data.giftDetails?.diamondCount || data.diamondCount || 0;
        const totalCoins = singleCoinValue * giftCount;

        addTenantLog(apiKey, `🎁 @${data.uniqueId} tặng ${giftCount}x ${giftName} (${totalCoins}🪙)!`, true);

        processGiftEventForTenant(apiKey, {
            giftId,
            giftName,
            repeatCount: giftCount,
            singleCoinValue,
            totalCoins,
            tiktokUsername: data.uniqueId,
            nickname: data.nickname || data.uniqueId
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

module.exports = {
    connectTikTokForTenant,
    disconnectTikTokForTenant,
    processNewCommentForTenant,
    processGiftEventForTenant
};
