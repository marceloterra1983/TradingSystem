# LlamaIndex Components Refactoring Plan

**Date**: 2025-10-31
**Scope**: `src/components/pages/LlamaIndex*.tsx` + `src/services/llamaIndexService.ts`
**Goal**: Reduce complexity, improve testability, enhance maintainability

---

## 📊 Current State Analysis

### File Metrics

| File | LOC | Issues | Severity |
|------|-----|--------|----------|
| `LlamaIndexPage.tsx` | 1,170 | God Component, 15+ states, prop drilling | 🔴 Critical |
| `LlamaIndexIngestionStatusCard.tsx` | 957 | Mixed concerns, 150+ line table, complex conditionals | 🔴 Critical |
| `LlamaIndexQueryTool.tsx` | 435 | Manual history management, inline formatting | 🟡 High |
| `llamaIndexService.ts` | 236 | Good, minor improvements possible | 🟢 Low |
| `LlamaIndexCollectionsCard.tsx` | 114 | Good structure | 🟢 Low |

### Critical Problems Identified

#### LlamaIndexPage.tsx
- **God Component**: 1,170 lines doing everything
- **State Complexity**: 15+ interconnected useState hooks
- **Business Logic**: Data transformation, API calls, parsing all in component
- **Performance**: Excessive memoization (useMemo for constants)
- **Code Duplication**: Path normalization repeated 3 times
- **Deep Nesting**: useEffect inside useEffect
- **Prop Drilling**: 8+ levels deep

#### LlamaIndexIngestionStatusCard.tsx
- **Mixed Responsibilities**: UI + API + Business Logic + State Management
- **Monolithic Render**: 150+ line JSX table without sub-components
- **Complex Conditionals**: 5+ level nested ternaries
- **Derived State**: Recalculated on every render (not memoized properly)
- **Poor Testability**: Impossible to unit test individual pieces

### Test Coverage

- ❌ **0 tests** for LlamaIndex components
- ✅ 157 tests total in project (good testing culture)
- 🎯 **Priority**: Write tests BEFORE refactoring

---

## 🎯 Refactoring Goals

### Primary Goals
1. **Reduce Complexity**: Break down 1,170 line component into < 300 line pieces
2. **Improve Testability**: Enable unit testing for all logic
3. **Enhance Maintainability**: Clear separation of concerns
4. **Preserve Functionality**: Zero behavioral changes (black-box equivalence)

### Success Metrics
- ✅ Each component < 300 LOC
- ✅ Cyclomatic complexity < 10 per function
- ✅ Test coverage > 80%
- ✅ Zero prop drilling beyond 2 levels
- ✅ All business logic in custom hooks

---

## 📝 Refactoring Strategy: 3-Phase Incremental Approach

### Phase 1: Extract Custom Hooks & Utils (Week 1)

**Why First**: Safest changes, no UI impact, immediately testable

#### 1.1 Extract Utilities
```typescript
// src/hooks/llamaIndex/utils/pathNormalizer.ts
export function normalizeCollectionPath(path: string | null): string;
export function normalizeIndexedPath(value: string): string | null;
export function sanitizeUrl(value: string, fallback: string): string;
```

#### 1.2 Extract Status Hook
```typescript
// src/hooks/llamaIndex/useLlamaIndexStatus.ts
export function useLlamaIndexStatus(selectedCollection: string | null) {
  return {
    statusData,
    statusLoading,
    statusError,
    fetchStatus,
    handleRefresh,
  };
}
```

#### 1.3 Extract Collections Hook
```typescript
// src/hooks/llamaIndex/useLlamaIndexCollections.ts
export function useLlamaIndexCollections(statusData, hiddenCollections) {
  return {
    collectionOptions,
    selectedCollection,
    handleCollectionChange,
    collectionDocStats,
  };
}
```

#### 1.4 Extract Ingestion Hook
```typescript
// src/hooks/llamaIndex/useLlamaIndexIngestion.ts
export function useLlamaIndexIngestion(selectedCollection) {
  return {
    ingesting,
    ingestionMessage,
    lastIngestion,
    handleIngest,
    handleCleanOrphans,
    cleaningOrphans,
  };
}
```

