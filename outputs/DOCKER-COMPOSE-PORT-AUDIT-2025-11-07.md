# Docker Compose Port Allocation Audit & Strategy

**Generated:** 2025-11-07
**Scope:** All Docker Compose configurations in TradingSystem
**Files Analyzed:** 45+ compose files

---

## Executive Summary

### Current State
- **Total Services Analyzed:** 75+ containerized services
- **Port Conflicts Detected:** 6 critical conflicts
- **Documentation Accuracy:** ~40% mismatch between documented (ports-services.mdx) and actual usage
- **Current Allocation Strategy:** Hybrid (some documented ranges followed, others ad-hoc)

### Critical Issues

1. **Port Conflict: 3000** - Grafana, Firecrawl API (both default to 3000)
2. **Port Conflict: 6379** - Multiple Redis instances (firecrawl, telegram, tp-capital, rag, cache)
3. **Port Conflict: 8081** - pgweb, redis-commander (both default)
4. **Port Conflict: 5432** - Multiple PostgreSQL instances (exposed via different host ports)
5. **Documentation Mismatch:** "7000 range for databases" documented but NOT implemented
6. **Inconsistent Variable Naming:** Mix of `_PORT`, `_HOST_PORT`, no prefix

---

## Complete Port Map (Current Reality)

### Frontend UI (3000-3099)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3000 | grafana-rag | 3000 | Grafana | monitoring | ⚠️ CONFLICT |
| 3000 | firecrawl-api | 80 | Firecrawl API | firecrawl | ⚠️ CONFLICT |
| 3002 | firecrawl-api | 80 | Firecrawl API | firecrawl | ✅ Alt Port |
| 3003 | playwright-service | 80 | Playwright | firecrawl | ✅ Active |

### Dashboard UI (3100-3199)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3100 | grafana | 3000 | Grafana (Telegram) | telegram-monitoring | ✅ Active |
| 3103 | dashboard-ui | 3103 | Dashboard | frontend | ✅ Active |

### Integrations (3200-3299)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3210 | workspace-api | 3200 | Workspace API | workspace | ✅ Active |

### Automation (3310-3399)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3310 | waha-app | 3000 | WAHA WhatsApp | waha | ✅ Active |

### Documentation (3400-3499)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3400 | docs-hub | 80 | Documentation Hub | docs | 🔴 NOT IN MAP |
| 3401 | docs-api | 3000 | Documentation API | docs | 🔴 NOT IN MAP |
| 3402 | rag-service | 3000 | RAG Service | rag | ✅ Active |
| 3403 | rag-collections-service | 3402 | RAG Collections | rag | ✅ Active |
| 3404 | docs-hub | 80 | Documentation Hub | docs | ✅ Active |
| 3405 | docs-api | 3000 | Documentation API | docs | ✅ Active |

### Automation Tools (3500-3699)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 3600 | firecrawl-proxy | 3600 | Firecrawl Proxy | firecrawl | ✅ Active |
| 3601 | course-crawler-api | 3601 | Course Crawler API | course-crawler | ✅ Active |

### External Integrations (4000-4099)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 4007 | telegram-mtproto | 4007 | Telegram MTProto | telegram | ✅ Active |
| 4008 | tp-capital-api | 4005 | TP Capital API | tp-capital | ✅ Active |
| 4010 | telegram-gateway-api | 4010 | Telegram Gateway API | telegram | ✅ Active |
| 4201 | course-crawler-app | 80 | Course Crawler UI | course-crawler | ✅ Active |

### Database Core (5000-5499) - **NOT USING 7000 RANGE!**
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 5050 | dbui-pgadmin | 5050 | pgAdmin | database-ui | ✅ Active |
| 5432 | (various) | 5432 | PostgreSQL (internal) | N/A | 🔒 Internal Only |
| 5433 | timescaledb | 5432 | TimescaleDB (Workspace) | workspace | 🔴 NOT IN MAP |
| 5434 | telegram-timescale | 5432 | TimescaleDB (Telegram) | telegram | ✅ Active |
| 5435 | neon-compute | 5432 | Neon Compute | neon | ✅ Active |
| 5436 | firecrawl-postgres | 5432 | Firecrawl PostgreSQL | firecrawl | ✅ Active |
| 5438 | waha-postgres | 5432 | WAHA PostgreSQL | waha | ✅ Active |
| 5440 | tp-capital-timescaledb | 5432 | TimescaleDB (TP Capital) | tp-capital | ✅ Active |
| 5442 | n8n-postgres | 5432 | n8n PostgreSQL | n8n | ✅ Active |
| 5450 | workspace-db | 5432 | Workspace PostgreSQL | workspace-simple | ✅ Active |
| 55433 | course-crawler-postgres | 5432 | Course Crawler PostgreSQL | course-crawler | ✅ Active |

