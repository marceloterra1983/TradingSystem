---
title: Frontend Architecture Overview
sidebar_position: 10
tags: [architecture, react, frontend, overview]
domain: frontend
type: reference
summary: Architecture of the Documentation Dashboard and related patterns
status: active
last_review: "2025-10-17"
---

# Frontend Architecture Overview

## Layout & Navigation

- **Shell**: `components/layout/*` hosts sidebar, header, and customizable grid (`CustomizablePageLayout`, `DraggableGridLayout`, `LayoutControls`).
- **Routing**: React Router v6 (see `src/routes.tsx`) drives key routes: `/`, `/connections`, `/banco-ideias`, `/escopo`, `/banco-dados/tp-capital-opcoes`, etc.
- **Navigation metadata**: centralised in `data/navigation.tsx`, powering sidebar, breadcrumbs, and customizable layout defaults.
- **Code splitting**: `React.lazy` + `Suspense` for page-level bundles.

## State & Data Flow

| Layer | Responsibility |
|-------|----------------|
| **Zustand** | UI/interaction state (sidebar collapse, layout prefs, Kanban filters, dialogs). |
| **React Query** | Server state for Idea Bank (`ideaBankService`) and TP-Capital (`/signals`, `/logs`, `/telegram/*`). Handles polling (10–30s), caching, and error propagation. |
| **Local Storage** | MVP persistence for customizable layouts and select configuration drafts (see ADR-0003). |
| **Context Providers** | `WebSocketProvider` (mock) stands in until live status stream is wired to backend. |

Server data enters via REST:
- Idea Bank API (`http://localhost:3200/api`) consumed by `services/ideaBankService.ts`.
- TP-Capital API (`VITE_TP_CAPITAL_API_URL` or `http://localhost:4005`) consumed directly inside `ConnectionsPage` and `TPCapitalOpcoesPage`.

## UI & Design System

- Base UI uses **shadcn/ui** + Radix primitives; Tailwind CSS configured with custom tokens (`tailwind.config.js`).
- Shared primitives live in `components/ui/*` (button, card, dialog, select, textarea, badge, collapsible-card).
- Icons provided by `lucide-react`; transitions handled by Tailwind utilities — framer-motion reserved for future micro-interactions.
- Layout components support 1–4 column grids with drag-and-drop courtesy of `@dnd-kit`.

## Feature Highlights

- **Idea Bank** (`BancoIdeiasPage.tsx`): Kanban board with optimistic updates, metrics, filters, and CRUD via Idea Bank API.
- **Connections** (`ConnectionsPage.tsx`): Telegram bot/channel CRUD backed by QuestDB endpoints; React Query polling keeps QuestDB data in sync.
- **TP CAPITAL | OPCOES** (`TPCapitalOpcoesPage.tsx`): QuestDB signal table with filtering/search + ingestion logs viewer; designed for &lt;1s refresh on 500 rows.
- **Escopo & Docs**: Collapsible sections for documentation and scope pages, leveraging the customizable layout framework.

## Coding Guidelines

- Strict TypeScript with ESLint (`npm run lint`) and Vite build for fast feedback.
- Structure large components into smaller logical sections, prefer hooks for reusable behaviour.
- Use the `cn` helper for conditional Tailwind classes; avoid inline style duplication.
- Document significant changes via ADRs (`frontend/architecture/decisions`) and keep feature specs up to date.

## Architecture Roadmap

- [ ] Extract Idea Bank Kanban into dedicated subcomponents (KanbanColumn, IdeaCard, MetricsPanel) with unit tests.
- [ ] Replace mocked `WebSocketProvider` with real status stream from backend (signals/health).
- [ ] Publish Storybook for shared UI primitives and layout components.
- [ ] Formalise dark mode strategy in `references/design-system.md` (Tailwind CSS variables / CSS props).
- [ ] Consolidate REST clients under a shared API layer (axios + interceptors) once authentication is introduced.
