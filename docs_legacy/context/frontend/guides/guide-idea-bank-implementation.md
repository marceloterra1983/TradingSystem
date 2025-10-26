---
title: Idea Bank Implementation Guide
sidebar_position: 80
tags: [idea-bank, frontend, guide]
domain: frontend
type: guide
summary: Implementation walkthrough of the Idea Bank page inside the dashboard
status: active
last_review: "2025-10-17"
---

# Idea Bank Implementation Guide

## Overview

The Idea Bank page consolidates four major sections: searchable list, creation form, category summary, and Kanban board. The page lives in `src/components/pages/BancoIdeiasPage.tsx` and interacts with the Idea Bank API (port 3200).

## Key files

| File | Purpose |
|------|---------|
| src/components/pages/BancoIdeiasPage.tsx | Main page orchestrating sections, metrics, and board. |
| src/components/ui/input.tsx | Shadcn-inspired input component. |
| src/components/ui/label.tsx | Accessible label component. |
| src/data/navigation.tsx | Adds Idea Bank entry and accordion sections. |
| src/services/ideaBankService.ts | REST client for Idea Bank API. |

## Page sections

1. Ideas list  search, filters, responsive cards.
2. Add idea form  required fields (title, description, category, priority) and tags.
3. Categories overview  cards by category with counts.
4. Status board  five columns ((new, review, in-progress, completed, rejected)) with `@dnd-kit` drag-and-drop.

## Supporting components

- Metrics cards (counts by status/priority/category).
- Dialogs for view/edit/delete operations.
- Toast notifications for success/error feedback.

## Drag-and-drop flow

1. User drags card (`DraggableIdeaCard`).
2. `onDragEnd` detects target status.
3. Local state updates optimistically.
4. `ideaBankService.updateIdea` persists to API.
5. On failure, revert state and log error.

## Styling and accessibility

- Tailwind classes with `cn()` helper for conditional styling.
- Badges use palette defined in design system.
- Inputs/dialogs rely on shadcn/ui primitives (ARIA support).

## Testing recommendations

- Vitest for utility/state functions.
- Playwright for end-to-end CRUD + drag flow.
- Mock `ideaBankService` to test error paths.

## Future enhancements

- Break into smaller components (IdeaKanban, IdeaFilters, IdeaMetrics).
- Add pagination and server-side filtering.
- Introduce WebSocket updates for multi-user sync.
- Document dark mode tokens.

## Related docs

- [Dashboard Documentation Guide](guide-documentation-dashboard.md)
- [Idea Bank Feature](../features/feature-idea-bank.md)
- [Idea Bank API Guide](../../backend/guides/guide-idea-bank-api.md)