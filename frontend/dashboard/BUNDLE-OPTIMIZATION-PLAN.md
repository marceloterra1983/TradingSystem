# 📦 Bundle Size Optimization Plan

**Date:** 2025-11-04
**Current Status:** Build blocked by TypeScript errors
**Target:** < 500KB initial bundle, < 1MB total

---

## 🔍 Current Analysis

### Build Status: ❌ Blocked

TypeScript compilation errors preventing production build:

1. **Unused imports/variables** (39 errors)
   - `formatDate`, `Activity`, `SignalRowType`, etc.
   - These are warnings but block prod builds with strict TS

2. **Type errors** (7 errors)
   - Missing properties in component props
   - Type mismatches in test files
   - Missing type declarations

3. **Test file errors** (23 errors)
   - Missing `toBeInTheDocument` from `@testing-library/jest-dom`
   - Missing module `../../../utils/tpCapitalApi`

### Existing Optimizations ✅

The `vite.config.ts` is already well-configured:

1. **Code Splitting** ✅
   - Manual chunks for vendors (React, Radix UI, icons, etc.)
   - Page-specific chunks (Llama, Workspace, TP Capital)
   - Catalog chunks (Agents 661KB, Commands)

2. **Compression** ✅
   - Gzip (`.gz` files)
   - Brotli (`.br` files, ~15-20% smaller)

3. **Minification** ✅
   - Terser with console removal in prod
   - Drop debugger statements

4. **Bundle Analysis** ✅
   - Rollup visualizer configured
   - Generates `dist/stats.html`

---

## 🎯 Optimization Strategy

### Phase 1: Fix Build Errors (Priority: Critical)

**Before optimizing, we must fix TypeScript errors:**

#### 1.1 Remove Unused Imports

```typescript
// Files to fix:
// - src/components/pages/TelegramGatewayFinal.tsx (line 446)
// - src/components/pages/telegram-gateway/SimpleStatusCard.tsx (line 6)
// - src/components/pages/tp-capital/SignalsTable.refactored.tsx (lines 30, 221, 285)
// - src/components/pages/tp-capital/SignalsTable.tsx (line 30)
// - src/components/pages/tp-capital/components/SignalsFilterBar.tsx (lines 82, 88, 90)
// - src/components/pages/tp-capital/utils/logger.ts (line 11)
// - src/components/telegram/GenericLinkPreview.tsx (line 2)
// - src/services/libraryService.ts (line 8)
```

#### 1.2 Fix Type Errors

```typescript
// SignalsTable.refactored.tsx:
// - Add missing date props to SignalsFilterBarProps
// - Add onDelete prop to SignalRowProps
```

#### 1.3 Fix Test Configuration

```typescript
// Add to vitest.setup.ts or test setup:
import '@testing-library/jest-dom';

// Create missing module:
// src/utils/tpCapitalApi.ts
```

### Phase 2: Implement Route-Based Lazy Loading (Priority: High)

**Current:** All 67 pages loaded eagerly
**Target:** Lazy load all pages except critical ones

#### Implementation

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

// Only eager load critical components
import { Layout } from './components/layout/Layout';

// Lazy load all pages
const WorkspacePage = lazy(() => import('./components/pages/WorkspacePageNew'));
const LlamaIndexPage = lazy(() => import('./components/pages/LlamaIndexPage'));
const TPCapitalPage = lazy(() => import('./components/pages/TPCapitalOpcoesPage'));
const DocusaurusPage = lazy(() => import('./components/pages/DocusaurusPage'));
const CatalogPage = lazy(() => import('./components/pages/CatalogPage'));
// ... repeat for all 67 pages

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Layout />
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Expected Savings:** ~400-600KB on initial load

### Phase 3: Optimize Large Dependencies (Priority: High)

#### 3.1 Analyze Current Bundle

```bash
npm run build
open dist/stats.html  # View bundle treemap
```

**Known Large Dependencies:**

1. **AI Agents Directory** (661KB)
   - `src/data/aiAgentsDirectory.ts`
   - Currently loaded eagerly
   - **Solution:** Move to async import in CatalogPage

2. **Recharts** (~100KB)
   - Used in PerformancePage, LogsDashboardPage
   - **Solution:** Lazy load chart pages

3. **Framer Motion** (~80KB)
   - Used for animations
   - **Solution:** Replace with CSS animations where possible

4. **Lucide Icons** (large)
   - Currently importing entire library
   - **Solution:** Import only used icons

#### 3.2 Optimize AI Agents Directory

```typescript
// Current (WRONG):
import { aiAgentsDirectory } from '@/data/aiAgentsDirectory';

// Optimized:
const aiAgentsDirectory = lazy(() => import('@/data/aiAgentsDirectory').then(m => ({ default: m.aiAgentsDirectory })));

// Or even better - load from API:
const { data: agents } = useQuery('agents', fetchAgentsFromAPI);
```

