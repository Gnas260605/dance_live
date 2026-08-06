// test_full.js - Comprehensive API test suite
const API = 'http://localhost:3001/api';
const API_KEY = 'demo-api-key-sg-music';
const STREAMER = `${API}/v1/streamer/${API_KEY}`;
const DASH = `${API}/v1/dashboard`;

let passed = 0;
let failed = 0;
const errors = [];

async function req(method, url, body) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
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
        const r = await req('GET', `${STREAMER}/current-player`);
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
        const r2 = await req('GET', `${STREAMER}/current-player`);
        assert('player.id SAME after re-comment (no dup spawn)', r2.data?.player?.id === firstPlayerId,
            `first=${firstPlayerId}, second=${r2.data?.player?.id}`);
    }

    console.log('\n=== 5. DANCE STATUS REPORT (Roblox → Backend) ===');
    {
        const r = await req('POST', `${STREAMER}/dance-status`, {
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
        const r = await req('POST', `${STREAMER}/heartbeat`, {
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
        const r = await req('GET', `${STREAMER}/game-events`);
        assert('GET /game-events → 200', r.status === 200, `got ${r.status}`);
        assert('events is array', Array.isArray(r.data?.events));
    }

    console.log('\n=== 8. TIKTOK CONNECT (calls real connector) ===');
    {
        const r = await req('POST', `${DASH}/connect-tiktok`, { tiktokUsername: 'sandg.music' });
        assert('POST /connect-tiktok → 200', r.status === 200, `got ${r.status}`);
        assert('tiktokUsername echoed', r.data?.tiktokUsername === 'sandg.music');
        // message should say "Đang kết nối" not "Đã kết nối" (since real connect is async)
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

        const r2 = await req('GET', `${STREAMER}/current-player`);
        assert('player is null after clear', r2.data?.player === null);
    }

    console.log('\n=== 11. EMERGENCY STOP ===');
    {
        // Add a player first
        await req('POST', `${DASH}/simulate-comment`, { tiktokUsername: 'u1', comment: '!dance Builderman' });
        const r = await req('POST', `${DASH}/emergency-stop`, {});
        assert('POST /emergency-stop → 200', r.status === 200);
        const r2 = await req('GET', `${STREAMER}/current-player`);
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
        assert('POST /music-library → 200', add.status === 200);
        assert('track added', add.data?.track?.musicId === 'rbxassetid://1837879082');
    }

    console.log('\n=== 14. PREFLIGHT CHECKLIST ===');
    {
        const r = await req('POST', `${DASH}/preflight`, {});
        assert('POST /preflight → 200', r.status === 200);
        assert('checks array', Array.isArray(r.data?.checks));
        assert('Backend API Service check passes', r.data?.checks?.find(c => c.name === 'Backend API Service')?.pass === true);
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
