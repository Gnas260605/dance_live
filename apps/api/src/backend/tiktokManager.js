// tiktokManager.js
const { WebcastPushConnection } = require('tiktok-live-connector');
const { getTenant, addTenantLog, TIKTOK_GIFTS } = require('./store');
const prisma = require('./db');
const crypto = require('crypto');

const activeConnections = new Map();
const userCooldowns = new Map();
const COOLDOWN_MS = 2000;

const processedEvents = new Set();
function checkAndRegisterEvent(apiKey, eventId) {
    const key = `${apiKey}_${eventId}`;
    if (processedEvents.has(key)) {
        return true;
    }
    processedEvents.add(key);
    if (processedEvents.size > 2000) {
        const firstKey = processedEvents.values().next().value;
        processedEvents.delete(firstKey);
    }
    return false;
}

function markTikTokState(tenant, state, extra = {}) {
    tenant.tiktokConnectionState = state;
    Object.assign(tenant, extra);
}


function extractRobloxUsername(text) {
    if (!text || typeof text !== 'string') return null;
    let cleanText = text.trim();

    // 1. Colon-based patterns: if there is a colon, extract the first valid username after it
    if (cleanText.includes(':')) {
        const parts = cleanText.split(':');
        const afterColon = parts[parts.length - 1].trim();
        const match = afterColon.match(/@?([a-zA-Z0-9_]{3,20})/);
        if (match) {
            const username = match[1];
            const commonWords = [
                'hello', 'xinchao', 'chao', 'hi', 'like', 'follow', 'share', 'dance', 
                'nhay', 'nhảy', 'sub', 'gift', 'vip', 'ad', 'admin', 'hay', 'dep', 
                'đẹp', 'qua', 'quá', 'ok', 'oke', 'tui', 'cho', 'nha', 'di', 'đi', 
                'lam', 'làm', 'ghe', 'ghê', 'voi', 'với', 'minh', 'mình', 'em', 'anh',
                'roblox', 'rbx', 'acc', 'nick', 'user', 'username'
            ];
            if (!commonWords.includes(username.toLowerCase())) {
                return username;
            }
        }
    }

    // 2. Tokenize the text into words (removing punctuation)
    const words = cleanText.split(/[\s,!?.\/\\#\-\+]+/);
    
    const keywords = [
        'dance', 'nhay', 'nhảy', 'play', 'join', 'spawn', 'ten', 'tên', 'nick', 
        'acc', 'roblox', 'rbx', 'user', 'username'
    ];
    
    const commonWords = [
        'hello', 'xinchao', 'chao', 'hi', 'like', 'follow', 'share', 'dance', 
        'nhay', 'nhảy', 'sub', 'gift', 'vip', 'ad', 'admin', 'hay', 'dep', 
        'đẹp', 'qua', 'quá', 'ok', 'oke', 'tui', 'cho', 'nha', 'di', 'đi', 
        'lam', 'làm', 'ghe', 'ghê', 'voi', 'với', 'minh', 'mình', 'em', 'anh',
        'la', 'là', 'của', 'cua', 'cai', 'cái', 'nay', 'này', 'va', 'và', 'co', 'có'
    ];

    // Find all alphanumeric words that match Roblox username requirements
    const candidates = [];
    for (let word of words) {
        if (word.startsWith('@')) {
            word = word.substring(1);
        }
        
        if (/^[a-zA-Z0-9_]{3,20}$/.test(word)) {
            const lowerWord = word.toLowerCase();
            if (!commonWords.includes(lowerWord) && !keywords.includes(lowerWord)) {
                candidates.push(word);
            }
        }
    }

    // If we found candidates, the username is usually the last one (since Vietnamese sentences place it at the end)
    if (candidates.length > 0) {
        return candidates[candidates.length - 1];
    }

    // Fallback: If no candidate found but there is a command match
    const cmdMatch = cleanText.match(/(?:!|\/)?(?:dance|nhay|nhảy|play|join|spawn|ten|tên|nick|acc|roblox|rbx)\s+@?([a-zA-Z0-9_]{3,20})/i);
    if (cmdMatch) {
        const username = cmdMatch[1];
        if (!keywords.includes(username.toLowerCase())) {
            return username;
        }
    }

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
        if (data && data.data && data.data.length > 0) {
            return data.data[0];
        } else {
            return null; // Successfully verified that the user DOES NOT exist
        }
    } catch (err) {
        console.error('[RobloxAPI] Validation error:', err.message);
        return { name: username, networkError: true }; // Network/API error, fallback to raw name
    }
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
/**
 * Pure rules evaluator following Phase 3 requirements.
 * Evaluates trigger constraints and maps event to action plan.
 */
function evaluateRules(normalizedEvent, eventMappings, actionDefs) {
    const resolvedActions = [];
    const matchedMappings = [];
    const { giftId, giftName, repeatCount = 1, totalCoins = 0 } = normalizedEvent;

    const context = {
        tiktokUsername: normalizedEvent.viewerUsername || 'Anonymous',
        nickname: normalizedEvent.viewerNickname || normalizedEvent.viewerUsername || 'Anonymous',
        giftId: giftId || 'gift',
        giftName: giftName || 'TikTok Gift',
        repeatCount,
        singleCoinValue: normalizedEvent.singleCoinValue || 0,
        totalCoins
    };

    const sortedMappings = [...eventMappings]
        .filter(m => m.enabled)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const mapping of sortedMappings) {
        const trigger = mapping.trigger || {};
        if (trigger.type !== 'TIKTOK_GIFT') continue;

        const idMatch = trigger.giftId && (
            trigger.giftId.toLowerCase() === (giftId || '').toLowerCase() || 
            trigger.giftId.toLowerCase() === (giftName || '').toLowerCase()
        );
        const nameMatch = trigger.giftName && trigger.giftName.toLowerCase() === (giftName || '').toLowerCase();

        if (!idMatch && !nameMatch && trigger.giftId) continue;

        if (trigger.minRepeatCount && repeatCount < trigger.minRepeatCount) continue;
        if (trigger.minTotalCoins && totalCoins < trigger.minTotalCoins) continue;

        const mappingActions = [];
        for (const actionRef of (mapping.actions || [])) {
            const actionDef = actionDefs.find(a => a.id === actionRef.actionId && a.enabled);
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

            mappingActions.push({
                actionId: actionDef.id,
                name: actionDef.name,
                type: actionDef.type,
                delayMs: actionRef.delayMs || actionDef.defaultDelayMs || 0,
                durationMs: actionRef.durationMs || actionDef.defaultDurationMs || 5000,
                parameters: renderedParams
            });
        }

        if (mappingActions.length > 0) {
            resolvedActions.push(...mappingActions);
            matchedMappings.push(mapping);
            if (mapping.stopProcessingAfterMatch) {
                break;
            }
        }
    }

    return { resolvedActions, matchedMappings, context };
}

/**
 * Core Gift Event Processor.
 * Ingests events, checks deduplication, evaluates rules, and records persistent GameEvents in the DB.
 */
function processGiftEventForTenant(apiKey, giftPayload, sourceEventId = null) {
    const tenant = getTenant(apiKey);
    const { giftId, giftName, repeatCount = 1, singleCoinValue = 0, totalCoins = 0, tiktokUsername, nickname } = giftPayload;

    const dedupeId = sourceEventId || `${tiktokUsername}_gift_${giftId}_${repeatCount}_${Date.now()}`;
    if (checkAndRegisterEvent(apiKey, dedupeId)) {
        addTenantLog(apiKey, `⚠️ [Deduplicate] Bỏ qua quà tặng trùng lặp: ${giftName} x${repeatCount} từ @${tiktokUsername}`);
        return { matchedAnyMapping: false, duplicate: true };
    }

    const normalizedEvent = {
        source: 'tiktok_live',
        sourceEventId: dedupeId,
        eventType: 'TIKTOK_GIFT',
        viewerUsername: tiktokUsername,
        viewerNickname: nickname,
        giftId,
        giftName,
        repeatCount,
        singleCoinValue,
        totalCoins,
        timestamp: new Date()
    };

    const { resolvedActions, matchedMappings, context } = evaluateRules(
        normalizedEvent,
        tenant.eventMappings || [],
        tenant.actionDefs || []
    );

    let matchedAnyMapping = false;

    if (resolvedActions.length > 0) {
        matchedAnyMapping = true;
        const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');
        
        // Find user model to get database userId
        const { findUserByApiKey } = require('./store');
        const user = findUserByApiKey(apiKey);
        
        if (prisma && user) {
            prisma.gameEvent.create({
                data: {
                    eventId,
                    userId: user.id,
                    mappingId: matchedMappings[0]?.id || null,
                    eventType: 'gift_effect',
                    actionsJson: JSON.stringify(resolvedActions),
                    contextJson: JSON.stringify(context),
                    status: 'QUEUED',
                    deliveryAttempts: 0,
                    expiresAt: new Date(Date.now() + 60000) // 60s TTL
                }
            }).then(dbEvent => {
                const ramEvent = {
                    eventId: dbEvent.eventId,
                    tenantId: apiKey,
                    mappingId: dbEvent.mappingId,
                    mappingName: matchedMappings[0]?.name || 'Gift Effect',
                    eventType: dbEvent.eventType,
                    actions: resolvedActions,
                    context: context,
                    createdAt: dbEvent.createdAt.toISOString(),
                    expiresAt: dbEvent.expiresAt.toISOString(),
                    status: dbEvent.status,
                    deliveryAttempts: dbEvent.deliveryAttempts
                };
                tenant.gameEventQueue.push(ramEvent);
                tenant.gameEventsHistory.unshift(ramEvent);
                if (tenant.gameEventsHistory.length > 100) tenant.gameEventsHistory.pop();
            }).catch(err => console.error('[DB Event Ingestion Error]', err.message));
        }

        addTenantLog(apiKey, `🎯 Event Match: "${matchedMappings[0]?.name}" → Tạo GameEvent [${eventId}] (${resolvedActions.length} actions)`, true);
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
    const extracted = extractRobloxUsername(commentText);
    
    if (!extracted) {
        return { success: false, reason: 'NO_ROBLOX_USERNAME', error: 'Bình luận không chứa tên nhân vật Roblox hợp lệ!' };
    }
    const rawUsername = extracted;

    const now = Date.now();
    const cooldownKey = `${apiKey}_${tiktokUsername}`;

    if (!isVIP && userCooldowns.has(cooldownKey)) {
        const lastTime = userCooldowns.get(cooldownKey);
        if (now - lastTime < COOLDOWN_MS) {
            const remainSec = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
            addTenantLog(apiKey, `[Bỏ qua] @${tiktokUsername} comment quá nhanh (cần chờ thêm ${remainSec}s).`);
            return { success: false, reason: 'COOLDOWN', error: `@${tiktokUsername} đang trong thời gian chờ 30 giây.` };
        }
    }

    const robloxAccount = await validateRobloxUsername(rawUsername);
    if (robloxAccount === null) {
        addTenantLog(apiKey, `⚠️ [Bỏ qua] Tài khoản Roblox "${rawUsername}" (@${tiktokUsername}) không tồn tại trên hệ thống.`);
        return { success: false, reason: 'INVALID_USERNAME', error: `Tài khoản Roblox "${rawUsername}" không tồn tại!` };
    }
    const verifiedUsername = robloxAccount.name;

    const isCurrentlyActive = tenant.activePlayer && tenant.activePlayer.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase();
    const isAlreadyQueued = tenant.playerQueue.some(p => p.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase());

    if (isCurrentlyActive || isAlreadyQueued) {
        // FIXED: Reuse the SAME player ID to avoid triggering duplicate avatar spawns in Roblox.
        // Only update comment text and timestamp so the dashboard stays fresh.
        const existingId = (tenant.activePlayer && tenant.activePlayer.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase())
            ? tenant.activePlayer.id
            : (tenant.playerQueue.find(p => p.robloxUsername.toLowerCase() === verifiedUsername.toLowerCase()) || {}).id;

        const updatedPlayerData = {
            id: existingId || (Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5)),
            robloxUsername: verifiedUsername,
            tiktokUsername: tiktokUsername,
            commentText: commentText,
            animationId: tenant.selectedDanceId || 'rbxassetid://507771019',
            danceStyle: tenant.selectedDanceStyle || 'bounce',
            danceName: tenant.selectedDanceName || 'Bounce Starter',
            danceVerification: tenant.activePlayer ? tenant.activePlayer.danceVerification : {
                success: false, mode: 'pending',
                danceId: tenant.selectedDanceId || 'rbxassetid://507771019',
                danceStyle: tenant.selectedDanceStyle || 'bounce',
                message: 'Dang cho Roblox xac nhan nhan vat bat dau nhay.',
                verifiedAt: null
            },
            isVIP: isVIP,
            giftDetails: giftDetails,
            timestamp: now
        };
        tenant.activePlayer = updatedPlayerData;
        addTenantLog(apiKey, `💬 Re-comment: "${commentText}" → ${verifiedUsername} đang nhảy rồi, giữ nguyên slot (@${tiktokUsername})`);
        return { success: true, playerData: updatedPlayerData };
    }

    userCooldowns.set(cooldownKey, now);

    const playerData = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
        robloxUsername: verifiedUsername,
        tiktokUsername: tiktokUsername,
        commentText: commentText,
        animationId: tenant.selectedDanceId || 'rbxassetid://507771019',
        danceStyle: tenant.selectedDanceStyle || 'bounce',
        danceName: tenant.selectedDanceName || 'Bounce Starter',
        danceVerification: {
            success: false,
            mode: 'pending',
            danceId: tenant.selectedDanceId || 'rbxassetid://507771019',
            danceStyle: tenant.selectedDanceStyle || 'bounce',
            message: 'Dang cho Roblox xac nhan nhan vat bat dau nhay.',
            verifiedAt: null
        },
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
    tenant.lastDanceVerification = {
        playerId: playerData.id,
        robloxUsername: playerData.robloxUsername,
        success: false,
        mode: 'pending',
        danceId: playerData.animationId,
        danceStyle: playerData.danceStyle,
        message: 'Dang cho Roblox xac nhan nhan vat bat dau nhay.',
        verifiedAt: null
    };
    if (tenant.playerQueue.length > 50) tenant.playerQueue.shift();

    return { success: true, playerData };
}

function connectTikTokForTenant(apiKey, uniqueId) {
    if (!uniqueId) return;
    const cleanUniqueId = uniqueId.trim().replace(/^@/, '');
    disconnectTikTokForTenant(apiKey);
    const tenant = getTenant(apiKey);
    tenant.tiktokUsername = cleanUniqueId;
    markTikTokState(tenant, 'connecting', {
        lastTikTokError: null,
        lastTikTokErrorAt: null,
        lastTikTokConnectAttemptAt: new Date().toISOString()
    });
    addTenantLog(apiKey, `Đang kết nối tới TikTok Live: @${cleanUniqueId}...`, true);

    const tiktokConnectorModule = require('tiktok-live-connector');
    const ConnectionClass = tiktokConnectorModule.TikTokLiveConnection || tiktokConnectorModule.WebcastPushConnection;

    const signerApiKey = (process.env.EULERSTREAM_API_KEY || tenant.eulerApiKey || '').trim();
    if (signerApiKey) {
        addTenantLog(apiKey, `🔑 Đã nạp EulerStream API Key: ${signerApiKey.substring(0, 10)}...`);
        if (tiktokConnectorModule.SignConfig) {
            tiktokConnectorModule.SignConfig.apiKey = signerApiKey;
        }
    } else {
        addTenantLog(apiKey, `⚠️ Chưa phát hiện EULERSTREAM_API_KEY trong môi trường.`);
    }

    const connectionOptions = {
        processInitialData: false,
        fetchRoomInfoOnConnect: false,
        enableExtendedGiftInfo: false,
        signApiKey: signerApiKey
    };

    const connection = new ConnectionClass(cleanUniqueId, connectionOptions);
    activeConnections.set(apiKey, connection);

    connection.connect().then(state => {
        tenant.isConnected = true;
        markTikTokState(tenant, 'connected', {
            lastTikTokError: null,
            lastTikTokErrorAt: null,
            lastTikTokConnectedAt: new Date().toISOString(),
            lastTikTokRoomId: state ? (state.roomId || state.roomInfo?.roomId || null) : null
        });
        addTenantLog(apiKey, `🟢 Kết nối thành công tới TikTok Live ID: ${state ? (state.roomId || state.roomInfo?.roomId || 'LiveActive') : 'LiveActive'}`, true);

        // Async create DB session
        const { users } = require('./store');
        const user = users.find(u => u.apiKey === apiKey);
        if (prisma && user) {
            prisma.streamSession.create({
                data: {
                    userId: user.id,
                    tiktokUsername: cleanUniqueId
                }
            }).then(session => {
                tenant.currentSessionId = session.id;
            }).catch(err => console.warn('[DB Session Create Error]', err.message));
        }
    }).catch(err => {
        tenant.isConnected = false;
        const msg = err && err.message ? err.message : String(err);
        markTikTokState(tenant, 'error', {
            lastTikTokError: msg,
            lastTikTokErrorAt: new Date().toISOString()
        });
        if (!signerApiKey && (msg.includes("Business plan") || msg.includes("fetchWebcastSignatureFromEulerRoute") || msg.includes("Eulerstream") || msg.includes("requires a Business plan"))) {
            addTenantLog(apiKey, `⚠️ TikTok yêu cầu EulerStream API Key để ký chữ ký Live. Bạn tạo 1 API Key MIỄN PHÍ tại https://www.eulerstream.com (Gói Community Free), dán vào Render (EULERSTREAM_API_KEY) để mở khóa Live 24/7!`, true);
        } else if (msg.includes("isn't online") || msg.includes("offline") || msg.includes("User is offline")) {
            addTenantLog(apiKey, `❌ Lỗi kết nối @${cleanUniqueId}: Kênh TikTok này hiện đang OFF Live (Chưa bấm nút "Phát LIVE" trên ứng dụng TikTok)`, true);
        } else {
            addTenantLog(apiKey, `❌ Lỗi kết nối TikTok Live @${cleanUniqueId}: ${msg}`, true);
        }
    });

    connection.on('chat', data => {
        tenant.lastTikTokEventAt = new Date().toISOString();
        if (data.msgId && checkAndRegisterEvent(apiKey, data.msgId)) {
            return; // Skip duplicate chat comments
        }
        processNewCommentForTenant(apiKey, data.uniqueId, data.comment);
    });

    connection.on('gift', data => {
        tenant.lastTikTokEventAt = new Date().toISOString();
        if (data.giftType === 1 && data.repeatEnd === false) return; // Streak packet intermediate skip
        if (data.msgId && checkAndRegisterEvent(apiKey, data.msgId)) {
            addTenantLog(apiKey, `⚠️ [Deduplicate] Bỏ qua quà tặng trùng lặp từ live listener: @${data.uniqueId} [${data.msgId}]`);
            return;
        }

        const giftName = data.giftName || 'TikTok Gift';
        const giftId = (data.giftId || giftName).toString().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const giftCount = data.repeatCount || 1;
        let singleCoinValue = data.giftDetails?.diamondCount || data.diamondCount || data.coins || 0;

        if (!singleCoinValue && giftName) {
            const catalogueEntry = TIKTOK_GIFTS.find(g =>
                g.name.toLowerCase() === giftName.toLowerCase() ||
                g.id === giftId ||
                g.id === giftName.toLowerCase().replace(/[^a-z0-9]/g, '_')
            );
            if (catalogueEntry) singleCoinValue = catalogueEntry.coins;
        }

        const totalCoins = singleCoinValue * giftCount;

        addTenantLog(apiKey, `🎁 @${data.uniqueId} tặng ${giftCount}x ${giftName} (${singleCoinValue}🪙/quà = ${totalCoins}🪙)!`, true);

        processGiftEventForTenant(apiKey, {
            giftId,
            giftName,
            repeatCount: giftCount,
            singleCoinValue,
            totalCoins,
            tiktokUsername: data.uniqueId,
            nickname: data.nickname || data.uniqueId
        }, data.msgId);
    });

    connection.on('streamEnd', () => {
        tenant.isConnected = false;
        markTikTokState(tenant, 'ended');
        addTenantLog(apiKey, `Stream TikTok Live đã kết thúc.`, true);
    });

    connection.on('disconnected', () => {
        tenant.isConnected = false;
        markTikTokState(tenant, 'disconnected');
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
    markTikTokState(tenant, 'disconnected');
    addTenantLog(apiKey, `Đang ngắt kết nối TikTok.`);

    // Close session in DB
    if (tenant.currentSessionId && prisma) {
        prisma.streamSession.update({
            where: { id: tenant.currentSessionId },
            data: { endedAt: new Date() }
        }).catch(err => console.warn('[DB Session Close Error]', err.message));
        tenant.currentSessionId = null;
    }
}

// TikFinity Desktop App Auto-Connector (ws://localhost:21213/)
let tikFinityWsInstance = null;
let tikFinityRetryTimer = null;

function initTikFinityDesktopConnector(apiKey = 'demo-api-key-sg-music') {
    if (tikFinityWsInstance) {
        try { tikFinityWsInstance.close(); } catch (e) {}
        tikFinityWsInstance = null;
    }
    if (tikFinityRetryTimer) {
        clearTimeout(tikFinityRetryTimer);
        tikFinityRetryTimer = null;
    }

    try {
        const WsClass = globalThis.WebSocket || require('ws');
        const ws = new WsClass('ws://localhost:21213/');
        tikFinityWsInstance = ws;

        ws.onopen = () => {
            console.log('[TikFinityWS] Connected to TikFinity Desktop App at ws://localhost:21213/');
            const tenant = getTenant(apiKey);
            tenant.isConnected = true;
            addTenantLog(apiKey, `🟢 Đã kết nối tự động tới TikFinity Desktop App (ws://localhost:21213/)! Đang nhận 100% Comment & Quà TikTok Live!`, true);
        };

        ws.onmessage = (event) => {
            try {
                const msgStr = typeof event.data === 'string' ? event.data : event.data.toString();
                const payload = JSON.parse(msgStr);
                const { event: eventName, data } = payload;
                if (!data) return;

                if (eventName === 'chat') {
                    const tiktokUsername = data.uniqueId || data.nickname || 'Viewer';
                    const commentText = data.comment || '';
                    processNewCommentForTenant(apiKey, tiktokUsername, commentText);
                } else if (eventName === 'gift') {
                    if (data.giftType === 1 && data.repeatEnd === false) return;
                    const tiktokUsername = data.uniqueId || 'Viewer';
                    const giftName = data.giftName || 'TikTok Gift';
                    const giftId = (data.giftId || giftName).toString().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    const giftCount = data.repeatCount || 1;
                    let singleCoinValue = data.diamondCount || data.coins || 0;

                    if (!singleCoinValue && giftName) {
                        const catalogueEntry = TIKTOK_GIFTS.find(g =>
                            g.name.toLowerCase() === giftName.toLowerCase() ||
                            g.id === giftId
                        );
                        if (catalogueEntry) singleCoinValue = catalogueEntry.coins;
                    }
                    const totalCoins = (singleCoinValue || 1) * giftCount;

                    addTenantLog(apiKey, `🎁 [TikFinity Live] @${tiktokUsername} tặng ${giftCount}x ${giftName} (${totalCoins}🪙)!`, true);

                    processGiftEventForTenant(apiKey, {
                        giftId,
                        giftName,
                        repeatCount: giftCount,
                        singleCoinValue: singleCoinValue || 1,
                        totalCoins,
                        tiktokUsername,
                        nickname: data.nickname || tiktokUsername
                    });
                }
            } catch (err) {
                console.error('[TikFinityWS] Message Parse Error:', err.message);
            }
        };

        ws.onerror = () => {
            // Silently handle when TikFinity app is not open
        };

        ws.onclose = () => {
            tikFinityWsInstance = null;
            tikFinityRetryTimer = setTimeout(() => {
                initTikFinityDesktopConnector(apiKey);
            }, 6000);
        };
    } catch (err) {
        tikFinityRetryTimer = setTimeout(() => {
            initTikFinityDesktopConnector(apiKey);
        }, 6000);
    }
}

// Auto-start TikFinity Desktop App connector on module load
setTimeout(() => {
    initTikFinityDesktopConnector();
}, 2000);

module.exports = {
    connectTikTokForTenant,
    disconnectTikTokForTenant,
    processNewCommentForTenant,
    processGiftEventForTenant,
    initTikFinityDesktopConnector
};
