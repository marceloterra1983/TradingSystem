# 🚀 Kong Gateway - Deploy Agora (2 Comandos)

## Comando 1: Liberar Portas (SUDO)

```bash
sudo bash scripts/kong/sudo-deploy-kong.sh
```

**O que faz:**
- Mata processos em portas 5433, 8000, 8001, 8002, 8443
- Adiciona KONG_PG_PASSWORD ao .env
- Inicia Kong + PostgreSQL
- Verifica health

**Tempo**: 1-2 minutos

---

## Comando 2: Verificar

```bash
# Kong Admin API
curl http://localhost:8001/status | jq

# Kong Proxy
curl http://localhost:8000

# Containers
docker ps --format "table {{.Names}}\t{{.Status}}" | grep kong
```

**Resultado esperado:**
```
kong-gateway    Up X seconds (healthy)
kong-db         Up X seconds (healthy)
```

---

## ✅ Sucesso = Kong Deployed!

Depois disso, Kong estará pronto para:
- Proxy requests para `/api/v1/rag/*`
- Rate limiting (100 req/min)
- CORS habilitado
- Service token injection automática

---

**Execute o Comando 1 e me avise o resultado!** 🚀

