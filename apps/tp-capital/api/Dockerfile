# Production Dockerfile for TP Capital API
# Features: Optimized build, non-root user, security hardening

FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && \
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

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 4005

# Health check (production intervals)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD node -e "require('http').get('http://localhost:4005/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application (production mode)
CMD ["node", "src/server.js"]
