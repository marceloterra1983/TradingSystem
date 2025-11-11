#!/bin/bash
# ==============================================================================
# Sync Telegram Channels - Auto-populate from messages
# ==============================================================================
# Automatically discovers and registers channels from incoming messages
# ==============================================================================

set -euo pipefail

echo "🔄 Syncing Telegram Channels..."
echo ""

# Count existing channels
EXISTING_COUNT=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.channels;" 2>/dev/null | tr -d ' ')

echo "Current channels in database: $EXISTING_COUNT"
echo ""

# Auto-discover and insert new channels from messages
echo "Discovering channels from messages..."
INSERTED=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "
INSERT INTO telegram_gateway.channels (channel_id, label, description, is_active)
SELECT DISTINCT
    channel_id::bigint,
    'Channel ' || channel_id as label,
    'Auto-discovered from messages' as description,
    true
FROM telegram_gateway.messages
WHERE channel_id IS NOT NULL
  AND channel_id ~ '^-?[0-9]+\$'
  AND channel_id::bigint NOT IN (SELECT channel_id FROM telegram_gateway.channels)
ON CONFLICT (channel_id) DO NOTHING
RETURNING channel_id;
" 2>/dev/null | grep -c "-" || echo "0")

if [ "$INSERTED" -gt 0 ]; then
    echo "✅ Inserted $INSERTED new channels"
else
    echo "✅ No new channels discovered"
fi

# Count total channels now
TOTAL_COUNT=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "SELECT COUNT(*) FROM telegram_gateway.channels;" 2>/dev/null | tr -d ' ')

echo ""
echo "📊 Total channels: $TOTAL_COUNT"
echo ""

# Show top 10 active channels by message count
echo "🔝 Top 10 active channels:"
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT
    c.channel_id,
    c.label,
    COUNT(m.id) as message_count
FROM telegram_gateway.channels c
LEFT JOIN telegram_gateway.messages m ON c.channel_id::text = m.channel_id
GROUP BY c.channel_id, c.label
ORDER BY message_count DESC
LIMIT 10;
" 2>/dev/null

echo ""
echo "✅ Channel sync completed!"
echo ""
echo "Test API endpoint:"
echo "  curl http://localhost:9080/api/telegram-gateway/channels | jq '.data | length'"