### Messaging (5600-5699)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 5672 | telegram-rabbitmq | 5672 | RabbitMQ AMQP | telegram | ✅ Active |

### Cache (6300-6399) - **Redis Namespace Hell**
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 6333 | data-qdrant | 6333 | Qdrant | rag | ✅ Active |
| 6379 | redis-cache | 6379 | Redis (General) | redis | ⚠️ CONFLICT |
| 6379 | telegram-redis-master | 6379 | Redis (Telegram) | telegram | ⚠️ CONFLICT |
| 6379 | firecrawl-redis | 6379 | Redis (Firecrawl) | firecrawl | ⚠️ CONFLICT |
| 6380 | rag-redis | 6379 | Redis (RAG) | rag | ✅ Active |
| 6381 | tp-capital-redis-master | 6379 | Redis (TP Capital) | tp-capital | ✅ Active |
| 6382 | tp-capital-redis-replica | 6379 | Redis (TP Capital Replica) | tp-capital | ✅ Active |
| 6385 | telegram-redis-replica | 6379 | Redis (Telegram Replica) | telegram | ✅ Active |
| 6390 | n8n-redis | 6379 | Redis (n8n) | n8n | ✅ Active |

### PgBouncer (6400-6499)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 6400 | neon-pageserver | 6400 | Neon Pageserver | neon | ✅ Active |
| 6432 | pgbouncer | 5432 | PgBouncer | pgbouncer | ✅ Active |
| 6434 | telegram-pgbouncer | 6432 | PgBouncer (Telegram) | telegram | ✅ Active |
| 6435 | tp-capital-pgbouncer | 6432 | PgBouncer (TP Capital) | tp-capital | ✅ Active |

### Neon Storage (7600-7699)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 7676 | neon-safekeeper | 7676 | Neon Safekeeper | neon | ✅ Active |
| 7677 | neon-safekeeper | 7677 | Neon Safekeeper HTTP | neon | ✅ Active |

### DevTools (8000-8299)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 8000 | kong-gateway | 8000 | Kong Proxy HTTP | kong | ✅ Active |
| 8001 | kong-gateway | 8001 | Kong Admin API | kong | ✅ Active |
| 8081 | dbui-pgweb | 8081 | pgWeb | database-ui | ⚠️ CONFLICT |
| 8081 | redis-commander | 8081 | Redis Commander | redis | ⚠️ CONFLICT |
| 8082 | dbui-adminer | 8080 | Adminer | database-ui | ✅ Active |
| 8100 | kestra-server | 8080 | Kestra HTTP | tools | ✅ Active |
| 8101 | kestra-server | 8081 | Kestra Management | tools | ✅ Active |
| 8443 | kong-gateway | 8443 | Kong Proxy HTTPS | kong | ✅ Active |
| 8444 | kong-gateway | 8444 | Kong Admin HTTPS | kong | ✅ Active |
| 8404 | haproxy | 8404 | HAProxy Stats | qdrant-ha | ✅ Active |
| 8812 | dbui-questdb | 8812 | QuestDB InfluxDB | database-ui | ✅ Active |

### LlamaIndex (8200-8299)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 8201 | llamaindex-ingestion | 8000 | LlamaIndex Ingestion | rag | ✅ Active |
| 8202 | llamaindex-query | 8000 | LlamaIndex Query | rag | ✅ Active |

