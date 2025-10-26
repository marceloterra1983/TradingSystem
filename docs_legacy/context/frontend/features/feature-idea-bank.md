---
title: Idea Bank Feature Overview
sidebar_position: 10
tags: [idea-bank, dashboard, frontend, feature]
domain: frontend
type: reference
summary: Feature-level documentation for the Idea Bank experience in the Documentation Dashboard
status: active
last_review: "2025-10-17"
---

# Idea Bank Feature

## Overview

The Idea Bank delivers an interactive workspace to collect, prioritise, and track feature ideas for the TradingSystem platform. It is surfaced inside the Documentation Dashboard and backed by the Idea Bank API.

- Real-time search across title, description, and tags.
- Combined filters (status, priority, category) with AND logic.
- Responsive grid (1/2/3 columns) with colour-coded status/priority badges.
- Metrics cards summarising totals by category, priority, status.
- Kanban board with drag-and-drop between five columns (New, Review, In-progress, Completed, Rejected).

## Access Points

- **Frontend**: http://localhost:5173/documentacao/banco-ideias
- **Backend API**: http://localhost:3200/api/items (Idea Bank API)
- **Storage**: `backend/api/idea-bank/db/ideas.json` (LowDB, MVP)
- **Configuration**: copy `.env.example` to `.env` and adjust `PORT`, `DB_PATH`, `LOG_LEVEL`
- **Tests**: `npm test` inside `backend/api/idea-bank` (Jest + Supertest, isolated DB)

## UX Breakdown

1. **Ideas list**  searchable cards showing category, status, priority, created timestamp.
2. **Add idea**  modal/dialog with required fields (`title`, `description`, `category`, `priority`) and optional tags.
3. **Categories view**  tiles summarising ideas per category (documentation, data collection, database, analytics, risk, dashboard).
4. **Kanban board**  five-column layout powered by `@dnd-kit`; status changes persist via API calls.

## Data Model (frontend)

```typescript
interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'documentacao' | 'coleta-dados' | 'banco-dados' | 'analise-dados' | 'gestao-riscos' | 'dashboard';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}
```

## Dependencies

- Frontend: React 18, Zustand, React Query, Tailwind, shadcn/ui, @dnd-kit.
- Backend: Idea Bank API (Express, LowDB, express-validator, pino).
- Future: migrate persistence to PostgreSQL/Timescale, add authentication, pagination, filters server-side.

## Related Docs

- [Dashboard Documentation Guide](../guides/guide-documentation-dashboard.md)
- [Idea Bank API Guide](../../backend/guides/guide-idea-bank-api.md)
- [Database Migration Strategy](../../backend/data/migrations/README.md)