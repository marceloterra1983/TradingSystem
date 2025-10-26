---
title: Frontend Features Summary
sidebar_position: 2
tags: [frontend, features, summary, overview]
domain: frontend
type: reference
summary: Quick overview of implemented frontend features with links to detailed documentation
status: active
last_review: "2025-10-17"
---

# Frontend Features Summary

Quick reference guide for implemented features in the TradingSystem dashboard.

## Feature Matrix

| Feature | Status | Location | Documentation |
|---------|--------|----------|---------------|
| **Dashboard Home** | ✅ Implemented | `/` | [Spec](feature-dashboard-home.md) |
| **Ports** | ✅ Implemented | `/ports` | [Spec](feature-ports-page.md) |
| **Settings** | ✅ Implemented | `/settings` | TBD |
| **Idea Bank** | ✅ Implemented | `/banco-ideias` | [Spec](feature-idea-bank.md) |
| **TP-Capital** | ✅ Implemented | `/banco-dados/tp-capital-opcoes` | [Spec](feature-tp-capital-signals.md) |
| **Connections** | ✅ Implemented | `/connections` | [Spec](feature-telegram-connections.md) |
| **Escopo** | ✅ Implemented | `/escopo` | TBD |
| **Docs** | 🚧 Placeholder | `/docs` | TBD |
| **Docusaurus** | 🚧 Placeholder | `/docusaurus` | TBD |
| **PRDs** | 🚧 Placeholder | `/prds` | TBD |
| **ADR** | 🚧 Placeholder | `/adr` | TBD |
| **Features** | 🚧 Placeholder | `/features` | TBD |
| **Roadmap** | 🚧 Placeholder | `/roadmap` | TBD |
| **(26 more placeholder pages)** | 🚧 Placeholder | Various | See [README](../README.md) |

## Feature Categories

**Data Management**
- Idea Bank — Curated research ideas with Kanban, tagging, metrics.
- TP-Capital Table — QuestDB-backed table with logs and filters.

**System Monitoring**
- Connections Page — Service health, Telegram configuration CRUD, QuestDB polling.
- Dashboard Home — Overview cards and recent activity.

**Documentation**
- Escopo Page — Project scope with collapsible sections and status panels.

## Implementation Status

**Completed (Phase 1)**
- Idea Bank CRUD with customizable layout.
- Telegram Connections management (QuestDB integration + polling).
- TP-Capital table and logs view.
- Customizable layout system across pages.
- Dark mode support and responsive layout.

**In Progress (Phase 2)**
- Automated tests (unit + E2E).
- CSV export for TP Capital signals.
- WebSocket/live updates for service health.
- Configuration import/export for Telegram.

**Planned (Phase 3)**
- Role-based access control.
- Advanced filtering/search across docs.
- Audit logging for administrative actions.
- Notification centre (toast + history).

## Quick Links

**For Product Managers**
- [PRD Catalog (EN)](../../shared/product/prd/en/README.md)
- Feature Roadmap (see repository `ROADMAP.md`).

**For Developers**
- [Frontend README](../README.md)
- Component Library: see `docs/context/frontend/features/` and component readmes.
- Development Guide: [Guides Overview](../guides/README.md)

**For Operators**
- [User Guides](../guides/README.md)
- [Runbooks](../../shared/runbooks/README.md)

## Documentation Pattern

Each feature follows this documentation structure:
1. **PRD** (`docs/context/shared/product/prd/en/{feature}-prd.md`)
2. **Technical Spec** (`docs/context/frontend/features/feature-{feature}.md`)
3. **User Guide** (`docs/guides/{feature}-guide.md`) — optional

## Update Process

When adding a new feature:
1. Create a PRD in `docs/context/shared/product/prd/en/`.
2. Create the technical spec in `docs/context/frontend/features/`.
3. Update [features.md](features.md) and this summary.
4. Update the PRD catalog and `CHANGELOG.md`.

## Metrics (as of 2025-10-12)

- **Total Pages**: 33
- **Fully Implemented**: 7 (21%)
- **Placeholder/In Progress**: 26 (79%)
- **Documented**: 5 (15%) - Dashboard Home, Ports, Idea Bank, TP-Capital, Telegram Connections
- **Documentation Gap**: 28 pages (85%)
- **Lines of Feature Documentation**: ~16,000

**Next Review**: 2025-11-12 — Maintainer: Frontend Team.
