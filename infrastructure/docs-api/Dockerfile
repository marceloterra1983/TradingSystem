# Use pinned Node.js Alpine image for security and size
FROM node:18.17.0-alpine

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S docsapi -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R docsapi:nodejs /app
USER docsapi

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the app
CMD ["node", "server.js"]