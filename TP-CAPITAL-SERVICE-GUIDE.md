# TP Capital - Guia Completo do Serviço

## ✅ Status Descoberto

**TP Capital é um SERVIÇO LOCAL (não container)** rodando em **porta 4005**

### Informações do Serviço

| Propriedade | Valor |
|-------------|-------|
| **Tipo** | 🖥️ Serviço Local Node.js |
| **Porta** | **4005** (não 3200!) |
| **Localização** | `apps/tp-capital/` |
| **Status Atual** | ✅ **RODANDO** |
| **Tecnologia** | Express + Telegraf + TimescaleDB |
| **Propósito** | Ingestão de sinais Telegram do TP Capital |

---

## 🔍 Descoberta Importante

### ⚠️ CORREÇÃO: Porta Correta

**ANTES (incorreto):**
- Pensávamos que TP Capital usava porta **3200**

**AGORA (correto):**
- TP Capital usa porta **4005**
- Workspace API usa porta **3200**
- **NÃO há conflito de portas!**

---

## 📊 Mapa de Portas Atualizado

| Serviço | Porta | Tipo | Status |
|---------|-------|------|--------|
| **Workspace API** | 3200 | Local | ❌ Precisa iniciar |
| **Documentation API** | 3400 | Local | ✅ Rodando |
| **B3 Market API** | 3302 | Local | ❌ Precisa iniciar |
| **TP Capital** | **4005** | Local | ✅ **Rodando** |
| **Dashboard** | 3103 | Local | ✅ Rodando |
| **Docusaurus** | 3205 | Local | ✅ Rodando |

---

## 🚀 Como Iniciar TP Capital

### Opção 1: Script Helper (Recomendado)

```bash
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
bash start.sh
```

**O script faz:**
1. ✅ Verifica se porta 4005 está livre
2. ✅ Mata processo anterior se existir
3. ✅ Inicia serviço em modo dev

### Opção 2: NPM Direto

```bash
cd apps/tp-capital
npm run dev
```

### Opção 3: Modo Produção

```bash
cd apps/tp-capital
npm start
```

---

## 🔧 Configuração do Serviço

### Variáveis de Ambiente

**Arquivo:** `apps/tp-capital/.env`

**Principais variáveis:**
```bash
# Porta do serviço
PORT=4005

# TimescaleDB
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=tp_capital
TIMESCALEDB_USER=postgres
TIMESCALEDB_PASSWORD=postgres

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE_NUMBER=your_phone

# CORS
CORS_ORIGIN=http://localhost:3103,http://localhost:3205
DISABLE_CORS=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

---

## 📡 Endpoints Disponíveis

### Health Check

```bash
curl http://localhost:4005/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "tp-capital",
  "timestamp": "2025-10-25T...",
  "uptime": 12345,
  "database": {
    "timescaledb": "connected"
  }
}
```

### Métricas Prometheus

```bash
curl http://localhost:4005/metrics
```

### Webhook Telegram

```bash
POST http://localhost:4005/webhook/telegram
Content-Type: application/json

{
  "update_id": 123,
  "message": {...}
}
```

### Logs em Tempo Real

```bash
curl http://localhost:4005/logs
```

### UI de Status

```bash
# Abra no browser
http://localhost:4005/
```

**Features:**
- 📊 Estatísticas em tempo real
- 📝 Logs streaming
- 🔄 Status de conexões
- 📈 Gráficos de mensagens

---

## 🏗️ Arquitetura do TP Capital

### Componentes

```
TP Capital Service (Port 4005)
├── Express Server
│   ├── Health Endpoint (/health)
│   ├── Webhook Endpoint (/webhook/telegram)
│   ├── Logs Endpoint (/logs)
│   ├── Metrics Endpoint (/metrics)
│   └── Static UI (/)
│
├── Telegram Integration
│   ├── Bot (Telegraf)
│   ├── User Client (Telegram)
│   ├── Channel Forwarder
│   └── Message Parser
│
├── Database
│   ├── TimescaleDB (Port 5433)
│   ├── Hypertables (time-series)
│   └── Signal Storage
│
└── Monitoring
    ├── Prom-client (metrics)
    ├── Pino (logging)
    └── In-memory log store
