# ============================================================================
# TradingSystem - Documentation Container (Consolidated)
# ============================================================================
# Serves:
#   - Documentation files (markdown, specs)
#   - OpenAPI/AsyncAPI specifications
#   - Static assets
#
# Port: 3400
# ============================================================================

FROM nginx:alpine

# Install dependencies for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory structure
RUN mkdir -p /usr/share/nginx/html/docs \
    && mkdir -p /usr/share/nginx/html/specs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Labels
LABEL com.tradingsystem.stack="documentation" \
      com.tradingsystem.service="docs" \
      com.tradingsystem.type="frontend" \
      com.tradingsystem.port="3400"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