**Expected Savings:** ~661KB moved to lazy chunk

#### 3.3 Optimize Icon Imports

```typescript
// Current (WRONG):
import { ChevronDown, ChevronUp, Search, Filter, X, Check, ... } from 'lucide-react';

// Optimized (import individually):
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Search from 'lucide-react/dist/esm/icons/search';
```

**Expected Savings:** ~50-100KB

### Phase 4: Tree Shaking Optimizations (Priority: Medium)

#### 4.1 Ensure Side-Effect Free Imports

```json
// package.json
{
  "sideEffects": [
    "*.css",
    "*.scss"
  ]
}
```

#### 4.2 Use ES6 Module Imports

```typescript
// Avoid default imports from libraries
import { format } from 'date-fns';  // ✅ Good
import * as dateFns from 'date-fns';  // ❌ Bad (imports everything)
```

### Phase 5: Image & Asset Optimization (Priority: Medium)

#### 5.1 Optimize Images

```bash
# Install optimizer
npm install --save-dev vite-plugin-imagemin

# Add to vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

plugins: [
  viteImagemin({
    gifsicle: { optimizationLevel: 7 },
    optipng: { optimizationLevel: 7 },
    mozjpeg: { quality: 80 },
    pngquant: { quality: [0.8, 0.9], speed: 4 },
    svgo: {
      plugins: [
        { name: 'removeViewBox', active: false },
        { name: 'removeEmptyAttrs', active: true },
      ],
    },
  }),
]
```

#### 5.2 Use Modern Image Formats

```typescript
// Convert to WebP/AVIF where possible
<picture>
  <source srcSet="image.avif" type="image/avif" />
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="..." />
</picture>
```

### Phase 6: Remove Unused Dependencies (Priority: Medium)

#### 6.1 Audit Dependencies

```bash
# Find unused dependencies
npx depcheck

# Analyze bundle size
npm run build
npm run analyze:bundle
```

**Candidates for Removal:**

Check if these are actually used:
- `diff` - Used in DiffViewer?
- `cmdk` - Used in Command palette?
- `@dnd-kit/*` - Used in workspace?

### Phase 7: Dynamic Import for Heavy Features (Priority: High)

#### 7.1 Markdown Rendering

```typescript
// Only load markdown when needed
const MarkdownViewer = lazy(() => import('./components/pages/MarkdownViewer'));

// Use dynamic import for markdown libraries
const renderMarkdown = async (content: string) => {
  const { unified } = await import('unified');
  const { remarkParse } = await import('remark-parse');
  const { remarkGfm } = await import('remark-gfm');
  // ...
};
```

#### 7.2 Charts

```typescript
// Only load Recharts when chart is visible
const Chart = lazy(() => import('./components/charts/PerformanceChart'));

// Usage
{showChart && (
  <Suspense fallback={<ChartSkeleton />}>
    <Chart data={data} />
  </Suspense>
)}
```

### Phase 8: Configure Performance Budget (Priority: Medium)

```typescript
// vite.config.ts
build: {
  chunkSizeWarningLimit: 500, // Already set ✅
  rollupOptions: {
    output: {
      // Add size budget checks
      plugins: [
        {
          name: 'size-budget',
          generateBundle(options, bundle) {
            const sizes = Object.entries(bundle).map(([name, chunk]) => ({
              name,
              size: chunk.type === 'chunk' ? chunk.code.length : chunk.source.length
            }));

            const oversized = sizes.filter(s => s.size > 500 * 1024);
            if (oversized.length > 0) {
              console.warn('⚠️  Oversized chunks:', oversized);
            }
          }
        }
      ]
    }
  }
}
```

---

## 📊 Expected Improvements

### Before Optimization (Estimated)

- **Initial Load:** ~800KB (minified + gzipped)
- **Total Bundle:** ~2MB (uncompressed)
- **Lazy Chunks:** Minimal (only vendor splits)
- **LCP:** ~2.5s
- **Time to Interactive:** ~3.5s

### After Optimization (Target)

- **Initial Load:** <400KB (minified + gzipped) ⬇️ 50%
- **Total Bundle:** ~1.5MB (uncompressed) ⬇️ 25%
- **Lazy Chunks:** 50+ route-based chunks
- **LCP:** <1.8s ⬇️ 28%
- **Time to Interactive:** <2.5s ⬇️ 29%

---

## 🚀 Implementation Roadmap

### Week 1: Fix Build + Critical Optimizations

**Day 1-2: Fix TypeScript Errors**
- [ ] Remove unused imports (39 errors)
- [ ] Fix type errors (7 errors)
- [ ] Fix test configuration (23 errors)
- [ ] Verify build succeeds: `npm run build`