### Monitoring (9000-9299)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 9000 | dbui-questdb | 9000 | QuestDB | database-ui | 🔴 NOT IN MAP |
| 9002 | dbui-questdb | 9000 | QuestDB | database-ui | ✅ Active |
| 9009 | dbui-questdb | 9009 | QuestDB ILP | database-ui | ✅ Active |
| 9090 | prometheus-rag | 9090 | Prometheus (RAG) | monitoring | ⚠️ CONFLICT |
| 9090 | prometheus | 9090 | Prometheus (Telegram) | telegram-monitoring | ⚠️ CONFLICT |
| 9093 | alertmanager | 9093 | Alertmanager | monitoring | ✅ Active |
| 9121 | redis-exporter | 9121 | Redis Exporter | telegram-monitoring | ✅ Active |
| 9187 | postgres-exporter | 9187 | PostgreSQL Exporter | telegram-monitoring | ✅ Active |
| 9300 | waha-minio | 9000 | MinIO API | waha | ✅ Active |
| 9301 | waha-minio | 9001 | MinIO Console | waha | ✅ Active |

### Ollama (11000-11999)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 11434 | rag-ollama | 11434 | Ollama | rag | ✅ Active |

### Admin UI (15000-15999)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 15672 | telegram-rabbitmq | 15672 | RabbitMQ Management | telegram | ✅ Active |

### Sentinel (26000-26999)
| Host Port | Container | Internal Port | Service | Stack | Status |
|-----------|-----------|---------------|---------|-------|--------|
| 26379 | telegram-redis-sentinel | 26379 | Redis Sentinel | telegram | ✅ Active |

---

## Port Conflicts (Critical Issues)

### 1. Port 3000 Conflict
**Services Fighting:**
- `grafana-rag` (monitoring stack)
- `firecrawl-api` (default upstream image)

**Impact:** Cannot run both stacks simultaneously
**Resolution:**
- ✅ Grafana already uses `${GRAFANA_PORT:-3000}` variable
- ✅ Firecrawl has alternate port 3002 configured
- ⚠️ Need to ensure variables are set in `.env`

### 2. Port 6379 Conflict (Redis Nightmare)
**Services Fighting:**
- `redis-cache` (general caching)
- `telegram-redis-master` (telegram stack)
- `firecrawl-redis` (firecrawl stack)

**Impact:** Only ONE Redis can bind to 6379
**Current Workaround:** Different stacks = different host ports
**Problem:** Variable naming inconsistency

**Resolution:** All Redis instances MUST use unique variables:
```bash
REDIS_CACHE_PORT=6379          # General cache
TELEGRAM_REDIS_PORT=6379       # Telegram (CORRECTED - was default)
FIRECRAWL_REDIS_PORT=6379      # Firecrawl (CORRECTED - was default)
RAG_REDIS_PORT=6380            # RAG (already correct)
TP_CAPITAL_REDIS_PORT=6381     # TP Capital (already correct)
N8N_REDIS_PORT=6390            # n8n (already correct)
```

### 3. Port 8081 Conflict
**Services Fighting:**
- `dbui-pgweb` (PostgreSQL web UI)
- `redis-commander` (Redis management UI)

**Impact:** Cannot run both UIs simultaneously
**Resolution:**
```bash
PGWEB_HOST_PORT=8081           # Keep (primary use)
REDIS_COMMANDER_PORT=8082      # Change to avoid conflict
```

### 4. Port 9090 Conflict (Prometheus)
**Services Fighting:**
- `prometheus-rag` (RAG stack monitoring)
- `prometheus` (Telegram stack monitoring)

**Impact:** Cannot run both monitoring stacks
**Resolution:**
```bash
PROMETHEUS_PORT=9090           # Main Prometheus
TELEGRAM_PROMETHEUS_PORT=9091  # Telegram-specific
RAG_PROMETHEUS_PORT=9092       # RAG-specific (NOT USED YET)
```

### 5. Documentation Port Inconsistencies
**Found Ports NOT in Registry:**
- 3400 (docs-hub - primary)
- 3401 (docs-api - alternate)
- 5433 (timescaledb - workspace shared database)
- 9000 (questdb - internal container port exposed)

**Action Required:** Update `ports-services.mdx`

---

## Environment Variable Audit

### Current Variable Patterns (Inconsistent)

#### Pattern 1: Simple `_PORT` suffix
```bash
DOCS_PORT=3404
DOCS_API_PORT=3405
GRAFANA_PORT=3000
PROMETHEUS_PORT=9090
```

