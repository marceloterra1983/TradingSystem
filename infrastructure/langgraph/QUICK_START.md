# LangGraph Service - Quick Start Guide

**⏱️ Tempo estimado:** 10 minutos  
**✅ Status:** Production Ready

---

## 🚀 Deploy em 5 Passos

### 1. Setup Database (2 minutos)

```bash
cd /home/marce/projetos/TradingSystem

# PostgreSQL
psql -U postgres -d tradingsystem -f backend/data/postgresql/schemas/langgraph_checkpoints.sql

# QuestDB
curl -G "http://localhost:9000/exec" \
  --data-urlencode "query=$(cat backend/data/questdb/schemas/langgraph_events.sql)"
```

### 2. Configure Environment (1 minuto)

Adicione ao `.env` do projeto (raiz):

```bash
# Copie estas variáveis essenciais:
LANGGRAPH_PORT=8111
LANGGRAPH_ENV=production
POSTGRES_HOST=localhost
POSTGRES_DB=tradingsystem
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_PASSWORD_HERE
QUESTDB_HOST=localhost
AGNO_API_URL=http://localhost:8200
ENABLE_TRADING_WORKFLOWS=true
ENABLE_DOCS_WORKFLOWS=true
```

**Arquivo completo:** Ver `ENV_VARS.md`

### 3. Build & Deploy (2 minutos)

```bash
# Build container
docker compose -f infrastructure/compose/docker-compose.infra.yml build langgraph

# Start service
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph

# Check logs
docker logs infra-langgraph --tail 50
```

### 4. Verify Health (30 segundos)

```bash
# Health check
curl http://localhost:8111/health | jq

# Expected output:
# {
#   "status": "healthy",
#   "service": "langgraph",
#   "version": "2.0.0",
#   "dependencies": {
#     "agno_agents": "healthy",
#     ...
#   }
# }
```

### 5. Test Workflows (3 minutos)

**Test Trading Workflow:**
```bash
curl -X POST http://localhost:8111/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "WINZ25",
    "mode": "paper"
  }' | jq

# Expected: {"run_id": "...", "status": "completed"}
```

**Test Docs Review:**
```bash
curl -X POST http://localhost:8111/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test Doc\nContent here",
    "operation": "review"
  }' | jq

# Expected: {"run_id": "...", "status": "completed"}
```

---

## 📊 Verificar Execuções

### PostgreSQL (Checkpoints)

```sql
-- Últimas execuções
SELECT 
  run_id,
  workflow_type,
  status,
  started_at,
  completed_at
FROM langgraph_runs
ORDER BY started_at DESC
LIMIT 10;
```

### QuestDB (Events)

```sql
-- Eventos recentes
SELECT 
  timestamp,
  workflow_name,
  node_name,
  status,
  duration_ms
FROM langgraph_events
WHERE timestamp > dateadd('h', -1, now())
ORDER BY timestamp DESC;
```

---

## 🔧 Troubleshooting Rápido

### Service não inicia

```bash
# Verificar se portas estão livres
netstat -tuln | grep 8111

# Verificar logs detalhados
docker logs infra-langgraph

# Rebuild forçado
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d --force-recreate langgraph
```

### Database connection error

```bash
# Test PostgreSQL
psql -U postgres -d tradingsystem -c "SELECT 1"

# Test QuestDB
curl "http://localhost:9000/exec?query=SELECT 1"

# Verify .env has correct credentials
cat .env | grep POSTGRES
```

### Workflow execution fails

```bash
# Check Agno Agents
curl http://localhost:8200/health

# Check DocsAPI
curl http://localhost:3400/health

# Check Firecrawl
curl http://localhost:3600/health

# Review dependency status
curl http://localhost:8111/health?detailed=true | jq
```

---

## 📚 Próximos Passos

1. **Configure Monitoring:**
   - Add Prometheus scrape: `http://localhost:8111/metrics`
   - Create Grafana dashboard

2. **Test Integration:**
   - Run full trading workflow with real Agno
   - Test docs review with real DocsAPI

3. **Enable Features:**
   - Set `LLM_ENRICHMENT_ENABLED=true` (if using LLM)
   - Configure webhooks (coming in D6+)

4. **Production Hardening:**
   - Set secure PostgreSQL password
   - Configure TLS (if needed)
   - Set up log rotation
   - Configure backup strategy

---

## 📖 Documentação Completa

- **[README.md](README.md)** - Guia completo do serviço
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Detalhes da implementação
- **[ENV_VARS.md](ENV_VARS.md)** - Todas as variáveis de ambiente
- **[Implementation Guide](../../docs/context/backend/guides/langgraph-implementation-guide.md)** - Guia técnico com diagramas

---

## 🎯 API Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/workflows/trading/execute` | POST | Execute trading workflow |
| `/workflows/docs/review` | POST | Review document |
| `/workflows/docs/enrich` | POST | Enrich document |

---

## ✅ Success Checklist

- [ ] Database schemas created
- [ ] Environment variables configured
- [ ] Service started and healthy
- [ ] Trading workflow tested
- [ ] Docs workflow tested
- [ ] Monitoring configured
- [ ] Logs reviewed

---

**Status:** ✅ Ready to Use  
**Support:** Ver documentação completa em `README.md`  
**Issues:** Check logs → Check dependencies → Check `.env`

