# Evolution API - Nota de Acesso

**Data:** 2025-11-11
**Status:** ℹ️ **INFORMAÇÃO IMPORTANTE**

---

## 🔗 Acesso ao Evolution Manager UI

### ⚠️ IMPORTANTE: Acesso Direto Obrigatório

O **Evolution Manager UI** deve ser acessado **diretamente na porta 4203**, não via Traefik API Gateway.

### URL de Acesso

```
http://localhost:4203/manager

**✅ Dashboard configurado:** O link no Dashboard do TradingSystem já aponta corretamente para `/manager`.
```

**NÃO usar:**
- ❌ `http://localhost:9080/evolution` (Traefik não roteia)
- ❌ `http://localhost:4203` (precisa do path `/manager`)

### Motivo

O Evolution Manager UI é uma aplicação **NGINX estática** que serve arquivos React buildados. O roteamento interno do NGINX espera o path `/manager` para funcionar corretamente.

**Configuração NGINX:**
```nginx
# tools/compose/evolution/nginx-manager.conf
location /manager {
    try_files $uri $uri/ /manager/index.html;
}
```

---

## 📊 Evolution API Stack - Portas

### Serviços da Stack

| Serviço | Porta | Protocolo | Acesso | Descrição |
|---------|-------|-----------|--------|-----------|
| **evolution-api** | 4100 | HTTP | API direta | Evolution API core (WhatsApp Baileys) |
| **evolution-manager** | 4203 | HTTP | **Direct only** | Evolution Manager UI (NGINX + React) |
| evolution-postgres | 5437 | PostgreSQL | Interno | PostgreSQL 16 (Prisma backend) |
| evolution-pgbouncer | 6436 | PostgreSQL | Interno | PgBouncer connection pooler |
| evolution-redis | 6388 | Redis | Interno | Redis cache (sessions/buffers) |
| evolution-minio | 9310 | HTTP | Interno | MinIO API (S3 media storage) |
| evolution-minio-console | 9311 | HTTP | Direto | MinIO Console UI |

---

## 🚀 Como Usar

### 1. Iniciar a Stack

```bash
cd tools/compose
docker compose -f docker-compose.5-2-evolution-api-stack.yml up -d
```

### 2. Verificar Health

```bash
docker ps --filter "label=com.tradingsystem.stack=evolution-api"
```

**Containers esperados (6):**
- ✅ evolution-api (core service)
- ✅ evolution-manager (UI dashboard)
- ✅ evolution-postgres (database)
- ✅ evolution-pgbouncer (connection pool)
- ✅ evolution-redis (cache)
- ✅ evolution-minio (object storage)

### 3. Acessar Manager UI

```bash
# Abrir no navegador
http://localhost:4203/manager

**✅ Dashboard configurado:** O link no Dashboard do TradingSystem já aponta corretamente para `/manager`.
```

### 4. Configurar API Base URL

No Evolution Manager, configurar:
```
API Base URL: http://localhost:4100
```

---

## 🔐 Autenticação

### Evolution API

**Global API Key** (configurável em `.env`):

```bash
EVOLUTION_API_GLOBAL_KEY_NAME=global-key
AUTHENTICATION_TYPE=global
AUTHENTICATION_ENABLED=true
```

**Header para requisições API:**
```bash
apikey: <seu-global-key>
```

**Exemplo:**
```bash
curl -X GET 'http://localhost:4100/instance/fetchInstances' \
  -H "apikey: your-global-key-here"
```

---

## 📡 Endpoints Disponíveis

### Via Evolution API (Port 4100)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/instance/create` | POST | Criar nova instância WhatsApp |
| `/instance/fetchInstances` | GET | Listar instâncias ativas |
| `/instance/connect/{instance}` | GET | Conectar instância |
| `/instance/connectionState/{instance}` | GET | Estado da conexão |
| `/message/sendText/{instance}` | POST | Enviar mensagem de texto |
| `/webhook/set/{instance}` | POST | Configurar webhook |
| `/metrics` | GET | Prometheus metrics |

**Documentação completa:** `http://localhost:4100/swagger`

---

## 🔗 Integração com TradingSystem

### Webhook para Mensagens

O Evolution API pode enviar mensagens recebidas para o sistema via webhook:

```bash
curl -X POST 'http://localhost:4100/webhook/set/my-instance' \
  -H "apikey: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "http://host.docker.internal:9080/api/tp-capital/webhook/whatsapp",
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE"
    ]
  }'
```

### Comparação com Telegram Gateway

| Feature | Telegram Gateway | Evolution API |
|---------|------------------|---------------|
| **Protocolo** | MTProto (Telegram) | Baileys (WhatsApp) |
| **Storage** | TimescaleDB | PostgreSQL + MinIO |
| **Cache** | Redis Sentinel | Redis single |
| **Routing** | Via Traefik | Direct access |
| **UI Manager** | Custom React | Official Evolution Manager |
| **Media Storage** | Database | S3 (MinIO) |

