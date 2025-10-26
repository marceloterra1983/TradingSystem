---
title: "ADR-0001: Use Zustand for State Management"
sidebar_position: 10
tags: [frontend, architecture, state-management, zustand, adr]
domain: frontend
type: adr
summary: Decision to adopt Zustand as the primary state management library for the Dashboard application
status: active
last_review: "2025-10-17"
---

# ADR-0001: Use Zustand for State Management

## Status
**Accepted** - 2025-10-11

## Context

The TradingSystem Dashboard requires a state management solution to handle:
- **Global application state** (user preferences, theme, sidebar collapse state)
- **Server state** (API responses, caching, real-time data)
- **UI state** (modal visibility, form states, loading indicators)
- **Real-time updates** (WebSocket connections, live data streams)

### Requirements
1. **Simplicity**: Minimal boilerplate, easy to learn
2. **Performance**: Fast re-renders, selective subscriptions
3. **TypeScript Support**: Full type safety
4. **DevTools Integration**: Debugging capabilities
5. **Bundle Size**: Small footprint (< 5KB)
6. **Server State**: Works well with React Query

### Options Considered

| Library | Bundle Size | Learning Curve | TypeScript | DevTools | Boilerplate |
|---------|-------------|----------------|------------|----------|-------------|
| **Zustand** | 1.2 KB | Low | Excellent | Yes | Minimal |
| Redux Toolkit | 12 KB | Medium | Good | Excellent | Medium |
| MobX | 16 KB | High | Good | Yes | Medium |
| Jotai | 3 KB | Low | Excellent | Yes | Low |
| Recoil | 14 KB | Medium | Good | Yes | Medium |
| Context + Hooks | 0 KB | Low | Manual | No | High |

## Decision

We will use **Zustand** as the primary state management library for the Dashboard application.

### Rationale

1. **Minimal Boilerplate**
   - No providers, no wrappers
   - Direct store creation with `create()`
   - Simple hook-based consumption

2. **Excellent Performance**
   - Fine-grained subscriptions (select specific state slices)
   - No unnecessary re-renders
   - Optimized for React 18 concurrent rendering

3. **TypeScript First**
   - Full type inference
   - No manual type definitions needed for most cases
   - Excellent IDE autocomplete

4. **Tiny Bundle Size**
   - 1.2 KB gzipped (vs. Redux Toolkit 12 KB)
   - Critical for dashboard load times

5. **DevTools Integration**
   - Redux DevTools support out of the box
   - Time-travel debugging
   - State inspection and action replay

6. **Works Well with React Query**
   - Zustand handles UI/app state
   - React Query handles server state
   - Clear separation of concerns

7. **Flexible Architecture**
   - Can be used with or without Redux patterns (actions, reducers)
   - Supports middleware (persist, devtools, immer)
   - Easy to split stores or combine them

## Implementation

### Basic Store Pattern
```typescript
// stores/useLayoutStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface LayoutState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useLayoutStore = create<LayoutState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        theme: 'system',
        toggleSidebar: () => set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        })),
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'layout-storage' }
    )
  )
);
```

### Component Usage
```typescript
// components/Sidebar.tsx
import { useLayoutStore } from '@/stores/useLayoutStore';

export function Sidebar() {
  // Subscribe to specific state slices
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore((state) => ({
    sidebarCollapsed: state.sidebarCollapsed,
    toggleSidebar: state.toggleSidebar,
  }));

  return (
    <aside className={cn('sidebar', sidebarCollapsed && 'collapsed')}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### Store Organization
```
src/stores/
├── index.ts                  # Export all stores
├── useLayoutStore.ts         # Sidebar, theme, UI preferences
├── useUserStore.ts           # User session, permissions
├── useNotificationStore.ts   # Toast notifications, alerts
└── useTelegramStore.ts       # Telegram connection state (if needed)
```

## Consequences

### Positive
✅ **Reduced Bundle Size**: 1.2 KB vs. Redux Toolkit's 12 KB
✅ **Faster Development**: Minimal boilerplate, quick iterations
✅ **Better TypeScript DX**: Full type inference, excellent autocomplete
✅ **Improved Performance**: Fine-grained subscriptions reduce re-renders
✅ **Easier Onboarding**: Simple API, low learning curve for new developers
✅ **Flexible Middleware**: Can add persistence, devtools, immer as needed

### Negative
⚠️ **Less Opinionated**: No enforced patterns (can lead to inconsistency)
⚠️ **Limited Ecosystem**: Fewer third-party integrations than Redux
⚠️ **Manual Testing**: No built-in test utilities (unlike Redux Testing Library)

### Mitigation Strategies
- **Consistency**: Establish store patterns in this ADR and enforce via code review
- **Testing**: Use standard React Testing Library with Zustand test utilities
- **Documentation**: Document store patterns in `docs/context/frontend/references/state-management.md`

## Alternatives Considered

### Redux Toolkit
**Pros**: Industry standard, excellent DevTools, large ecosystem
**Cons**: 12 KB bundle, more boilerplate, steeper learning curve
**Verdict**: **Rejected** - Overkill for our use case, bundle size too large

### Jotai
**Pros**: Atomic state, small bundle (3 KB), modern API
**Cons**: Different mental model, less mature ecosystem
**Verdict**: **Rejected** - Zustand's hook-based API is more familiar to team

### Context + useReducer
**Pros**: Built-in, zero dependencies
**Cons**: Performance issues, prop drilling, no DevTools
**Verdict**: **Rejected** - Insufficient for complex dashboard state

## Related Decisions
- [ADR-0003: Use localStorage for Client-Side Persistence](2025-10-11-adr-0003-use-localstorage-for-mvp.md)
- Future: ADR for React Query (server state management)

## References
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React State Management in 2024](https://blog.logrocket.com/react-state-management-2024/)
- [Zustand vs Redux Performance Benchmark](https://dev.to/builderio/zustand-vs-redux-performance-3o2f)

---

**Decision Date**: 2025-10-11
**Decision Maker**: Frontend Team
**Implementation Status**: ✅ Implemented (Dashboard uses Zustand)
**Review Date**: 2025-04-11 (6 months)
