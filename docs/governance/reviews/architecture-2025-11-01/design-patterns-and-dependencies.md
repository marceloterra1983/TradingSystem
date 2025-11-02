---
title: "Design Patterns & Dependency Analysis"
sidebar_position: 2
description: "Evaluation of backend/frontend patterns, coupling levels, and dependency risks across TradingSystem services."
---

## Design Patterns Evaluation

### Backend Patterns

#### ✅ Service Layer Pattern
- Each API has dedicated service classes (`MarkdownSearchService`, `RagProxyService`, `CollectionService`).
- Business logic stays outside HTTP handlers, preserving separation of concerns.

**Example:** `backend/api/documentation-api/src/services/`

#### ✅ Repository Pattern
- Database abstraction for TimescaleDB queries with consistent data access patterns.
- Supports multiple data strategies (FlexSearch, TimescaleDB, Postgres).

**Example:** `backend/api/documentation-api/src/config/appConfig.js`

#### ✅ Factory Pattern
- Logger factory `createLogger()` in `backend/shared/logger/`.
- Middleware factories such as `configureCors()`, `configureRateLimit()`, `configureHelmet()`.
- Ensures consistent object creation across services.

#### ✅ Proxy Pattern
- RAG proxy in Documentation API (`routes/rag-proxy.js`).
- JWT minting handled server-side as a security best practice.
- Centralizes authentication for RAG services.

#### ⚠️ Circuit Breaker Pattern (Partial)
- Implemented in `apps/status/` for health checks.
- **Missing** in critical data paths (WebSocket, ProfitDLL callbacks).

### Frontend Patterns

#### ✅ State Management (Zustand)
```typescript
// frontend/dashboard/src/store/appStore.ts
export const useTradingStore = create<TradingState>()(
  devtools((set, get) => ({
    trades: [],
    orderBooks: new Map(),
    positions: [],
    // ... state and actions
  }), { name: 'TradingStore' })
);
```

**Assessment**
- ✅ Centralized state with devtools integration.
- ✅ Immutable updates with focused action creators.
- ✅ Optimized re-renders using selectors.
- ⚠️ No persistence layer (state lost on reload).
- ⚠️ No optimistic updates for network requests.

#### ✅ Custom Hooks Pattern
```typescript
// frontend/dashboard/src/hooks/llamaIndex/
useRagManager.ts
useLlamaIndexStatus.ts
useItemDragDrop.ts
useItemFilters.ts
```

**Assessment:** ✅ Excellent separation of concerns through reusable hooks.

#### ✅ Compound Component Pattern
- Components in `workspace/components/` follow atomic design and support composition.

#### ⚠️ Missing Patterns
- ❌ React error boundaries for runtime failures.
- ❌ Suspense + ErrorBoundary for async workflows.
- ❌ Route-based code splitting for bundle optimization.

## Dependency Architecture Analysis

### Coupling Levels

#### Backend Service Dependencies

```
documentation-api
├── shared/logger (HIGH coupling)
├── shared/middleware (HIGH coupling)
├── FlexSearch (MEDIUM coupling)
├── Qdrant JS Client (MEDIUM coupling)
├── Prisma (HIGH coupling for DB strategy)
└── JWT (MEDIUM coupling)
```

**Coupling Metrics**
- **High Coupling (60%)**: Shared modules, database clients, authentication.
- **Medium Coupling (30%)**: External libraries (FlexSearch, Axios, Express).
- **Low Coupling (10%)**: Route handlers and service classes.

**Risk Assessment**
- ⚠️ Shared modules amplify cascading failures (logger crash impacts all services).
- ⚠️ Direct database coupling restricts independent deployments.
- ⚠️ Lack of API gateway hampers controlled service-to-service communication.

#### Frontend Dependencies

```
dashboard
├── React 18 (MEDIUM coupling)
├── Zustand (LOW coupling - replaceable)
├── TanStack Query (MEDIUM coupling)
├── Radix UI (MEDIUM coupling)
├── Tailwind CSS (LOW coupling)
└── Lucide Icons (LOW coupling)
```

**Assessment:** ✅ Low-to-medium coupling overall with good modularity.

### Circular Dependencies

**Detected Issues**
1. ❌ `backend/shared/middleware` ↔ `backend/shared/logger`
   - Middleware uses the logger; logger may hydrate middleware context.
   - **Risk:** Initialization deadlock.

2. ⚠️ `frontend/dashboard/src/contexts` ↔ `frontend/dashboard/src/store`
   - Context providers consume stores and stores trigger context updates.
   - **Risk:** Re-render loops and brittle ordering.

**Recommendations**
- Introduce dependency injection to break shared imports.
- Favor event-driven communication instead of direct imports.
- Apply the Interface Segregation Principle (ISP) to shared modules.

### Dependency Injection

**Current State**
- ✅ Route initialization leverages manual dependency passing (`initializeRoute({ markdownSearchService, searchMetrics })`).
- ⚠️ No formal DI container (e.g., InversifyJS, Awilix, TSyringe).
- ⚠️ Constructors accept dependencies manually, reducing testability.

**Recommendation:** Adopt a lightweight DI container to standardize lifecycle management and improve unit-test ergonomics.
