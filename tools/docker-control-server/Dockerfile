FROM node:20-alpine

# Install docker CLI
RUN apk add --no-cache docker-cli curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY index.js ./

# Expose port
EXPOSE 9880

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:9880/health || exit 1

# Start server
CMD ["node", "index.js"]
