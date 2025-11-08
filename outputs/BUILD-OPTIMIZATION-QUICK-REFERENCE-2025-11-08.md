# Build Optimization Quick Reference Card

**TradingSystem Build Optimization** | Last Updated: 2025-11-08

---

## ⚡ Quick Commands

```bash
# Normal build (with all optimizations)
npm run build

# Clean build (force regeneration)
rm -rf dist .tsbuildinfo .agents-cache.json && npm run build

# Skip prebuild (for testing)
SKIP_DASHBOARD_PREBUILD=1 npm run build

# Type check only (fast)
npm run type-check

# Dev mode (with watch)
npm run dev
```

---

## 📊 Expected Build Times

| Build Type | Time | Notes |
|-----------|------|-------|
| **Clean** | ~19s | First build or after cache clear |
| **Incremental** | ~12s | Typical daily builds (37% faster) |
| **Type Check Only** | ~2s | No bundling, just TypeScript |

---

## 🔧 Active Optimizations

### ✅ TypeScript Incremental Compilation
- **Cache**: `.tsbuildinfo`
- **Benefit**: 30-50% faster type checking
- **Clear if needed**: `rm -f .tsbuildinfo`

### ✅ Agents Cache
- **Cache**: `.agents-cache.json`
- **Benefit**: Skip generation when `.claude/commands/` unchanged (~3s)
- **Clear if needed**: `rm -f .agents-cache.json`

### ✅ JSON Data Format
- **Files**: `aiAgentsDirectory.json` (549 KB)
- **Benefit**: Faster parsing than TypeScript
- **Auto-generated**: Yes (on prebuild)

### ✅ Enhanced Vendor Chunks
- **Chunks**: 13 granular vendor chunks
- **Benefit**: Better browser caching
- **Config**: `vite.config.ts` manualChunks

---

## 🚨 Troubleshooting

### Build is slow

```bash
# Check cache files exist
ls -lh .tsbuildinfo .agents-cache.json

# Clear all caches and rebuild
rm -rf dist .tsbuildinfo .agents-cache.json node_modules/.vite
npm run build
```

### Types not updating

```bash
# Clear TypeScript cache
rm -f .tsbuildinfo
npm run type-check
```

### Agents not regenerating

```bash
# Force regeneration
rm -f .agents-cache.json
npm run build
```

### JSON import errors

```bash
# Verify JSON exists
ls -lh src/data/aiAgentsDirectory.json

# Regenerate from TypeScript
node scripts/convert-agents-to-json.mjs
```

---

## 📁 Important Files

### Cache Files (auto-generated, git-ignored)
```
.tsbuildinfo              - TypeScript incremental cache
.agents-cache.json        - Agents directory cache
node_modules/.vite        - Vite cache
```

### Configuration Files
```
tsconfig.json             - TypeScript config (incremental: true)
vite.config.ts            - Vite config (vendor chunks)
package.json              - Build scripts
```

### Data Files
```
src/data/aiAgentsDirectory.ts       - Source (kept for dev)
src/data/aiAgentsDirectory.json     - Production (549 KB)
src/data/aiAgentsDirectory.types.ts - Type definitions (808 B)
```

### Scripts
```
scripts/check-agents-cache.cjs      - Cache checker
scripts/convert-agents-to-json.mjs  - TS to JSON converter
```

---

## 🎯 Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Incremental Build** | < 15s | 12.1s | ✅ |
| **Cache Hit Rate** | > 80% | 90% | ✅ |
| **Vendor Chunks** | > 10 | 13 | ✅ |

---

## 📚 Full Documentation

- **Analysis**: [BUILD-OPTIMIZATION-ANALYSIS-2025-11-08.md](BUILD-OPTIMIZATION-ANALYSIS-2025-11-08.md)
- **Implementation**: [BUILD-OPTIMIZATION-IMPLEMENTATION-2025-11-08.md](BUILD-OPTIMIZATION-IMPLEMENTATION-2025-11-08.md)
- **Phase 2 Results**: [BUILD-OPTIMIZATION-PHASE2-RESULTS-2025-11-08.md](BUILD-OPTIMIZATION-PHASE2-RESULTS-2025-11-08.md)
- **Executive Summary**: [BUILD-OPTIMIZATION-EXECUTIVE-SUMMARY-2025-11-08.md](BUILD-OPTIMIZATION-EXECUTIVE-SUMMARY-2025-11-08.md)

---

## 💡 Tips

- ✅ Incremental builds are 37% faster - use them!
- ✅ Cache files are safe to delete (will regenerate)
- ✅ `SKIP_DASHBOARD_PREBUILD=1` skips prebuild for testing
- ✅ Type check is faster than full build for quick checks
- ✅ JSON is auto-generated, edit TypeScript source instead

---

**Need Help?** See troubleshooting section in implementation docs.
