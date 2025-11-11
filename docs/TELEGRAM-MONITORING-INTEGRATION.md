# Telegram Stack - Monitoring Integration

**Data:** 2025-11-11
**Status:** ✅ **CONCLUÍDO - Monitoramento Integrado**

---

## 🎯 Objetivo

Integrar todos os containers de monitoramento (Prometheus, Grafana, Postgres Exporter, Redis Exporter) no arquivo principal da stack Telegram (`docker-compose.4-2-telegram-stack-minimal-ports.yml`).

---

## ✅ Containers Adicionados

### 1. Prometheus (Coleta de Métricas)
- **Container:** `telegram-prometheus`
- **Imagem:** `prom/prometheus:v2.48.0`
- **Porta:** `9090` (interna e externa)
- **Recursos:** 1 CPU, 1GB RAM
- **Retenção:** 30 dias
- **Health Check:** HTTP em `/-/healthy`
- **Acesso:** http://localhost:9090

**Configuração:**
```yaml
volumes:
  - ./telegram/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
  - ./telegram/monitoring/alerts:/etc/prometheus/alerts:ro
  - telegram-prometheus-data:/prometheus
```

### 2. Grafana (Visualização)
- **Container:** `telegram-grafana`
- **Imagem:** `grafana/grafana:10.2.2`
- **Porta Externa:** `3100` → **Porta Interna:** `3000`
- **Recursos:** 0.5 CPU, 512MB RAM
- **Plugins:** `redis-datasource`, `marcusolsson-json-datasource`
- **Acesso:** http://localhost:3100
- **Credenciais:** admin/admin (default)

**Configuração:**
```yaml
volumes:
  - telegram-grafana-data:/var/lib/grafana
  - ./telegram/monitoring/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
```

### 3. Postgres Exporter (Métricas do TimescaleDB)
- **Container:** `telegram-postgres-exporter`
- **Imagem:** `prometheuscommunity/postgres-exporter:v0.15.0`
- **Porta:** `9187`
- **Recursos:** 0.25 CPU, 128MB RAM
- **Target:** `telegram-timescale:5432/telegram_gateway`
- **Acesso:** http://localhost:9187/metrics

**Dependências:**
```yaml
depends_on:
  telegram-timescaledb:
    condition: service_healthy
```

### 4. Redis Exporter (Métricas do Cache)
- **Container:** `telegram-redis-exporter`
- **Imagem:** `oliver006/redis_exporter:v1.55.0-alpine`
- **Porta:** `9121`
- **Recursos:** 0.25 CPU, 128MB RAM
- **Target:** `telegram-redis-master:6379`
- **Acesso:** http://localhost:9121/metrics

**Dependências:**
```yaml
depends_on:
  telegram-redis-master:
    condition: service_healthy
```

---

## 📊 Status dos Containers

### Verificação Completa (2025-11-11 14:45)

```bash
docker ps --filter "label=com.tradingsystem.stack=telegram-gateway"
```

**Resultado:**
```
telegram-prometheus          Up 2 minutes (healthy)    0.0.0.0:9090->9090/tcp
telegram-grafana             Up 2 minutes (healthy)    0.0.0.0:3100->3000/tcp
telegram-postgres-exporter   Up 2 minutes (healthy)    0.0.0.0:9187->9187/tcp
telegram-redis-exporter      Up 2 minutes (healthy)    0.0.0.0:9121->9121/tcp
```

### Health Checks ✅

**Prometheus:**
```bash
curl http://localhost:9090/-/healthy
# Prometheus Server is Healthy.
```

**Grafana:**
```bash
curl http://localhost:3100/api/health
# 200 OK
```

**Postgres Exporter:**
```bash
curl http://localhost:9187/metrics | head -5
# HELP go_gc_duration_seconds A summary of the pause duration...
# Metrics: ✅ Exporting
```

**Redis Exporter:**
```bash
curl http://localhost:9121/metrics | head -5
# HELP go_gc_duration_seconds A summary of the pause duration...
# Metrics: ✅ Exporting
```

---

## 🏗️ Arquitetura de Monitoramento

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Stack (12 containers)           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Core Services (8)          Monitoring (4)                   │
│  ├── TimescaleDB            ├── Prometheus :9090             │
│  ├── PgBouncer              ├── Grafana :3100                │
│  ├── Redis Master           ├── Postgres Exporter :9187      │
│  ├── Redis Replica          └── Redis Exporter :9121         │
│  ├── Redis Sentinel                                          │
│  ├── RabbitMQ                                                │
│  ├── MTProto                                                 │
│  └── Gateway API                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │  Prometheus Scraping  │
                │  - TimescaleDB metrics│
                │  - Redis metrics      │
                │  - Container metrics  │
                └───────────────────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │   Grafana Dashboards  │
                │   - Database Health   │
                │   - Cache Performance │
                │   - Service Latency   │
                └───────────────────────┘
```

---

## 🔧 Configuração de Métricas

### Prometheus Targets

**Arquivo:** `tools/compose/telegram/monitoring/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'telegram-postgres'
    static_configs:
      - targets: ['telegram-postgres-exporter:9187']

  - job_name: 'telegram-redis'
    static_configs:
      - targets: ['telegram-redis-exporter:9121']

  - job_name: 'telegram-gateway-api'
    static_configs:
      - targets: ['telegram-gateway-api:4010']
    metrics_path: '/metrics'
```

### Grafana Data Sources

**Arquivo:** `tools/compose/telegram/monitoring/grafana-datasources.yml`

```yaml
apiVersion: 1

