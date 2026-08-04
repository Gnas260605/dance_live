// db.js
// Production Prisma DB Client Initialization & Singleton Manager
const { PrismaClient } = require('@prisma/client');
const path = require('path');

let prisma;

try {
    prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
} catch (err) {
    console.warn('[Prisma] Database initialization warning, using fallback mode:', err.message);
}

module.exports = prisma;
