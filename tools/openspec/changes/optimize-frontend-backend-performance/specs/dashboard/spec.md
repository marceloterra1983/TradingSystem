# Dashboard Capability - Performance Optimization Deltas

## MODIFIED Requirements

### Requirement: Bundle Optimization and Code Splitting

The dashboard SHALL optimize JavaScript bundle sizes through code splitting, lazy loading, and vendor chunk separation to achieve Time to Interactive < 3 seconds.

**Rationale:** Current bundle size of 1.3MB causes 5-6 second load times on 3G connections. Target is 600-800KB for 2-3 second load times.

**Key Changes:**
- Implement proper lazy loading for all page components (117 total, currently only 13)
- Separate heavy dependencies (LangChain ~200KB, Recharts ~100KB) into independent vendor chunks
- Maintain manual chunking strategy for React, Radix UI, and utilities

#### Scenario: Initial page load with optimized bundle
- **GIVEN** user navigates to dashboard homepage
- **WHEN** initial HTML loads
- **THEN** only core bundle (50-60KB), React vendor (137KB), and essential vendors load
- **AND** page is interactive within 2-3 seconds
- **AND** Lighthouse Performance Score is > 90

#### Scenario: Route-based lazy loading
- **GIVEN** user is on homepage
- **WHEN** user navigates to "TP Capital" page
- **THEN** tp-capital chunk loads on-demand (not included in initial bundle)
- **AND** Suspense fallback shows loading spinner during chunk fetch
- **AND** page renders successfully after chunk loads

#### Scenario: Vendor chunk caching
- **GIVEN** user has visited dashboard before
- **WHEN** user returns to dashboard
- **THEN** React vendor chunk (137KB) is served from browser cache (304 Not Modified)
- **AND** LangChain vendor chunk is served from cache if unchanged
- **AND** only application code (index bundle) is re-downloaded if updated

#### Scenario: Build-time chunk optimization
- **GIVEN** developer runs production build
- **WHEN** Vite build completes
- **THEN** total bundle size is < 1MB (target: 600-800KB)
- **AND** main bundle (index-*.js) is 50-60KB
- **AND** vendor chunks are properly separated:
  - react-vendor: ~137KB
  - ui-radix: ~83KB
  - langchain-vendor: ~200KB
  - charts-vendor: ~100KB
  - markdown-vendor: ~124KB
  - utils-vendor: ~61KB
  - dnd-vendor: ~47KB
  - state-vendor: ~39KB

---

### Requirement: Page Component Lazy Loading

The dashboard SHALL use React.lazy() with functional customContent to defer loading of page components until they are accessed by the user.

**Rationale:** Current navigation.tsx instantiates all page components eagerly (lines 55-67), defeating the purpose of React.lazy(). This bloats the initial bundle.

**Key Changes:**
- Convert `customContent` from JSX element to function returning JSX: `() => <Component />`
- Update PageContent component to handle functional customContent
- Wrap all lazy-loaded components in Suspense with LoadingSpinner fallback

#### Scenario: Functional lazy loading pattern
- **GIVEN** navigation.tsx defines page with `customContent: () => <TPCapitalOpcoesPage />`
- **WHEN** PageContent component renders the page
- **THEN** function is called to instantiate component (not instantiated at module load)
- **AND** component chunk is fetched on-demand
- **AND** Suspense boundary shows loading state during fetch

#### Scenario: Error boundary for lazy loading failures
- **GIVEN** network failure occurs during chunk fetch
- **WHEN** lazy component attempts to load
- **THEN** ErrorBoundary catches the error
- **AND** user sees friendly error message with retry button
- **AND** error is logged to monitoring system

#### Scenario: Suspense fallback UI
- **GIVEN** user navigates to lazy-loaded page
- **WHEN** chunk is fetching (< 500ms typically)
- **THEN** LoadingSpinner component renders
- **AND** UI remains responsive (no freeze)
- **AND** spinner disappears when chunk loads

---

### Requirement: TypeScript Strict Mode Compilation

The dashboard SHALL compile in TypeScript strict mode with 0 errors to enable accurate production bundle analysis and deployment.

**Rationale:** 36 TypeScript compilation errors currently block production builds. This prevents accurate bundle size measurement and deployment.

**Key Changes:**
- Fix unused imports/variables (TS6133)
- Add explicit type annotations (TS7006)
- Resolve type mismatches (TS2322)
- Fix missing module imports (TS2307)

#### Scenario: Production build succeeds
- **GIVEN** all TypeScript errors are fixed
- **WHEN** developer runs `npm run build`
- **THEN** TypeScript compiler completes with 0 errors
- **AND** Vite build generates dist/ directory
- **AND** all chunks are properly minified and optimized