```

### Fluxo de Dados

```
Telegram Channel
  └─> Bot receives message
      └─> Parse signal
          └─> Validate data
              └─> Store in TimescaleDB
                  └─> Emit metrics
                      └─> Log event
                          └─> Update UI
```

---

## 📊 Integração com Dashboard

### Como o Dashboard Acessa TP Capital

**Config:** `frontend/dashboard/src/config/api.ts`

```typescript
tpCapitalApi: `${baseUrl}/api/tp-capital`
```

**Proxy Vite:** `frontend/dashboard/vite.config.ts`

```typescript
server: {
  proxy: {
    '/api/tp-capital': {
      target: 'http://localhost:4005',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/tp-capital/, ''),
    },
  },
}
```

### Acessando no Dashboard

1. Abra: `http://localhost:3103`
2. Navegue: Apps → TP CAPITAL
3. Veja:
   - 📊 Tabela de sinais em tempo real
   - 🔔 Novas mensagens do Telegram
   - 📈 Gráficos de performance
   - ⚙️ Status de conexões

---

## 🧪 Testes

### Teste 1: Verificar se está rodando

```bash
curl http://localhost:4005/health
```

**Esperado:** Status 200 OK

### Teste 2: Ver logs

```bash
curl http://localhost:4005/logs
```

**Esperado:** Array de logs recentes

### Teste 3: Métricas

```bash
curl http://localhost:4005/metrics | grep tp_capital
```

**Esperado:** Métricas Prometheus

### Teste 4: UI

Abra no browser: `http://localhost:4005/`

**Esperado:** Página de status HTML

### Teste 5: Dashboard Integration

1. Abra: `http://localhost:3103`
2. Vá em: Apps → TP CAPITAL
3. Verifique tabela carrega

---

## 🔄 Reiniciar Serviço

### Stop

```bash
# Encontrar PID
lsof -ti :4005

# Matar processo
kill -9 <PID>

# Ou usar fuser
fuser -k 4005/tcp
```

### Start

```bash
cd apps/tp-capital
bash start.sh
```

### Restart (one-liner)

```bash
fuser -k 4005/tcp 2>/dev/null && sleep 2 && cd apps/tp-capital && bash start.sh
```

---

## 🗄️ Database (TimescaleDB)

### Conexão

**Port:** 5433 (não é o PostgreSQL padrão 5432!)

```bash
# Via psql
psql -h localhost -p 5433 -U postgres -d tp_capital

# Via docker (se TimescaleDB em container)
docker exec -it timescaledb psql -U postgres -d tp_capital
```

### Principais Tabelas

```sql
-- Ver todas as tabelas
\dt

-- Tabela de sinais
SELECT * FROM telegram_signals ORDER BY timestamp DESC LIMIT 10;

-- Tabela de mensagens raw
SELECT * FROM telegram_messages ORDER BY received_at DESC LIMIT 10;

-- Estatísticas
SELECT COUNT(*) as total_signals FROM telegram_signals;
SELECT COUNT(*) as total_messages FROM telegram_messages;
```

---

## 📝 Logs

### Logs em Tempo Real (Terminal)

```bash
cd apps/tp-capital
npm run dev
# Logs aparecem no terminal com Pino pretty-print
```

### Logs via HTTP

```bash
curl http://localhost:4005/logs | jq
```

### Filtrar Logs

```bash
# Apenas erros
curl http://localhost:4005/logs | jq '.[] | select(.level == "error")'

# Últimas 10 mensagens
curl http://localhost:4005/logs | jq '.[-10:]'

# Logs de uma data específica
curl http://localhost:4005/logs | jq '.[] | select(.time | contains("2025-10-25"))'
```

---

## ⚠️ Troubleshooting

### Porta 4005 já em uso

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::4005
```

**Solução:**
```bash
# Matar processo na porta
fuser -k 4005/tcp

# Ou usar o script que já faz isso
bash start.sh
```

### Não conecta no TimescaleDB

**Sintoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:5433
```

**Solução:**
```bash
# Verificar se TimescaleDB está rodando
docker ps | grep timescale

# Iniciar TimescaleDB
docker compose up -d timescaledb

# Verificar porta
psql -h localhost -p 5433 -U postgres -l
```

