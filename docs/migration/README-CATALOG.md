## Overview
- Total README files: 14
- Domains covered: apps (7), backend (2), frontend (2), docs (1), ops (1), shared (2)
- Completeness: All 14 marked Complete
- Last catalog update: 2025-10-25

## Catalog Table

| Path | Domain | Audience | Status | Summary | Last Updated |
|------|--------|----------|--------|---------|--------------|
| [apps/README.md](../../apps/README.md) | apps | Developers | Complete | Overview of vertical apps, deployment modes, and lifecycle tooling. | 2025-10-17 |
| [apps/workspace/README.md](../../apps/workspace/README.md) | apps | Developers | Complete | Workspace agent orchestration, environment setup, and config registry usage. | 2025-10-18 |
| [apps/tp-capital/README.md](../../apps/tp-capital/README.md) | apps | Product | Complete | Trading partner capital requirements, data ingestion, and compliance checks. | 2025-10-16 |
| [apps/risk-analytics/README.md](../../apps/risk-analytics/README.md) | apps | Ops | Complete | Risk scoring pipeline, alert thresholds, and monitoring hooks. | 2025-10-15 |
| [apps/order-router/README.md](../../apps/order-router/README.md) | apps | Developers | Complete | Order routing service flows, retry policies, and integration endpoints. | 2025-10-14 |
| [apps/alerting-bot/README.md](../../apps/alerting-bot/README.md) | apps | Ops | Complete | Alert bot deployment, notification channels, and escalation policies. | 2025-10-13 |
| [apps/insights-dashboard/README.md](../../apps/insights-dashboard/README.md) | apps | UI Engineers | Complete | Embedded dashboards, theming guidelines, and graph data sources. | 2025-10-12 |
| [backend/api/README.md](../../backend/api/README.md) | backend | Developers | Complete | Backend API architecture, service mesh integration, and OpenAPI references. | 2025-10-19 |
| [frontend/dashboard/README.md](../../frontend/dashboard/README.md) | frontend | UI Engineers | Complete | Vite workspace, component library usage, and design tokens integration. | 2025-10-20 |
| [docs/README.md](../../docs/README.md) | docs | Docs & Ops | Complete | TradingSystem Documentation Portal. | 2025-10-23 |
| [docs/context/backend/README.md](../../docs/context/backend/README.md) | backend | Backend Engineers | Complete | Central reference for backend architecture, APIs, guides, and data with comprehensive index. | 2025-10-18 |
| [docs/context/frontend/README.md](../../docs/context/frontend/README.md) | frontend | UI Engineers | Complete | Indice central de toda documentacao frontend do TradingSystem. | 2025-10-19 |
| [docs/context/ops/README.md](../../docs/context/ops/README.md) | ops | Operations | Complete | Central hub for operations, deployment, monitoring, and incident management with comprehensive index. | 2025-10-18 |
| [docs/context/shared/README.md](../../docs/context/shared/README.md) | shared | Cross-functional Teams | Complete | Central hub for templates, product docs, diagrams, runbooks, and cross-cutting documentation. | 2025-10-18 |

## Statistics

### By Domain
- apps: 7 files
- backend: 2 files
- frontend: 2 files
- docs: 1 file
- ops: 1 file
- shared: 2 files

### By Status
- Complete: 14
- Partial: 0
- Outdated: 0
- Unknown: 0

## Detailed Analysis

### apps/README.md
- **Key Sections:** Overview, Service Catalogue, Release Process, Troubleshooting.
- **Cross-References:** `config/services-manifest.json`, `docs/context/ops/onboarding/QUICK-START-GUIDE.md`.
- **Environment Variables:** References global `.env` schema and per-app overrides.
- **Integration Points:** Connects to `backend/api/documentation-api` and shared event bus.

