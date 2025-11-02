# Build Command

Execute build de produção para verificar se o código compila corretamente.

## Usage

```bash
/build [target] [options]
```

## Targets

- `frontend` - Build frontend/dashboard (default)
- `backend` - Build backend services (if applicable)
- `all` - Build all projects

## Options

- `--analyze` - Analyze bundle size
- `--clean` - Clean before build
- `--watch` - Watch mode (rebuild on changes)

## Examples

```bash
# Build frontend
/build

# Clean build
/build --clean

# Build with bundle analysis
/build --analyze

# Build all
/build all

# Watch mode (dev)
/build --watch
```

## Implementation

```bash
# Frontend
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard

  # Clean if requested
  if [[ "{{args}}" == *"--clean"* ]]; then
    echo "Cleaning dist/..."
    rm -rf dist/
  fi

  # Build
  if [[ "{{args}}" == *"--watch"* ]]; then
    npm run dev
  else
    npm run build
  fi

  # Analyze bundle
  if [[ "{{args}}" == *"--analyze"* ]]; then
    echo ""
    echo "Bundle Analysis:"
    echo "================"
    ls -lh dist/assets/*.js | awk '{print $9 " - " $5}'
    echo ""
    echo "Total size:"
    du -sh dist/
    echo ""
    echo "For interactive analysis, run:"
    echo "  npx vite-bundle-visualizer"
  fi

  cd ../..
fi

# Backend
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f "package.json" ]] && grep -q '"build"' package.json; then
      echo "Building $api..."
      npm run build
    fi
    cd ../../..
  done
fi
```

## Build Output (Frontend)

```
vite v5.0.0 building for production...
✓ 142 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.30 kB
dist/assets/index-B2jU8v9z.css   12.34 kB │ gzip:  3.21 kB
dist/assets/index-C4sD9f8g.js   234.56 kB │ gzip: 76.54 kB
✓ built in 3.21s
```

## Bundle Size Targets

| Asset Type | Target | Warning | Critical |
|------------|--------|---------|----------|
| Initial JS | < 200 KB | 300 KB | 500 KB |
| CSS | < 50 KB | 100 KB | 150 KB |
| Total (gzipped) | < 300 KB | 500 KB | 800 KB |
| Lazy chunks | < 100 KB | 150 KB | 200 KB |

## Bundle Analysis

### Interactive Visualization

```bash
npm run build
npx vite-bundle-visualizer
```

Opens browser with treemap showing:
- Which packages are largest
- Code splitting effectiveness
- Duplicate code across chunks

### Command Line Analysis

```bash
# List chunks by size
ls -lhS dist/assets/*.js | head -10

# Find large dependencies
npx vite-bundle-visualizer --mode json | jq '.modules | sort_by(.size) | reverse | .[0:10]'

# Check gzipped sizes
gzip -c dist/assets/index-*.js | wc -c
```

## Optimization Tips

### Code Splitting

```typescript
// ❌ Bad: Import everything upfront
import { HeavyComponent } from './HeavyComponent';

// ✅ Good: Lazy load
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Tree Shaking

```typescript
// ❌ Bad: Import entire library
import _ from 'lodash';

// ✅ Good: Import specific functions
import { debounce } from 'lodash-es';
// Or even better:
import debounce from 'lodash-es/debounce';
```

### Dynamic Imports

```typescript
// Load heavy library only when needed
async function processImage(file: File) {
  const { default: imageCompression } = await import('browser-image-compression');
  return imageCompression(file, { maxSizeMB: 1 });
}
```

## Build Errors

### Out of Memory

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors

```bash
# Type check first
npx tsc --noEmit

# Then build
npm run build
```

## CI/CD Build

```yaml
# .github/workflows/build.yml
- name: Build
  run: |
    cd frontend/dashboard
    npm run build

- name: Check Bundle Size
  run: |
    SIZE=$(du -sb frontend/dashboard/dist | cut -f1)
    if [ $SIZE -gt 838860800 ]; then  # 800MB
      echo "Bundle too large: ${SIZE} bytes"
      exit 1
    fi
```

## Production Build

For deployment:

```bash
# 1. Clean
/build --clean

# 2. Build with analysis
/build --analyze

# 3. Verify output
ls -la dist/

# 4. Test production build locally
npx vite preview
```

## Related Commands

- `/quality-check` - Full quality check (includes build)
- `/type-check` - TypeScript verification before build
- `/bundle-analyze` - Detailed bundle analysis
