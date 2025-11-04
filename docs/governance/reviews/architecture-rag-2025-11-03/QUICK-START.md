# RAG Migration - Quick Start Guide

⚡ **Para quem quer começar AGORA** - Comandos essenciais sem explicações

---

## 🚀 Deploy Completo (3 Comandos)

```bash
cd /home/marce/Projetos/TradingSystem

# 1. Deploy Infrastructure (10 minutos)
bash scripts/neon/setup-neon-local.sh && \
bash scripts/qdrant/init-cluster.sh && \
docker compose -f tools/compose/docker-compose.kong.yml up -d && \
bash scripts/kong/configure-rag-routes.sh

# 2. Migrate Data (1-2 horas)
bash scripts/migration/update-env-for-migration.sh && \
bash scripts/migration/migrate-timescaledb-to-neon.sh && \
python scripts/migration/migrate-qdrant-single-to-cluster.py

# 3. Test Everything (5 minutos)
bash scripts/testing/smoke-test-rag-stack.sh
```

**Se todos os testes passarem:** ✅ Migration completa!

---

## 🔍 Verify (1 Comando)

```bash
# Test all components
bash scripts/testing/test-neon-connection.sh && \
bash scripts/testing/test-qdrant-cluster.sh && \
bash scripts/testing/test-kong-routes.sh && \
echo "✅ All systems healthy!"
```

---

## 🔧 URLs Importantes

```
Neon:          postgresql://postgres:neon_password@localhost:5435/rag
Qdrant LB:     http://localhost:6333
Kong Proxy:    http://localhost:8000
Kong Admin:    http://localhost:8001
Konga UI:      http://localhost:1337
```

---

## 📊 Comandos de Status

```bash
# Ver todos os containers
docker ps | grep -E "neon|qdrant|kong"

# Cluster Qdrant status
curl http://localhost:6333/cluster | jq

# Kong routes
curl http://localhost:8001/routes | jq '.data[].name'

# Neon row counts
psql postgresql://postgres:neon_password@localhost:5435/rag \
  -c "SELECT 'collections', COUNT(*) FROM rag.collections \
      UNION ALL SELECT 'documents', COUNT(*) FROM rag.documents \
      UNION ALL SELECT 'chunks', COUNT(*) FROM rag.chunks"
```

---

## ⚠️ Troubleshooting

**Erro: Port already in use**
```bash
sudo netstat -tulnp | grep -E "5435|6333|8000"
# Kill processo ou mudar porta no .env
```

**Erro: Cannot connect to database**
```bash
docker logs neon-compute --tail 50
# Check logs for errors
```

**Erro: Qdrant cluster not forming**
```bash
docker logs qdrant-node-1 --tail 50
docker logs qdrant-node-2 --tail 50
# Ensure P2P ports (6335-6338) are open
```

---

## 🔄 Rollback (Se Necessário)

```bash
# Parar nova infraestrutura
docker compose -f tools/compose/docker-compose.neon.yml down
docker compose -f tools/compose/docker-compose.qdrant-cluster.yml down
docker compose -f tools/compose/docker-compose.kong.yml down

# Restaurar .env
cp .env.backup.TIMESTAMP .env

# Religar infraestrutura antiga
docker compose -f tools/compose/docker-compose.database.yml up -d
docker compose -f tools/compose/docker-compose.rag.yml up -d
```

**Tempo de rollback:** < 5 minutos

---

## 📚 Documentação Completa

**Se precisar de detalhes, consulte:**
- `README.md` - Navigation hub
- `IMPLEMENTATION-COMPLETE.md` - Full deployment guide
- `HANDOFF-GUIDE.md` - Step-by-step guide
- `FINAL-SUMMARY.md` - Executive summary

---

**Ready to deploy? Run the 3 commands above! 🚀**

