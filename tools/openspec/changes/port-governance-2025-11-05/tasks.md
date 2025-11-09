# Port Governance & Connectivity - Implementation Tasks

**Proposal:** port-governance-2025-11-05  
**Status:** DRAFT  
**Last Updated:** 2025-11-05

---

## Task Overview

| Phase                    | Tasks        | Estimated Effort | Owner            | Status         |
| ------------------------ | ------------ | ---------------- | ---------------- | -------------- |
| **Phase 1: Preparation** | 5 tasks      | 3-4 days         | Architecture     | 🔄 Not Started |
| **Phase 2: Tooling**     | 8 tasks      | 4-5 days         | DevOps + Backend | 🔄 Not Started |
| **Phase 3: Migration**   | 10 tasks     | 4-5 days         | All Teams        | 🔄 Not Started |
| **Phase 4: Enforcement** | 6 tasks      | 2-3 days         | DevOps           | 🔄 Not Started |
| **Phase 5: Cleanup**     | 5 tasks      | 2-3 days         | Documentation    | 🔄 Not Started |
| **TOTAL**                | **34 tasks** | **15-20 days**   | -                | -              |

---

## Phase 1: Preparation (Week 1)

### TASK-001: Port Inventory

**Owner:** Platform Architecture  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** None  
**Status:** 🟡 Em revisão (inventário gerado em `reports/ports/port-inventory.xlsx`)

**Objective:** Catalog all ports currently in use

**Steps:**

1. Scan Docker Compose files (`tools/compose/*.yml`)
2. Scan systemd services (`tools/systemd/*.service`)
3. Scan start scripts (`scripts/docker/*.sh`, `START-*.sh`)
4. Scan backend code (`apps/*/`, `backend/*/`)
5. Scan frontend configs (`frontend/*/package.json`)
6. Scan documentation (`docs/content/tools/ports-services.mdx`)
7. Create spreadsheet with findings

**Deliverable:** `port-inventory.xlsx`

**Acceptance Criteria:**

-   [x] All 35 services cataloged (ver `reports/ports/port-inventory.xlsx`)
-   [x] Port, protocol, owner, description documentados
-   [x] Conflicts identified and highlighted (nenhum conflito encontrado na revisão 2025-11-05)
-   [ ] Peer reviewed by 2+ team members

---

### TASK-002: Define Port Ranges

**Owner:** Platform Architecture  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** TASK-001  
**Status:** 🟡 Em revisão (faixas publicadas em `docs/content/governance/port-governance/port-ranges.mdx`)

**Objective:** Establish port range convention

**Steps:**

1. Analyze current port usage patterns
2. Group services by category (frontend, apis, databases, etc.)
3. Define non-overlapping ranges
4. Reserve ranges for future growth (20% buffer)
5. Document rationale

**Deliverable:** Port ranges specification

**Proposed Ranges:**

```yaml
ranges:
    frontend: "3100-3199" # 100 ports (current: 2)
    documentation: "3200-3299" # 100 ports (current: 1)
    tools: "3300-3399" # 100 ports (current: 3)
    apis: "3400-3499" # 100 ports (current: 5)
    external-integrations: "4000-4099" # 100 ports (current: 3)
    databases-timescale: "5400-5499" # 100 ports (current: 2)
    databases-postgres: "5500-5599" # 100 ports (current: 1)
    redis: "6300-6399" # 100 ports (current: 5)
    pgbouncer: "6400-6499" # 100 ports (current: 2)
    rabbitmq: "5600-5699" # 100 ports (current: 1)
    monitoring: "9100-9199" # 100 ports (current: 4)
```

**Acceptance Criteria:**

-   [x] All current services fit within ranges (`registry.yaml`)
-   [x] No overlaps
-   [x] 20%+ headroom em cada faixa (detalhado no doc de ranges)
-   [ ] Reviewed by Architecture + DevOps

---

### TASK-003: Create Initial Registry

