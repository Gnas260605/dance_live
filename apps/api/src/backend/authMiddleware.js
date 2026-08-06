// authMiddleware.js
const jwt = require('jsonwebtoken');
const { findUserByApiKey, findUserById } = require('./store');

const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET === 'sg_music_roblox_production_secret_2026_key')) {
    console.error('❌ [SECURITY CRITICAL] JWT_SECRET MUST be set in production environment to a secure, custom value! Exiting...');
    process.exit(1);
}
const SECRET_KEY = JWT_SECRET || 'sg_music_roblox_production_secret_2026_key';

// JWT authentication for Web Dashboard
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }

    jwt.verify(token, SECRET_KEY, (err, userPayload) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        const user = findUserById(userPayload.id);
        if (!user) {
            return res.status(404).json({ error: 'User account not found' });
        }
        req.user = user;
        next();
    });
}

// API Key authentication for Roblox Studio Place HTTP Polling
function authenticateApiKey(req, res, next) {
    const apiKey = req.params.apiKey || req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
        return res.status(401).json({ error: 'API Key missing' });
    }

    const user = findUserByApiKey(apiKey);
    if (!user) {
        return res.status(403).json({ error: 'Invalid API Key' });
    }

    req.user = user;
    req.apiKey = apiKey;
    next();
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, apiKey: user.apiKey, planTier: user.planTier },
        SECRET_KEY,
        { expiresIn: '7d' }
    );
}

module.exports = {
    JWT_SECRET: SECRET_KEY,
    authenticateToken,
    authenticateApiKey,
    generateToken
};
