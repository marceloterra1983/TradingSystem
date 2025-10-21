---
title: Operations Hub
sidebar_position: 1
tags: [ops, overview, operations, deployment, monitoring, runbooks]
domain: ops
type: overview
summary: Central hub for operations, deployment, monitoring, and incident management with comprehensive index
status: active
last_review: 2025-10-18
---

# Operations Hub

> **Central hub** for operational procedures, deployment playbooks, monitoring setup, and incident management.

## 🎯 Quick Navigation

| Need                  | Go to                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **Quick start**       | [onboarding/QUICK-START-GUIDE.md](onboarding/QUICK-START-GUIDE.md)                         |
| **Service ports**     | [service-port-map.md](service-port-map.md)                                                 |
| **Environment setup** | [ENVIRONMENT-CONFIGURATION.md](ENVIRONMENT-CONFIGURATION.md)                               |
| **Deployment**        | [deployment/deployment.md](deployment/deployment.md)                                       |
| **Monitoring**        | [monitoring/monitoring.md](monitoring/monitoring.md)                                       |
| **Incidents**         | [incidents/incidents.md](incidents/incidents.md)                                           |
| **Troubleshooting**   | [troubleshooting/container-startup-issues.md](troubleshooting/container-startup-issues.md) |

---

## 🚀 Onboarding

**Location**: `ops/onboarding/`

### Quick Start Guides

| Guide                                                             | Language | Purpose                   | Tags                                       |
| ----------------------------------------------------------------- | -------- | ------------------------- | ------------------------------------------ |
| [QUICK-START-GUIDE.md](onboarding/QUICK-START-GUIDE.md)           | EN       | Developer quick start     | `quick-start`, `onboarding`, `guide`       |
| [GUIA-INICIO-DEFINITIVO.md](onboarding/GUIA-INICIO-DEFINITIVO.md) | PT       | Complete onboarding guide | `onboarding`, `guide`, `complete`, `pt-br` |
| [INICIO-RAPIDO.md](onboarding/INICIO-RAPIDO.md)                   | PT       | Quick start (Portuguese)  | `quick-start`, `pt-br`                     |
| [COMO-INICIAR.md](onboarding/COMO-INICIAR.md)                     | PT       | How to start (redirect)   | `quick-start`, `pt-br`                     |
| [START-HERE-LINUX.md](onboarding/START-HERE-LINUX.md)             | EN       | Linux-specific setup      | `linux`, `setup`, `guide`                  |
| [START-SERVICES.md](onboarding/START-SERVICES.md)                 | EN       | Service startup guide     | `services`, `startup`, `guide`             |
| [QUICK-REFERENCE.md](onboarding/QUICK-REFERENCE.md)               | EN       | Quick reference commands  | `quick-reference`, `commands`              |

---

## 🔧 Development Environment

**Location**: `ops/development/`

| Guide                                                        | Purpose                     | Tags                             |
| ------------------------------------------------------------ | --------------------------- | -------------------------------- |
| [CURSOR-LINUX-SETUP.md](development/CURSOR-LINUX-SETUP.md)   | Cursor IDE setup for Linux  | `cursor`, `linux`, `setup`       |
| [CURSOR-SETUP-RAPIDO.md](development/CURSOR-SETUP-RAPIDO.md) | Cursor quick setup (PT)     | `cursor`, `quick-start`, `pt-br` |
| [PYTHON-ENVIRONMENTS.md](development/PYTHON-ENVIRONMENTS.md) | Python virtual environments | `python`, `environments`, `venv` |

---

## 🚢 Deployment

**Location**: `ops/deployment/`

| Document                                                | Purpose                           | Tags                                 |
| ------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| [windows-native.md](deployment/windows-native.md)       | Windows-native service deployment | `windows`, `deployment`, `native`    |
| [rollback-playbook.md](deployment/rollback-playbook.md) | Rollback procedures               | `rollback`, `playbook`, `deployment` |
| [scheduled-tasks.md](deployment/scheduled-tasks.md)     | Scheduled task setup              | `scheduled-tasks`, `automation`      |

### Deployment Targets

| Target             | Services                      | Technology       | Documentation                                        |
| ------------------ | ----------------------------- | ---------------- | ---------------------------------------------------- |
| **Windows Native** | Data Capture, Order Manager   | .NET 8           | [windows-native.md](deployment/windows-native.md)    |
| **Linux/WSL**      | Node.js APIs (6 services)     | Express, Node 20 | [service-startup-guide.md](service-startup-guide.md) |
| **Docker Compose** | QuestDB, Monitoring, AI Tools | Docker           | `start-all-stacks.sh`                                |