**Owner:** Platform Architecture  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** TASK-001, TASK-002  
**Status:** 🟢 Concluído (registry.yaml v1.0 disponível)

**Objective:** Create `config/ports/registry.yaml` v1.0

**Steps:**

1. Create `config/ports/` directory
2. Define YAML schema (see design.md)
3. Populate with inventory data
4. Assign owners (consult teams)
5. Add descriptions
6. Mark deprecated services
7. Validate manually

**Deliverable:** `config/ports/registry.yaml`

**Sample Entry:**

```yaml
services:
    - name: dashboard
      stack: frontend
      port: 3103
      protocol: http
      owner: Frontend Team
      description: "Main React Dashboard - port 3103"
      container: true
      healthcheck:
          endpoint: /
          expected: 200
```

**Acceptance Criteria:**

-   [x] All 35 services in registry (`config/ports/registry.yaml`)
-   [x] 100% of fields populated
-   [x] Owners confirmados conforme inventário
-   [x] Valida contra `npm run ports:validate`
-   [x] No duplicates (ports or names)
-   [ ] Peer reviewed

---

### TASK-004: Draft ADR-015

**Owner:** Platform Architecture  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-003  
**Status:** 🟡 Em revisão (ADR criado em `docs/content/reference/adrs/015-port-governance.md`)

**Objective:** Document port governance policy

**Steps:**

1. Create `docs/content/reference/adrs/015-port-governance.md`
2. Document decision (centralized registry)
3. Document rationale (conflicts, maintainability)
4. Document process (new port approval)
5. Document consequences (benefits + risks)
6. Define governance committee (3 approvers)
7. Submit for review

**Deliverable:** ADR-015 (draft)

**Structure:**

```markdown
# ADR-015: Port Governance Policy

## Status: Proposed

## Context

(Why we need this)

## Decision

(What we're doing)

## Consequences

(Benefits and risks)

## Process

(How to add new ports)

## Enforcement

(CI validation)
```

**Acceptance Criteria:**

-   [x] Follows ADR template
-   [ ] Reviewed by Architecture committee
-   [ ] Approved by Tech Leads (3+)

---

### TASK-005: Team Communication

**Owner:** Platform Architecture  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-004  
**Status:** 🟡 Ready for broadcast (pacote em `docs/content/governance/communications/port-governance-kickoff.mdx`)

**Objective:** Communicate plan to all teams

**Steps:**

