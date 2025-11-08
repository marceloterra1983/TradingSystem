# WhatsApp Gateway Stack - Setup Completo

## 📋 Resumo

Foi criada uma stack completa de WhatsApp Gateway similar ao Telegram Stack, incluindo:

✅ **Infraestrutura completa** (Docker Compose com 8 containers)  
✅ **Banco de dados** (TimescaleDB com schemas completos)  
✅ **API REST** (Express.js com webhook e sincronização)  
✅ **Serviço de sync** (Worker em background)  
✅ **Armazenamento de mídia** (MinIO S3-compatible)  
✅ **Scripts de gerenciamento** (startup, health-check)  
✅ **Documentação completa**

---

## 🗂️ Arquivos Criados

### Docker Compose Stack

```
tools/compose/docker-compose.whatsapp.yml    # Stack completa (8 containers)
tools/compose/whatsapp/postgresql.conf       # Configuração do PostgreSQL
```

### Schemas SQL (TimescaleDB)

```
backend/data/timescaledb/whatsapp-gateway/
├── 01_init_schema.sql           # Inicialização do schema
├── 02_contacts_table.sql        # Tabela de contatos e grupos
├── 03_messages_table.sql        # Tabela de mensagens (hypertable)
├── 04_media_downloads_table.sql # Tabela de downloads de mídia
├── 05_sync_state_table.sql      # Tabela de estado de sincronização
└── 06_sessions_table.sql        # Tabela de sessões WhatsApp
```

### Gateway API (Express)

```
backend/api/whatsapp-gateway/
├── package.json                 # Dependências
├── Dockerfile                   # Container da API
└── src/
    ├── config/
    │   └── env.js              # Configuração de ambiente
    ├── db/
    │   └── pool.js             # Pool de conexões PostgreSQL
    ├── services/
    │   ├── messageService.js   # Serviço de mensagens
    │   ├── mediaService.js     # Serviço de mídia (MinIO)
    │   ├── contactService.js   # Serviço de contatos
    │   └── sessionService.js   # Serviço de sessões
    ├── routes/
    │   └── webhook.js          # Rotas de webhook
    ├── utils/
    │   └── logger.js           # Logger Winston
    └── server.js               # Servidor Express
```

### Sync Service (Background Worker)

```
backend/services/whatsapp-sync/
├── package.json                 # Dependências
├── Dockerfile                   # Container do worker
└── src/
    └── index.js                # Worker de sincronização
```

### Scripts de Gerenciamento

```
scripts/whatsapp/
├── start-stack.sh              # Script de inicialização
└── health-check.sh             # Script de health check
```

### Documentação

```
docs/content/apps/whatsapp-gateway/
├── README.md                   # Documentação principal
└── CONFIGURATION.md            # Guia de configuração
```

---

## 🚀 Como Iniciar

### 1. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env` na raiz do projeto:

```bash
# WhatsApp Database
WHATSAPP_DB_USER=whatsapp
WHATSAPP_DB_PASSWORD=seu-password-seguro
WHATSAPP_DB_PORT=5435
WHATSAPP_PGBOUNCER_PORT=6435

# WhatsApp Core (WAHA)
WHATSAPP_CORE_PORT=3311
WHATSAPP_API_KEY=sua-api-key-aqui
WHATSAPP_DASHBOARD_ENABLED=true
WHATSAPP_DASHBOARD_USERNAME=admin
WHATSAPP_DASHBOARD_PASSWORD=seu-password-dashboard

# Gateway API
WHATSAPP_GATEWAY_API_PORT=4011
WHATSAPP_GATEWAY_API_TOKEN=seu-api-token-aqui
WHATSAPP_WEBHOOK_TOKEN=seu-webhook-token-aqui

# Redis
WHATSAPP_REDIS_PORT=6380
WHATSAPP_REDIS_ENABLED=true

# MinIO
WHATSAPP_MINIO_API_PORT=9302
WHATSAPP_MINIO_CONSOLE_PORT=9303
WHATSAPP_MINIO_ROOT_USER=whatsappadmin
WHATSAPP_MINIO_ROOT_PASSWORD=seu-minio-password
WHATSAPP_MINIO_BUCKET=whatsapp-media

# Sync Settings
WHATSAPP_SYNC_ENABLED=true
WHATSAPP_SYNC_INTERVAL_MS=300000  # 5 minutos
WHATSAPP_SYNC_BATCH_SIZE=100
WHATSAPP_SYNC_LOOKBACK_DAYS=7
```

### 2. Iniciar a Stack

```bash
# Opção 1: Usar o script (recomendado)
bash scripts/whatsapp/start-stack.sh

# Opção 2: Docker Compose manual
docker compose -f tools/compose/docker-compose.whatsapp.yml up -d
```

### 3. Criar Sessão WhatsApp

1. Acesse: http://localhost:3311/dashboard
2. Login com credenciais do `.env`
3. Clique em "Create Session"
4. Escaneie o QR code com o WhatsApp no celular
5. Aguarde status "Connected"

### 4. Verificar Funcionamento

```bash
# Health check completo
bash scripts/whatsapp/health-check.sh

# Ver logs
docker compose -f tools/compose/docker-compose.whatsapp.yml logs -f

# Verificar banco de dados
docker exec -it whatsapp-timescale psql -U whatsapp -d whatsapp_gateway

# Contar mensagens
docker exec whatsapp-timescale psql -U whatsapp -d whatsapp_gateway \
  -c "SELECT COUNT(*) FROM whatsapp_gateway.messages;"
```