### Bot Telegram não responde

**Sintoma:** Mensagens não chegam no serviço

**Soluções:**
1. Verificar token no `.env`:
   ```bash
   grep TELEGRAM_BOT_TOKEN apps/tp-capital/.env
   ```

2. Testar bot manualmente:
   ```bash
   cd apps/tp-capital
   node test-bot-connection.js
   ```

3. Verificar webhook:
   ```bash
   curl -X POST http://localhost:4005/webhook/telegram \
     -H "Content-Type: application/json" \
     -d '{"update_id":1,"message":{"text":"test"}}'
   ```

### Dashboard não mostra sinais

**Sintoma:** Tabela vazia em Apps → TP CAPITAL

**Soluções:**
1. Verificar se TP Capital está rodando:
   ```bash
   curl http://localhost:4005/health
   ```

2. Verificar proxy do Vite:
   ```bash
   # Console do browser deve mostrar requisições para /api/tp-capital
   ```

3. Verificar dados no banco:
   ```sql
   SELECT COUNT(*) FROM telegram_signals;
   ```

---

## 📚 Scripts Disponíveis

### Desenvolvimento

```bash
npm run dev          # Modo dev com watch
npm run dev:stable   # Modo dev sem watch
npm start           # Modo produção
```

### Testes

```bash
npm test                        # Todos os testes
node test-bot-connection.js     # Testar conexão do bot
node test-connection.js         # Testar conexão geral
node test-forwarder.js          # Testar forwarder
```

### Utilitários

```bash
node authenticate-user.js       # Autenticar usuário Telegram
node update-channel-names.js    # Atualizar nomes de canais
node reset-webhook.js           # Resetar webhook do bot
bash monitor-forwarder.sh       # Monitorar forwarder
```

### Database

```bash
npm run seed                    # Popular com dados de exemplo
```

---

## 🔐 Segurança

### Rate Limiting

- **Window:** 60 segundos (1 minuto)
- **Max Requests:** 120 requisições
- **Headers:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### CORS

- **Origens Permitidas:** `http://localhost:3103`, `http://localhost:3205`
- **Credentials:** Habilitado
- **Pode desabilitar:** `DISABLE_CORS=true`

### Helmet

- Proteção contra ataques XSS
- Content Security Policy
- Headers de segurança padrão

---

## 📊 Métricas Prometheus

### Principais Métricas

```prometheus
# HTTP
http_request_duration_seconds
http_requests_total

# Telegram
tp_capital_messages_received_total
tp_capital_signals_parsed_total
tp_capital_bot_connected

# Database
tp_capital_db_queries_total
tp_capital_db_query_duration_seconds

# System
process_cpu_user_seconds_total
nodejs_heap_size_total_bytes
```

### Visualizar no Browser

```bash
curl http://localhost:4005/metrics
```

### Grafana Dashboard

Se Grafana estiver configurado, importar métricas de:
```
http://localhost:4005/metrics
```

---

## 🎯 Status Atual

### ✅ Confirmado

- [x] **TP Capital está RODANDO**
- [x] **Porta: 4005**
- [x] **Tipo: Serviço Local (Node.js)**
- [x] **Health check OK**
- [x] **Não há conflito com Workspace API (3200)**
- [x] **Script de start disponível**
- [x] **Documentação completa**

---

## 🚀 Próximos Passos

### 1. Atualizar Documentação de Portas

Corrigir referências incorretas que mencionam TP Capital na porta 3200.

### 2. Atualizar Script de Check

Adicionar porta 4005 ao `scripts/check-apis.sh`

### 3. Documentar no START-APIS.md

Adicionar seção específica para TP Capital.

---

## 📝 Resumo

**TP Capital:**
- ✅ É um **serviço local** Node.js
- ✅ Roda na porta **4005**
- ✅ **NÃO é container Docker**
- ✅ **Já está rodando** no seu sistema
- ✅ Usa **TimescaleDB** (porta 5433)
- ✅ Integrado com **Telegram** (Bot + User Client)
- ✅ Acessível via dashboard em **Apps → TP CAPITAL**

---

**Criado:** 2025-10-25
**Versão:** 1.0.0
**Status:** ✅ Documentação Completa
