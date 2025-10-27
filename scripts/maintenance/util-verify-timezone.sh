#!/bin/bash
# Script to verify timezone configuration across all trading system components

echo "=========================================="
echo "TIMEZONE VERIFICATION - São Paulo Market"
echo "=========================================="
echo ""

echo "Expected: America/Sao_Paulo (UTC-3)"
echo ""

# Check host system
echo "1. HOST SYSTEM:"
echo "   Date: $(date)"
echo "   Timezone: $(cat /etc/timezone 2>/dev/null || echo 'Not set in /etc/timezone')"
echo ""

# Check TimescaleDB
echo "2. TIMESCALEDB:"
TIMESCALE_CONTAINER=$(docker ps --filter "name=data-timescaledb" --format "{{.Names}}" | head -1)
if [ -n "$TIMESCALE_CONTAINER" ]; then
    echo "   Container: $TIMESCALE_CONTAINER"
    echo "   Date: $(docker exec $TIMESCALE_CONTAINER date 2>/dev/null || echo 'Container not running')"
    echo "   TZ var: $(docker exec $TIMESCALE_CONTAINER printenv TZ 2>/dev/null || echo 'Not set')"
else
    echo "   Status: Not running"
fi
echo ""

# Check data timestamps (TimescaleDB placeholder)
echo "3. DATA TIMESTAMPS (TimescaleDB):"
if [ -n "$TIMESCALE_CONTAINER" ]; then
    echo "   Run inside container for detailed checks:"
    echo "     docker exec -it $TIMESCALE_CONTAINER psql -U \${TIMESCALEDB_USER:-timescale} -d \${TIMESCALEDB_DB:-tradingsystem} -c \"SELECT NOW();\""
else
    echo "   TimescaleDB container not available for timestamp verification"
fi
echo ""

# Check Node.js services timezone
echo "4. NODE.JS SERVICES:"
echo "   (Verifique apenas serviços de API ativos conforme necessário.)"
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "✅ All services should show America/Sao_Paulo (UTC-3)"
echo "✅ Timestamps should be in São Paulo time zone"
echo ""