1. Create Slack announcement
2. Email all developers
3. Schedule all-hands presentation (15 min)
4. Create FAQ document
5. Set up Q&A channel (#port-governance)
6. Gather feedback

**Deliverables:**

-   Slack announcement
-   Email
-   Presentation slides
-   FAQ doc

**Acceptance Criteria:**

-   [ ] 90%+ of developers informed (depende de envio)
-   [x] FAQ addresses common concerns
-   [ ] Feedback collected and reviewed

---

## Phase 2: Tooling (Week 2)

### TASK-006: Setup Project Structure

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** Phase 1 complete  
**Status:** 🟢 Concluído (estrutura criada em `tools/ports/`)

**Steps:**

1. Create `tools/ports/` directory
2. Initialize package.json
3. Install dependencies (js-yaml, glob, etc.)
4. Create subdirectories (lib, generators, templates)
5. Setup TypeScript config (optional)

**Deliverable:** Project structure

**Acceptance Criteria:**

-   [x] Directory structure matches design.md (`lib/`, `generators/`, `templates/`)
-   [x] Dependencies installed (`yaml`, `glob`, etc.)
-   [x] README criado (`tools/ports/README.md`)

---

### TASK-007: Implement Registry Loader

**Owner:** Backend Team  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** TASK-006  
**Status:** 🟢 Concluído (loader + testes em `tools/ports/__tests__/registry.test.js`)

**Objective:** Read and parse registry.yaml

**Files:**

-   `tools/ports/lib/registry.js`

**Functions:**

```javascript
export async function readRegistry(path: string): Promise<Registry>
export async function writeRegistry(path: string, registry: Registry): Promise<void>
export function groupByStack(services: Service[]): Map<string, Service[]>
```

**Tests:**

-   [ ] Reads valid YAML
-   [ ] Handles invalid YAML
-   [ ] Handles missing file
-   [ ] Groups correctly

**Acceptance Criteria:**

-   [x] All functions implementados (`readRegistry`, `writeRegistry`, `groupByStack`)
-   [x] Testes cobrindo casos válidos/erro/missing
-   [x] Error handling completo (mensagens claras)

---

### TASK-008: Implement Schema Validator

**Owner:** Backend Team  
**Effort:** 1.5 days  
**Priority:** P0  
**Dependencies:** TASK-007  
**Status:** 🟢 Concluído (validator + CLI `npm run ports:validate`)

**Objective:** Validate registry against schema

**Files:**

-   `tools/ports/lib/schema.js`
-   `tools/ports/validate.js`

**Validations:**

1. Schema structure (fields, types)
2. Duplicate ports
3. Duplicate names
4. Port within range
5. Dependencies exist
6. Valid protocols
7. Deprecated services have replacement

**CLI:**

```bash
npm run ports:validate
# Output:
# ✅ Schema valid
# ✅ No duplicate ports
# ✅ No duplicate names
# ✅ All ports in range
# ✅ All dependencies exist
# ✅ Registry valid
```

**Acceptance Criteria:**

-   [x] 7 validações implementadas (`schema.js`)
-   [x] Mensagens claras (duplicates, ranges, deps, protocolos)
-   [x] CLI retorna exit code 1 em falhas
-   [x] Testes cobrindo cenários-chave (`schema.test.js`)

---

### TASK-009: Implement ENV Generator

**Owner:** Backend Team  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** TASK-007  
**Status:** 🟢 Concluído (gera `.env.shared` usado por todos os stacks)

**Objective:** Generate `.env.shared` from registry

**Files:**

-   `tools/ports/generators/env.js`

**Output Format:**

```bash
# Auto-generated from config/ports/registry.yaml
# DO NOT EDIT MANUALLY - Run: npm run ports:sync
# Generated: 2025-11-05T10:00:00.000Z

DASHBOARD_PORT=3103
DASHBOARD_URL=http://dashboard:3103

TELEGRAM_MTPROTO_PORT=4007
TELEGRAM_MTPROTO_URL=http://telegram-mtproto:4007

# ... (all services)
```

**Acceptance Criteria:**

-   [x] Formato `.env` válido com comentários e timestamp
-   [x] Host/URL usando nome do serviço (container) ou `localhost` (dev)
-   [x] Gera variáveis `*_HOST`, `*_PORT`, `*_URL`
-   [x] Coberto por `env-generator.test.js`

---

### TASK-010: Implement Compose Generator

**Owner:** DevOps  
**Effort:** 1.5 days  
**Priority:** P0  
**Dependencies:** TASK-007  
**Status:** 🟢 Concluído (dictionary + fragments em `tools/compose/generated/`)

**Objective:** Generate Docker Compose files from registry

**Files:**

-   `tools/ports/generators/compose.js`
-   `tools/ports/templates/docker-compose.template.yml`

**Strategy:**

1. Use template with placeholders
2. Substitute variables
3. Generate one compose per stack

**Template:**

```yaml
# Auto-generated - DO NOT EDIT
# Generated: {{timestamp}}

services:
{{#services}}
  {{name}}:
    container_name: {{name}}
    ports:
      - "${{{portEnvVar}}}:{{port}}"
{{#network}}
    networks:
      - {{network}}
{{/network}}
{{#depends_on}}
    depends_on:
{{#dependencies}}
      {{.}}:
        condition: service_healthy
{{/dependencies}}
{{/depends_on}}
{{/services}}

{{#networks}}
networks:
{{#.}}
  {{name}}:
    name: {{name}}
    driver: bridge
{{/.}}
{{/networks}}
```

**Acceptance Criteria:**

-   [x] Gera YAML válido a partir de template
-   [x] Todas as stacks recebem arquivo `docker-compose.<stack>.ports.yml`
-   [x] Integrado ao `npm run ports:sync`
-   [x] Testes automatizados (`compose-generator.test.js`)
-   [ ] Dependencies correct
-   [ ] Networks defined

---

### TASK-011: Implement Docs Generator

**Owner:** Documentation Team  
**Effort:** 1 day  
**Priority:** P1  
**Dependencies:** TASK-007  
**Status:** 🟢 Concluído (Dockerfile em `apps/telegram-gateway/Dockerfile`)

**Objective:** Generate Docusaurus MDX from registry

**Files:**

-   `tools/ports/generators/docs.js`

**Output:** `docs/content/tools/ports-services.mdx`

**Structure:**

1. Header (title, tags, generated flag)
2. Port ranges table
3. Services by stack (tables)
4. Deprecated services warning
5. Last updated timestamp

**Acceptance Criteria:**

-   [ ] Valid MDX
-   [ ] Docusaurus renders correctly
-   [ ] Searchable
-   [ ] Mobile-friendly tables

---

### TASK-012: Implement Health Generator

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-007  
**Status:** 🟢 Concluído (dashboard container em `docker-compose.dashboard.yml`)

**Objective:** Generate health check script

**Files:**

-   `tools/ports/generators/health.js`

**Output:** `scripts/maintenance/ports-health.sh`

**Logic:**

```bash
#!/bin/bash
for service in $(registry services with healthcheck); do
  curl -f http://${service}:${port}${healthcheck_endpoint}
  if [ $? -eq 0 ]; then
    echo "✅ ${service} HEALTHY"
  else
    echo "❌ ${service} UNHEALTHY"
  fi
done
```

**Acceptance Criteria:**

-   [ ] Executable script
-   [ ] Color-coded output
-   [ ] Exit code reflects health
-   [ ] Timeout after 5s per service

---

### TASK-013: Implement Hardcoded Scanner

**Owner:** Backend Team  
**Effort:** 1 day  
**Priority:** P1  
**Dependencies:** None  
**Status:** 🟡 Em progresso (workspace, docs, firecrawl e TP Capital migrados)

**Objective:** Detect hardcoded ports in codebase

**Files:**

-   `tools/ports/scan-hardcoded.js`

**Patterns:**

-   `localhost:\d{4,5}`
-   `127.0.0.1:\d{4,5}`
-   `ports: "3103:3103"`
-   `PORT=3200`

**Exceptions:**

-   `config/ports/registry.yaml`
-   `.env.shared` (generated)
-   `tools/ports/**` (tooling itself)

**CLI:**

```bash
npm run ports:scan-hardcoded

# If violations found:
# ❌ Hardcoded ports found:
#   backend/api/workspace/src/index.js:15 - PORT=3200
#   tools/compose/docker-compose.old.yml:10 - ports: "3103:3103"
# Exit code: 1

# If clean:
# ✅ No hardcoded ports found
# Exit code: 0
```

**Acceptance Criteria:**

-   [ ] Scans all file types (.js, .ts, .yml, .sh)
-   [ ] Respects ignore patterns
-   [ ] Clear violation reports
-   [ ] Fast (<5s for entire codebase)

---

## Phase 3: Migration (Week 3)

### TASK-014: Create Telegram Dockerfile

**Owner:** Telegram Team  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** Phase 2 complete  
**Status:** 🟢 Concluído (db-core stack usa `.env.shared` e portas oficiais)

**Objective:** Containerize MTProto Gateway

**Files:**

-   `apps/telegram-gateway/Dockerfile`

**Requirements:**

-   Node 20 Alpine
-   Production dependencies only
-   Healthcheck endpoint `/health`
-   Session persistence (volume)

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4007/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 4007

CMD ["node", "src/index.js"]
```

**Acceptance Criteria:**

-   [x] Builds successfully (`docker compose -p 4-2-telegram-stack ... up`)
-   [x] Health check `/health` respondendo 200 em container
-   [x] Sessões montadas via volume `apps/telegram-gateway/.session`
-   [ ] Connects to Telegram (depende de credenciais em produção)

---

### TASK-015: Update Telegram Compose

**Owner:** Telegram Team  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** TASK-014  
**Status:** 🟢 Concluído (MTProto + Gateway API rodando via compose)

**Objective:** Add MTProto to docker-compose.4-2-telegram-stack.yml

**Steps:**

1. Add `telegram-mtproto` service
2. Configure network (`telegram_net`)
3. Add volume (`telegram-sessions`)
4. Update `telegram-gateway-api` dependencies
5. Update `MTPROTO_SERVICE_URL` to `http://telegram-mtproto:4007`
6. Test locally

**Acceptance Criteria:**

-   [x] MTProto inicia em container `telegram-mtproto`
-   [x] Gateway API usa `http://telegram-mtproto:4007`
-   [x] Health checks OK (`curl localhost:4007/health`, `:4010/health`)
-   [ ] Sync works end-to-end (depende de fluxo real/Telegram)

---

### TASK-016: Migrate Frontend Stack

**Owner:** Frontend Team  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-010  
**Status:** 🟢 Concluído (Redis master/replica/sentinel usam `.env.shared` e portas oficiais)

**Services:**

-   Dashboard (3103)

**Steps:**

1. Backup current compose file
2. Generate new compose from registry
3. Update start scripts to use `.env.shared`
4. Test locally
5. Deploy to dev

**Acceptance Criteria:**

-   [x] Dashboard starts on port `${DASHBOARD_PORT}` (compose stack)
-   [x] Compose/service definitions usam `.env.shared`/vars (sem literal 3103)
-   [ ] Start scripts atualizados (serão tratados no TASK-021)

---

### TASK-017: Migrate APIs Stack

**Owner:** Backend APIs Team  
**Effort:** 1 day  
**Priority:** P1  
**Dependencies:** TASK-010  
**Status:** 🟡 Em andamento (start/stop scripts agora carregam `.env.shared` para portas geradas)

**Services:**

-   Workspace API (3200)
-   TP Capital (4005)
-   Documentation API (3401)
-   Firecrawl Proxy (3600)

**Steps:** (same as TASK-016 for each service)

**Acceptance Criteria:**

-   [x] Workspace API roda via stack docker-compose.workspace-stack.yml (`WORKSPACE_API_PORT`)
-   [x] Docs Hub + Documentation API usam `.env.shared` (ports 3400/3401)
-   [x] Firecrawl proxy e dependências usam `.env.shared`
-   [x] TP Capital stack expõe `${TP_CAPITAL_API_PORT:-4008}`

---

### TASK-018: Migrate Database Stack

**Owner:** Database Team  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-010  
**Status:** 🔄 Not Started

**Services:**

-   TimescaleDB (5434)
-   Postgres (5432)
-   PgBouncer (6434)

**Steps:** (same as TASK-016)

**Acceptance Criteria:**

-   [x] Databases acessíveis via `${TELEGRAM_DB_PORT:-5434}`
-   [x] PgBouncer exposto conforme registry (6434)
-   [x] Dados persistem em volumes (`telegram-timescaledb-data`, `workspace-db-*`)

---

### TASK-019: Migrate Cache Stack

**Owner:** Cache Team  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-010  
**Status:** 🔄 Not Started

**Services:**

-   Redis Master (6379)
-   Redis Replica (6386)
-   Redis Sentinel (26379)

**Steps:** (same as TASK-016)

**Acceptance Criteria:**

-   [x] Redis master exposto via `${TELEGRAM_REDIS_PORT:-6379}`
-   [x] Replica/ Sentinel usam `${TELEGRAM_REDIS_REPLICA_PORT:-6385}` / `${TELEGRAM_REDIS_SENTINEL_PORT:-26379}`
-   [x] Compose referencia `.env.shared` (pronto para health script)
-   [ ] Failover/replication testado (executar durante TASK-022)

---

### TASK-020: Migrate Monitoring Stack

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-010  
**Status:** 🟢 Concluído (Grafana/Prometheus/exporters alinhados ao registry)

**Services:**

-   Grafana (3100)
-   Prometheus (9193)
-   Exporters (9121, 9188)

**Steps:** (same as TASK-016)

**Acceptance Criteria:**

-   [x] Prometheus e Grafana usam `${PROMETHEUS_PORT}` / `${GRAFANA_PORT}` via `.env.shared`
-   [x] Timescale/Redis exporters usam `.env.shared` e portas 9187/9121
-   [ ] Alertas testados (cobrir em TASK-022)

---

### TASK-021: Update Start Scripts

**Owner:** DevOps  
**Effort:** 1 day  
**Priority:** P1  
**Dependencies:** TASK-014-020  
**Status:** 🔄 Not Started

**Scripts abordados:**

-   `scripts/start.sh`
-   `scripts/docker/start-stacks.sh`
-   `scripts/docker/stop-stacks.sh`
-   `scripts/docker/check-docs-services.sh`

**Script pendentes:** `START-ALL-TELEGRAM.sh`, `install-shortcuts.sh`.

**Updates em andamento:**

1. Source `.env.shared`
2. Usar `${PORT_VAR}` no lugar de literais
3. Atualizar health checks para novas URLs
4. Ajustar dashboard para containers ou abstrações equivalentes

**Acceptance Criteria:**

-   [x] Scripts docker/start-stacks.sh e stop-stacks.sh leem `.env.shared`
-   [x] `scripts/start.sh` carrega `.env.shared` e usa variáveis `${*_PORT}` para serviços locais
-   [ ] Revisar dependências locais do dashboard em scripts host-only
-   [ ] Error handling revisto para novos fluxos

---

### TASK-022: Integration Testing

**Owner:** QA + DevOps  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** TASK-014-021  
**Status:** 🔄 Not Started

**Test Scenarios:**

1. **Full Stack Startup**

    - Start all services
    - Verify health
    - Test connectivity

2. **Telegram Sync**

    - Trigger sync from Dashboard
    - Verify messages saved
    - Check link previews

3. **Inter-Service Communication**

    - Gateway API → MTProto
    - APIs → Databases
    - Services → Redis

4. **Port Conflicts**
    - Verify no conflicts
    - Test port reuse after stop

**Acceptance Criteria:**

-   [ ] All scenarios pass
-   [ ] No port conflicts
-   [ ] Performance baseline met
-   [ ] Documentation updated

---

### TASK-023: Rollback Plan

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** TASK-022  
**Status:** 🔄 Not Started

**Objective:** Prepare rollback procedure

**Steps:**

1. Backup all current configs (`.bak`)
2. Document rollback steps
3. Test rollback procedure
4. Create rollback script

**Rollback Script:**

```bash
#!/bin/bash
# rollback-port-governance.sh

echo "🔄 Rolling back to pre-governance configs..."

# Restore backups
cp tools/compose/*.yml.bak tools/compose/
cp .env.bak .env

# Restart services
docker compose down
docker compose up -d

echo "✅ Rollback complete"
```

**Acceptance Criteria:**

-   [ ] Rollback tested successfully
-   [ ] < 5 minutes downtime
-   [ ] Documentation complete

---

## Phase 4: Enforcement (Week 4)

### TASK-024: Create CI Workflow

**Owner:** DevOps  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** Phase 2 complete  
**Status:** 🔄 Not Started

**File:** `.github/workflows/port-governance.yml`

**Jobs:**

1. Validate schema
2. Check duplicates
3. Verify sync (generated files match)
4. Scan hardcoded ports
5. Check range compliance
6. Generate report
7. Comment PR

**Triggers:**

-   Pull requests (all)
-   Push to main/develop

**Mode:** Non-blocking initially, blocking after Phase 3

**Acceptance Criteria:**

-   [ ] Workflow runs successfully
-   [ ] All checks implemented
-   [ ] PR comments helpful
-   [ ] < 1 minute execution time

---

### TASK-025: Create Pre-commit Hook

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-024  
**Status:** 🔄 Not Started

**File:** `.husky/pre-commit`

**Logic:**

```bash
if registry modified; then
  npm run ports:sync
  git add generated files
fi

npm run ports:validate || exit 1
```

**Acceptance Criteria:**

-   [ ] Runs on every commit
-   [ ] Auto-syncs when registry changes
-   [ ] Fast (<2s)
-   [ ] Clear error messages

---

### TASK-026: Enable CI Enforcement

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** TASK-024, Phase 3 complete  
**Status:** 🔄 Not Started

**Steps:**

1. Change CI workflow to blocking
2. Update branch protection rules
3. Require status check
4. Test with dummy PR

**Branch Protection:**

```yaml
main:
    required_status_checks:
        - port-governance
    required_reviews: 2
    enforce_admins: true
```

**Acceptance Criteria:**

-   [ ] PRs blocked on CI failure
-   [ ] Test PR validated
-   [ ] Admins cannot bypass

---

### TASK-027: Deploy to Staging

**Owner:** DevOps  
**Effort:** 1 day  
**Priority:** P0  
**Dependencies:** TASK-026  
**Status:** 🔄 Not Started

**Steps:**

1. Deploy to staging environment
2. Run smoke tests
3. Monitor for 24-48h
4. Check logs for errors
5. Validate performance

**Smoke Tests:**

-   Health checks pass
-   Inter-service connectivity
-   No port conflicts
-   Performance baseline

**Acceptance Criteria:**

-   [ ] 48h uptime
-   [ ] Zero port conflicts
-   [ ] Performance within 5% of baseline
-   [ ] No critical errors

---

### TASK-028: Deploy to Production

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P0  
**Dependencies:** TASK-027 (48h clean)  
**Status:** 🔄 Not Started

**Steps:**

1. Schedule maintenance window (if needed)
2. Deploy to production
3. Monitor closely (first hour)
4. Validate all services
5. Run health checks

**Rollback Trigger:**

-   Any critical service down > 5 min
-   Port conflicts
-   Data loss

**Acceptance Criteria:**

-   [ ] Clean deployment
-   [ ] < 5 min downtime (if any)
-   [ ] All services healthy
-   [ ] Monitoring shows normal

---

### TASK-029: Post-Deployment Monitoring

**Owner:** DevOps  
**Effort:** 1 day (spread over week)  
**Priority:** P1  
**Dependencies:** TASK-028  
**Status:** 🔄 Not Started

**Monitoring:**

1. Watch logs for errors
2. Track port conflicts (should be 0)
3. Monitor performance
4. Check developer feedback

**Metrics:**

-   Uptime: > 99.9%
-   Port conflicts: 0
-   Mean time to resolution: < 10 min
-   Developer satisfaction: survey

**Acceptance Criteria:**

-   [ ] 7 days clean operation
-   [ ] No rollbacks
-   [ ] Positive developer feedback

---

## Phase 5: Cleanup & Documentation (Week 5)

### TASK-030: Remove Old Configs

**Owner:** DevOps  
**Effort:** 0.5 days  
**Priority:** P2  
**Dependencies:** TASK-029  
**Status:** 🔄 Not Started

**Files to Remove:**

-   All `.bak` files
-   Old compose files (if replaced)
-   Unused scripts

**Steps:**

1. Verify new configs stable (7+ days)
2. Create archive branch (backup)
3. Delete old files
4. Commit with clear message

**Acceptance Criteria:**

-   [ ] No `.bak` files in main
-   [ ] Archive branch created
-   [ ] Codebase clean

---

### TASK-031: Update Documentation

**Owner:** Documentation Team  
**Effort:** 1 day  
**Priority:** P1  
**Dependencies:** TASK-030  
**Status:** 🔄 Not Started

**Documents to Update:**

1. Main README.md
2. CONTRIBUTING.md
3. All service READMEs
4. Architecture docs
5. Troubleshooting guides

**New Documentation:**

1. Port governance guide
2. How to add new port
3. Troubleshooting port issues

**Acceptance Criteria:**

-   [ ] All docs updated
-   [ ] Screenshots current
-   [ ] Links working
-   [ ] Peer reviewed

---

### TASK-032: Create Onboarding Guide

**Owner:** Documentation Team  
**Effort:** 0.5 days  
**Priority:** P1  
**Dependencies:** TASK-031  
**Status:** 🔄 Not Started

**File:** `docs/content/tools/ports-governance-guide.mdx`

**Sections:**

1. Overview
2. How it works
3. Port ranges
4. Adding new service
5. Troubleshooting
6. FAQ

**Acceptance Criteria:**

-   [ ] Clear and concise
-   [ ] Code examples
-   [ ] Screenshots/diagrams
-   [ ] Searchable

---

### TASK-033: Team Workshop

**Owner:** Platform Architecture  
**Effort:** 1 day (prep + delivery)  
**Priority:** P1  
**Dependencies:** TASK-032  
**Status:** 🔄 Not Started

**Workshop:**

-   Duration: 60 min
-   Audience: All developers
-   Format: Presentation + Q&A

**Agenda:**

1. Why port governance (10 min)
2. How it works (15 min)
3. Live demo (15 min)
4. Adding new port (10 min)
5. Q&A (10 min)

**Deliverables:**

-   Slides
-   Recording
-   FAQ update

**Acceptance Criteria:**

-   [ ] 80%+ attendance
-   [ ] Recording published
-   [ ] Positive feedback

---

### TASK-034: Retrospective

**Owner:** Platform Architecture  
**Effort:** 0.5 days  
**Priority:** P2  
**Dependencies:** All tasks complete  
**Status:** 🔄 Not Started

**Objective:** Review implementation, gather lessons learned

**Participants:**

-   Architecture
-   DevOps
-   Team Leads
-   Key contributors

**Topics:**

1. What went well
2. What could be improved
3. Unexpected challenges
4. Future enhancements

**Deliverable:** Retrospective document

**Acceptance Criteria:**

-   [ ] Meeting held
-   [ ] Action items captured
-   [ ] Document published

---

## Summary

### Critical Path

```
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-006 →
TASK-007 → TASK-008 → TASK-010 → TASK-014 → TASK-015 →
TASK-022 → TASK-024 → TASK-026 → TASK-027 → TASK-028
```

**Critical Path Duration:** ~15 days

### Effort by Team

| Team                  | Tasks  | Days     |
| --------------------- | ------ | -------- |
| Platform Architecture | 7      | 5.5      |
| DevOps                | 11     | 8.0      |
| Backend               | 6      | 5.5      |
| Frontend              | 2      | 1.0      |
| Database              | 1      | 0.5      |
| Telegram              | 2      | 1.5      |
| Documentation         | 4      | 2.5      |
| QA                    | 1      | 1.0      |
| **TOTAL**             | **34** | **25.5** |

_(Parallelizable to ~15-20 days calendar time)_

---

## Risk Mitigation Tasks

**Additional tasks if risks materialize:**

-   **RISK-001:** MTProto can't be containerized
    -   **Mitigation Task:** Use `host.docker.internal` fallback
    -   **Effort:** 0.5 days
-   **RISK-002:** Breaking changes cause outages
    -   **Mitigation Task:** Gradual rollout (stack by stack)
    -   **Effort:** +2 days
-   **RISK-003:** Team ignores process
    -   **Mitigation Task:** Additional training + enforcement
    -   **Effort:** 1 day

---

**Next:** Begin Phase 1 tasks upon approval