### apps/workspace/README.md
- **Key Sections:** Workspace Overview, Agent Matrix, Task Scheduling, Deployment.
- **Cross-References:** `backend/api/workspace/README.md`, `scripts/startup/workspace.sh`.
- **Environment Variables:** `WORKSPACE_AGENT_TOKEN`, `WORKSPACE_SCHEDULE_WINDOW`.
- **Integration Points:** Invokes workspace microservice, hooks into MCP registry.

### apps/tp-capital/README.md
- **Key Sections:** Capital Requirements, Data Pipelines, Compliance Automation.
- **Cross-References:** `backend/data/schemas/tp-capital.md`, `config/services-manifest.json`.
- **Environment Variables:** `TP_CAPITAL_API_KEY`, `TP_CAPITAL_REFRESH_CRON`.
- **Integration Points:** Connects to Ops alerting and risk analytics data feeds.

### apps/risk-analytics/README.md
- **Key Sections:** Analytics Engine, Scoring Algorithms, Alert Thresholds.
- **Cross-References:** `docs/context/backend/guides/risk-analytics.md`, `scripts/startup/risk.sh`.
- **Environment Variables:** `RISK_MODEL_VERSION`, `RISK_ALERT_SLACK_CHANNEL`.
- **Integration Points:** Consumes order-router events, publishes to alerting bot.

### apps/order-router/README.md
- **Key Sections:** Routing Flow, Retry Policies, Failover Strategy.
- **Cross-References:** `backend/api/README.md`, `ops/service-port-map.md`.
- **Environment Variables:** `ORDER_ROUTER_MAX_RETRY`, `ORDER_ROUTER_FALLBACK_ENDPOINT`.
- **Integration Points:** Interfaces with trading engine, logs to monitoring stack.

### apps/alerting-bot/README.md
- **Key Sections:** Notification Channels, Escalation Policies, Health Checks.
- **Cross-References:** `scripts/startup/alerting.sh`, `ops/monitoring/prometheus-setup.md`.
- **Environment Variables:** `ALERTING_SLACK_TOKEN`, `ALERTING_ESCALATION_TEAM`.
- **Integration Points:** Subscribes to risk analytics outputs, integrates with Ops dashboards.

### apps/insights-dashboard/README.md
- **Key Sections:** Dashboard Modules, Theming, Embedding Guidelines.
- **Cross-References:** `frontend/dashboard/README.md`, `frontend/tokens/README.md`.
- **Environment Variables:** `INSIGHTS_THEME_MODE`, `INSIGHTS_DATA_SOURCE`.
- **Integration Points:** Pulls from backend analytics APIs, embeds into Workspace.

### backend/api/README.md
- **Key Sections:** Service Overview, API Catalogue, Authentication, Deployment.
- **Cross-References:** `docs/context/backend/api/README.md`, `docs/context/backend/api/specs/`.
- **Environment Variables:** `API_GATEWAY_URL`, `SERVICE_MESH_NAMESPACE`.
- **Integration Points:** Coordinates microservices, exports OpenAPI specs to docs.

### frontend/dashboard/README.md
- **Key Sections:** Workspace Setup, Component Library, State Management, Testing.
- **Cross-References:** `frontend/dashboard/src/components/README.md`, `frontend/design-system/tokens.mdx`.
- **Environment Variables:** `VITE_API_BASE_URL`, `VITE_FEATURE_FLAGS`.
- **Integration Points:** Consumes backend APIs, hooks into analytics telemetry.

## Files Needing Attention

None identified - all READMEs have complete frontmatter, recent updates (October 2025), and comprehensive sections.

## Cross-Reference Map

- `config/services-manifest.json` (referenced by apps/README.md)
- `config/ENV-CONFIGURATION-RULES.md` (referenced by multiple READMEs)
- `backend/api/workspace/README.md` (referenced by apps/workspace/README.md)
- `scripts/startup/*.sh` and `scripts/shutdown/*.sh` (referenced by multiple READMEs)

## Maintenance Notes

Recommend quarterly review cycle to:
- Verify last_review dates remain current
- Check for new README files in apps/
- Validate cross-references still resolve
- Update statistics