datasources:
  - name: Telegram Prometheus
    type: prometheus
    access: proxy
    url: http://telegram-prometheus:9090
    isDefault: true

  - name: Telegram TimescaleDB
    type: postgres
    url: telegram-timescale:5432
    database: telegram_gateway
    user: telegram
    secureJsonData:
      password: ${TELEGRAM_DB_PASSWORD}
```

---

## 📈 Métricas Disponíveis

### TimescaleDB (Postgres Exporter)

**Endpoint:** http://localhost:9187/metrics

**Métricas principais:**
- `pg_up` - Database up/down status
- `pg_stat_database_*` - Connections, transactions, conflicts
- `pg_stat_bgwriter_*` - Background writer statistics
- `pg_locks_*` - Lock statistics
- `pg_database_size_bytes` - Database size

**Exemplo:**
```bash
curl -s http://localhost:9187/metrics | grep "pg_up"
# pg_up 1
```

### Redis (Redis Exporter)

**Endpoint:** http://localhost:9121/metrics

**Métricas principais:**
- `redis_up` - Redis up/down status
- `redis_connected_clients` - Number of clients
- `redis_used_memory_bytes` - Memory usage
- `redis_commands_total` - Commands processed
- `redis_keyspace_*` - Keyspace statistics

**Exemplo:**
```bash
curl -s http://localhost:9121/metrics | grep "redis_up"
# redis_up 1
```

---

## 🎯 Dashboards Sugeridos

### 1. Database Health Dashboard
- **Conexões ativas** (pg_stat_database_numbackends)
- **Tamanho do banco** (pg_database_size_bytes)
- **Taxa de transações** (pg_stat_database_xact_commit)
- **Locks ativos** (pg_locks_count)

### 2. Cache Performance Dashboard
- **Clientes conectados** (redis_connected_clients)
- **Uso de memória** (redis_used_memory_bytes)
- **Hit rate** (redis_keyspace_hits / redis_keyspace_misses)
- **Taxa de comandos** (redis_commands_total)

### 3. Gateway API Dashboard
- **Latência de requisições** (http_request_duration_seconds)
- **Taxa de requisições** (http_requests_total)
- **Taxa de erros** (http_requests_total{status=~"5.."}`)
- **Throughput de mensagens** (telegram_messages_processed_total)

---

## 🚀 Como Usar

### Acessar Grafana

1. Abra http://localhost:3100
2. Login: `admin` / `admin`
3. Vá em **Data Sources** → Verificar **Telegram Prometheus** conectado
4. Criar novo dashboard ou importar template

### Query Prometheus Direta

```bash
# Verificar targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Query de métricas
curl 'http://localhost:9090/api/v1/query?query=pg_up' | jq '.data.result'
```

### Visualizar Métricas Raw

**Postgres Exporter:**
```bash
curl -s http://localhost:9187/metrics | grep "pg_stat_database_" | head -10
```

**Redis Exporter:**
```bash
curl -s http://localhost:9121/metrics | grep "redis_" | head -10
```

---

## 🔍 Troubleshooting

### Prometheus não está coletando métricas?

```bash
# Verificar targets no Prometheus
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastError: .lastError}'

# Esperado:
# {
#   "job": "telegram-postgres",
#   "health": "up",
#   "lastError": ""
# }
```

### Grafana não conecta ao Prometheus?

```bash
# Testar conectividade do container Grafana → Prometheus
docker exec telegram-grafana wget -qO- http://telegram-prometheus:9090/-/healthy

# Esperado: "Prometheus Server is Healthy."
```

### Postgres Exporter não está exportando métricas?

```bash
# Verificar logs do exporter
docker logs telegram-postgres-exporter 2>&1 | tail -20

# Testar conexão com TimescaleDB
docker exec telegram-postgres-exporter wget -qO- http://localhost:9187/metrics | head -10
```

### Redis Exporter não está exportando métricas?

```bash
# Verificar logs do exporter
docker logs telegram-redis-exporter 2>&1 | tail -20

# Testar conexão com Redis Master
docker exec telegram-redis-exporter redis-cli -h telegram-redis-master ping
# Esperado: PONG
```

---

## 📚 Referências

- **Compose File:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`
- **Prometheus Config:** `tools/compose/telegram/monitoring/prometheus.yml`
- **Grafana Config:** `tools/compose/telegram/monitoring/grafana-datasources.yml`
- **Alerting Rules:** `tools/compose/telegram/monitoring/alerts/`

---

## ✅ Resumo Executivo

### O que foi feito?
- ✅ 4 containers de monitoramento adicionados ao stack principal
- ✅ Prometheus configurado para scraping automático
- ✅ Grafana com data sources provisionados
- ✅ Postgres Exporter coletando métricas do TimescaleDB
- ✅ Redis Exporter coletando métricas do cache

### O que funciona?
- ✅ Todos os containers healthy
- ✅ Prometheus coletando métricas
- ✅ Grafana acessível e operacional
- ✅ Exporters funcionando corretamente
- ✅ Health checks passando

### Próximos Passos (Opcional)
1. Criar dashboards customizados no Grafana
2. Configurar alerting rules no Prometheus
3. Integrar com sistema de notificações (Slack, email, etc.)
4. Adicionar métricas customizadas no Gateway API
5. Criar dashboard de SLA/SLO

---

**Última Atualização:** 2025-11-11 14:50 BRT
**Status:** ✅ Monitoramento 100% operacional