---

## 📊 Monitoring

**Location**: `ops/monitoring/`

| Document                                                  | Purpose                            | Tags                                     |
| --------------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| [prometheus-setup.md](monitoring/prometheus-setup.md)     | Prometheus setup and configuration | `prometheus`, `monitoring`, `setup`      |
| [grafana-dashboards.md](monitoring/grafana-dashboards.md) | Grafana dashboard setup            | `grafana`, `dashboards`, `visualization` |
| [alerting-policy.md](monitoring/alerting-policy.md)       | Alerting policies and rules        | `alerting`, `policy`, `monitoring`       |

### Monitoring Stack

| Component        | Port | Purpose            | Documentation                                             |
| ---------------- | ---- | ------------------ | --------------------------------------------------------- |
| **Prometheus**   | 9090 | Metrics collection | [prometheus-setup.md](monitoring/prometheus-setup.md)     |
| **Grafana**      | 3000 | Visualization      | [grafana-dashboards.md](monitoring/grafana-dashboards.md) |
| **AlertManager** | 9093 | Alert routing      | [alerting-policy.md](monitoring/alerting-policy.md)       |

---

## 🚨 Incidents

**Location**: `ops/incidents/`

| Incident                                                                                         | Description                   | Tags                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------ |
| [incident-profitdll-reconnect.md](incidents/incident-profitdll-reconnect.md)                     | ProfitDLL reconnection issues | `profitdll`, `reconnect`, `incident` |
| [incident-idea-bank-down.md](incidents/incident-idea-bank-down.md)                               | Idea Bank service down        | `idea-bank`, `downtime`, `incident`  |
| [incident-2025-10-12-container-failures.md](incidents/incident-2025-10-12-container-failures.md) | Container startup failures    | `docker`, `containers`, `incident`   |

---

## 🔍 Troubleshooting

**Location**: `ops/troubleshooting/`

| Guide                                                                      | Purpose                           | Tags                                      |
| -------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| [container-startup-issues.md](troubleshooting/container-startup-issues.md) | Container startup troubleshooting | `docker`, `containers`, `troubleshooting` |

---

## ⚙️ Infrastructure

**Location**: `ops/infrastructure/`

| Document                                                                                        | Purpose                         | Tags                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| [CENTRALIZED-ENV-IMPLEMENTATION-PLAN.md](infrastructure/CENTRALIZED-ENV-IMPLEMENTATION-PLAN.md) | Centralized .env implementation | `environment`, `configuration`, `plan`     |
| [reverse-proxy-setup.md](infrastructure/reverse-proxy-setup.md)                                 | Reverse proxy configuration     | `reverse-proxy`, `nginx`, `infrastructure` |

---

## 🤖 Automation

**Location**: `ops/automation/`

| Document                                      | Purpose                     | Tags                                |
| --------------------------------------------- | --------------------------- | ----------------------------------- |
| [backup-job.md](automation/backup-job.md)     | Automated backup procedures | `backup`, `automation`, `scheduled` |
| [startup-task.md](automation/startup-task.md) | Startup automation tasks    | `startup`, `automation`, `tasks`    |

---

## ✅ Checklists

**Location**: `ops/checklists/`

| Checklist                                           | Purpose                   | Tags                                     |
| --------------------------------------------------- | ------------------------- | ---------------------------------------- |
| [pre-deploy.md](checklists/pre-deploy.md)           | Pre-deployment checklist  | `deployment`, `checklist`, `pre-deploy`  |
| [post-deploy.md](checklists/post-deploy.md)         | Post-deployment checklist | `deployment`, `checklist`, `post-deploy` |
| [incident-review.md](checklists/incident-review.md) | Incident review checklist | `incident`, `checklist`, `review`        |
| [linux-setup.md](checklists/linux-setup.md)         | Linux setup checklist     | `linux`, `setup`, `checklist`            |

---

## 📦 Repository Management

**Location**: `ops/repository/`

