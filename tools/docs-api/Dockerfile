# Simple Dockerfile for DocsAPI placeholder with health endpoint
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create health endpoint file
RUN mkdir -p /usr/share/nginx/html && \
    echo '{"status":"healthy","service":"docs-api"}' > /usr/share/nginx/html/health.json && \
    echo '{"service":"DocsAPI","version":"1.0.0","status":"placeholder"}' > /usr/share/nginx/html/index.json

# Configure nginx
RUN echo 'server { \
    listen 80; \
    server_name _; \
    \
    location /health { \
        default_type application/json; \
        alias /usr/share/nginx/html/health.json; \
    } \
    \
    location / { \
        default_type application/json; \
        alias /usr/share/nginx/html/index.json; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
