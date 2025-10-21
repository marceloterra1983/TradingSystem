---
title: Frontend Summary
sidebar_position: 20
tags: [frontend, summary, shared]
domain: shared
type: reference
summary: Executive summary of the documentation dashboard and UI components
status: active
last_review: 2025-10-17
---

# Frontend Summary

## Application Overview

**Documentation Dashboard** — React 18 single-page application for trading system monitoring, documentation management, TP Capital signal visualisation, and research ideation.

- **URL**: http://localhost:5173 (development).
- **Purpose**: Centralised interface for operators to monitor services, manage documentation, track research ideas, and configure Telegram integrations.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18.2 + TypeScript 5.3 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3.4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | Lucide React |
| State Management | Zustand (UI state) |
| Data Fetching | React Query (TanStack Query) |
| Drag & Drop | @dnd-kit |
| Routing | React Router v6 |
| Testing | Vitest + React Testing Library (planned) |

## Component Architecture

**Four-layer structure**

1. **Presentation Layer**
   - Pages: Dashboard, Connections, BancoIdeias, Escopo, TPCapitalOpcoes, Settings.
   - Layout: Sidebar, Header, PageContent, CustomizablePageLayout.
   - UI primitives: shadcn/ui (Button, Card, Dialog, Tabs, Table).

2. **State Management (Zustand)**
   - `useLayoutStore`: sidebar collapsed, theme, grid layouts (persisted to localStorage).
   - `useUserStore`: user preferences, authentication state (placeholder).
   - `useNotificationStore`: toast notifications.

3. **Service Layer**
   - `ideaBankService`: REST client for Idea Bank API (port 3200).
   - QuestDB integrations handled inline via React Query fetchers targeting TP-Capital API (port 4005).
   - Local storage used for layout persistence and sandboxed configuration drafts.

4. **Utilities & Hooks**
   - `useCustomLayout` (grid persistence), `useWebSocket` (mocked), `cn`, formatters.

Related ADRs:
- [Use Zustand](../../frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md)
- [Use shadcn/ui](../../frontend/architecture/decisions/2025-10-11-adr-0002-use-shadcn-ui-for-design-system.md)
- [Use localStorage MVP](../../frontend/architecture/decisions/2025-10-11-adr-0003-use-localstorage-for-mvp.md)
- [Use React Router v6](../../frontend/architecture/decisions/2025-10-11-adr-0004-use-react-router-v6-for-navigation.md)

## Key Features

1. **Banco de Ideias**
   - Full CRUD for research ideas with Kanban board, filtering, metrics.
   - Persists to Idea Bank API; layout preferences stored per user in localStorage.

2. **Telegram Connections Management**
   - CRUD for bots (`/telegram/bots`) and channels (`/telegram/channels`) backed by QuestDB.
   - Polling every 10 seconds for status (`/bots`) and data refresh.
   - Token masking and description preview modals for operators.

3. **TP CAPITAL | OPCOES**
   - Fetches QuestDB data via `/signals` with filters for channel, signal type, free-text search.
   - Exposes CSV export (planned) and log viewer (`/logs`) for ingestion troubleshooting.

4. **Customizable Layout System**
   - Drag-and-drop cards, per-page grid presets (1-4 columns), collapsible sections.
   - Persistence via `CustomizablePageLayout` storing layout JSON in localStorage.

5. **Service Status Monitoring**
   - Connections page aggregates health cards (ProfitDLL, APIs, QuestDB ingestion).
   - Uses React Query for polling and local heuristics when APIs unavailable.

## Navigation Structure

Seven main sections: Dashboard, Coleta de Dados, Banco de Dados, Analise de Dados, Gestao de Riscos, Documentacao, Configuracoes. Routes are code-split via `React.lazy` + `Suspense` for faster initial load.

## Upcoming Work

**Q4 2025**
- Harden QuestDB UI integrations (CSV export, delete workflow safeguards).
- Add unit tests for Telegram and signals pages.
- Backport documentation browser improvements into dedicated guides.
- Introduce Prometheus status badges once metrics endpoints go live.

**Q1 2026**
- Migrate Idea Bank / Documentation features to authenticated PostgreSQL APIs.
- Add Storybook for component snapshots.
- Implement WebSocket live updates (signals, service health).
- Add import/export for Telegram configuration.

**Q2 2026**
- Deliver advanced charting for signals.
- Notification centre (toast + history).
- Mobile responsive refinements.
- Role-based access control (RBAC).

## Related Documentation

- [Frontend Architecture](../../frontend/architecture/overview.md)
- [Frontend ADRs](../../frontend/architecture/decisions/README.md)
- [Feature Documentation](../../frontend/features/features.md)
- [UI Guides](../../frontend/guides/README.md)
- [Component Architecture Diagram](../diagrams-overview.md#3-component-architecture---frontend)
- [Telegram Bot Sequence Diagram](../diagrams-overview.md#4-sequence---telegram-bot-configuration)
