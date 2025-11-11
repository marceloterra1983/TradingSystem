# Port Allocation Map - TradingSystem

**Última Atualização:** 2025-11-11
**Status:** Atualizado após resolução de conflitos

## 🎯 Objetivo

Este documento mantém o mapeamento oficial de todas as portas alocadas no projeto, prevenindo conflitos e facilitando troubleshooting.

## 📋 Princípios de Alocação

1. **Portas 3000-3999**: Frontend e APIs HTTP
2. **Portas 4000-4999**: Gateways e serviços de mensageria
3. **Portas 5000-5999**: Bancos de dados PostgreSQL/TimescaleDB
4. **Portas 6000-6999**: Bancos de dados Redis e connection poolers
5. **Portas 7000-7999**: Databases compartilhadas (QuestDB, etc)
6. **Portas 8000-8999**: Ferramentas de desenvolvimento
7. **Portas 9000-9999**: Monitoring e métricas

## 🔴 CRITICAL: Telegram Stack Ports (UPDATED)

### Base de Dados

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| TimescaleDB | **5436** | `telegram-timescale` | `localhost:5436` | ⚠️ **MUDOU de 5434** |
| PgBouncer | 6434 | `telegram-pgbouncer` | `localhost:6434` | Connection pooler |

### Cache Layer

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| Redis Master | **6383** | `telegram-redis-master` | `localhost:6383` | ⚠️ **MUDOU de 6379** |
| Redis Replica | 6385 | `telegram-redis-replica` | `localhost:6385` | Read-only replica |
| Redis Sentinel | 26379 | `telegram-redis-sentinel` | `localhost:26379` | HA monitoring |

### Message Queue

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| RabbitMQ AMQP | 5672 | `telegram-rabbitmq` | `localhost:5672` | Message broker |
| RabbitMQ Mgmt | 15672 | `telegram-rabbitmq` | `http://localhost:15672` | Web UI |

### Application Services

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| MTProto Gateway | 4007 | `telegram-mtproto` | `http://localhost:4007` | Telegram client |
| Gateway REST API | 4010 | `telegram-gateway-api` | `http://localhost:4010` | Query API |

## 🟢 TP Capital Stack Ports

### Base de Dados

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| TimescaleDB | 5440 | `tp-capital-timescale` | `localhost:5440` | Isolated DB |
| PgBouncer | 6435 | `tp-capital-pgbouncer` | `localhost:6435` | Connection pooler |

### Cache Layer

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| Redis Master | 6381 | `tp-capital-redis-master` | `localhost:6381` | Hot cache |
| Redis Replica | 6382 | `tp-capital-redis-replica` | `localhost:6382` | Read scaling |

### Application Services

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| TP Capital API | Traefik (`/api/tp-capital`) | `tp-capital-api` | `http://localhost:9080/api/tp-capital` | Roteado via Traefik; sem porta externa dedicada |

## 🟡 Workspace Stack Ports

| Serviço | Porta | Container | Host Access | Notas |
|---------|-------|-----------|-------------|-------|
| Workspace API | Traefik (`/api/workspace`) | `workspace-api` | `http://localhost:9080/api/workspace` | REST API via gateway |
| Workspace DB | 5450 | `workspace-db` | `localhost:5450` | PostgreSQL |

## 🔵 Frontend & Documentation

| Serviço | Porta | Container/Process | URL | Notas |
|---------|-------|-------------------|-----|-------|
| Dashboard | 3103 | Vite Dev Server | `http://localhost:3103` | React app |
| Documentation Hub | Traefik (`/docs`) | `docs-hub` | `http://localhost:9080/docs` | Docusaurus (sem porta dedicada) |
| Documentation API | Traefik (`/api/docs`) | `documentation-api` | `http://localhost:9080/api/docs` | Docs management via gateway |

## 🟠 AI & RAG Stack

| Serviço | Porta | Container | URL | Notas |
|---------|-------|-----------|-----|-------|
| Firecrawl Proxy | Traefik (`/api/firecrawl`) | `firecrawl-proxy` | `http://localhost:9080/api/firecrawl` | Proxy Express (sem porta dedicada) |
| LlamaIndex Query | 8202 | `llamaindex-query` | `http://localhost:8202` | RAG queries |
| Qdrant Vector DB | 6333 | `qdrant` | `http://localhost:6333` | Vector store |
| Ollama | 11434 | `ollama` | `http://localhost:11434` | LLM server |

