// signature.js
const crypto = require('crypto');

function generateHmacSignature(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

function verifyHmacSignature(req, res, next) {
    const signature = req.headers['x-roblox-signature'];
    const secret = req.user ? req.user.apiSecret : process.env.JWT_SECRET;

    if (!signature) {
        // Soft fallback for standard HTTP requests
        return next();
    }

    const expectedSignature = generateHmacSignature(req.body || {}, secret);
    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    next();
}

module.exports = {
    generateHmacSignature,
    verifyHmacSignature
};
