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

# Check B3 containers
echo "2. B3 SERVICES:"
B3_CONTAINER=$(docker ps --filter "name=b3-market-data" --format "{{.Names}}" | head -1)
if [ -n "$B3_CONTAINER" ]; then
    echo "   b3-market-data:"
    echo "     Container: $B3_CONTAINER"
    echo "     Date: $(docker exec $B3_CONTAINER date 2>/dev/null || echo 'Container not running')"
    echo "     TZ var: $(docker exec $B3_CONTAINER printenv TZ 2>/dev/null || echo 'Not set')"
else
    echo "   b3-market-data container not running"
fi
echo ""

# Check TimescaleDB
echo "3. TIMESCALEDB:"
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
echo "4. DATA TIMESTAMPS (TimescaleDB):"
if [ -n "$TIMESCALE_CONTAINER" ]; then
    echo "   Run inside container for detailed checks:"
    echo "     docker exec -it $TIMESCALE_CONTAINER psql -U \${TIMESCALEDB_USER:-timescale} -d \${TIMESCALEDB_DB:-tradingsystem} -c \"SELECT NOW();\""
else
    echo "   TimescaleDB container not available for timestamp verification"
fi
echo ""

# Check Node.js services timezone
echo "5. NODE.JS SERVICES:"
if [ -n "$B3_CONTAINER" ]; then
    echo "   b3-market-data API:"
    docker exec $B3_CONTAINER node -e "
const now = new Date();
console.log('   Date:', now.toISOString());
console.log('   Locale (pt-BR):', now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
console.log('   TZ env:', process.env.TZ || 'Not set');
" 2>/dev/null || echo "   Container not running"
else
    echo "   b3-market-data container not running"
fi
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "✅ All services should show America/Sao_Paulo (UTC-3)"
echo "✅ Timestamps should be in São Paulo time zone"
echo ""