| Document                                                                  | Purpose                        | Tags                                   |
| ------------------------------------------------------------------------- | ------------------------------ | -------------------------------------- |
| [repo-cleanup-prep.md](repository/repo-cleanup-prep.md)                   | Repository cleanup preparation | `repository`, `cleanup`, `maintenance` |
| [js-workspace-inventory.md](repository/js-workspace-inventory.md)         | JavaScript workspace inventory | `javascript`, `workspace`, `inventory` |
| [service-manifest-blueprint.md](repository/service-manifest-blueprint.md) | Service manifest template      | `manifest`, `template`, `services`     |
| [history-rewrite-plan.md](repository/history-rewrite-plan.md)             | Git history rewrite plan       | `git`, `history`, `rewrite`            |

---

## 🔄 Migrations

**Location**: `ops/migrations/`

| Migration                                                                       | Description                   | Status   |
| ------------------------------------------------------------------------------- | ----------------------------- | -------- |
| [docusaurus-relocation-summary.md](migrations/docusaurus-relocation-summary.md) | Docusaurus relocation summary | Complete |

---

## 📜 Scripts

**Location**: `ops/scripts/`

| Document                                                       | Purpose                       | Tags                                   |
| -------------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| [README.md](scripts/README.md)                                 | Scripts documentation         | `scripts`, `automation`, `index`       |
| [IMPLEMENTATION-SUMMARY.md](scripts/IMPLEMENTATION-SUMMARY.md) | Script implementation summary | `scripts`, `implementation`, `summary` |

---

## 🗺️ Service Port Map

**Location**: [service-port-map.md](service-port-map.md)

### Active Services

| Service               | Port        | Container                | Technology                                           | Status   |
| --------------------- | ----------- | ------------------------ | ---------------------------------------------------- | -------- |
| **Dashboard**         | 3103        | - (npm dev server)       | React + Vite                                         | Active   |
| **Documentation API** | 3400        | `docs-api` | Express + FlexSearch                                 | Active   |
| **Docusaurus**        | 3004        | `docs-docusaurus`        | Docusaurus                                           | Active   |
| **API Viewer**        | 3101        | `docs-api-viewer`        | Next.js                                              | Active   |
| **Library API**       | 3100        | - (npm dev server)       | Express + LowDB                                      | Active   |
| **TP Capital**        | 3200        | - (npm dev server)       | Express + QuestDB                                    | Active   |
| **B3 Market Data**    | 3302        | - (npm dev server)       | Express                                              | Active   |
| **Service Launcher**  | 3500        | - (npm dev server)       | Express                                              | Active   |
| **Firecrawl Proxy**   | 3600        | - (npm dev server)       | Express + Firecrawl                                  | Active   |
| **Firecrawl API**     | 3002        | `firecrawl-api`          | Node.js (Firecrawl upstream)                         | Active   |
| **LangGraph**         | 8111        | `infra-langgraph`        | LangGraph Server                                     | Active   |
| **LangGraph Dev**     | 8112        | `infra-langgraph-dev`    | LangGraph Dev Server                                 | Active   |
| **Qdrant**            | 6333        | `data-qdrant`           | Vector DB                                            | Active   |
| **TimescaleDB**       | 5433 → 5432 | `data-timescaledb`       | Datastore principal                                  | Active   |
| QuestDB (legacy)      | -           | -                        | Container removido (dados migrados para TimescaleDB) | Retirado |
| **Prometheus**        | 9090        | `mon-prometheus`         | Monitoring                                           | Active   |
| **Grafana**           | 3000        | `mon-grafana`            | Visualization                                        | Active   |

> 📌 Naming conventions for all containers are documented in [Container Naming Convention](infrastructure/container-naming.md).

---

## 🏷️ Tags for Search

**Deployment**: `deployment`, `windows`, `linux`, `docker`, `native`, `rollback`  
**Monitoring**: `prometheus`, `grafana`, `alerting`, `metrics`, `observability`  
**Operations**: `runbooks`, `incidents`, `troubleshooting`, `automation`, `checklists`  
**Environment**: `environment`, `configuration`, `env-vars`, `setup`  
**Infrastructure**: `infrastructure`, `reverse-proxy`, `networking`, `ports`

---

## 📋 Guidelines

1. **Deployment**: Follow checklists in `checklists/` for all deployments
2. **Incidents**: Document all incidents in `incidents/` with postmortem
3. **Monitoring**: Update dashboards and alerts when adding new services
4. **Runbooks**: Keep operational procedures in `shared/runbooks/` for global scope
5. **Environment**: Use centralized `.env` (see `ENVIRONMENT-CONFIGURATION.md`)

