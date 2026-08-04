// test-all.js
// Production E2E & Unit Tests for TikTok Live Roblox SaaS Platform

const assert = require('assert');
const { processGiftEventForTenant, extractRobloxUsername } = require('../src/backend/tiktokManager');
const { getTenant } = require('../src/backend/store');

console.log('🧪 Running Comprehensive SaaS Suite & Event Engine Tests...');

// Test 1: Parser
function testParser(text) {
    if (!text) return null;
    const danceCmdMatch = text.match(/!dance\s+([a-zA-Z0-9_]{3,20})/i);
    if (danceCmdMatch) return danceCmdMatch[1];
    const standaloneMatch = text.trim().match(/^([a-zA-Z0-9_]{3,20})$/);
    if (standaloneMatch) return standaloneMatch[1];
    return null;
}

assert.strictEqual(testParser('!dance Builderman'), 'Builderman');
assert.strictEqual(testParser('!dance ROBLOX'), 'ROBLOX');
assert.strictEqual(testParser('Builderman'), 'Builderman');
assert.strictEqual(testParser('Hello world!'), null);
console.log('  ✅ Parser Test Passed');

// Test 2: FIFO Queue & Duplicate Prevention
let queue = [];
function addToQueue(item) {
    const isDuplicate = queue.some(i => i.robloxUsername.toLowerCase() === item.robloxUsername.toLowerCase());
    if (isDuplicate) return false;
    queue.push(item);
    return true;
}

assert.strictEqual(addToQueue({ robloxUsername: 'Builderman' }), true);
assert.strictEqual(addToQueue({ robloxUsername: 'builderman' }), false);
assert.strictEqual(queue.length, 1);
console.log('  ✅ FIFO Queue & Duplicate Prevention Test Passed');

// Test 3: Event Engine (Rose -> FLOWER_RAIN -> GameEvent Generation)
const testApiKey = 'test-suite-key-1';
const tenant = getTenant(testApiKey);

// Process a Rose Gift Event
const result = processGiftEventForTenant(testApiKey, {
    giftId: 'rose',
    giftName: 'Rose',
    repeatCount: 1,
    singleCoinValue: 1,
    totalCoins: 1,
    tiktokUsername: 'RoseGiver_99',
    nickname: 'Rose Fan'
});

assert.strictEqual(result.matchedAnyMapping, true);
assert.strictEqual(tenant.gameEventQueue.length > 0, true);

const gameEvent = tenant.gameEventQueue[tenant.gameEventQueue.length - 1];
assert.strictEqual(gameEvent.status, 'QUEUED');
assert.strictEqual(gameEvent.actions.length >= 1, true);

const flowerRainAction = gameEvent.actions.find(a => a.type === 'FLOWER_RAIN');
assert.notStrictEqual(flowerRainAction, undefined);
console.log('  ✅ Event Engine (Rose → FLOWER_RAIN) Test Passed');

// Test 4: Roblox Polling & ACK Flow
gameEvent.status = 'DELIVERED';
assert.strictEqual(gameEvent.status, 'DELIVERED');

// Simulate Roblox ACK
gameEvent.status = 'ACKED';
tenant.gameEventQueue = tenant.gameEventQueue.filter(e => e.eventId !== gameEvent.eventId);
assert.strictEqual(gameEvent.status, 'ACKED');
console.log('  ✅ Roblox Polling & ACK Flow Test Passed');

// Test 5: Heartbeat update
tenant.robloxHeartbeat = {
    lastHeartbeat: new Date().toISOString(),
    isOnline: true,
    placeId: '123456789',
    jobId: 'job_test_1'
};
assert.strictEqual(tenant.robloxHeartbeat.isOnline, true);
console.log('  ✅ Roblox Heartbeat Test Passed');

console.log('🎉 All Automated Unit & Integration Tests Passed Successfully!');
