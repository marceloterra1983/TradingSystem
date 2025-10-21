---
title: "ADR-0004: Use React Router v6 for Client-Side Navigation"
sidebar_position: 40
tags: [frontend, architecture, routing, react-router, navigation, adr]
domain: frontend
type: adr
summary: Decision to adopt React Router v6 as the routing library for the Dashboard application
status: active
last_review: 2025-10-17
---

# ADR-0004: Use React Router v6 for Client-Side Navigation

## Status
**Accepted** - 2025-10-11

## Context

The TradingSystem Dashboard is a single-page application (SPA) requiring client-side routing to navigate between:
- **Dashboard Home** (`/`)
- **Connections** (`/connections`)
- **Banco de Ideias** (`/banco-ideias`)
- **Escopo** (`/escopo`)
- **TP Capital Sinais** (`/tp-capital-sinais`)
- **Telegram Data** (`/telegram-data`)
- **Documentation** (`/docs/*`)

### Requirements
1. **Declarative Routing**: Component-based route configuration
2. **Nested Routes**: Support for hierarchical page structures
3. **Code Splitting**: Lazy loading for route components
4. **TypeScript Support**: Full type safety for routes and params
5. **Browser History**: Back/forward navigation support
6. **URL Parameters**: Dynamic route segments and query strings
7. **Route Guards**: Protected routes (authentication, authorization)
8. **404 Handling**: Fallback for undefined routes

### Options Considered

| Library | Bundle Size | TypeScript | Nested Routes | Code Splitting | Community | Maintenance |
|---------|-------------|------------|---------------|----------------|-----------|-------------|
| **React Router v6** | 10 KB | Excellent | ✅ Yes | ✅ Yes | Huge | Active |
| TanStack Router | 12 KB | Excellent | ✅ Yes | ✅ Yes | Growing | Active |
| Wouter | 1.5 KB | Good | ⚠️ Limited | ⚠️ Manual | Small | Active |
| Reach Router | 7 KB | Good | ✅ Yes | ⚠️ Manual | Large | ⚠️ Deprecated |
| Next.js | N/A | Excellent | ✅ Yes | ✅ Yes | Huge | Active |

## Decision

We will use **React Router v6** as the routing library for the Dashboard application.

### Rationale

1. **Industry Standard**
   - Most popular React routing library (10M+ weekly npm downloads)
   - Battle-tested in production at scale
   - Extensive documentation and community resources

2. **React 18 Optimized**
   - Built for React 18 concurrent rendering
   - Supports Suspense for code splitting
   - Automatic batching for route transitions

3. **Excellent TypeScript Support**
   - Full type inference for `useParams`, `useSearchParams`
   - Type-safe route definitions
   - IDE autocomplete for route paths

4. **Nested Routes Architecture**
   - Layout routes for shared UI components
   - Outlet components for nested rendering
   - Clean separation of layout and content

5. **Data Loading Integration**
   - Loader functions for route-level data fetching
   - Works well with React Query
   - Suspense-compatible for loading states

6. **Modern API Surface**
   - Hooks-based API (`useNavigate`, `useLocation`, `useParams`)
   - Declarative route configuration with JSX
   - Cleaner API than v5 (removed `<Switch>`, simpler nesting)

7. **Code Splitting Ready**
   - Lazy loading with `React.lazy()`
   - Suspense fallbacks for loading states
   - Automatic chunk splitting per route

8. **Bundle Size**
   - 10 KB gzipped (acceptable for routing library)
   - Tree-shakeable (only import what you use)
   - No external dependencies

## Implementation

