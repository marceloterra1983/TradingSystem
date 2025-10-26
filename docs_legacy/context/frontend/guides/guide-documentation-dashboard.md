---
title: Dashboard Documentation Guide
sidebar_position: 50
tags: [dashboard, frontend, guide]
domain: frontend
type: guide
summary: Setup and core capabilities of the Documentation Dashboard
status: active
last_review: "2025-10-17"
---

# Dashboard Documentation Guide

## 1. Purpose

Provide an interactive hub for documentation, the Idea Bank, and light analytics. It is the reference implementation for layout, design system usage, and drag-and-drop patterns.

## 2. Prerequisites

- Node.js 18+
- npm
- Idea Bank API running (`backend/api/idea-bank`, port `3200`)
- TP-Capital API running (`apps/tp-capital`, port `4005`, QuestDB reachable)

## 3. Setup

```bash
cd frontend/dashboard
npm install
npm run dev
```

Production build:
```bash
npm run build
npm run preview
```

## 4. Key components

| Area | Description |
|------|-------------|
| `components/layout/*` | Shell (sidebar, header, customizable grid, layout controls). |
| `components/pages/BancoIdeiasPage.tsx` | Idea Bank CRUD + Kanban board, metrics, filters. |
| `components/pages/ConnectionsPage.tsx` | Telegram bot/channel CRUD backed by QuestDB. |
| `components/pages/TPCapitalOpcoesPage.tsx` | QuestDB signal table + ingestion logs. |
| `services/ideaBankService.ts` | REST integration with Idea Bank API (fetch). |
| `data/navigation.tsx` | Sidebar configuration and routing metadata. |
| `hooks/useWebSocket.ts` | Mocked status provider for upcoming realtime stream. |
| `components/ui/*` | shadcn/ui primitives (button, card, dialog, select, collapsible card). |

## 5. Features

- Form validation (title, description, category, priority).
- Combined filters (status, priority, category).
- Drag-and-drop Kanban board with optimistic updates (dnd-kit).
- Summary metrics (totals by status, priority, category).
- Responsive layout (1–4 column grids) with colour-coded badges.
- TP Capital signal monitoring (QuestDB table, filters, manual refresh, logs viewer).
- Telegram configuration management (bot/channel CRUD with polling + status badges).

## 6. Best practices

- Keep components focused; pass typed props and avoid global state when unnecessary.
- Use Tailwind utility classes plus the `cn` helper for conditional styling.
- Update `glossary.md` when introducing new UI terminology.
- Record significant architectural changes through ADRs (frontend/architecture/decisions).

## 7. Quality checks

- `npm run lint` (ESLint).
- `npm run test` (Vitest)  add coverage for Idea Bank as tests are introduced.
- Manual: drag cards, create/edit/delete ideas, exercise filters.

## 8. Next iterations

- Add Vitest/Playwright coverage for Idea Bank, Telegram CRUD, and TP Capital signals flows.
- Replace the mock WebSocket with a real backend connection (service health + ingestion telemetry).
- Break down the Kanban page into smaller documented components.
- Consolidate REST clients (axios + interceptors) once authentication is available.
