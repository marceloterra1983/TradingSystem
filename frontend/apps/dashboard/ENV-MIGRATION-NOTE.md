# Dashboard - Environment Migration

## ⚠️ IMPORTANT: .env File Location Changed

The frontend dashboard now uses the **centralized `.env`** file from the project root instead of a local `.env` file.

### What Changed

**Before (v2.0)**:
```
frontend/apps/dashboard/.env  ← Local config file
```

**After (v2.1)**:
```
TradingSystem/.env  ← Single source of truth for ALL services
```

### How Vite Loads Environment Variables

Vite automatically searches for `.env` files in the following order:
1. Project root (where `vite.config.ts` is relative to)
2. Current working directory

Since the dashboard's `vite.config.ts` defines:
```typescript
const repoRoot = path.resolve(__dirname, '../../../');
```

Vite will automatically load `.env` from `TradingSystem/.env` (project root).

### Environment Variables Used

All `VITE_*` prefixed variables in root `.env` are available:

```bash
# From TradingSystem/.env
VITE_API_URL=http://localhost:4010
VITE_WS_URL=ws://localhost:4010
VITE_QUESTDB_URL=http://localhost:9000
VITE_PROMETHEUS_URL=http://localhost:9090
VITE_ENABLE_ML_FEATURES=true
VITE_ENABLE_PROFITDLL=false
```

### Setup for Development

1. **Ensure root `.env` exists**:
   ```bash
   cd TradingSystem
   bash scripts/env/setup-env.sh
   ```

2. **Start dashboard** (it will load root `.env` automatically):
   ```bash
   cd frontend/apps/dashboard
   npm run dev
   ```

3. **Verify variables are loaded**:
   Open browser console and check `import.meta.env.VITE_API_URL`

### Backup

The old `.env` file was backed up to:
- `frontend/apps/dashboard/.env.OLD.backup`

This can be safely deleted after verifying the dashboard works with root `.env`.

---

**Migration Date**: 2025-10-15  
**Status**: ✅ Complete  
**Documentation**: See `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`

