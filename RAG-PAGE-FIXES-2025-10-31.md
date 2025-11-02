# RAG Services Page Fixes - 2025-10-31

## Issues Resolved

### 1. Infinite Render Loop ✅
**Problem**: The `useCollections` hook had circular dependencies in `useCallback` hooks causing infinite re-renders.

**Solution**: Completely replaced `useCollections` with `useRagManager` hook that uses **React Query (TanStack Query)** for state management.

**Files Changed**:
- `frontend/dashboard/src/hooks/llamaIndex/useRagManager.ts` - New hook using React Query
- `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx` - Updated to use `useRagManager`
- `frontend/dashboard/src/components/pages/CollectionsManagementCard.tsx` - Converted to controlled component pattern

**Benefits of React Query**:
- ✅ No circular dependencies
- ✅ Automatic caching (staleTime: 10s for collections, 60s for models)
- ✅ Auto-refetch intervals (15s for status)
- ✅ Built-in mutation handling
- ✅ Better error and loading states
- ✅ Query invalidation on mutations

### 2. Missing `cloneCollection` Method ✅
**Problem**: `useRagManager` was calling `collectionsService.cloneCollection()` which didn't exist.

**Solution**: Added `cloneCollection` method to `collectionsService.ts`.

**File Changed**: `frontend/dashboard/src/services/collectionsService.ts`

**Implementation**:
```typescript
async cloneCollection(name: string, newName: string): Promise<Collection> {
  // Get the original collection
  const original = await this.getCollection(name);

  // Create a new collection with the same configuration
  const cloneRequest: CreateCollectionRequest = {
    name: newName,
    description: `${original.description} (cloned from ${name})`,
    directory: original.directory,
    embeddingModel: original.embeddingModel,
    chunkSize: original.chunkSize,
    chunkOverlap: original.chunkOverlap,
    fileTypes: original.fileTypes,
    recursive: original.recursive,
    enabled: original.enabled,
    autoUpdate: original.autoUpdate
  };

  return await this.createCollection(cloneRequest);
}
```

### 3. Mutation Signature Mismatch ✅
**Problem**: React Query mutations expect object parameters, but component was calling with separate arguments.

**Solution**: Added wrapper functions in `LlamaIndexPage.tsx` to transform arguments.

**File Changed**: `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx`

**Example**:
```typescript
onUpdateCollection={async (name, updates) => {
  await updateCollection({ name, updates });
}}
onCloneCollection={async (name, newName) => {
  await cloneCollection({ name, newName });
}}
```

### 4. Environment Variable Inconsistency ✅
**Problem**:
- Two different ports configured:
  - `VITE_API_BASE_URL=http://localhost:3402` (LlamaIndex direct)
  - `VITE_RAG_COLLECTIONS_URL=http://localhost:3403` (Documentation API proxy)
- Duplicate `VITE_API_BASE_URL` entry in `.env`
- Different response formats between ports

**Port Analysis**:
- **Port 3402**: LlamaIndex service with legacy response format
  ```json
  {
    "success": true,
    "models": [...],
    "configured": [...]
  }
  ```
- **Port 3403**: Documentation API proxy with standardized format
  ```json
  {
    "success": true,
    "data": {
      "models": [...]
    }
  }
  ```

**Solution**:
1. Removed duplicate `VITE_API_BASE_URL` from `.env`
2. Updated `VITE_API_BASE_URL` to use port 3403 (Documentation API)
3. Both `useRagManager` and `collectionsService` now use the same endpoint

**File Changed**: `.env`

**Final Configuration**:
```bash
VITE_API_BASE_URL=http://localhost:3403
VITE_RAG_COLLECTIONS_URL=http://localhost:3403
```

### 5. Page Layout Redesign ✅
**Completed in Previous Session**: The page was redesigned to use:
- `CustomizablePageLayout` with drag-and-drop
- `CollapsibleCard` components
- 4 sections: Overview, Health, Collections Management, Query Tool
- 2-column default layout

### 6. Table Action Buttons ✅
**Completed in Previous Session**: Collections table was updated with:
- Inline icon buttons instead of dropdown menu
- Tooltips for each action (Edit, Clone, Ingest, Delete)
- Color-coded hover states (blue, purple, emerald, red)
- Spinning animation for running ingestion

## Testing Checklist

- [ ] Navigate to `http://localhost:3103/#/rag-services`
- [ ] Verify no console errors or infinite loops
- [ ] Check that embedding models load in "Nova Coleção" dialog
- [ ] Test creating a new collection
- [ ] Test editing an existing collection
- [ ] Test cloning a collection
- [ ] Test deleting a collection
- [ ] Test triggering ingestion (spinner should appear)
- [ ] Verify collapsible cards work
- [ ] Verify drag-and-drop layout works
- [ ] Check that status auto-refreshes every 15s

## Models Available

```bash
# Port 3403 (Documentation API)
curl -s http://localhost:3403/api/v1/rag/models | jq '.data.models[] | .name'
```

Output:
- nomic-embed-text (384 dimensions)
- mxbai-embed-large (1024 dimensions)

## Architecture Notes

### React Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});
```

### Query Keys
```typescript
const queryKeys = {
  collections: ['rag', 'collections'],
  models: ['rag', 'models'],
  status: (collection?: string | null) => ['rag', 'status', collection ?? 'all'],
};
```

### Stale Times
- Collections: 10 seconds
- Models: 60 seconds
- Status: 10 seconds with 15s refetch interval

## Next Steps

1. ✅ Restart the dashboard to pick up `.env` changes:
   ```bash
   cd frontend/dashboard
   npm run dev
   ```

2. ✅ Test all functionality in the browser

3. 📋 Monitor console for any errors or warnings

4. 📊 Verify React Query DevTools shows correct cache behavior (if installed)

## Files Modified

1. `frontend/dashboard/src/hooks/llamaIndex/useRagManager.ts` - React Query implementation
2. `frontend/dashboard/src/services/collectionsService.ts` - Added `cloneCollection` method
3. `frontend/dashboard/src/components/pages/LlamaIndexPage.tsx` - Updated mutation wrappers
4. `.env` - Fixed environment variables (removed duplicate, changed port)

## Related Documentation

- React Query: https://tanstack.com/query/latest
- RAG Services API: `backend/api/documentation-api/src/routes/rag-collections.js`
- LlamaIndex Integration: `tools/llamaindex/`
- Collections Types: `frontend/dashboard/src/types/collections.ts`
