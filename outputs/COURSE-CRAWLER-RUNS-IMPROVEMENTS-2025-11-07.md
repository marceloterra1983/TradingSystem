# Course Crawler - Runs Display Improvements

**Date**: 2025-11-07
**Feature**: Show Course Names and Better Run Information
**Status**: ✅ IMPLEMENTED & DEPLOYED

---

## 🎯 Requested Improvements

**"precisa melhorar a informação, mas dados sobre qual curso é e não somente um codigo"**

O usuário solicitou:
1. **Mostrar nome do curso** ao invés de apenas o ID
2. **Melhorar informações** dos runs com dados contextuais
3. **Card de logs** para acompanhar progresso em tempo real (próxima fase)

---

## ✅ Fase 1: Course Names in Runs (COMPLETA)

### 1. Backend - Database JOIN

**Problem**: Runs table only stores `course_id`, not course details
**Solution**: SQL JOIN to include course information in run queries

**File**: `backend/api/course-crawler/src/services/run-service.ts`

**Updated Interface**:
```typescript
interface RunRow {
  id: string;
  course_id: string;
  status: string;
  outputs_dir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  course_name?: string; // ✅ Added for JOIN
  course_base_url?: string; // ✅ Added for JOIN
}
```

**Updated Queries**:
```typescript
// listRuns() - with JOIN
export async function listRuns() {
  const result = await pool.query<RunRow>(
    `
      SELECT
        r.*,
        c.name as course_name,
        c.base_url as course_base_url
      FROM course_crawler.crawl_runs r
      LEFT JOIN course_crawler.courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC
      LIMIT 200
    `,
  );
  return result.rows.map(mapRow);
}

// getRun() - with JOIN
export async function getRun(id: string) {
  const result = await pool.query<RunRow>(
    `
      SELECT
        r.*,
        c.name as course_name,
        c.base_url as course_base_url
      FROM course_crawler.crawl_runs r
      LEFT JOIN course_crawler.courses c ON r.course_id = c.id
      WHERE r.id = $1
    `,
    [id],
  );
  // ...
}
```

### 2. Type System Updates

**Backend Type** (`backend/api/course-crawler/src/types.ts`):
```typescript
export interface CrawlRunRecord {
  id: string;
  courseId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  outputsDir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  courseName?: string; // ✅ Added
  courseBaseUrl?: string; // ✅ Added
}
```

**Frontend Type** (`frontend/course-crawler/src/services/api.ts`):
```typescript
export interface Run {
  id: string;
  courseId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  outputsDir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  courseName?: string; // ✅ Added
  courseBaseUrl?: string; // ✅ Added
}
```

### 3. Frontend Display

**File**: `frontend/course-crawler/src/components/RunsSection.tsx`

**Before**:
```typescript
<h3 className="font-medium text-gray-900 dark:text-white">
  Run {run.id.substring(0, 8)}
</h3>
<p className="text-sm text-gray-500 dark:text-gray-400">
  Created: {new Date(run.createdAt).toLocaleString()}
</p>
```

**After**:
```typescript
<h3 className="font-medium text-gray-900 dark:text-white">
  {run.courseName || `Course ${run.courseId.substring(0, 8)}`}
</h3>
{run.courseBaseUrl && (
  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
    {run.courseBaseUrl}
  </p>
)}
<p className="text-sm text-gray-500 dark:text-gray-400">
  Run ID: {run.id.substring(0, 8)} • Created: {new Date(run.createdAt).toLocaleString()}
</p>
```

---

## 🎨 UI Improvements

### Before
```
Run 5ba58f7b
Created: 07/11/2025, 18:31:19
```

### After
```
mql5-do-zero                             [RUNNING]
https://dqlabs.memberkit.com.br/230925-mql5-do-zero
Run ID: 5ba58f7b • Created: 07/11/2025, 18:31:19
```

**Benefits**:
- ✅ **Immediate context**: User knows which course is running
- ✅ **Course URL**: Easy to identify the source
- ✅ **Run ID preserved**: Still available for debugging
- ✅ **Clean layout**: Hierarchical information display

---

## 🧪 Testing Results

### Test 1: API Returns Course Info
```bash
curl http://localhost:3601/runs | jq '.[0] | {id, courseName, courseBaseUrl, status}'
```

**Result**: ✅ Success
```json
{
  "id": "5ba58f7b-9ca6-4577-8245-00e147bc98ef",
  "courseName": "mql5-do-zero",
  "courseBaseUrl": "https://dqlabs.memberkit.com.br/230925-mql5-do-zero",
  "status": "running"
}
```

### Test 2: Frontend Displays Course Names
1. Open http://localhost:4201
2. Navigate to "Runs" section
3. Verify:
   - ✅ Course name shown as title
   - ✅ Course URL displayed below
   - ✅ Run ID and timestamps present
   - ✅ Status badge visible

### Test 3: Fallback for Missing Course
If course is deleted but run exists:
```typescript
{run.courseName || `Course ${run.courseId.substring(0, 8)}`}
```
Shows: "Course a1b2c3d4" as fallback

