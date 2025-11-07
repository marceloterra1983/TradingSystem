# Course Crawler Phase 2 - Worker Improvements Test Report

**Date:** 2025-11-07
**System:** Course Crawler v0.1.0

## Test Summary

All Phase 2 improvements successfully implemented and tested:

### 1. Timeout Configuration ✅

**Implementation:**
- Configurable via `COURSE_CRAWLER_TIMEOUT_MS` environment variable
- Default: 300000ms (5 minutes)
- Graceful shutdown: SIGTERM → wait 5s → SIGKILL if needed
- Timeout detection using `Promise.race()`

**Test Results:**
- ✅ Worker respects configured timeout
- ✅ Process receives SIGTERM on timeout
- ✅ Fallback SIGKILL works after 5s
- ✅ Run marked as failed with timeout error message

### 2. Health Check Endpoints ✅

**Endpoints:**
- `GET /health` - Overall system health
- `GET /health/worker` - Detailed worker state

**Test Results:**
```json
// GET /health
{
  "status": "healthy",
  "timestamp": "2025-11-07T19:56:49.806Z",
  "uptime": 9.858627131,
  "worker": {
    "isRunning": true,
    "lastPollTime": "2025-11-07T19:56:45.077Z",
    "timeSinceLastPollMs": 4729,
    "activeRunsCount": 0,
    "activeRuns": []
  }
}

// GET /health/worker (with active run)
{
  "isRunning": true,
  "lastPollTime": "2025-11-07T19:57:13.667Z",
  "timeSinceLastPollMs": 5790,
  "activeRunsCount": 1,
  "activeRuns": [
    {
      "runId": "9ba00ea5-ebe4-4eeb-8fba-b041ec381aa1",
      "pid": 29,
      "startTime": "2025-11-07T19:57:13.673Z",
      "durationMs": 5784
    }
  ]
}
```

### 3. Run Cancellation ✅

**Implementation:**
- `DELETE /runs/:id` endpoint
- Updates database status to 'cancelled'
- Kills active process via SIGTERM
- Only allows cancellation of 'queued' or 'running' runs

**Test Results:**
```bash
# Schedule run
$ curl -X POST http://localhost:3601/courses/{id}/runs
{
  "id": "3febfdb0-fd0a-49dd-8757-fa6cfcd6e154",
  "status": "queued"
}

# Cancel run (after 2s)
$ curl -X DELETE http://localhost:3601/runs/3febfdb0-fd0a-49dd-8757-fa6cfcd6e154
{
  "id": "3febfdb0-fd0a-49dd-8757-fa6cfcd6e154",
  "status": "cancelled",
  "finishedAt": "2025-11-07T19:59:33.816Z"
}
```

- ✅ Run status changed to 'cancelled'
- ✅ Process terminated gracefully
- ✅ Database updated with finishedAt timestamp
- ✅ Cannot cancel completed/failed runs (400 error)

### 4. Enhanced Logging ✅

**Improvements:**
- Prefixed logging: `[Worker][runId]` for all messages
- Separate stdout/stderr streams with run ID tags
- Process tracking (PID, start time, duration)
- Timeout warnings with context
- Error messages include last 500 chars of output

**Sample Logs:**
```
[Worker] Processing run 3febfdb0-fd0a-49dd-8757-fa6cfcd6e154 for course 7af96027-23e8-4d11-899d-fbdeba27afc7
[Worker] Spawning CLI process for run 3febfdb0-fd0a-49dd-8757-fa6cfcd6e154
[Worker][3febfdb0-fd0a-49dd-8757-fa6cfcd6e154][stdout] {"level":30,"time":1762545572716,"pid":29,"hostname":"a84c80437afc","msg":"[course-crawler] Neon migrations applied"}
[Worker][3febfdb0-fd0a-49dd-8757-fa6cfcd6e154][stdout] {"level":30,"time":1762545572718,"pid":29,"hostname":"a84c80437afc","msg":"[course-crawler] Starting discovery"}
```

## Database Schema Updates

Added 'cancelled' status to CHECK constraint:

```sql
ALTER TABLE course_crawler.crawl_runs
DROP CONSTRAINT IF EXISTS crawl_runs_status_check;

ALTER TABLE course_crawler.crawl_runs
ADD CONSTRAINT crawl_runs_status_check
CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled'));
```

## API Changes

### New Endpoints:
1. `GET /health` - System health check
2. `GET /health/worker` - Worker state details
3. `DELETE /runs/:id` - Cancel a run

### Updated Types:
```typescript
export interface CrawlRunRecord {
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  // ... other fields
}
```

## Worker State Tracking

New exported state for health monitoring:

```typescript
export const workerState = {
  isRunning: true,
  lastPollTime: Date.now(),
  activeRuns: new Map<string, { startTime: number; pid: number | undefined }>(),
};
```

## Files Modified

1. `backend/api/course-crawler/src/jobs/worker.ts` - Timeout & logging
2. `backend/api/course-crawler/src/routes/health.ts` - NEW: Health endpoints
3. `backend/api/course-crawler/src/routes/runs.ts` - Cancellation endpoint
4. `backend/api/course-crawler/src/services/run-service.ts` - cancelRun()
5. `backend/api/course-crawler/src/types.ts` - Added 'cancelled' status
6. `backend/api/course-crawler/src/app.ts` - Register health routes
7. `backend/api/course-crawler/migrations/002-add-cancelled-status.sql` - NEW

## Recommendations for Phase 3

Based on testing, suggested improvements:

1. **Frontend Integration**: Add cancellation button to UI
2. **Real Course Testing**: Test with actual Moodle/Canvas instances
3. **Retry Logic**: Add automatic retry for failed runs
4. **Progress Reporting**: Real-time progress updates via WebSocket
5. **Artifact Cleanup**: Automatic cleanup of failed run artifacts

## Conclusion

✅ **All Phase 2 improvements successfully implemented and tested!**

The worker now has:
- Configurable timeouts with graceful shutdown
- Comprehensive health monitoring
- Run cancellation capability
- Enhanced logging with run context

System is production-ready for Phase 3 testing with real courses.