### Route Configuration
```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

// Lazy-loaded pages
const DashboardPage = React.lazy(() => import('./components/pages/DashboardPage'));
const ConnectionsPage = React.lazy(() => import('./components/pages/ConnectionsPage'));
const BancoIdeiasPage = React.lazy(() => import('./components/pages/BancoIdeiasPage'));
const EscopoPage = React.lazy(() => import('./components/pages/EscopoPage'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <React.Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </React.Suspense>
          } />
          <Route path="connections" element={
            <React.Suspense fallback={<PageLoader />}>
              <ConnectionsPage />
            </React.Suspense>
          } />
          <Route path="banco-ideias" element={
            <React.Suspense fallback={<PageLoader />}>
              <BancoIdeiasPage />
            </React.Suspense>
          } />
          <Route path="escopo" element={
            <React.Suspense fallback={<PageLoader />}>
              <EscopoPage />
            </React.Suspense>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Layout with Outlet
```typescript
// components/layout/Layout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet /> {/* Child routes render here */}
        </main>
      </div>
    </div>
  );
}
```

### Navigation Hook Usage
```typescript
// components/Sidebar.tsx
import { useNavigate, useLocation } from 'react-router-dom';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/connections', label: 'Connections', icon: Activity },
    { path: '/banco-ideias', label: 'Banco de Ideias', icon: Lightbulb },
  ];

  return (
    <nav>
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={cn(
            'nav-item',
            location.pathname === item.path && 'active'
          )}
        >
          <item.icon />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

### Type-Safe Routing
```typescript
// lib/routes.ts
export const ROUTES = {
  home: '/',
  connections: '/connections',
  bancoIdeias: '/banco-ideias',
  escopo: '/escopo',
  tpCapitalSignals: '/tp-capital-sinais',
  telegramData: '/telegram-data',
} as const;

// Usage with type safety
navigate(ROUTES.bancoIdeias); // ✅ Type-safe
navigate('/banco-ideas'); // ✅ Still works but no autocomplete
```

### Protected Routes (Future)
```typescript
// components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Usage
<Route element={<ProtectedRoute />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```

## Consequences

### Positive ✅
- ✅ **Industry Standard**: Huge community, extensive resources
- ✅ **TypeScript Excellence**: Full type safety for routing
- ✅ **Nested Routes**: Clean layout/content separation with Outlet
- ✅ **Code Splitting**: Built-in Suspense support for lazy loading
- ✅ **Modern API**: Hooks-based, no class components needed
- ✅ **Active Maintenance**: React Router team actively develops v6+
- ✅ **Migration Path**: Can upgrade to Remix (same team) if needed

### Negative ⚠️
- ⚠️ **Bundle Size**: 10 KB (larger than micro-routers like Wouter)
- ⚠️ **Learning Curve**: v6 API differs from v5 (migration friction)
- ⚠️ **No Built-in Transitions**: Need custom implementation for page transitions
- ⚠️ **Limited Data Fetching**: Not as integrated as Next.js or Remix

### Mitigation Strategies
- **Bundle Size**: Acceptable for routing library, tree-shakeable
- **Learning Curve**: Provide team training, document patterns
- **Transitions**: Use Framer Motion or CSS transitions if needed
- **Data Fetching**: Integrate with React Query for server state

## Alternatives Considered

### TanStack Router
**Pros**: Modern, type-safe, built-in data loading
**Cons**: Newer library, smaller community, 12 KB bundle
**Verdict**: **Rejected** - React Router is more established, sufficient features

### Wouter
**Pros**: Tiny bundle (1.5 KB), simple API
**Cons**: Limited nested routes, manual code splitting, small community
**Verdict**: **Rejected** - Too basic for complex dashboard requirements

### Next.js
**Pros**: File-based routing, SSR, excellent DX
**Cons**: Requires server, opinionated structure, overkill for SPA
**Verdict**: **Rejected** - Dashboard is client-side SPA, no SSR needed

### Reach Router
**Pros**: Good accessibility, similar API to React Router
**Cons**: Deprecated (merged into React Router v6)
**Verdict**: **Rejected** - Superseded by React Router v6

## Related Decisions
- [ADR-0001: Use Zustand for State Management](2025-10-11-adr-0001-use-zustand-for-state-management.md) - Client state
- Future ADR: Use React Query for server state management

## References
- [React Router v6 Documentation](https://reactrouter.com/)
- [React Router v6 Tutorial](https://reactrouter.com/en/main/start/tutorial)
- [React Router vs TanStack Router Comparison](https://tanstack.com/router/latest/docs/comparison)
- [Code Splitting in React Router](https://reactrouter.com/en/main/route/lazy)

---

**Decision Date**: 2025-10-11
**Decision Maker**: Frontend Team
**Implementation Status**: ✅ Implemented (Dashboard uses React Router v6)
**Review Date**: 2025-04-11 (6 months)