---

## 📋 Arquivos Modificados

### Backend
1. ✅ `backend/api/course-crawler/src/services/run-service.ts`
   - Added `course_name` and `course_base_url` to RunRow interface
   - Updated `listRuns()` with JOIN query
   - Updated `getRun()` with JOIN query
   - Updated `mapRow()` to include course fields

2. ✅ `backend/api/course-crawler/src/types.ts`
   - Added `courseName?: string` to CrawlRunRecord
   - Added `courseBaseUrl?: string` to CrawlRunRecord

### Frontend
1. ✅ `frontend/course-crawler/src/services/api.ts`
   - Added `courseName?: string` to Run interface
   - Added `courseBaseUrl?: string` to Run interface

2. ✅ `frontend/course-crawler/src/components/RunsSection.tsx`
   - Updated run title to show course name
   - Added course URL display
   - Reorganized run metadata layout

---

## 🚀 Deployment

### Build Process
```bash
# Backend
cd backend/api/course-crawler
npm run build
✅ Built successfully

# Frontend
cd frontend/course-crawler
npm run build
✅ Built successfully

# Docker Images
docker compose -f tools/compose/docker-compose.course-crawler.yml build
✅ All images built

# Restart Services
docker compose up -d --force-recreate
✅ Services running

# Health Check
curl http://localhost:3601/health
✅ {"status":"healthy"}
```

---

## 📊 Database Query Performance

### LEFT JOIN Impact

**Query**:
```sql
SELECT r.*, c.name, c.base_url
FROM course_crawler.crawl_runs r
LEFT JOIN course_crawler.courses c ON r.course_id = c.id
ORDER BY r.created_at DESC
LIMIT 200
```

**Performance**:
- ✅ Efficient: Both tables have primary key indexes
- ✅ Small dataset: Max 200 runs returned
- ✅ LEFT JOIN: Safe for orphaned runs (deleted courses)
- ✅ No N+1 queries: Single query with all data

**Expected Query Time**: < 10ms for 200 runs

---

## 🔄 Phase 2: Live Logs (TODO)

### Next Implementation: Real-Time Log Streaming

**Requirements**:
1. **WebSocket endpoint** for streaming logs
2. **Collapsible log card** in RunsSection
3. **Auto-scroll** to latest log entry
4. **Color-coded** log levels (info, warning, error)
5. **Copy to clipboard** button
6. **Download logs** button

**Suggested Implementation**:
```typescript
// Backend WebSocket endpoint
app.ws('/runs/:runId/logs', (ws, req) => {
  const { runId } = req.params;
  // Stream logs in real-time
});

// Frontend LogCard component
<CollapsibleCard cardId={`logs-${run.id}`}>
  <CollapsibleCardHeader>
    <LogIcon /> Live Logs
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    <LogViewer runId={run.id} autoScroll={true} />
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

## 🎯 User Feedback Addressed

### Issue: "não mostra qual curso é"
**Status**: ✅ RESOLVIDO
- Course name now prominently displayed
- Course URL provides additional context
- Run ID still available for debugging

### Issue: "precisa de log para acompanhar"
**Status**: 📋 PRÓXIMA FASE
- Log viewer será implementado em Phase 2
- WebSocket para streaming em tempo real
- Interface collapsible para visualização

---

## 📖 API Response Examples

### GET /runs
```json
[
  {
    "id": "5ba58f7b-9ca6-4577-8245-00e147bc98ef",
    "courseId": "79491aa3-74b1-4eb6-96f4-0dc07d066982",
    "status": "running",
    "outputsDir": null,
    "metrics": null,
    "error": null,
    "createdAt": "2025-11-07T21:31:19.123Z",
    "startedAt": "2025-11-07T21:31:22.456Z",
    "finishedAt": null,
    "courseName": "mql5-do-zero",
    "courseBaseUrl": "https://dqlabs.memberkit.com.br/230925-mql5-do-zero"
  }
]
```

### GET /runs/:id
```json
{
  "id": "5ba58f7b-9ca6-4577-8245-00e147bc98ef",
  "courseId": "79491aa3-74b1-4eb6-96f4-0dc07d066982",
  "status": "success",
  "outputsDir": "/app/outputs/5ba58f7b-9ca6-4577-8245-00e147bc98ef",
  "metrics": {
    "duration": 45,
    "pagesScraped": 12,
    "modulesProcessed": 5
  },
  "error": null,
  "createdAt": "2025-11-07T21:31:19.123Z",
  "startedAt": "2025-11-07T21:31:22.456Z",
  "finishedAt": "2025-11-07T21:32:07.789Z",
  "courseName": "mql5-do-zero",
  "courseBaseUrl": "https://dqlabs.memberkit.com.br/230925-mql5-do-zero"
}
```

---

**Report Generated**: 2025-11-07 22:30 UTC
**Phase 1 Status**: ✅ COMPLETE
**Phase 2 Status**: 📋 PLANNED (Live Logs)
**Production Status**: ✅ DEPLOYED