#### Scenario: Type-checking in CI/CD
- **GIVEN** CI/CD pipeline runs on pull request
- **WHEN** `npm run type-check` executes
- **THEN** TypeScript compiler exits with code 0 (success)
- **AND** no implicit 'any' types exist
- **AND** all imports are valid

---

## ADDED Requirements

### Requirement: Vite Manual Chunk Configuration

The dashboard SHALL configure Vite with manual chunk splitting to separate large dependencies from the main application bundle.

**Rationale:** LangChain (~200KB) and Recharts (~100KB) are stable dependencies that rarely change. Separating them enables better caching and reduces main bundle size by 60%.

#### Scenario: LangChain vendor chunk separation
- **GIVEN** vite.config.ts includes `langchain-vendor` in manualChunks
- **WHEN** production build runs
- **THEN** langchain-vendor-[hash].js is created (~200KB)
- **AND** main bundle size is reduced by ~200KB
- **AND** LangChain imports resolve to vendor chunk (no duplication)

#### Scenario: Recharts vendor chunk separation
- **GIVEN** vite.config.ts includes `charts-vendor` in manualChunks
- **WHEN** production build runs
- **THEN** charts-vendor-[hash].js is created (~100KB)
- **AND** Recharts is not included in main bundle or other vendor chunks

#### Scenario: Chunk size warning threshold
- **GIVEN** vite.config.ts sets `chunkSizeWarningLimit: 500`
- **WHEN** build produces chunk > 500KB
- **THEN** Vite emits warning in build output
- **AND** developer investigates and optimizes large chunk

---

### Requirement: Performance Monitoring Integration

The dashboard SHALL expose performance metrics (Time to Interactive, Largest Contentful Paint, First Input Delay) for monitoring and alerting.

**Rationale:** Need baseline metrics to validate performance improvements and detect regressions.

#### Scenario: Web Vitals measurement
- **GIVEN** dashboard loads in browser
- **WHEN** page becomes interactive
- **THEN** Web Vitals metrics are captured:
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1
- **AND** metrics are sent to monitoring service (optional)

#### Scenario: Lighthouse performance audit
- **GIVEN** production deployment is complete
- **WHEN** Lighthouse audit runs
- **THEN** Performance Score is > 90
- **AND** Accessibility Score is > 90
- **AND** Best Practices Score is > 90
- **AND** SEO Score is > 90

---

## REMOVED Requirements

None. All existing dashboard requirements remain valid.

---

## Implementation Notes

### File Changes
1. **frontend/dashboard/src/data/navigation.tsx (lines 55-67)**
   - Change: `const tpCapitalContent = <TPCapitalOpcoesPage />;`
   - To: `customContent: () => <TPCapitalOpcoesPage />`

2. **frontend/dashboard/src/components/layout/PageContent.tsx**
   - Add: `typeof page.customContent === 'function' ? page.customContent() : page.customContent`

3. **frontend/dashboard/vite.config.ts (lines 108-122)**
   - Add to manualChunks:
     ```typescript
     'langchain-vendor': ['@langchain/core', '@langchain/langgraph-sdk', '@langchain/langgraph-ui'],
     'charts-vendor': ['recharts'],
     ```

### Testing Requirements
- [ ] All 117 page routes load successfully
- [ ] Network tab shows on-demand chunk loading
- [ ] Bundle size < 1MB (target: 600-800KB)
- [ ] Time to Interactive < 3 seconds
- [ ] Lighthouse Performance Score > 90
- [ ] No TypeScript compilation errors
- [ ] Lazy loading error boundaries work correctly

### Performance Targets
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Bundle Size | 1.3MB | 600-800KB | 40-50% ↓ |
| Main Bundle Size | 152KB | 50-60KB | 60% ↓ |
| Time to Interactive | 5-6s | 2-3s | 50% ↓ |
| Lighthouse Score | 75-80 | 90+ | +15-20 pts |
| TypeScript Errors | 36 | 0 | 100% ↓ |

### Migration Path
1. Fix TypeScript errors first (enables accurate build analysis)
2. Implement vendor chunk separation (immediate bundle size reduction)
3. Refactor lazy loading pattern (deferred loading benefits)
4. Validate with Lighthouse audits and bundle analysis
5. Deploy with monitoring and rollback plan

### Security Considerations
- All optimizations are performance-only, no security implications
- Lazy loading does not expose new attack vectors
- Vendor chunk separation maintains existing CSP policies
- TypeScript strict mode improves type safety (security benefit)

### Rollback Strategy
- Each optimization is independent and can be rolled back individually
- Git revert specific commits if issues arise
- Monitor bundle sizes and load times post-deployment
- Keep pre-optimization bundles for comparison
