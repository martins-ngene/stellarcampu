# Multi-stage Dockerfile for StellarCampus Fastify Backend
# Stage 1: Build & Compile
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools if needed
RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package*.json tsconfig.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy source code and build
COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies & compiled output
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Run Prisma schema push on startup and launch Fastify
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
