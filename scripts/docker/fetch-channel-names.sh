#!/bin/bash
# ==============================================================================
# Fetch Channel Names - Get real names from Telegram
# ==============================================================================
# Fetches real channel names/titles from Telegram and updates database
# ==============================================================================

set -euo pipefail

echo "🔍 Buscando nomes reais dos canais do Telegram..."
echo ""

# Step 1: Get current channels from database
echo "1️⃣  Listando canais cadastrados..."
CHANNELS=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "
SELECT channel_id
FROM telegram_gateway.channels
WHERE label LIKE 'Channel -%'
ORDER BY id;
" 2>/dev/null | tr -d ' ')

if [ -z "$CHANNELS" ]; then
    echo "✅ Todos os canais já possuem nomes personalizados!"
    exit 0
fi

CHANNEL_COUNT=$(echo "$CHANNELS" | wc -l)
echo "📊 Encontrados $CHANNEL_COUNT canais com nomes genéricos"
echo ""

# Step 2: For each channel, try to get the title from messages
echo "2️⃣  Buscando nomes a partir das mensagens mais recentes..."
echo ""

UPDATED_COUNT=0

while IFS= read -r CHANNEL_ID; do
    [ -z "$CHANNEL_ID" ] && continue

    # Try to get channel title from most recent message metadata
    CHANNEL_TITLE=$(docker exec telegram-timescale psql -U telegram -d telegram_gateway -t -c "
SELECT
    COALESCE(
        metadata->>'channelTitle',
        metadata->>'channel_title',
        'Canal ' || channel_id
    ) as title
FROM telegram_gateway.messages
WHERE channel_id = '$CHANNEL_ID'
  AND (
      metadata->>'channelTitle' IS NOT NULL
      OR metadata->>'channel_title' IS NOT NULL
  )
ORDER BY created_at DESC
LIMIT 1;
" 2>/dev/null | tr -d ' ' | head -1)

    if [ -n "$CHANNEL_TITLE" ] && [ "$CHANNEL_TITLE" != "Canal$CHANNEL_ID" ]; then
        # Update database with real name
        docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
UPDATE telegram_gateway.channels
SET
    label = '$CHANNEL_TITLE',
    description = 'Nome real do canal Telegram',
    updated_at = NOW()
WHERE channel_id = $CHANNEL_ID;
" &>/dev/null

        echo "✅ $CHANNEL_ID → $CHANNEL_TITLE"
        ((UPDATED_COUNT++))
    else
        echo "⏭️  $CHANNEL_ID → Nome não encontrado nas mensagens"
    fi
done <<< "$CHANNELS"

echo ""
echo "📊 Resultado:"
echo "   Total de canais verificados: $CHANNEL_COUNT"
echo "   Canais atualizados: $UPDATED_COUNT"
echo "   Canais sem nome: $((CHANNEL_COUNT - UPDATED_COUNT))"

if [ $UPDATED_COUNT -gt 0 ]; then
    echo ""
    echo "✅ Nomes atualizados com sucesso!"
    echo ""
    echo "📋 Canais atualizados:"
    docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT
    channel_id,
    label,
    description
FROM telegram_gateway.channels
WHERE description = 'Nome real do canal Telegram'
ORDER BY label;
" 2>/dev/null
fi

echo ""
echo "💡 Para ver todos os canais:"
echo "   docker exec telegram-timescale psql -U telegram -d telegram_gateway -c 'SELECT * FROM telegram_gateway.channels;'"
