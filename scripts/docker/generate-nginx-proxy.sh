#!/bin/bash
#
# Generate Nginx Proxy Configuration for iFrame Embedding
#
# This script generates nginx proxy configuration files from the template
# to allow services to be embedded in iframes on the Dashboard.
#
# Usage:
#   bash scripts/docker/generate-nginx-proxy.sh SERVICE_NAME SERVICE_PORT
#
# Example:
#   bash scripts/docker/generate-nginx-proxy.sh n8n 5678
#
# Output:
#   tools/compose/SERVICE_NAME-nginx-proxy.conf
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo ""
    echo "Usage: $0 SERVICE_NAME SERVICE_PORT"
    echo ""
    echo "Example: $0 n8n 5678"
    echo ""
    exit 1
fi

SERVICE_NAME=$1
SERVICE_PORT=$2

# Validate service name (alphanumeric and hyphens only)
if ! [[ "$SERVICE_NAME" =~ ^[a-zA-Z0-9-]+$ ]]; then
    echo -e "${RED}Error: Invalid service name${NC}"
    echo "Service name must contain only alphanumeric characters and hyphens"
    exit 1
fi

# Validate port (numeric only)
if ! [[ "$SERVICE_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid port number${NC}"
    echo "Port must be numeric"
    exit 1
fi

# Paths
TEMPLATE_FILE="tools/compose/templates/nginx-iframe-proxy.conf.template"
OUTPUT_FILE="tools/compose/${SERVICE_NAME}-nginx-proxy.conf"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file not found${NC}"
    echo "Expected: $TEMPLATE_FILE"
    exit 1
fi

echo "=========================================="
echo "Nginx Proxy Configuration Generator"
echo "=========================================="
echo ""
echo "Service Name: $SERVICE_NAME"
echo "Service Port: $SERVICE_PORT"
echo "Output File:  $OUTPUT_FILE"
echo ""

# Check if output file already exists
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}Warning: Configuration file already exists${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Generate configuration
echo "Generating configuration..."
sed "s/{{SERVICE_NAME}}/$SERVICE_NAME/g; s/{{SERVICE_PORT}}/$SERVICE_PORT/g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo -e "${GREEN}✓ Configuration generated successfully!${NC}"
echo ""

# Display configuration
echo "----------------------------------------"
echo "Generated Configuration:"
echo "----------------------------------------"
cat "$OUTPUT_FILE"
echo "----------------------------------------"
echo ""

# Next steps
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Add proxy service to docker-compose file:"
echo "   ${SERVICE_NAME}-proxy:"
echo "     image: nginx:alpine"
echo "     container_name: ${SERVICE_NAME}-proxy"
echo "     volumes:"
echo "       - ./tools/compose/${SERVICE_NAME}-nginx-proxy.conf:/etc/nginx/conf.d/default.conf:ro"
echo "     networks:"
echo "       - tradingsystem_backend"
echo "     depends_on:"
echo "       - ${SERVICE_NAME}"
echo ""
echo "2. Configure Traefik labels for the proxy:"
echo "   labels:"
echo "     - \"traefik.enable=true\""
echo "     - \"traefik.http.routers.${SERVICE_NAME}.rule=PathPrefix(\`/automation/${SERVICE_NAME}/\`)\""
echo "     - \"traefik.http.services.${SERVICE_NAME}.loadbalancer.server.port=80\""
echo ""
echo "3. Restart services:"
echo "   docker compose -f your-compose-file.yml up -d"
echo ""

exit 0
