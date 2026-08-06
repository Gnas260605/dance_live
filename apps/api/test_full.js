// test_full.js - Comprehensive API test suite with Real JWT Authentication
const API = 'http://localhost:3001/api';
const API_KEY = 'demo-api-key-sg-music';
const STREAMER = `${API}/v1/streamer/${API_KEY}`;
const DASH = `${API}/v1/dashboard`;

let passed = 0;
let failed = 0;
const errors = [];
let jwtToken = null;
let streamerUrl = STREAMER;

async function req(method, url, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (jwtToken && url.startsWith(DASH)) {
        opts.headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
}

function assert(label, cond, detail = '') {
    if (cond) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}${detail ? ' → ' + detail : ''}`);
        failed++;
        errors.push(`${label}: ${detail}`);
    }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
    console.log('\n=== 0. REGISTER & LOGIN REAL TEST CREATOR ===');
    const testEmail = `test_creator_${Date.now()}_${Math.random().toString(36).substring(2, 5)}@sgmusic.com`;
    {
        const r = await req('POST', `${API}/auth/register`, {
            name: 'Test Hardened Creator',
            email: testEmail,
            password: 'password123'
        });
        assert('POST /auth/register → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.data)}`);
        assert('token returned', !!r.data?.token);
        assert('apiKey returned', !!r.data?.user?.apiKey);
        
        jwtToken = r.data?.token;
        streamerUrl = `${API}/v1/streamer/${r.data?.user?.apiKey}`;
    }

    console.log('\n=== 1. SERVER HEALTH ===');
    {
        const r = await req('GET', `${DASH}/status`);
        assert('GET /status → 200', r.status === 200, `got ${r.status}`);
        assert('/status has tenantStatus', r.data?.tenantStatus !== undefined);
        assert('/status has isRobloxOnline field', 'isRobloxOnline' in (r.data?.tenantStatus || {}));
    }

    console.log('\n=== 2. COMMENT FLOW (jokerick_hiep) ===');
    let firstPlayerId = null;
    {
        const r = await req('POST', `${DASH}/simulate-comment`, {
            tiktokUsername: 'viewer_test',
            comment: '!dance jokerick_hiep',
        });
        assert('POST simulate-comment → 200', r.status === 200, `got ${r.status} ${JSON.stringify(r.data)}`);
        assert('playerData exists', !!r.data?.playerData);
        assert('robloxUsername = jokerick_Hiep', r.data?.playerData?.robloxUsername === 'jokerick_Hiep', r.data?.playerData?.robloxUsername);
        assert('animationId present', !!r.data?.playerData?.animationId, r.data?.playerData?.animationId);
        assert('id present', !!r.data?.playerData?.id);
        firstPlayerId = r.data?.playerData?.id;
    }

    console.log('\n=== 3. CURRENT-PLAYER ENDPOINT (Roblox polling) ===');
    {
        const r = await req('GET', `${streamerUrl}/current-player`);
        assert('GET /current-player → 200', r.status === 200, `got ${r.status}`);
        assert('player.robloxUsername = jokerick_Hiep', r.data?.player?.robloxUsername === 'jokerick_Hiep', r.data?.player?.robloxUsername);
        assert('player.id matches', r.data?.player?.id === firstPlayerId, `${r.data?.player?.id} vs ${firstPlayerId}`);
        assert('selectedDanceId exists', !!r.data?.selectedDanceId, r.data?.selectedDanceId);
        assert('danceDuration present', !!r.data?.danceDuration);
    }

    console.log('\n=== 4. DUPLICATE COMMENT (same user) - must NOT change player.id ===');
    {
        await sleep(2100); // past cooldown
        const r = await req('POST', `${DASH}/simulate-comment`, {
            tiktokUsername: 'viewer_test',
            comment: '!dance jokerick_hiep',
        });
        assert('second comment → 200', r.status === 200, `got ${r.status}`);
        // The player ID must stay SAME (bug fix: no duplicate spawn)
        const r2 = await req('GET', `${streamerUrl}/current-player`);
        assert('player.id SAME after re-comment (no dup spawn)', r2.data?.player?.id === firstPlayerId,
            `first=${firstPlayerId}, second=${r2.data?.player?.id}`);
    }

    console.log('\n=== 5. DANCE STATUS REPORT (Roblox → Backend) ===');
    {
        const r = await req('POST', `${streamerUrl}/dance-status`, {
            playerId: firstPlayerId,
            robloxUsername: 'jokerick_Hiep',
            danceId: 'rbxassetid://86539981118136',
            danceStyle: 'bounce',
            success: true,
            mode: 'asset',
            message: 'Animation track loaded and playing.',
        });
        assert('POST /dance-status → 200', r.status === 200, `got ${r.status}`);
        assert('verification.success = true', r.data?.verification?.success === true);
        assert('verification.mode = asset', r.data?.verification?.mode === 'asset');

        // Confirm it's reflected in dashboard status
        const s = await req('GET', `${DASH}/status`);
        assert('lastDanceVerification.success = true in status', s.data?.tenantStatus?.lastDanceVerification?.success === true);
    }

    console.log('\n=== 6. HEARTBEAT (Roblox → Backend) ===');
    {
        const r = await req('POST', `${streamerUrl}/heartbeat`, {
            placeId: '123456789',
            jobId: 'test-job-abc',
            scriptVer: '2.1.0',
        });
        assert('POST /heartbeat → 200', r.status === 200, `got ${r.status}`);
        assert('isOnline = true', r.data?.isOnline === true);

        const s = await req('GET', `${DASH}/status`);
        assert('isRobloxOnline = true after heartbeat', s.data?.tenantStatus?.isRobloxOnline === true);
        assert('robloxHeartbeat.scriptVer = 2.1.0', s.data?.tenantStatus?.robloxHeartbeat?.scriptVer === '2.1.0');
    }

    console.log('\n=== 7. GAME EVENTS QUEUE ===');
    {
        const r = await req('GET', `${streamerUrl}/game-events`);
        assert('GET /game-events → 200', r.status === 200, `got ${r.status}`);
        assert('events is array', Array.isArray(r.data?.events));
    }

    console.log('\n=== 8. TIKTOK CONNECT (calls real connector) ===');
    {
        const r = await req('POST', `${DASH}/connect-tiktok`, { tiktokUsername: 'sandg.music' });
        assert('POST /connect-tiktok → 200', r.status === 200, `got ${r.status}`);
        assert('tiktokUsername echoed', r.data?.tiktokUsername === 'sandg.music');
        assert('message is informative', typeof r.data?.message === 'string' && r.data.message.length > 0, r.data?.message);
    }

    console.log('\n=== 9. TIKTOK DISCONNECT ===');
    {
        const r = await req('POST', `${DASH}/disconnect-tiktok`, {});
        assert('POST /disconnect-tiktok → 200', r.status === 200, `got ${r.status}`);
        assert('isConnected = false', r.data?.isConnected === false);
    }

    console.log('\n=== 10. SKIP / CLEAR QUEUE ===');
    {
        const r = await req('POST', `${DASH}/clear-queue`, {});
        assert('POST /clear-queue → 200', r.status === 200);

        const r2 = await req('GET', `${streamerUrl}/current-player`);
        assert('player is null after clear', r2.data?.player === null);
    }

    console.log('\n=== 11. EMERGENCY STOP ===');
    {
        // Add a player first
        await req('POST', `${DASH}/simulate-comment`, { tiktokUsername: 'u1', comment: '!dance Builderman' });
        const r = await req('POST', `${DASH}/emergency-stop`, {});
        assert('POST /emergency-stop → 200', r.status === 200);
        const r2 = await req('GET', `${streamerUrl}/current-player`);
        assert('player null after emergency stop', r2.data?.player === null);
    }

    console.log('\n=== 12. DANCE LIBRARY ===');
    {
        const r = await req('GET', `${DASH}/dance`);
        assert('GET /dance → 200', r.status === 200);
        assert('verifiedDances array exists', Array.isArray(r.data?.verifiedDances));
        assert('verifiedDances not empty', (r.data?.verifiedDances?.length || 0) > 0);
    }

    console.log('\n=== 13. MUSIC LIBRARY ===');
    {
        const r = await req('GET', `${DASH}/music-library`);
        assert('GET /music-library → 200', r.status === 200);
        // Add a track
        const add = await req('POST', `${DASH}/music-library`, { name: 'Test Track', musicId: '1837879082' });
        assert('POST /music-library → 200', add.status === 200, `got ${add.status} ${JSON.stringify(add.data)}`);
        assert('track added', add.data?.track?.musicId === 'rbxassetid://1837879082');
    }

    console.log('\n=== 14. PREFLIGHT CHECKLIST ===');
    {
        const r = await req('POST', `${DASH}/preflight`, {});
        assert('POST /preflight → 200', r.status === 200);
        assert('checks array', Array.isArray(r.data?.checks));
        assert('Backend API Service check passes', r.data?.checks?.find(c => c.name === 'Backend API Service')?.pass === true);
    }

    console.log('\n=== 15. EVENT ENGINE V2 (Phase 3) ===');
    {
        const testDedupeId = 'evt_test_dedupe_' + Date.now();
        const r1 = await req('POST', `${DASH}/simulate-gift`, {
            tiktokUsername: 'vip_tester',
            giftName: 'Rose',
            giftId: 'rose',
            repeatCount: 1,
            diamondCount: 1,
            sourceEventId: testDedupeId
        });
        assert('POST /simulate-gift (first) → 200', r1.status === 200);
        await new Promise(resolve => setTimeout(resolve, 300));

        const r2 = await req('POST', `${DASH}/simulate-gift`, {
            tiktokUsername: 'vip_tester',
            giftName: 'Rose',
            giftId: 'rose',
            repeatCount: 1,
            diamondCount: 1,
            sourceEventId: testDedupeId
        });
        assert('POST /simulate-gift (second/duplicate) → 200', r2.status === 200);
        assert('second attempt is marked duplicate', r2.data?.result?.duplicate === true);

        const rPoll = await req('GET', `${streamerUrl}/game-events`);
        assert('GET /game-events → 200', rPoll.status === 200);
        const testEvent = rPoll.data?.events?.find(e => e.context?.giftId === 'rose' || e.context?.giftName === 'Rose');
        assert('event exists in polled events queue', !!testEvent);

        if (testEvent) {
            const eventId = testEvent.eventId;
            const rAck1 = await req('POST', `${streamerUrl}/game-events/${eventId}/ack`, { success: true });
            assert('First ACK → 200', rAck1.status === 200);
            assert('First ACK status = ACKED', rAck1.data?.status === 'ACKED');

            const rAck2 = await req('POST', `${streamerUrl}/game-events/${eventId}/ack`, { success: true });
            assert('Second ACK (Idempotent) → 200', rAck2.status === 200);
            assert('Second ACK status still = ACKED', rAck2.data?.status === 'ACKED');
        }

        const stopDedupeId = 'evt_test_stop_' + Date.now();
        const rSim = await req('POST', `${DASH}/simulate-gift`, {
            tiktokUsername: 'vip_tester',
            giftName: 'Rose',
            giftId: 'rose',
            repeatCount: 1,
            diamondCount: 1,
            sourceEventId: stopDedupeId
        });
        assert('Create event for stop test → 200', rSim.status === 200);
        await new Promise(resolve => setTimeout(resolve, 300));

        const rStop = await req('POST', `${DASH}/emergency-stop`, {});
        assert('POST /emergency-stop → 200', rStop.status === 200);

        const rPollAfterStop = await req('GET', `${streamerUrl}/game-events`);
        const stoppedEvent = rPollAfterStop.data?.events?.find(e => e.eventId === stopDedupeId);
        assert('event is no longer active in queued events', !stoppedEvent);
    }

    // ============ SUMMARY ============
    console.log('\n' + '='.repeat(50));
    console.log(`TOTAL: ${passed + failed} tests | ✅ ${passed} passed | ❌ ${failed} failed`);
    if (errors.length) {
        console.log('\nFailed tests:');
        errors.forEach(e => console.log('  ❌ ' + e));
    } else {
        console.log('\n🎉 ALL TESTS PASSED!');
    }
    console.log('='.repeat(50));
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('\n💥 CRITICAL ERROR:', e.message);
    process.exit(1);
});
