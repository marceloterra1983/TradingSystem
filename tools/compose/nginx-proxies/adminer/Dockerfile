FROM nginx:1.25-alpine

# Copy nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Verify file was copied
RUN ls -la /etc/nginx/conf.d/ && \
    cat /etc/nginx/conf.d/default.conf | head -5

CMD ["nginx", "-g", "daemon off;"]
