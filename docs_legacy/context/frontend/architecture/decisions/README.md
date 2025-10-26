---
title: Frontend Architecture Decision Records
sidebar_position: 1
tags: [frontend, architecture, adr, index]
domain: frontend
type: index
summary: Index of architecture decisions for the TradingSystem Dashboard frontend
status: active
last_review: "2025-10-17"
---

# Frontend Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) documenting significant architectural choices for the TradingSystem Dashboard frontend.

## ADR Index

| Number | Title | Status | Date | Review Due |
|--------|-------|--------|------|------------|
| [ADR-0001](2025-10-11-adr-0001-use-zustand-for-state-management.md) | Use Zustand for State Management | Active | 2025-10-11 | 2026-04-11 |
| [ADR-0002](2025-10-11-adr-0002-use-shadcn-ui-for-design-system.md) | Use shadcn/ui + Radix UI for Design System | Active | 2025-10-11 | 2026-04-11 |
| [ADR-0003](2025-10-11-adr-0003-use-localstorage-for-mvp.md) | Use localStorage for Client-Side Persistence (MVP) | Active | 2025-10-11 | 2025-12-31 |
| [ADR-0004](2025-10-11-adr-0004-use-react-router-v6-for-navigation.md) | Use React Router v6 for Navigation | Active | 2025-10-11 | 2026-04-11 |

## Quick Reference: Key Decisions

### State Management
- **Client State**: Zustand ([ADR-0001](2025-10-11-adr-0001-use-zustand-for-state-management.md))
- **Server State**: React Query (ADR pending)
- **Persistence**: localStorage for MVP ([ADR-0003](2025-10-11-adr-0003-use-localstorage-for-mvp.md))

### UI & Styling
- **Design System**: shadcn/ui + Radix UI ([ADR-0002](2025-10-11-adr-0002-use-shadcn-ui-for-design-system.md))
- **CSS**: Tailwind CSS 3.4
- **Icons**: Lucide React

### Routing & Navigation
- **Router**: React Router v6 ([ADR-0004](2025-10-11-adr-0004-use-react-router-v6-for-navigation.md))
- **Code Splitting**: React.lazy + Suspense

> Use `shared/tools/templates/template-adr.md` when authoring new ADRs for this folder.

---

**Last Updated**: 2025-10-11
**Maintainer**: Frontend Team
