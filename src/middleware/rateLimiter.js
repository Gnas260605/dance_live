// rateLimiter.js
const rateLimit = require('express-rate-limit');

// Auth rate limiter (login & register: max 15 requests per 15 minutes)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts from this IP, please try again after 15 minutes' }
});

// Roblox Studio Polling Limiter (max 120 requests per minute)
const robloxApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Roblox place rate limit exceeded' }
});

// Dashboard General Action Limiter (max 60 requests per minute)
const dashboardLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Action rate limit exceeded' }
});

module.exports = {
    authLimiter,
    robloxApiLimiter,
    dashboardLimiter
};
