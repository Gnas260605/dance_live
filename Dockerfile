FROM node:20-alpine

# Install openssl for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependencies manifest and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Ensure data folder exists
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_URL="file:../data/production.db"
ENV JWT_SECRET="sg_music_roblox_production_secret_2026_key"

CMD ["sh", "-c", "npx prisma db push && npm start"]
