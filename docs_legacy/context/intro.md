---
title: Welcome to TradingSystem Documentation
sidebar_position: 1
slug: /
tags: [overview, getting-started, architecture, quick-start]
domain: shared
type: reference
summary: Central documentation hub for TradingSystem platform with architecture overview and navigation guide
status: active
last_review: "2025-10-17"
---

# TradingSystem Documentation

> Core references for the on-prem TradingSystem platform (Windows-native services + Docker Compose auxiliaries).

**Key concepts**
- 100% local stack: native Windows (.NET + ProfitDLL) para o pipeline de trading; Docker Compose para serviços auxiliares (QuestDB, monitoring, AI tools)
- Low-latency architecture: ProfitDLL → Data Capture (.NET) → REST/WebSocket APIs → React dashboard
- Built-in risk controls: kill switch, daily limits, position caps, telemetry with Prometheus/Grafana

---

## 📦 Service Footprint

| Layer | Runs where | Notes |
|-------|------------|-------|
| Data Capture / Order Manager | Windows services | ProfitDLL integration, &lt;500 ms SLA |
| Node.js APIs (Library, TP Capital, B3, Docs, Launcher, Firecrawl Proxy) | Linux/WSL | Dev scripts (`start-all-services.sh`) |
| QuestDB, Monitoring, AI tooling | Docker Compose stacks | `start-all-stacks.sh` |
| React Dashboard | Local dev (`npm run dev`) / publicação via Docker Compose | Main UI at http://localhost:3103 |

---

## 📐 Documentation Standards

All documentation follows official standards:
- **[DOCUMENTATION-STANDARD.md](https://github.com/marceloterra/TradingSystem/blob/main/docs/DOCUMENTATION-STANDARD.md)** - YAML frontmatter, PlantUML diagrams, templates
- **[DIRECTORY-STRUCTURE.md](https://github.com/marceloterra/TradingSystem/blob/main/docs/DIRECTORY-STRUCTURE.md)** - Complete project structure guide

Required frontmatter fields: title, sidebar_position, tags, domain, type, summary, status, last_review

---

## 🗺️ Navigate the Docs

| Need | Start here |
|------|------------|
| High-level architecture | `frontend/context` & `backend/context` overviews |
| Service APIs & data schemas | `context/backend/api/` + `context/backend/data/` |
| Dashboard features & guides | `context/frontend/features/` + `context/frontend/guides/` |
| Operations / Runbooks | `context/ops/` (deployment, monitoring, incidents) |
| Product specs & templates | `context/shared/product/` + `context/shared/tools/templates/` |
| Glossary & summaries | `context/glossary.md` + `context/shared/summaries/` |

---

## 🚀 Developer Quick Start

```bash
# from repo root
bash install-dependencies.sh
bash start-all-services.sh
```

- Health checks: `bash check-services.sh`, logs em `/tmp/tradingsystem-logs`
- Scripts de stacks: `start-all-stacks.sh`, `stop-all-stacks.sh`
- Dashboard: http://localhost:3103
- Docusaurus: http://localhost:3004

---

## 📚 Useful Shortcuts

- `guides/README.md` — índice de guias operacionais (onboarding, tooling)
- `docs/reports/README.md` — auditorias e análises
- `archive/` — histórico de sessões/legados (não usar para novos fluxos)
