FROM node:22-alpine

# Install openssl for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root package.json and packages configurations
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/contracts/package*.json ./packages/contracts/
COPY prisma ./prisma/

# Install dependencies for all workspaces
RUN npm ci


# Copy the entire source code
COPY . .

# Build the React web app and copy its dist to the api public directory
RUN npm run build:web && node scripts/deploy-static.js

# Ensure data folder exists for SQLite storage
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/production.db"
ENV JWT_SECRET="sg_music_roblox_production_secret_2026_key"

# Start the API backend workspace, generate client, push schema and start
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run start:api"]
