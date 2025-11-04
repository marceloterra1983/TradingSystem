# 🚀 Deploy Sprint 1 - Instruções Rápidas

## ✅ Pré-requisitos

Antes de começar o deploy, execute:

```bash
# 1. Configure o INTER_SERVICE_SECRET (NECESSÁRIO!)
bash scripts/setup/configure-inter-service-secret.sh
```

---

## 🎯 Opção 1: Deploy Completo (RECOMENDADO)

Deploy completo com validação e health checks:

```bash
bash scripts/deployment/deploy-rag-sprint1.sh
```

**Tempo estimado**: 5-8 minutos

---

## ⚡ Opção 2: Rebuild Rápido (Desenvolvimento)

Se você já executou o deploy completo antes e só quer rebuild:

```bash
# 1. Build das imagens (3-5 min)
bash scripts/deployment/quick-rebuild-rag.sh

# 2. Restart dos serviços
docker compose -f tools/compose/docker-compose.rag.yml up -d --force-recreate llamaindex-query rag-service rag-collections-service

# 3. Aguardar 30s
sleep 30

# 4. Verificar circuit breakers
curl http://localhost:8202/health | jq '.circuitBreakers'
```

**Tempo estimado**: 3-5 minutos

---

## 🧪 Manual Testing

Após o deploy, execute os testes manuais:

```bash
# Test 1: Circuit Breaker Behavior (simula falha do Ollama)
bash scripts/testing/test-circuit-breaker.sh

# Test 2: Inter-Service Authentication (valida tokens)
bash scripts/testing/test-service-auth.sh
```

---

## 🔍 Verificação Rápida

```bash
# Health check de todos os serviços
docker ps --format "table {{.Names}}\t{{.Status}}" | grep rag

# Verificar circuit breakers estão ativos
curl -s http://localhost:8202/health | jq '.circuitBreakers'

# Logs em tempo real
docker compose -f tools/compose/docker-compose.rag.yml logs -f llamaindex-query rag-service
```

---

## ⚠️ Troubleshooting

### ❌ Erro: `circuitBreakers: null` no health check

**Causa**: Container rodando com imagem antiga (sem Sprint 1).

**Solução**:
```bash
# Force rebuild
docker compose -f tools/compose/docker-compose.rag.yml build llamaindex-query --no-cache
docker compose -f tools/compose/docker-compose.rag.yml up -d --force-recreate llamaindex-query

# Verificar
curl http://localhost:8202/health | jq '.circuitBreakers'
```

### ❌ Erro: `INTER_SERVICE_SECRET not found`

**Causa**: Variável não configurada no `.env`.

**Solução**:
```bash
bash scripts/setup/configure-inter-service-secret.sh
docker compose -f tools/compose/docker-compose.rag.yml restart
```

### ❌ Container unhealthy

**Verificar logs**:
```bash
docker logs rag-service --tail 50
docker logs rag-llamaindex-query --tail 50
```

**Restart forçado**:
```bash
docker compose -f tools/compose/docker-compose.rag.yml restart rag-service
```

---

## 📊 Expected Results

Após deploy bem-sucedido:

```bash
$ curl http://localhost:8202/health | jq '.circuitBreakers'
{
  "qdrant_search": "closed",
  "qdrant_answer": "closed",
  "ollama_embeddings": "closed",
  "ollama_generation": "closed"
}
```

✅ **Status**: 4 circuit breakers com estado `"closed"` (healthy)

---

## 🎉 Next Steps (Sprint 2)

Após validar Sprint 1 por 48 horas:

1. **Qdrant HA** - 3-node cluster (High Availability)
2. **Kong API Gateway** - Centralized auth/routing
3. **Monitoring** - Prometheus + Grafana dashboards
4. **Load Testing** - K6 stress tests

---

**Last Updated**: 2025-11-03
**Status**: Sprint 1 Ready for Deployment