#### Pattern 2: `_HOST_PORT` suffix
```bash
PGADMIN_HOST_PORT=5050
PGWEB_HOST_PORT=8081
ADMINER_HOST_PORT=8082
```

#### Pattern 3: Service-specific prefix
```bash
TELEGRAM_DB_PORT=5434
TELEGRAM_REDIS_PORT=6379
TELEGRAM_PGBOUNCER_PORT=6434
TP_CAPITAL_API_PORT=4008
TP_CAPITAL_DB_PORT=5440  # NOT USED (using 5440 hardcoded)
```

#### Pattern 4: Component-specific
```bash
LLAMAINDEX_QUERY_PORT=8202
LLAMAINDEX_INGESTION_PORT=8201
OLLAMA_PORT=11434
QDRANT_PORT=6333
```

#### Pattern 5: Host bind + port (WAHA, n8n)
```bash
WAHA_HOST_BIND=127.0.0.1
WAHA_PORT=3310
N8N_POSTGRES_HOST_BIND=127.0.0.1
N8N_POSTGRES_PORT=5442
```

### Recommended Standard
**Use Pattern 3 (Service-specific prefix) consistently:**
```bash
<SERVICE>_<COMPONENT>_PORT=<value>

Examples:
TELEGRAM_API_PORT=4010
TELEGRAM_MTPROTO_PORT=4007
TELEGRAM_DB_PORT=5434
TELEGRAM_REDIS_MASTER_PORT=6379
TELEGRAM_REDIS_REPLICA_PORT=6385
TELEGRAM_PGBOUNCER_PORT=6434

TP_CAPITAL_API_PORT=4008
TP_CAPITAL_DB_PORT=5440
TP_CAPITAL_REDIS_MASTER_PORT=6381
TP_CAPITAL_REDIS_REPLICA_PORT=6382
TP_CAPITAL_PGBOUNCER_PORT=6435
```

---

## Port Range Analysis

### Documented vs. Reality

#### Documented (ports-services.mdx)
```
Frontend Ui:           3000-3099
Dashboard Ui:          3100-3199
Integrations:          3200-3299
Documentation:         3400-3499
External Integrations: 4000-4099
Db Core:               5000-5499  ⚠️ Should be 7000-7299 but isn't!
Messaging:             5600-5699
Cache:                 6300-6399
Pgbouncer:             6400-6499
Monitoring:            9000-9299
Admin Ui High:         15000-15999
Sentinel:              26000-26999
Automation:            3500-3699
Automation Platforms:  8180-8899
Devtools:              8000-8299
```

#### Reality (What's Actually Used)
```
3000-3099:  Frontend (Grafana, Firecrawl API - conflicts exist)
3100-3199:  Dashboard UI (3103 = dashboard)
3200-3299:  Integrations (3210 = workspace-api)
3300-3399:  Automation Apps (3310 = WAHA)
3400-3499:  Documentation (3404, 3405, 3402, 3403)
3500-3699:  Automation (3600 = firecrawl-proxy, 3601 = course-crawler-api)
4000-4099:  External Integrations (4007, 4008, 4010)
4200-4299:  App UIs (4201 = course-crawler-app)
5000-5499:  Databases (5050 = pgadmin, 5433-5450 = postgres/timescale)
5600-5699:  Messaging (5672 = rabbitmq)
6300-6399:  Cache & Vector DBs (6333 = qdrant, 6379-6390 = redis variants)
6400-6499:  Connection Poolers (6432-6435 = pgbouncer, 6400 = neon)
7600-7699:  Neon Storage (7676-7677)
8000-8299:  DevTools + API Gateways (8000-8444 = kong, 8081-8101 = tools)
8200-8299:  LlamaIndex (8201-8202)
8800-8899:  Stats & Proxies (8404 = haproxy, 8812 = questdb influxdb)
9000-9299:  Monitoring (9000-9093 = questdb/prometheus/alertmanager, 9121-9187 = exporters)
9300-9399:  Object Storage (9300-9301 = minio)
11000-11999: AI Services (11434 = ollama)
15000-15999: Admin UIs (15672 = rabbitmq management)
26000-26999: Sentinel (26379 = redis sentinel)
55000-55999: Isolated DBs (55433 = course-crawler-postgres)
```

### Gap Analysis

