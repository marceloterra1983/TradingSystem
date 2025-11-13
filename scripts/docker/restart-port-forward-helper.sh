#!/usr/bin/env bash
# Helper script to restart port forwarding (no sudo required after socat is installed)

set -e

# Stop old processes
pkill -f "socat TCP-LISTEN:(9082|9083|3601)" 2>/dev/null || true

# Get container IPs
TRAEFIK_IP=$(docker inspect api-gateway | jq -r '.[0].NetworkSettings.Networks.tradingsystem_backend.IPAddress')
COURSE_CRAWLER_IP=$(docker inspect course-crawler-api | jq -r '.[0].NetworkSettings.Networks | to_entries[0].value.IPAddress')

echo "Starting port forwarding..."
echo "  Traefik IP: $TRAEFIK_IP"
echo "  Course Crawler IP: $COURSE_CRAWLER_IP"

# Start forwarding (using nohup to avoid background job warnings)
nohup socat TCP-LISTEN:9082,fork,reuseaddr TCP:$TRAEFIK_IP:9080 > /tmp/socat-9082.log 2>&1 &
nohup socat TCP-LISTEN:9083,fork,reuseaddr TCP:$TRAEFIK_IP:8080 > /tmp/socat-9083.log 2>&1 &
nohup socat TCP-LISTEN:3601,fork,reuseaddr TCP:$COURSE_CRAWLER_IP:3601 > /tmp/socat-3601.log 2>&1 &

sleep 1

echo "Port forwarding started!"
echo ""
echo "Test with:"
echo "  curl http://localhost:9082/api/channels"
echo "  curl http://localhost:3601/health"