---

## ⚙️ Configuração Avançada

### Variáveis de Ambiente (.env)

```bash
# Evolution API
EVOLUTION_API_PORT=4100
EVOLUTION_API_HOST_BIND=127.0.0.1
EVOLUTION_API_PUBLIC_URL=http://localhost:4100

# Evolution Manager
EVOLUTION_MANAGER_PORT=4203
EVOLUTION_MANAGER_HOST_BIND=127.0.0.1
EVOLUTION_MANAGER_API_BASE_URL=http://evolution-api:8080

# Database
EVOLUTION_DB_PORT=5437
EVOLUTION_DB_NAME=evolution
EVOLUTION_DB_USER=evolution
EVOLUTION_DB_PASSWORD=evolutiondb

# PgBouncer
EVOLUTION_PGBOUNCER_PORT=6436

# Redis
EVOLUTION_REDIS_PORT=6388

# MinIO
EVOLUTION_MINIO_API_PORT=9310
EVOLUTION_MINIO_CONSOLE_PORT=9311
EVOLUTION_MINIO_BUCKET=evolution-media
```

---

## 🧪 Validação

### 1. Test: Evolution API Health
```bash
curl http://localhost:4100/
# ✅ {"status": "ok"}
```

### 2. Test: Metrics Endpoint
```bash
curl http://localhost:4100/metrics
# ✅ # HELP evolution_...
```

### 3. Test: Manager UI Access
```bash
curl -I http://localhost:4203/manager

**✅ Dashboard configurado:** O link no Dashboard do TradingSystem já aponta corretamente para `/manager`.
# ✅ HTTP/1.1 200 OK
```

### 4. Test: PostgreSQL Connection
```bash
docker exec evolution-postgres psql -U evolution -d evolution -c "SELECT 1;"
# ✅  ?column?
#    ----------
#            1
```

---

## 📚 Documentação Relacionada

- **Stack Compose:** `tools/compose/docker-compose.5-2-evolution-api-stack.yml`
- **NGINX Config:** `tools/compose/evolution/nginx-manager.conf`
- **PostgreSQL Config:** `tools/compose/evolution/postgresql.conf`
- **Official Docs:** https://doc.evolution-api.com/
- **GitHub:** https://github.com/EvolutionAPI/evolution-api

---

## 🎓 Lições Importantes

### 1. Path-Based Routing no NGINX
**Conceito:** SPAs (Single Page Applications) precisam de paths específicos configurados no NGINX para funcionar corretamente.

**Evolution Manager:**
```nginx
location /manager {
    try_files $uri $uri/ /manager/index.html;
}
```

Sem o path `/manager`, o NGINX não encontra os arquivos estáticos.

### 2. Direct Access vs Traefik Gateway
**Não integrado com Traefik porque:**
- NGINX estático serve arquivos React buildados
- Path `/manager` é hardcoded na aplicação
- Não é uma API REST tradicional
- UI Manager é ferramenta administrativa, não de produção

### 3. S3-Compatible Storage
**MinIO** fornece API compatível com S3 para armazenar:
- Imagens/vídeos recebidos via WhatsApp
- QR codes de autenticação
- Backups de sessões

**Vantagem:** Não sobrecarrega banco de dados com BLOBs.

---

## 🚨 Troubleshooting

### Manager UI não carrega
```bash
# 1. Verificar se container está running
docker ps --filter "name=evolution-manager"

# 2. Verificar logs
docker logs evolution-manager --tail 50

# 3. Testar NGINX
docker exec evolution-manager cat /etc/nginx/conf.d/nginx.conf

# 4. Acessar com path correto
http://localhost:4203/manager

**✅ Dashboard configurado:** O link no Dashboard do TradingSystem já aponta corretamente para `/manager`.  # ✅ Correto
http://localhost:4203           # ❌ Errado
```

### API não responde
```bash
# 1. Verificar health da stack
docker compose -f tools/compose/docker-compose.5-2-evolution-api-stack.yml ps

# 2. Verificar conexão com PostgreSQL
docker exec evolution-api wget -q -O- http://evolution-pgbouncer:6432

# 3. Verificar logs
docker logs evolution-api --tail 100 | grep -i error
```

### MinIO não inicializa bucket
```bash
# 1. Verificar init job
docker logs evolution-minio-init

# 2. Criar bucket manualmente
docker exec evolution-minio-init \
  mc alias set evo http://evolution-minio:9000 evolution evolutionminio

docker exec evolution-minio-init \
  mc mb evo/evolution-media

docker exec evolution-minio-init \
  mc anonymous set download evo/evolution-media
```

---

**Resumo:** Evolution Manager UI deve ser acessado em `http://localhost:4203/manager

**✅ Dashboard configurado:** O link no Dashboard do TradingSystem já aponta corretamente para `/manager`.` (acesso direto, não via Traefik).

Para integrações programáticas, use a Evolution API em `http://localhost:4100` com autenticação via header `apikey`.