#### 1.5 Extract Logs Hook
```typescript
// src/hooks/llamaIndex/useLlamaIndexLogs.ts
export function useLlamaIndexLogs() {
  return {
    collectionLogs,
    appendCollectionLog,
    toggleCollectionLogVisibility,
  };
}
```

**Testing**: Write comprehensive unit tests for each hook

---

### Phase 2: Componentize UI (Week 2)

**Why Second**: UI changes are more visible but safer after logic extraction

#### 2.1 Extract Table Components
```typescript
// src/components/pages/LlamaIndex/CollectionTable.tsx
export function CollectionTable({
  collections,
  onSelect,
  onIngest,
  onCleanOrphans
}) { ... }

// src/components/pages/LlamaIndex/FileListTable.tsx
export function FileListTable({
  files,
  indexedPaths,
  sortBy,
  onSort
}) { ... }

// src/components/pages/LlamaIndex/ServiceHealthBadges.tsx
export function ServiceHealthBadges({ queryHealth, ingestionHealth }) { ... }
```

#### 2.2 Extract Metric Cards
```typescript
// src/components/pages/LlamaIndex/MetricCard.tsx
export function MetricCard({ label, value, helper, monospace }) { ... }

// src/components/pages/LlamaIndex/MetricsGrid.tsx
export function MetricsGrid({ metrics }) { ... }
```

#### 2.3 Simplify Main Components
- `LlamaIndexPage.tsx`: Reduce to ~300 LOC (orchestration only)
- `LlamaIndexIngestionStatusCard.tsx`: Reduce to ~350 LOC (composition)

**Testing**: Add integration tests for UI components with React Testing Library

---

### Phase 3: Context API for Global State (Week 3)

**Why Last**: Most impactful but requires all pieces in place

#### 3.1 Create Context
```typescript
// src/contexts/LlamaIndexContext.tsx
export const LlamaIndexContext = createContext<LlamaIndexContextValue>(null);

export function LlamaIndexProvider({ children }) {
  const status = useLlamaIndexStatus();
  const collections = useLlamaIndexCollections();
  const ingestion = useLlamaIndexIngestion();
  const logs = useLlamaIndexLogs();

  return (
    <LlamaIndexContext.Provider value={{ status, collections, ingestion, logs }}>
      {children}
    </LlamaIndexContext.Provider>
  );
}

export function useLlamaIndex() {
  return useContext(LlamaIndexContext);
}
```

#### 3.2 Migrate Components
- Remove prop drilling in `LlamaIndexPage`
- Use `useLlamaIndex()` in all child components
- Simplify component interfaces

**Testing**: End-to-end tests with full context integration

---

## 🧪 Testing Strategy

### Test Structure
```
src/
├── hooks/
│   └── llamaIndex/
│       ├── __tests__/
│       │   ├── useLlamaIndexStatus.test.ts
│       │   ├── useLlamaIndexCollections.test.ts
│       │   ├── useLlamaIndexIngestion.test.ts
│       │   └── utils/pathNormalizer.test.ts
│       ├── useLlamaIndexStatus.ts
│       ├── useLlamaIndexCollections.ts
│       └── useLlamaIndexIngestion.ts
├── components/
│   └── pages/
│       └── LlamaIndex/
│           ├── __tests__/
│           │   ├── LlamaIndexPage.test.tsx
│           │   ├── CollectionTable.test.tsx
│           │   └── FileListTable.test.tsx
│           ├── LlamaIndexPage.tsx
│           ├── CollectionTable.tsx
│           └── FileListTable.tsx
```

### Test Coverage Goals
- **Hooks**: 90%+ coverage (business logic)
- **Components**: 80%+ coverage (UI + integration)
- **Utils**: 100% coverage (pure functions)

### Test Tools
- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking

---

## 📦 Implementation Checklist