## 🟣 DevOps & Monitoring

| Serviço | Porta | Container | URL | Notas |
|---------|-------|-----------|-----|-------|
| Prometheus | 9090 | `prometheus` | `http://localhost:9090` | Metrics |
| Grafana | 3000 | `grafana` | `http://localhost:3000` | Dashboards |
| PgAdmin | Traefik (`/db-ui/pgadmin`) | `dbui-pgadmin` | `http://localhost:9080/db-ui/pgadmin` | DB admin via gateway (porta 5050 disponível como fallback) |
| Adminer | Traefik (`/db-ui/adminer`) | `dbui-adminer` | `http://localhost:9080/db-ui/adminer` | Lightweight DB UI (porta 3910 como fallback direto) |
| PgWeb | Traefik (`/db-ui/pgweb`) | `dbui-pgweb` | `http://localhost:9080/db-ui/pgweb` | Cliente SQL web (porta 5051 direta) |
| QuestDB Console | Traefik (`/db-ui/questdb`) | `dbui-questdb` | `http://localhost:9080/db-ui/questdb` | Console HTTP (ILP segue em 9009) |
| Kestra Orchestrator | Traefik (`/kestra`) | `kestra` | `http://localhost:9080/kestra` | UI do orquestrador (8080 interno) |
| Kestra Management | Traefik (`/kestra-management`) | `kestra` | `http://localhost:9080/kestra-management` | Endpoint de management (8081 interno) |

## 🔧 Configuração

### Localização dos Arquivos

- **Defaults**: `config/.env.defaults` - Valores padrão (versionado)
- **Secrets**: `.env` - Valores sensíveis e overrides (não versionado)
- **Compose Files**: `tools/compose/docker-compose.*.yml`

### Como Alterar uma Porta

1. **Editar `.env` (recomendado)**:
   ```bash
   TELEGRAM_REDIS_PORT=6383  # Sobrescreve default
   ```

2. **Editar `config/.env.defaults` (para mudanças permanentes)**:
   ```bash
   TELEGRAM_REDIS_PORT=6383  # Novo default para todos
   ```

3. **Nunca hardcode no compose file** ❌:
   ```yaml
   # ERRADO - evitar hardcoded
   ports:
     - "6379:6379"  # ❌ Hardcoded

   # CORRETO - usar variável com fallback
   ports:
     - "${TELEGRAM_REDIS_PORT:-6383}:6379"  # ✅
   ```

## 🚨 Resolução de Conflitos

### Sintomas

- Erro: `address already in use`
- Container falha ao iniciar
- Porta ocupada por processo desconhecido

### Diagnóstico

```bash
# Verificar conflitos de porta
bash scripts/docker/port-conflict-resolver.sh telegram

# Diagnóstico completo
bash scripts/docker/port-conflict-resolver.sh diagnostic
```

### Soluções

1. **Verificação Simples** (sem sudo):
   ```bash
   # Verifica se pode iniciar
   bash scripts/docker/start-telegram-stack.sh --check-only
   ```

2. **Limpeza Docker** (sem sudo):
   ```bash
   # Para stack e limpa networks
   docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml down
   docker network prune -f
   ```

3. **Reset Completo** (requer sudo):
   ```bash
   # Resolve locks de rede persistentes
   sudo bash .claude/sudo-scripts/docker-network-reset.sh
   ```

## 📚 Referências

- **Health Check Script**: `scripts/maintenance/health-check-all.sh`
- **Port Conflict Resolver**: `scripts/docker/port-conflict-resolver.sh`
- **Network Reset**: `.claude/sudo-scripts/docker-network-reset.sh`
- **Startup Script**: `scripts/docker/start-telegram-stack.sh`

## 🔄 Changelog

### 2025-11-11 - Port Conflict Resolution

**Mudanças Críticas:**

- Telegram TimescaleDB: `5434 → 5436`
- Telegram Redis Master: `6379 → 6383`

**Razão**: Conflitos persistentes de porta após reinicialização do sistema. As portas antigas (5434, 6379) ficavam travadas por locks de rede do Docker.

**Prevenção Futura:**
- Scripts automatizados de detecção de conflitos
- Validação antes de startup
- Documentação de procedimento de reset

---

**Mantenha este documento atualizado sempre que alocar novas portas!**
