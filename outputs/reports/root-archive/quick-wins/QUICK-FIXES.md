# ⚡ Quick Fixes - Complete os Últimos 10%

**Tempo estimado:** 1-2 horas  
**Dificuldade:** Média  
**Pré-requisitos:** Docker, vim/nano

---

## 🎯 3 Containers Pendentes

1. ❌ **PgBouncer** - Config syntax error
2. ❌ **RabbitMQ** - Deprecated env vars
3. ❌ **Redis Sentinel** - DNS resolution

---

## 🔧 Fix #1: PgBouncer (30 min)

### Problema
```
ERROR syntax error in configuration (/etc/pgbouncer/pgbouncer.ini:5)
```

### Solução

**Step 1:** Criar config simplificado

```bash
cat > tools/compose/telegram/pgbouncer-simple.ini << 'EOF'
[databases]
telegram_gateway = host=telegram-timescaledb port=5432 dbname=telegram_gateway user=telegram password=NYMBgrENUZP8FqUHN1Yo8sdzSfs3kLhp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5

admin_users = postgres
stats_users = postgres

logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
EOF
```

**Step 2:** Atualizar docker-compose.yml

```bash
# Editar
vim tools/compose/docker-compose.telegram.yml

# Encontrar telegram-pgbouncer e trocar:
# De:
#   - DATABASES_HOST=telegram-timescaledb
#   ...
# Para:
#   volumes:
#     - ./telegram/pgbouncer-simple.ini:/etc/pgbouncer/pgbouncer.ini:ro
```

**Step 3:** Restart

```bash
docker compose -f tools/compose/docker-compose.telegram.yml restart telegram-pgbouncer
docker logs telegram-pgbouncer --tail 20
```

**Verificação:**
```bash
docker exec telegram-pgbouncer psql -h localhost -p 6432 -U telegram -d telegram_gateway -c "SELECT 1"
# Expected: (1 row)
```

---

## 🔧 Fix #2: RabbitMQ (20 min)

### Problema
```
RABBITMQ_VM_MEMORY_HIGH_WATERMARK is set but deprecated
```

### Solução

**Step 1:** Remover env vars deprecated

```bash
vim tools/compose/docker-compose.telegram.yml

# Encontrar telegram-rabbitmq e remover/comentar:
#   - RABBITMQ_VM_MEMORY_HIGH_WATERMARK=0.6
#   - RABBITMQ_DISK_FREE_LIMIT=2GB
```

**Step 2:** Usar arquivo de config

```bash
cat > tools/compose/telegram/rabbitmq-simple.conf << 'EOF'
# Memory
vm_memory_high_watermark.relative = 0.6

# Disk
disk_free_limit.absolute = 2GB

# Networking
listeners.tcp.default = 5672

# Management
management.tcp.port = 15672

# Logging
log.console = true
log.console.level = info
EOF
```

**Step 3:** Adicionar volume no compose

```bash
vim tools/compose/docker-compose.telegram.yml

# Adicionar em telegram-rabbitmq:
volumes:
  - ./telegram/rabbitmq-simple.conf:/etc/rabbitmq/rabbitmq.conf:ro
```

**Step 4:** Restart

```bash
docker compose -f tools/compose/docker-compose.telegram.yml restart telegram-rabbitmq
docker logs telegram-rabbitmq --tail 20
```

**Verificação:**
```bash
docker exec telegram-rabbitmq rabbitmqctl status
# Expected: Node running, listeners on 5672 and 15672
```

---

## 🔧 Fix #3: Redis Sentinel (40 min)

### Problema
```
Can't resolve hostname 'telegram-redis-master'
```

### Solução

**Step 1:** Usar IPs ao invés de hostnames

```bash
# Descobrir IP do Redis Master
REDIS_MASTER_IP=$(docker inspect telegram-redis-master | jq -r '.[0].NetworkSettings.Networks.telegram_backend.IPAddress')
echo $REDIS_MASTER_IP  # Ex: 172.25.0.2

# Criar config com IP fixo
cat > tools/compose/telegram/sentinel-simple.conf << EOF
port 26379
sentinel monitor telegram-redis $REDIS_MASTER_IP 6379 2
sentinel down-after-milliseconds telegram-redis 5000
sentinel parallel-syncs telegram-redis 1
sentinel failover-timeout telegram-redis 10000
logfile /var/log/redis/sentinel.log
EOF
```

