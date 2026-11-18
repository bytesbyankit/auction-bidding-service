# ==============================================================================
# Production Dockerfile for Auction Bidding Service
# Multi-stage build with security hardening (non-root user, tini, healthcheck)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compilation
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications first for Docker layer caching
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy TypeScript source code and compile to JavaScript
COPY src ./src
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install tini for init signal handling (SIGTERM, SIGINT) and process reaping
RUN apk add --no-cache tini

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Ensure the non-root node user owns application files
RUN chown -R node:node /app

# Security: Run as unprivileged non-root user
USER node

# Expose HTTP application port
EXPOSE 3000

# Container healthcheck using Alpine's built-in wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Process supervisor
ENTRYPOINT ["/sbin/tini", "--"]

# Start production server
CMD ["node", "dist/server.js"]