---

## 🔗 See Also

### Cross-Domain Integration

**Backend Services:**

-   [Backend Documentation Hub](../backend/README.md) - Backend services requiring deployment
-   [Service Port Map](service-port-map.md) - Complete port reference (16 active services)
-   [Backend API Specifications](../backend/api/README.md) - API contracts for monitoring
-   [Data Operations](../backend/data/operations/) - Database backup and maintenance

**Frontend Deployment:**

-   [Frontend Documentation Hub](../frontend/README.md) - Dashboard deployment (port 3103)
-   [Dashboard Build Guide](../frontend/README.md#production-build) - Production build procedures
-   [Frontend Architecture](../frontend/architecture/overview.md) - Understanding frontend stack

**Shared Resources:**

-   [Product Requirements (PRDs)](../shared/product/prd/) - Feature specifications for deployment planning
-   [Architecture Diagrams](../shared/diagrams/) - System architecture for infrastructure planning
-   [Runbooks](../shared/runbooks/) - Operational procedures (global scope)

### Key Operations Guides

**Getting Started:**

-   [Quick Start Guide](onboarding/QUICK-START-GUIDE.md) - Developer quick start (English)
-   [Guia Início Definitivo](onboarding/GUIA-INICIO-DEFINITIVO.md) - Complete onboarding (Portuguese)
-   [Start Services Guide](onboarding/START-SERVICES.md) - Service startup procedures
-   [Quick Reference](onboarding/QUICK-REFERENCE.md) - Common commands

**Deployment:**

-   [Windows Native Deployment](deployment/windows-native.md) - Core trading services (.NET 8)
-   [Rollback Playbook](deployment/rollback-playbook.md) - Rollback procedures
-   [Pre-deployment Checklist](checklists/pre-deploy.md) - Validation before rollout
-   [Post-deployment Checklist](checklists/post-deploy.md) - Smoke tests after deployment

**Monitoring & Observability:**

-   [Prometheus Setup](monitoring/prometheus-setup.md) - Metrics collection (port 9090)
-   [Grafana Dashboards](monitoring/grafana-dashboards.md) - Visualization (port 3000)
-   [Alerting Policy](monitoring/alerting-policy.md) - Alert rules and routing
-   [Health Monitoring Guide](health-monitoring.md) - Comprehensive health checks

**Infrastructure:**

-   [Environment Configuration](ENVIRONMENT-CONFIGURATION.md) - Centralized .env management
-   [Reverse Proxy Setup](infrastructure/reverse-proxy-setup.md) - Nginx configuration
-   [Container Naming Convention](infrastructure/container-naming.md) - Docker naming standards

**Troubleshooting:**

-   [Container Startup Issues](troubleshooting/container-startup-issues.md) - Docker troubleshooting
-   [Incident: ProfitDLL Reconnect](incidents/incident-profitdll-reconnect.md) - ProfitDLL issues
-   [Incident: Container Failures](incidents/incident-2025-10-12-container-failures.md) - Container startup failures

### Development Environment

**IDE Setup:**

-   [Cursor Linux Setup](development/CURSOR-LINUX-SETUP.md) - Cursor IDE for Linux/WSL
-   [Cursor Quick Setup](development/CURSOR-SETUP-RAPIDO.md) - Quick setup (Portuguese)
-   [Python Environments](development/PYTHON-ENVIRONMENTS.md) - Virtual environment management

**Scripts & Automation:**

-   [Scripts Documentation](scripts/README.md) - Automation scripts overview
-   [Backup Job](automation/backup-job.md) - Automated backup procedures
-   [Startup Task](automation/startup-task.md) - Startup automation

### External Resources

-   [Docker Documentation](https://docs.docker.com/) - Container platform
-   [Docker Compose Documentation](https://docs.docker.com/compose/) - Multi-container orchestration
-   [Prometheus Documentation](https://prometheus.io/docs/) - Monitoring system
-   [Grafana Documentation](https://grafana.com/docs/) - Visualization platform
-   [Nginx Documentation](https://nginx.org/en/docs/) - Reverse proxy
-   [systemd Documentation](https://www.freedesktop.org/software/systemd/man/) - Linux service management

---

**Last updated**: 2025-10-18  
**Maintainers**: Ops Guild  
**Related**: [Backend Documentation](../backend/README.md) | [Frontend Documentation](../frontend/README.md) | [Shared Resources](../shared/README.md)

