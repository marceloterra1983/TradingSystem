FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3600

# Install wget for healthcheck
RUN apk add --no-cache wget

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3600/health || exit 1

# Start server
CMD ["node", "src/server.js"]