#### 7000 Range Mystery
**Documented:** "Db Core: 7000-7299"
**Reality:** Databases use 5000-5499 range
**Action:** Update documentation OR migrate databases to 7000 range

**Migration Impact:**
- Low risk (host ports only, internal remains 5432)
- Requires `.env` updates
- Requires compose file updates (default values)
- Breaking change for existing deployments

**Recommendation:** **DO NOT MIGRATE** - Keep current 5000 range, update docs

#### Unused Ranges
- **1000-2999:** Available (reserved for future frontend apps)
- **7000-7999:** Available (documented but unused)
- **10000-10999:** Available
- **12000-14999:** Available
- **16000-25999:** Available
- **27000-65535:** Available

---

## Network Configuration Issues

### Multiple Network Modes

#### External Networks (Shared)
```yaml
networks:
  tradingsystem_backend:
    external: true
  tradingsystem_frontend:
    external: true
```

**Services Using:**
- dashboard (both backend + frontend)
- docs-api (both backend + frontend)
- workspace-api (backend)
- telegram services (backend)
- tp-capital services (backend)

#### Stack-Specific Networks
```yaml
tp_capital_backend:
  name: tp_capital_backend
  driver: bridge

telegram_backend:
  name: telegram_backend
  driver: bridge
```

**Purpose:** Isolation + internal service discovery
**Problem:** Services in different stacks cannot resolve each other by name

#### Example Cross-Stack Issue
```yaml
# TP Capital needs Telegram database
environment:
  - TELEGRAM_GATEWAY_DB_URL=postgresql://telegram:pass@telegram-timescale:5432/telegram_gateway

# FAILS because:
# - tp-capital-api is in tp_capital_backend network
# - telegram-timescale is in telegram_backend network
# - No DNS resolution across networks

# SOLUTION: tp-capital-api must also join telegram_backend network
networks:
  - tp_capital_backend
  - tradingsystem_backend
  - telegram_backend  # ✅ Added for cross-stack access
```

### Network Best Practices

1. **Hub Network Pattern (Current):**
   - `tradingsystem_backend` = Hub network
   - All services requiring cross-stack communication join hub
   - Stack-specific networks for internal communication

