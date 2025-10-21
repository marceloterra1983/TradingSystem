---
title: Frontend Architecture Diagrams
sidebar_position: 20
tags: [frontend, architecture, diagrams, reference]
domain: frontend
type: reference
summary: Catalog of diagrams that visualize the dashboard architecture and state coordination
status: active
last_review: 2025-10-17
---

# Frontend Architecture Diagrams

This folder stores diagrams that complement the written architecture overview. Use the links below when presenting or updating the dashboard design.

| Asset | Format | Description |
|-------|--------|-------------|
| [component-map.svg](component-map.svg) | SVG | High-level component map highlighting routing, layout shell, and feature modules. |
| [state-flow.mmd](state-flow.mmd) | Mermaid | State synchronization between Zustand stores, React Query caches, and WebSocket subscriptions. Render via the [Mermaid Live Editor](https://mermaid.live/). |

## Contribution Tips

- Commit both the source (Mermaid, Figma exports) and rendered artifacts when possible.
- Keep filenames lowercase-and-hyphenated for consistent embedding in docs.
- Reference new diagrams from `frontend/architecture/overview.md` to keep the narrative coherent.