**Alternativa:** Usar service name com network alias

```bash
vim tools/compose/docker-compose.telegram.yml

# Adicionar em telegram-redis-sentinel:
depends_on:
  telegram-redis-master:
    condition: service_healthy
networks:
  telegram_backend:

# E garantir que telegram-redis-master tem:
networks:
  telegram_backend:
    aliases:
      - redis-master  # Alias consistente
```

**Step 2:** Restart

```bash
docker compose -f tools/compose/docker-compose.telegram.yml restart telegram-redis-sentinel
docker logs telegram-redis-sentinel --tail 30
```

**Verificação:**
```bash
docker exec telegram-redis-sentinel redis-cli -p 26379 SENTINEL masters
# Expected: Ver redis-master com IP e status
```

---

## ✅ Verification Final

```bash
# 1. Check all containers
docker ps --filter "name=telegram-" --format "table {{.Names}}\t{{.Status}}"

# Expected: All "Up X seconds (healthy)"

# 2. Run health check script
bash scripts/telegram/health-check-telegram.sh

# Expected:
# ✅ TimescaleDB (5434)
# ✅ PgBouncer (6434)
# ✅ Redis Master (6379)
# ✅ Redis Replica (6380)
# ✅ Redis Sentinel (26379)
# ✅ RabbitMQ (5672, 15672)

# 3. Test connectivity
docker exec telegram-pgbouncer psql -h localhost -p 6432 -U telegram -d telegram_gateway -c "\dt telegram_gateway.*"
# Expected: List of tables (messages, channels)

docker exec telegram-rabbitmq rabbitmqctl list_queues
# Expected: Empty or existing queues

docker exec telegram-redis-sentinel redis-cli -p 26379 SENTINEL masters
# Expected: redis-master listed

# 4. Test Redis cache
docker exec telegram-redis-master redis-cli SET test "hello"
docker exec telegram-redis-replica redis-cli GET test
# Expected: "hello" (replication working)
```

---

## 🎉 Success Criteria

Quando todos os checks passarem:

✅ **6/6 containers healthy**  
✅ **PgBouncer conectando ao TimescaleDB**  
✅ **Redis replication funcionando (master → replica)**  
✅ **Sentinel monitorando master**  
✅ **RabbitMQ management UI acessível** (http://localhost:15672)

**Próximo passo:** Re-habilitar SQL scripts avançados

```bash
cd backend/data/timescaledb/telegram-gateway
mv 03_optimization_indexes.sql.bak 03_optimization_indexes.sql
mv 04_continuous_aggregates.sql.bak 04_continuous_aggregates.sql
# ... repeat for all .bak files

# Restart TimescaleDB to apply
docker compose -f tools/compose/docker-compose.telegram.yml restart telegram-timescaledb

# Verify
docker exec telegram-timescale psql -U telegram -d telegram_gateway \
  -c "SELECT * FROM telegram_gateway.messages_hourly LIMIT 1"
```

---

## 🆘 Se Algo Der Errado

### Rollback Completo
```bash
cd /home/marce/Projetos/TradingSystem
docker compose -f tools/compose/docker-compose.telegram.yml down -v
# Restore backups se necessário
```

### Logs Detalhados
```bash
# Ver logs completos
docker logs telegram-pgbouncer 2>&1 | less
docker logs telegram-rabbitmq 2>&1 | less
docker logs telegram-redis-sentinel 2>&1 | less

# Logs em tempo real
docker logs -f telegram-pgbouncer
```

### Troubleshooting
Consulte: `docs/content/apps/telegram-gateway/troubleshooting.mdx`

---

**Boa sorte! 🚀**

Com esses fixes, você terá 100% dos containers funcionando e poderá completar a migração!

