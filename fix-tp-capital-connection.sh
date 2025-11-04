#!/bin/bash
set -e

echo "🔧 Aplicando correção final no TP Capital..."

# Remove linha problemática GATEWAY_DATABASE_URL do docker-compose
sed -i '/GATEWAY_DATABASE_URL.*localhost:5434/d' tools/compose/docker-compose.apps.yml

# Adiciona linha correta se não existir
if ! grep -q "GATEWAY_DATABASE_URL.*telegram-timescale" tools/compose/docker-compose.apps.yml; then
  sed -i '/GATEWAY_DATABASE_HOST=telegram-timescale/a\      - GATEWAY_DATABASE_URL=postgresql://telegram:${TELEGRAM_DB_PASSWORD}@telegram-timescale:5432/telegram_gateway' tools/compose/docker-compose.apps.yml
fi

echo "✅ Correção aplicada"
echo ""
echo "🚀 Reiniciando TP Capital..."

export TELEGRAM_DB_PASSWORD=$(grep "^TELEGRAM_DB_PASSWORD=" .env | cut -d'=' -f2)
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

echo ""
echo "⏳ Aguardando 10s para inicialização..."
sleep 10

echo ""
echo "📊 Verificando health..."
curl -s http://localhost:4006/health | jq '{status, checks}'

echo ""
echo ""
echo "🧪 Testando conexão ao Gateway Database..."
docker exec apps-tpcapital node -e "
const pg = require('pg');
const pool = new pg.Pool({
  host: 'telegram-timescale',
  port: 5432,
  database: 'telegram_gateway',
  user: 'telegram',
  password: process.env.GATEWAY_DATABASE_PASSWORD
});
pool.query('SELECT COUNT(*) as count, status FROM telegram_gateway.messages GROUP BY status')
  .then(r => {
    console.log('✅ Gateway Database: CONECTADO!');
    r.rows.forEach(row => console.log(\`   \${row.status}: \${row.count} mensagens\`));
  })
  .catch(e => console.error('❌ Error:', e.message))
  .finally(() => pool.end());
"

