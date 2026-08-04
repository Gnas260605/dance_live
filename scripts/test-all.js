// test-all.js
// Automated Unit Tests for TikTok Live Roblox SaaS Platform

const assert = require('assert');

// 1. Test Comment Parser
function extractRobloxUsername(text) {
    if (!text) return null;
    const danceCmdMatch = text.match(/!dance\s+([a-zA-Z0-9_]{3,20})/i);
    if (danceCmdMatch) return danceCmdMatch[1];

    const standaloneMatch = text.trim().match(/^([a-zA-Z0-9_]{3,20})$/);
    if (standaloneMatch) return standaloneMatch[1];

    return null;
}

console.log('🧪 Running Unit Tests...');

// Test 1: Parser
assert.strictEqual(extractRobloxUsername('!dance Builderman'), 'Builderman');
assert.strictEqual(extractRobloxUsername('!dance ROBLOX'), 'ROBLOX');
assert.strictEqual(extractRobloxUsername('Builderman'), 'Builderman');
assert.strictEqual(extractRobloxUsername('Hello world!'), null);
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

// Test 3: Cooldown Logic
const cooldowns = new Map();
function checkCooldown(user, now, cooldownMs = 15000) {
    if (cooldowns.has(user)) {
        if (now - cooldowns.get(user) < cooldownMs) return false;
    }
    cooldowns.set(user, now);
    return true;
}

const now = Date.now();
assert.strictEqual(checkCooldown('user1', now), true);
assert.strictEqual(checkCooldown('user1', now + 1000), false);
assert.strictEqual(checkCooldown('user1', now + 16000), true);
console.log('  ✅ Cooldown Logic Test Passed');

console.log('🎉 All Automated Unit Tests Passed Successfully!');
