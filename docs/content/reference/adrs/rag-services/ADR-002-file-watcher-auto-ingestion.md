---
title: "ADR-002: File Watcher Auto-Ingestion Architecture"
sidebar_position: 2
description: "Decision to implement automatic document ingestion using Chokidar file watcher with debouncing and auto-update configuration per collection"
tags: [adr, rag-services, file-watcher, automation]
domain: rag-services
type: adr
summary: "Decision to implement automatic document ingestion using Chokidar file watcher with debouncing and auto-update configuration per collection"
status: accepted
owner: ArchitectureGuild
lastReviewed: "2025-11-01"
last_review: "2025-11-01"
---

# ADR-002: File Watcher Auto-Ingestion Architecture

**Status**: Accepted
**Date**: 2025-10-30
**Deciders**: Development Team, DevOps Team
**Technical Story**: RAG Services Phase 1 Implementation

## Context and Problem Statement

TradingSystem documentation is continuously evolving with:
- Multiple contributors updating markdown files
- New features requiring documentation updates
- Architecture changes reflected in diagrams
- API specifications evolving with code

**Problem**: Manual ingestion workflow was inefficient:
1. Developer updates documentation file
2. Developer must remember to run ingestion script
3. Wait for ingestion to complete
4. Verify changes in dashboard

This creates:
- **Human error**: Forgotten ingestions lead to stale search results
- **Slow feedback**: Developers must context-switch to trigger ingestion
- **Inconsistent state**: Search index lags behind actual documentation
- **Developer friction**: Extra manual steps slow down workflow

## Decision Drivers

- **Developer Experience**: Minimize manual steps in documentation workflow
- **Consistency**: Ensure RAG search always reflects latest documentation
- **Performance**: Avoid re-ingesting unchanged files
- **Reliability**: Handle rapid file changes gracefully (batch edits, git pulls)
- **Configurability**: Allow per-collection control of auto-ingestion

## Considered Options

### Option 1: Chokidar File Watcher with Debouncing (SELECTED)
**Implementation**: Node.js service using Chokidar library, monitors configured directories

**Pros**:
- ✅ Real-time detection of file changes
- ✅ Debouncing prevents duplicate ingestions
- ✅ Per-collection configuration (`autoUpdate: true/false`)
- ✅ Efficient glob pattern matching
- ✅ Cross-platform (Linux, Windows, macOS)
- ✅ Minimal resource overhead

**Cons**:
- ❌ Requires service to be running
- ❌ Potential edge cases with symlinks
- ❌ inotify limits on Linux (many files)

### Option 2: Polling-Based File Comparison
**Implementation**: Periodic cron job scanning for file modifications

**Pros**:
- ✅ Simple implementation
- ✅ No inotify limits
- ✅ Works without persistent service

**Cons**:
- ❌ Higher resource usage (constant scanning)
- ❌ Delayed detection (polling interval)
- ❌ Inefficient for large directories
- ❌ Misses rapid changes between polls

### Option 3: Git Hook Integration
**Implementation**: Pre-commit/post-merge hooks trigger ingestion

**Pros**:
- ✅ Tied directly to source control
- ✅ No background service needed
- ✅ Deterministic triggers

**Cons**:
- ❌ Doesn't detect manual file edits
- ❌ Slows down git operations
- ❌ Requires hook installation on all dev machines
- ❌ No support for non-git workflows

### Option 4: Manual Ingestion Only (Status Quo)
**Implementation**: Developers run `bash scripts/rag/ingest-tradingsystem.sh` manually

**Pros**:
- ✅ Simplest architecture
- ✅ Developer has full control

**Cons**:
- ❌ High friction in workflow
- ❌ Frequently forgotten
- ❌ Leads to stale search results
- ❌ Not scalable with multiple contributors

## Decision Outcome

**Chosen option: "Chokidar File Watcher with Debouncing"**

### Rationale

1. **Developer Experience**: Zero manual steps, documentation updates automatically reflected in RAG
2. **Performance**: Debouncing (5s default) batches rapid changes, preventing duplicate ingestions
3. **Flexibility**: Per-collection `autoUpdate` flag allows granular control
4. **Reliability**: `awaitWriteFinish` ensures complete file writes before ingestion
5. **Existing Infrastructure**: Integrates seamlessly with existing RAG Services architecture

### Implementation Details

**File Watcher Service** (`services/fileWatcher.ts`):
```typescript
export class FileWatcherService {
  private watcher: FSWatcher | null = null;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private debounceMs: number = 5000; // 5 seconds

  async start(): Promise<void> {
    const collections = collectionManager.getAutoUpdateCollections();

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2s for write to finish
        pollInterval: 100
      },
      ignored: [/(^|[\/\\])\../, /node_modules/, /\.git/]
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath));
  }

  private scheduleIngestion(filePath: string, collection: CollectionConfig): void {
    // Cancel existing timeout
    const existing = this.pendingChanges.get(filePath);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Schedule ingestion after debounce
    const timeout = setTimeout(async () => {
      this.pendingChanges.delete(filePath);
      await this.triggerIngestion(filePath, collection);
    }, this.debounceMs);

    this.pendingChanges.set(filePath, { filePath, collection: collection.name, timeout });
  }
}
```