### Phase 1: Extract Hooks (Week 1)
- [ ] Create `src/hooks/llamaIndex/` directory
- [ ] Extract `utils/pathNormalizer.ts` + tests
- [ ] Extract `utils/collectionUtils.ts` + tests
- [ ] Extract `useLlamaIndexStatus.ts` + tests
- [ ] Extract `useLlamaIndexCollections.ts` + tests
- [ ] Extract `useLlamaIndexIngestion.ts` + tests
- [ ] Extract `useLlamaIndexLogs.ts` + tests
- [ ] Update `LlamaIndexPage.tsx` to use hooks (maintain behavior)
- [ ] Run full test suite
- [ ] Verify no regressions in UI

### Phase 2: Componentize UI (Week 2)
- [ ] Create `src/components/pages/LlamaIndex/` directory
- [ ] Extract `<CollectionTable>` + tests
- [ ] Extract `<FileListTable>` + tests
- [ ] Extract `<ServiceHealthBadges>` + tests
- [ ] Extract `<MetricCard>` + tests
- [ ] Extract `<MetricsGrid>` + tests
- [ ] Extract `<LogPanel>` + tests
- [ ] Refactor `LlamaIndexIngestionStatusCard.tsx`
- [ ] Refactor `LlamaIndexPage.tsx`
- [ ] Run full test suite
- [ ] Visual regression testing

### Phase 3: Context API (Week 3)
- [ ] Create `src/contexts/LlamaIndexContext.tsx`
- [ ] Write integration tests for context
- [ ] Migrate `LlamaIndexPage.tsx` to use context
- [ ] Migrate all child components
- [ ] Remove prop drilling
- [ ] Run full test suite
- [ ] Performance testing (React DevTools Profiler)

---

## 🔍 Code Review Checklist

### Before Merge (Each Phase)
- [ ] All tests passing (unit + integration)
- [ ] No ESLint errors
- [ ] TypeScript strict mode passes
- [ ] Code coverage meets goals (>80%)
- [ ] No visual regressions
- [ ] Performance metrics maintained
- [ ] Documentation updated
- [ ] Peer review completed

---

## 📚 Documentation Updates

### Required Updates
- [ ] Update component API documentation
- [ ] Document new hooks with JSDoc
- [ ] Add usage examples for Context API
- [ ] Update architecture diagrams
- [ ] Add refactoring notes to CHANGELOG

---

## 🚀 Rollout Strategy

### Feature Flag (Optional)
```typescript
// .env
VITE_USE_REFACTORED_LLAMAINDEX=true
```

### Gradual Rollout
1. **Internal Testing** (Week 1): Development team only
2. **Beta Testing** (Week 2): Select users with feature flag
3. **Full Rollout** (Week 3): Enable for all users
4. **Monitoring**: Track errors, performance, user feedback

### Rollback Plan
- Keep old components in `src/components/pages/legacy/`
- Feature flag allows instant rollback
- Database/API unchanged (no migration needed)

---

## 📈 Success Metrics

### Code Quality
- **Before**: 1,170 LOC main component, 0 tests
- **After**: <300 LOC components, >80% coverage

### Performance
- **Before**: Multiple re-renders on collection change
- **After**: Optimized with Context + memoization

### Maintainability
- **Before**: 15+ states, prop drilling, mixed concerns
- **After**: Clear separation, custom hooks, context

---

## 🛠️ Tools & Resources

### Development
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config
- **Prettier**: Auto-formatting
- **Vitest**: Testing framework

### Monitoring
- **React DevTools**: Component profiling
- **Sentry**: Error tracking
- **Lighthouse**: Performance audits

---

## 📝 Notes

### Design Patterns Applied
- **Custom Hooks**: Encapsulate stateful logic
- **Compound Components**: CollectionTable + FileListTable
- **Context API**: Global state without prop drilling
- **Render Props**: Flexible composition

### Future Improvements (Post-Refactoring)
- [ ] Add React Query for server state
- [ ] Implement optimistic updates
- [ ] Add virtualization for large tables
- [ ] Migrate to TanStack Table for sorting/filtering

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Owner**: Development Team
