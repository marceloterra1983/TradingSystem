# ============================================================================
# DocsAPI - Dockerfile
# Multi-stage build for Documentation API
# ============================================================================

# Stage 1: Base image with dependencies
FROM node:22-alpine AS base

WORKDIR /app

# Install production dependencies only
COPY backend/api/documentation-api/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Development image
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files
COPY backend/api/documentation-api/package*.json ./

# Copy shared modules
COPY backend/shared /shared

# Install ALL dependencies (including dev)
RUN npm install && \
    npm cache clean --force

# Install shared modules dependencies
RUN cd /shared/logger && npm ci && \
    cd /shared/middleware && npm ci && \
    cd /shared/config && npm ci

# Copy source code
COPY backend/api/documentation-api .

# Copy documentation sources (FlexSearch + static assets)
COPY docs ./docs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Development command
CMD ["npm", "start"]

# Stage 3: Production image (optimized)
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create app user (security)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from base stage
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs backend/api/documentation-api/package*.json ./
COPY --from=development --chown=nodejs:nodejs /shared /shared
COPY --chown=nodejs:nodejs backend/api/documentation-api/prisma ./prisma
COPY --chown=nodejs:nodejs backend/api/documentation-api/src ./src
COPY --chown=nodejs:nodejs docs ./docs

# Create uploads directory with proper permissions
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs uploads && \
    chmod 755 uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Production command
CMD ["node", "src/server.js"]