**Collection Configuration** (`collections-config.json`):
```json
{
  "collections": [
    {
      "name": "documentation",
      "directory": "/data/docs/content",
      "autoUpdate": true,  // Enable auto-ingestion
      "embeddingModel": "mxbai-embed-large",
      "fileTypes": ["md", "mdx"],
      "recursive": true
    }
  ]
}
```

**Environment Configuration** (`.env`):
```bash
FILE_WATCHER_ENABLED=true
FILE_WATCHER_DEBOUNCE_MS=5000
```

### Workflow

1. **Developer edits** `docs/content/api/workspace.mdx`
2. **Chokidar detects** file change event
3. **File Watcher** identifies collection: "documentation"
4. **Debounce timer** starts (5s)
5. **Additional edits** within 5s reset the timer
6. **Timer elapses** → Ingestion triggered
7. **Ingestion Service** calls LlamaIndex API
8. **LlamaIndex** chunks document, generates embeddings
9. **Qdrant** stores updated vectors
10. **Cache invalidated** for collection stats
11. **RAG search** now includes updated content

### Consequences

**Positive**:
- ✅ **Zero manual intervention**: Documentation updates automatically searchable
- ✅ **Fast feedback loop**: Changes reflected in ~10 seconds
- ✅ **Batched ingestions**: Multiple rapid edits processed once
- ✅ **Selective monitoring**: Only collections with `autoUpdate=true`
- ✅ **Observable**: Status endpoint shows events processed, pending ingestions

**Negative**:
- ❌ **Service dependency**: Requires File Watcher service running
  - **Mitigation**: Health checks, automatic restart on failure
- ❌ **inotify limits**: Large directory trees may hit kernel limits
  - **Mitigation**: Increase `fs.inotify.max_user_watches` on Linux
- ❌ **Deletion handling**: File deletions not yet implemented
  - **Mitigation**: Logged as TODO, requires document ID tracking

**Trade-offs**:
- **Convenience vs Control**: Automatic ingestion reduces control but improves UX
- **Simplicity vs Reliability**: Debouncing adds complexity but prevents wasted work
- **Performance vs Freshness**: 5s debounce balances resource usage and timeliness

## Validation and Monitoring

**Status Endpoint**:
```bash
curl -s http://localhost:3403/health | jq '.services.fileWatcher'
{
  "status": "active",
  "enabled": true,
  "watchedDirectories": ["/data/docs/content"],
  "eventsProcessed": 42,
  "lastEvent": {
    "type": "change",
    "filePath": "/data/docs/content/api/workspace.mdx",
    "collection": "documentation",
    "timestamp": "2025-11-01T03:15:42.123Z"
  },
  "pendingIngestions": 1
}
```

**Logs** (JSON structured):
```json
{
  "level": "info",
  "message": "File change detected",
  "eventType": "change",
  "filePath": "/data/docs/content/api/workspace.mdx",
  "collection": "documentation"
}
{
  "level": "info",
  "message": "Auto-ingestion job created",
  "filePath": "/data/docs/content/api/workspace.mdx",
  "collection": "documentation",
  "jobId": "job_abc123"
}
```

## Compliance and Operability

**Resource Management**:
- **CPU**: < 1% under normal operation
- **Memory**: ~50MB (file watcher state)
- **inotify watches**: ~200 for 220-file documentation tree

**Failure Modes**:
1. **inotify limit exceeded** → Logs error, fallback to manual ingestion
2. **Ingestion API down** → Job fails, logged, retries on next change
3. **Service crash** → Systemd/Docker restarts, resumes watching

**Operational Commands**:
```bash
# Enable file watcher
export FILE_WATCHER_ENABLED=true

# Adjust debounce (faster feedback)
export FILE_WATCHER_DEBOUNCE_MS=2000

# Force process pending changes (testing)
curl -X POST http://localhost:3403/api/v1/admin/file-watcher/flush
```

## Future Evolution

**Short-term (1-3 months)**:
1. **Deletion handling** - Remove vectors when files deleted
2. **Batch ingestion** - Single job for multiple file changes
3. **Selective re-indexing** - Only re-chunk modified sections

**Long-term (6+ months)**:
1. **Incremental ingestion** - Differential updates instead of full re-index
2. **Smart scheduling** - Off-peak ingestion for large batches
3. **Webhook integration** - Trigger ingestion from CI/CD pipelines

## References

- [Chokidar Documentation](https://github.com/paulmillr/chokidar)
- [Linux inotify Limits](https://github.com/guard/listen/wiki/Increasing-the-amount-of-inotify-watchers)
- [Debouncing Strategies](https://css-tricks.com/debouncing-throttling-explained-examples/)
- Project implementation: `tools/rag-services/src/services/fileWatcher.ts`

---

**Related ADRs**:
- [ADR-001: Redis Caching Strategy](./ADR-001-redis-caching-strategy)
- ADR-003: Collection Stats Performance Optimization (planned)

**Change Log**:
- 2025-10-30: Initial decision - Chokidar file watcher with debouncing
- 2025-10-30: Implemented and deployed
- 2025-11-01: Added cache invalidation integration
