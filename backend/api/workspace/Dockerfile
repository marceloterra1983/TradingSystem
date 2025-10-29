# Production Dockerfile for Workspace Service
# Features: Optimized build, non-root user, security hardening, TimescaleDB-only

FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy backend/shared package files for dependency installation
COPY ../../shared/logger/package.json /shared/logger/package.json
COPY ../../shared/middleware/package.json /shared/middleware/package.json

# Install dependencies (production only)
RUN npm ci --only=production && \
    npm cache clean --force

# Install shared modules dependencies
RUN cd /shared/logger && npm ci --only=production && \
    cd /shared/middleware && npm ci --only=production && \
    npm cache clean --force

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy backend/shared modules (required for shared logger/middleware)
COPY --from=builder --chown=nodejs:nodejs /shared /shared
COPY --chown=nodejs:nodejs ../../shared /shared

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3200

# Health check (production intervals)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD node -e "require('http').get('http://localhost:3200/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application (production mode)
CMD ["node", "src/server.js"]