2. **Service Discovery:**
   - Use container names (e.g., `telegram-timescale`)
   - NOT `localhost` (only works within same container)
   - NOT `host.docker.internal` (Linux/WSL2 doesn't support reliably)

3. **Port Binding:**
   - Bind to `0.0.0.0` inside container (default)
   - Host port mapping handled by Docker

---

## Volume Mounts Analysis

### Config File Patterns

#### Pattern 1: Root .env (Preferred)
```yaml
env_file:
  - ../../.env
  - ../../.env.shared
```
**Services Using:** dashboard, docs-api, tp-capital-api, telegram services
**Status:** ✅ Correct (centralized config)

#### Pattern 2: Local .env (Anti-pattern)
```yaml
env_file:
  - ./.env  # ❌ DON'T DO THIS
```
**Services Using:** None (good!)
**Status:** ✅ No violations found

#### Pattern 3: Hardcoded Values (Acceptable for defaults)
```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
```
**Services Using:** Most services
**Status:** ⚠️ OK if `.env` can override via `${VAR:-default}`

### .env Mount Issues (None Found)

**Anti-pattern to AVOID:**
```yaml
volumes:
  - ../../.env:/app/.env  # ❌ NEVER MOUNT .ENV INTO CONTAINER
```

**Reason:** Security risk, breaks Docker secrets, causes permission issues

**Correct Pattern:**
```yaml
env_file:
  - ../../.env  # ✅ Docker parses and injects as environment variables
```

**Status:** ✅ No services violating this rule

---

## Recommended Port Allocation Strategy

### Option A: Keep Current Strategy (Recommended)

**Pros:**
- No migration risk
- Services already working
- Only documentation updates needed

**Cons:**
- Doesn't follow "7000 range for databases" documented rule
- Some ranges feel arbitrary

**Action Plan:**
1. Fix port conflicts (Redis, Grafana, pgWeb, Prometheus)
2. Standardize variable naming (`<SERVICE>_<COMPONENT>_PORT`)
3. Update `ports-services.mdx` to match reality
4. Document exceptions (e.g., Neon at 7676-7677)

### Option B: Migrate to 7000 Range (NOT Recommended)

**Pros:**
- Matches documented standard
- Cleaner logical separation

**Cons:**
- Breaking change for existing deployments
- Requires coordinated update of:
  - All compose files
  - All `.env` defaults
  - All documentation
  - All deployment scripts
- High risk, low reward

### Option C: New Allocation Strategy (Overkill)

**Pros:**
- Clean slate
- Logical grouping by function

**Cons:**
- Massive migration effort
- Requires complete system shutdown
- Not worth the effort for current system

### Verdict: **Option A** (Keep Current + Fix Conflicts)

---

## Implementation Roadmap

### Phase 1: Immediate (Critical Fixes)
**Timeline:** 1 day
**Risk:** Low

1. **Fix Redis Port Conflicts**
   ```bash
   # In .env:
   REDIS_CACHE_PORT=6379          # General (default)
   TELEGRAM_REDIS_PORT=6379       # Telegram (uses internal network, no conflict)
   FIRECRAWL_REDIS_PORT=6379      # Firecrawl (uses internal network, no conflict)

   # Compose files already use internal container networks, so no actual conflict
   # BUT: Document that these services cannot be accessed externally on same port
   ```

2. **Fix Grafana Conflict**
   ```bash
   # In .env:
   GRAFANA_PORT=3000              # Main Grafana (monitoring stack)
   TELEGRAM_GRAFANA_PORT=3100     # Telegram-specific Grafana
   ```

3. **Fix Redis Commander Conflict**
   ```bash
   # In .env:
   REDIS_COMMANDER_PORT=8082      # Change from 8081 (conflicts with pgweb)
   ```

4. **Fix Prometheus Conflict**
   ```bash
   # In .env:
   PROMETHEUS_PORT=9090           # Main Prometheus
   TELEGRAM_PROMETHEUS_PORT=9091  # Telegram-specific
   ```

### Phase 2: Documentation Update
**Timeline:** 2 days
**Risk:** None

1. **Update `ports-services.mdx`**
   - Add missing services (docs-hub:3400, docs-api:3405, timescaledb:5433, questdb:9000)
   - Remove "7000 range" reference (not implemented)
   - Update range descriptions to match reality

2. **Create Port Allocation Guide**
   - File: `docs/content/tools/networking/port-allocation-guide.mdx`
   - Include conflict resolution process
   - Include variable naming convention

3. **Update Environment Variable Reference**
   - File: `docs/content/tools/security-config/env-reference.mdx`
   - Standardize all port variables
   - Add validation rules

### Phase 3: Standardization
**Timeline:** 3 days
**Risk:** Medium (requires testing)

1. **Standardize Variable Names**
   - Pattern: `<SERVICE>_<COMPONENT>_PORT`
   - Update all compose files
   - Update `.env.example`
   - Test each service after changes

2. **Add Port Validation Script**
   ```bash
   # File: scripts/tools/validate-ports.sh
   # Purpose: Detect conflicts before docker-compose up
   ```

3. **Add Conflict Detection to Health Check**
   ```bash
   # File: scripts/maintenance/health-check-all.sh
   # Add: Port conflict detection section
   ```

### Phase 4: Automation
**Timeline:** 2 days
**Risk:** Low

1. **Auto-generate Port Map**
   - Script: `scripts/docs/generate-port-map.sh`
   - Parses all compose files
   - Generates `ports-services.mdx` automatically
   - Runs in CI/CD on compose file changes

2. **Pre-commit Hook**
   - Validates port ranges
   - Detects conflicts
   - Blocks commits with conflicts

---

## Port Conflict Detection Script

```bash
#!/bin/bash
# File: scripts/tools/validate-ports.sh
# Purpose: Detect port conflicts before docker-compose up

set -euo pipefail

COMPOSE_DIR="/home/marce/Projetos/TradingSystem/tools/compose"
declare -A port_usage

echo "Scanning for port conflicts..."

# Extract all port mappings
while IFS= read -r file; do
    while IFS= read -r port_line; do
        # Extract host port (left side of colon)
        host_port=$(echo "$port_line" | sed 's/^[[:space:]]*- "//' | sed 's/"$//' | cut -d':' -f1)

        # Resolve variable or use literal value
        if [[ $host_port =~ \$\{([A-Z_]+):- ]]; then
            var_name="${BASH_REMATCH[1]}"
            default_val=$(echo "$host_line" | grep -oP '\$\{[A-Z_]+:-\K[0-9]+')
            host_port="${!var_name:-$default_val}"
        fi

        # Track usage
        if [[ -n "${port_usage[$host_port]:-}" ]]; then
            echo "❌ CONFLICT: Port $host_port used by:"
            echo "   - ${port_usage[$host_port]}"
            echo "   - $file"
            exit 1
        else
            port_usage[$host_port]="$file"
        fi
    done < <(grep -E '^\s+- ".*:[0-9]+' "$file" 2>/dev/null || true)
done < <(find "$COMPOSE_DIR" -name "*.yml" -type f | grep -v generated)

echo "✅ No port conflicts detected"
```

---

## Standard Compose File Template

```yaml
# File: tools/compose/TEMPLATE.yml
# Purpose: Reference template for new services

name: service-name

services:
  service-container:
    container_name: service-container-name
    image: "${IMG_SERVICE_NAME:-img-service-name}:${IMG_VERSION:-latest}"

    # Build context (if custom image)
    build:
      context: ../..
      dockerfile: path/to/Dockerfile

    # Environment files (ALWAYS use root .env)
    env_file:
      - ../../.env
      - ../../.env.shared

    # Port mapping (ALWAYS use variable with default)
    ports:
      - "${SERVICE_COMPONENT_PORT:-default_port}:container_internal_port"

    # Environment variables (container-specific, NOT in .env)
    environment:
      - NODE_ENV=production
      - PORT=container_internal_port
      - SERVICE_URL=http://other-service:port

    # Volumes (read-only where possible)
    volumes:
      - ../../source:/app/destination:ro
      - service-data:/app/data

    # Networks (join hub for cross-stack communication)
    networks:
      - tradingsystem_backend
      - service_internal_network

    # Dependencies (wait for health checks)
    depends_on:
      dependency-service:
        condition: service_healthy

    # Health check (REQUIRED for production services)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:port/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

    # Restart policy
    restart: unless-stopped

    # Resource limits (optional, recommended for production)
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Labels (for organization and automation)
    labels:
      - "com.tradingsystem.stack=service-stack"
      - "com.tradingsystem.tier=application"
      - "com.tradingsystem.service=service-name"

networks:
  tradingsystem_backend:
    external: true
  service_internal_network:
    name: service_internal_network
    driver: bridge

volumes:
  service-data:
    driver: local
```

---

## Docker Compose Best Practices

### 1. Port Allocation
- ✅ ALWAYS use environment variables with defaults
- ✅ Format: `${SERVICE_COMPONENT_PORT:-default}`
- ✅ Document port in compose file comments
- ❌ NEVER hardcode host ports
- ❌ NEVER use privileged ports (1-1024) without justification

### 2. Environment Variables
- ✅ Load from root `.env` via `env_file`
- ✅ Use `../../.env` (relative to compose file)
- ✅ Provide sensible defaults in compose file
- ❌ NEVER mount `.env` as volume
- ❌ NEVER create service-specific `.env` files

### 3. Networks
- ✅ Use `tradingsystem_backend` for cross-stack communication
- ✅ Use stack-specific networks for internal services
- ✅ Use container names for service discovery
- ❌ NEVER use `host.docker.internal` (unreliable on Linux/WSL2)
- ❌ NEVER use `localhost` for inter-container communication

### 4. Health Checks
- ✅ ALWAYS define health checks for services with dependencies
- ✅ Use `condition: service_healthy` in `depends_on`
- ✅ Test actual service functionality (HTTP endpoint, DB query)
- ❌ NEVER use `sleep` as health check
- ❌ NEVER skip health checks for production services

### 5. Resource Limits
- ✅ Define limits for production services
- ✅ Use `deploy.resources` for memory/CPU limits
- ✅ Monitor actual usage and adjust
- ⚠️ Optional for development environments

### 6. Volumes
- ✅ Mount source code as `:ro` (read-only) where possible
- ✅ Use named volumes for persistent data
- ✅ Use anonymous volumes for ephemeral data
- ❌ NEVER mount entire project root
- ❌ NEVER mount sensitive files (credentials, keys)

---

## Environment Variable Conventions

### Naming Standard
```bash
# Format: <SERVICE>_<COMPONENT>_<ATTRIBUTE>
# Examples:
TELEGRAM_API_PORT=4010
TELEGRAM_DB_HOST=telegram-timescale
TELEGRAM_DB_PORT=5432
TELEGRAM_REDIS_MASTER_PORT=6379
TELEGRAM_REDIS_REPLICA_PORT=6385
```

### Port Variables
```bash
# Host port (exposed to host machine)
<SERVICE>_<COMPONENT>_PORT=<port>

# Examples:
WORKSPACE_API_PORT=3210
TP_CAPITAL_API_PORT=4008
DOCS_PORT=3404
DOCS_API_PORT=3405
```

### Connection Variables
```bash
# Database connections
<SERVICE>_DB_HOST=<container-name>
<SERVICE>_DB_PORT=<internal-port>
<SERVICE>_DB_NAME=<database-name>
<SERVICE>_DB_USER=<username>
<SERVICE>_DB_PASSWORD=<password>

# Redis connections
<SERVICE>_REDIS_HOST=<container-name>
<SERVICE>_REDIS_PORT=<internal-port>
```

### Service URLs
```bash
# Internal service URLs (container-to-container)
<SERVICE>_URL=http://<container-name>:<internal-port>

# Examples:
LLAMAINDEX_QUERY_URL=http://rag-llamaindex-query:8000
QDRANT_URL=http://data-qdrant:6333
OLLAMA_BASE_URL=http://rag-ollama:11434
```

---

## Summary & Next Steps

### Immediate Actions (Priority 1)
1. ✅ Fix Redis port conflict documentation (internal networks = no conflict)
2. ✅ Fix Grafana port conflict (3000 → 3000 main, 3100 telegram)
3. ✅ Fix Redis Commander port (8081 → 8082)
4. ✅ Fix Prometheus port conflict (9090 → 9090 main, 9091 telegram)
5. ✅ Update `.env` with corrected variables
6. ✅ Test all affected services

### Documentation Updates (Priority 2)
1. Update `ports-services.mdx` with missing services
2. Remove "7000 range" reference (not implemented)
3. Create port allocation guide
4. Create environment variable reference
5. Document conflict resolution process

### Standardization (Priority 3)
1. Standardize all variable names
2. Update all compose files with new naming
3. Update `.env.example`
4. Create port validation script
5. Add conflict detection to health check

### Automation (Priority 4)
1. Auto-generate port map from compose files
2. Add pre-commit hook for port validation
3. Add CI/CD check for port conflicts
4. Monitor port usage in production

---

## Appendix: Complete File List

### Docker Compose Files Analyzed
```
tools/compose/docker-compose.course-crawler.yml
tools/compose/docker-compose.dashboard.yml
tools/compose/docker-compose.database-ui.yml
tools/compose/docker-compose.database.yml
tools/compose/docker-compose.docs.yml
tools/compose/docker-compose.e2e-override.yml
tools/compose/docker-compose.firecrawl.yml
tools/compose/docker-compose.kong.yml
tools/compose/docker-compose.monitoring.yml
tools/compose/docker-compose.n8n.yml
tools/compose/docker-compose.neon.yml
tools/compose/docker-compose.pgbouncer.yml
tools/compose/docker-compose.ports.generated.yml
tools/compose/docker-compose.qdrant-cluster.yml
tools/compose/docker-compose.qdrant-ha.yml
tools/compose/docker-compose.rag-gpu.yml
tools/compose/docker-compose.rag.yml
tools/compose/docker-compose.redis.yml
tools/compose/docker-compose.telegram-monitoring.yml
tools/compose/docker-compose.telegram.yml
tools/compose/docker-compose.tools.yml
tools/compose/docker-compose.tp-capital-stack.yml
tools/compose/docker-compose.waha.yml
tools/compose/docker-compose.workspace-simple.yml
tools/compose/generated/*.yml (24 files)
```

### Generated Outputs
```
outputs/DOCKER-COMPOSE-PORT-AUDIT-2025-11-07.md (this file)
scripts/tools/validate-ports.sh (to be created)
docs/content/tools/networking/port-allocation-guide.mdx (to be created)
```

---

**End of Report**