**Day 3-4: Implement Route-Based Lazy Loading**
- [ ] Convert App.tsx to use React.lazy()
- [ ] Add Suspense boundaries with loading states
- [ ] Test navigation between lazy-loaded pages
- [ ] Measure bundle size reduction

**Day 5: Optimize Large Data Files**
- [ ] Move aiAgentsDirectory to async import
- [ ] Lazy load Recharts/heavy libraries
- [ ] Implement dynamic imports for markdown

### Week 2: Advanced Optimizations

**Day 1-2: Icon & Dependency Optimization**
- [ ] Audit and optimize Lucide icon imports
- [ ] Remove unused dependencies
- [ ] Configure tree shaking optimizations

**Day 3-4: Asset Optimization**
- [ ] Install vite-plugin-imagemin
- [ ] Optimize images (WebP/AVIF)
- [ ] Optimize SVGs

**Day 5: Performance Budget & Monitoring**
- [ ] Add bundle size budget checks
- [ ] Setup CI bundle size monitoring
- [ ] Document performance improvements

---

## 🧪 Testing Checklist

After each optimization:

- [ ] Run build: `npm run build`
- [ ] Check bundle sizes: `ls -lh dist/assets/*.js`
- [ ] View bundle analysis: `open dist/stats.html`
- [ ] Test all pages load correctly
- [ ] Run E2E tests: `npm run test:e2e:smoke`
- [ ] Test on slow 3G connection
- [ ] Measure LCP, FID, CLS with Lighthouse

---

## 📈 Monitoring

### Bundle Size Tracking

```json
// package.json
{
  "scripts": {
    "build": "npm run copy:docs && tsc && NODE_ENV=production vite build",
    "build:analyze": "npm run build && npm run analyze:bundle",
    "analyze:bundle": "node scripts/analyze-bundle.js",
    "size:check": "node scripts/check-bundle-size.js"
  }
}
```

### CI Integration

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run size:check
      - uses: actions/upload-artifact@v4
        with:
          name: bundle-stats
          path: dist/stats.html
```

---

## 🎯 Success Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Initial Bundle | ~800KB | <400KB | 🔴 Pending |
| Total Bundle | ~2MB | <1.5MB | 🔴 Pending |
| Lazy Chunks | Minimal | 50+ | 🔴 Pending |
| LCP | ~2.5s | <1.8s | 🔴 Pending |
| TTI | ~3.5s | <2.5s | 🔴 Pending |
| Build Time | - | - | 🟡 Measure |

---

## 📚 References

- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

## 🔧 Quick Fixes (Can Start Immediately)

### 1. Remove Unused Imports Script

```bash
# Create cleanup script
cat > scripts/fix-unused-imports.sh << 'EOF'
#!/bin/bash
# Fix common unused import errors

# Remove unused imports
npx eslint src --fix --rule '{"no-unused-vars": "off", "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "^_" }]}'

# Format code
npx prettier --write src
EOF

chmod +x scripts/fix-unused-imports.sh
```

### 2. Add Bundle Size Budget

```typescript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

const BUDGET = {
  'index': 400 * 1024, // 400KB
  'vendor': 500 * 1024, // 500KB
};

const distPath = path.join(__dirname, '../dist/assets');
const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));

let failed = false;

files.forEach(file => {
  const size = fs.statSync(path.join(distPath, file)).size;
  const type = file.split('-')[0];
  const budget = BUDGET[type] || 500 * 1024;

  if (size > budget) {
    console.error(`❌ ${file}: ${(size / 1024).toFixed(0)}KB exceeds budget ${(budget / 1024).toFixed(0)}KB`);
    failed = true;
  } else {
    console.log(`✅ ${file}: ${(size / 1024).toFixed(0)}KB`);
  }
});

if (failed) {
  process.exit(1);
}
```

### 3. Lazy Load Heavy Pages

```typescript
// src/pages-lazy.ts
export const LazyPages = {
  Workspace: lazy(() => import('./components/pages/WorkspacePageNew')),
  LlamaIndex: lazy(() => import('./components/pages/LlamaIndexPage')),
  TPCapital: lazy(() => import('./components/pages/TPCapitalOpcoesPage')),
  Docusaurus: lazy(() => import('./components/pages/DocusaurusPage')),
  Catalog: lazy(() => import('./components/pages/CatalogPage')),
  TelegramGateway: lazy(() => import('./components/pages/TelegramGatewayFinal')),
  // ... add all 67 pages
};
```

---

**Next Step:** Fix TypeScript errors to enable build, then implement optimizations.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Status:** 🔴 Blocked - TypeScript errors must be fixed first