---

## 📊 Estrutura da Stack

### Containers

1. **whatsapp-timescaledb** (Port 5435)
   - Banco de dados TimescaleDB
   - Armazena mensagens, contatos, sessões

2. **whatsapp-pgbouncer** (Port 6435)
   - Connection pooling
   - Reduz overhead de conexões

3. **whatsapp-redis** (Port 6380)
   - Cache de dados
   - Fila de sincronização

4. **whatsapp-minio** (Ports 9302/9303)
   - Armazenamento S3-compatible
   - Mídia e thumbnails

5. **whatsapp-gateway-core** (Port 3311)
   - WAHA (WhatsApp HTTP API)
   - Conexão com WhatsApp

6. **whatsapp-gateway-api** (Port 4011)
   - API REST
   - Webhook receiver
   - Query endpoint

7. **whatsapp-sync-service**
   - Worker background
   - Sincronização automática

8. **whatsapp-minio-init**
   - One-shot container
   - Cria bucket inicial

### Fluxo de Dados

```
WhatsApp → WAHA → Webhook → Gateway API → TimescaleDB
                                ↓
                           MinIO (mídia)

Background: Sync Service → WAHA API → Gateway API → TimescaleDB
```

---

## 🛠️ Comandos Úteis

### Gerenciamento

```bash
# Parar stack
docker compose -f tools/compose/docker-compose.whatsapp.yml down

# Ver logs de um serviço
docker logs whatsapp-gateway-api -f

# Reiniciar serviço específico
docker compose -f tools/compose/docker-compose.whatsapp.yml restart whatsapp-sync-service
```

### Banco de Dados

```bash
# Acessar PostgreSQL
docker exec -it whatsapp-timescale psql -U whatsapp -d whatsapp_gateway

# Backup
docker exec whatsapp-timescale pg_dump -U whatsapp whatsapp_gateway > backup.sql

# Restore
docker exec -i whatsapp-timescale psql -U whatsapp whatsapp_gateway < backup.sql

# Queries úteis
SELECT COUNT(*) FROM whatsapp_gateway.messages;
SELECT COUNT(*) FROM whatsapp_gateway.contacts;
SELECT * FROM whatsapp_gateway.active_sessions;
SELECT * FROM whatsapp_gateway.sync_queue;
```

### MinIO

```bash
# Acessar console
open http://localhost:9303

# Listar buckets via CLI
docker exec whatsapp-minio mc ls whatsapp/whatsapp-media/
```

---

## 📡 API Endpoints

### Gateway API

Base: `http://localhost:4011`

Header: `X-Api-Token: SEU_TOKEN`

```bash
# Listar mensagens
curl -H "X-Api-Token: $WHATSAPP_GATEWAY_API_TOKEN" \
  "http://localhost:4011/api/messages/session-name/chat-id?limit=50"

# Listar contatos
curl -H "X-Api-Token: $WHATSAPP_GATEWAY_API_TOKEN" \
  "http://localhost:4011/api/contacts/session-name"

# Listar sessões
curl -H "X-Api-Token: $WHATSAPP_GATEWAY_API_TOKEN" \
  "http://localhost:4011/api/sessions"

# Health check
curl http://localhost:4011/health
```

---

## 🔍 Troubleshooting

### Mensagens não estão sendo salvas

1. Verificar logs: `docker logs whatsapp-gateway-api`
2. Verificar webhook no WAHA dashboard
3. Testar conexão com banco: `docker exec whatsapp-timescale pg_isready`

### Sync não está funcionando

1. Ver logs: `docker logs whatsapp-sync-service`
2. Verificar fila: `SELECT * FROM whatsapp_gateway.sync_queue;`
3. Verificar API do WAHA: `curl http://localhost:3311/health`

### Downloads de mídia falhando

1. Verificar MinIO: `curl http://localhost:9302/minio/health/live`
2. Ver tabela: `SELECT * FROM whatsapp_gateway.media_downloads WHERE download_status = 'failed';`
3. Verificar espaço em disco: `df -h`

---

## 📚 Documentação Completa

- **[README Principal](docs/content/apps/whatsapp-gateway/README.md)**
- **[Guia de Configuração](docs/content/apps/whatsapp-gateway/CONFIGURATION.md)**
- **[Comparação com Telegram Stack](docs/content/apps/telegram-gateway/README.md)**

---

## ✅ Checklist de Implementação

- [x] Docker Compose stack com 8 containers
- [x] Schemas SQL completos (TimescaleDB)
- [x] Gateway API (Express + Webhook)
- [x] Sync Service (Background worker)
- [x] Armazenamento de mídia (MinIO)
- [x] Scripts de gerenciamento
- [x] Documentação completa
- [x] Health checks
- [x] Retry logic
- [x] Logs estruturados
- [x] Security best practices

---

## 🎯 Próximos Passos

1. **Teste a stack** com uma conta WhatsApp real
2. **Ajuste configurações** conforme necessário (sync interval, batch size, etc.)
3. **Configure backups** automáticos do banco de dados
4. **Implemente monitoring** (Prometheus + Grafana)
5. **Adicione testes** automatizados
6. **Integre com frontend** (dashboard React)

---

**Criado em:** 2025-11-08  
**Stack similar:** [Telegram Gateway](docs/content/apps/telegram-gateway/README.md)  
**Versão:** 1.0.0

