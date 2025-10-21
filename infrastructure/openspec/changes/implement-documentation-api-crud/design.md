# Design Document: Documentation API Implementation

## Context

The Documentation API is currently a placeholder service with only health check and stub endpoints. This design implements a full-featured documentation management system based on industry patterns from GitBook, Notion, and FormKiQ.

**Stakeholders:**
- Development team (consuming documentation)
- Technical writers (creating/maintaining docs)
- Platform team (monitoring service health)

**Constraints:**
- Must use existing QuestDB instance (ports 9000/9009)
- Must integrate with existing React dashboard
- Must follow project conventions (Express, Pino logging, UTC timestamps)
- MVP timeline: 5-7 weeks (phased rollout)

## Goals / Non-Goals

**Goals:**
- Provide CRUD operations for documentation systems registry
- Enable Kanban-style idea management with drag-and-drop
- Support file attachments (images, PDFs, markdown) up to 10MB
- Aggregate statistics for documentation health metrics
- 80%+ test coverage with unit and integration tests

**Non-Goals:**
- Authentication/authorization (Phase 5 - future)
- Real-time collaboration (WebSocket updates)
- Full-text search across file contents (Phase 3 - limited to metadata)
- Version control for idea history (Phase 5 - future)
- AI-powered categorization (Phase 5 - future)

## Decisions

### 1. Database: QuestDB with Time-Series Optimizations

**Decision:** Use QuestDB with SYMBOL types for low-cardinality fields and timestamp-based partitioning.

**Rationale:**
- Already integrated in the project
- Excellent for audit logs and time-series analytics
- SYMBOL type provides indexed enum-like behavior
- Native timestamp partitioning for efficient queries

**Schema Design:**
- `documentation_systems` - PARTITION BY DAY (low write frequency)
- `documentation_ideas` - PARTITION BY MONTH (moderate write frequency)
- `documentation_files` - PARTITION BY MONTH (linked to ideas lifecycle)
- `documentation_audit_log` - PARTITION BY MONTH (append-only, high volume)

**Alternatives Considered:**
- PostgreSQL: More mature, but adds new dependency and doesn't leverage existing QuestDB
- MongoDB: Better for document storage, but no time-series optimization
- Local JSON files: Too simple, no concurrent access control

### 2. Architecture: Layered Service Pattern

**Decision:** Implement 3-layer architecture (API → Service → Repository)

**Layers:**
```
routes/         → API Layer (validation, HTTP)
services/       → Business Logic (orchestration)
repositories/   → Data Access (QuestDB queries)
```

**Rationale:**
- Clear separation of concerns
- Testable in isolation (mocking repositories)
- Matches existing project patterns (TP Capital API, B3 API)
- Easy to add caching or switch storage later

**Alternatives Considered:**
- Monolithic server.js: Too coupled, hard to test
- Full DDD with aggregates: Overkill for CRUD operations

### 3. File Storage: Local Filesystem (MVP) → S3-Compatible (Future)

**Decision:** Store files on local filesystem with metadata in QuestDB

**Storage Structure:**
```
uploads/
  ideas/
    {idea-id}/
      {timestamp}-{hash}-{original-name}
```

**Rationale:**
- Simple MVP implementation
- No cloud dependencies (project requirement)
- Metadata in QuestDB enables queries without filesystem scans
- Path abstraction allows future S3 migration

**Security:**
- Generate unique filenames (timestamp + random hash)
- Validate MIME types (whitelist: images, PDF, markdown)
- Size limit: 10MB per file
- Store outside webroot, serve via API

**Alternatives Considered:**
- Database BLOB storage: QuestDB not optimized for large binaries
- S3 immediately: Adds complexity, not needed for MVP scale

### 4. Frontend State: React Query for Server State

**Decision:** Use React Query for data fetching/caching, Zustand for UI-only state

**Rationale:**
- React Query handles loading/error/refetch automatically
- Built-in cache invalidation on mutations
- Optimistic updates for Kanban drag-and-drop
- Zustand already used in project for global state

**Data Flow:**
```
User Action → React Query Mutation → API Call → Cache Invalidation → Re-render
```

**Alternatives Considered:**
- Redux: Too boilerplate-heavy for this use case
- Pure useState: No caching, manual loading states

### 5. Kanban Implementation: @hello-pangea/dnd

**Decision:** Use @hello-pangea/dnd for drag-and-drop Kanban board

**Rationale:**
- Modern fork of react-beautiful-dnd (no longer maintained)
- Accessible (keyboard navigation, screen readers)
- Smooth animations out-of-the-box
- Handles edge cases (drop outside, multi-drag)

**Columns:**
- Backlog (default for new ideas)
- In Progress (actively being worked)
- Done (completed documentation)
- Cancelled (abandoned ideas)

**State Update:** Optimistic UI update → API call → rollback on error

**Alternatives Considered:**
- dnd-kit: More modern, but less mature ecosystem
- Custom drag handlers: High effort, accessibility concerns

## Risks / Trade-offs

### Risk: QuestDB Schema Changes

**Risk:** Modifying schema in production requires data migration
**Mitigation:**
- Start with comprehensive schema design
- Use `ALTER TABLE` for non-breaking additions
- Document migration scripts in `db/migrations/`

### Risk: File Storage Growth

**Risk:** Unlimited uploads could fill disk
**Mitigation:**
- 10MB per-file limit
- Manual cleanup tool for orphaned files
- Future: Add retention policies, migrate to S3

### Risk: Concurrent Idea Updates

**Risk:** Two users update same idea simultaneously
**Mitigation:**
- MVP: Last write wins (acceptable for documentation)
- Future: Add `updated_at` optimistic locking
- Add audit log to track all changes

### Trade-off: No Real-Time Collaboration

**Decision:** Poll-based updates (React Query auto-refetch every 60s)
**Rationale:** WebSocket adds complexity, documentation updates not time-critical
**Future:** Add WebSocket for live status indicators

## Migration Plan

### Phase 1: MVP - Core CRUD (Weeks 1-3)

1. **Week 1:** Database + backend foundation
   - Create QuestDB schemas
   - Implement SystemsService and IdeasService
   - Add validation middleware

2. **Week 2:** API endpoints
   - Systems CRUD (`/api/v1/systems/*`)
   - Ideas CRUD (`/api/v1/ideas/*`)
   - Statistics endpoint (`/api/v1/stats`)

3. **Week 3:** Frontend integration
   - DocumentationPage with tabs
   - SystemsGrid component
   - IdeasKanban with drag-and-drop

### Phase 2: File Uploads (Weeks 4-5)

- Multer middleware setup
- FilesService and endpoints
- FileBrowser component with upload UI

### Phase 3: Search & Analytics (Week 6)

- Full-text search on title/description
- Advanced filtering (multiple status/category)
- Enhanced statistics charts

### Phase 4: Polish & Testing (Week 7)

- Comprehensive test suite
- Error boundaries and loading states
- Responsive design for mobile
- Production deployment

### Rollback Plan

If critical issues arise:
1. Revert backend to placeholder version (server.js)
2. Remove `/documentation` route from frontend
3. Keep QuestDB tables (no data loss)
4. Fix issues in development branch
5. Redeploy when stable

## Open Questions

1. **Authentication:** Should API require auth tokens?
   - **Answer (MVP):** No authentication, trust internal network
   - **Future:** Add JWT when user service is available

2. **Idea Assignment:** Should we track assignees?
   - **Answer (MVP):** Optional `assigned_to` field (string)
   - **Future:** Link to user service when available

3. **Tags Schema:** Should tags be normalized (separate table)?
   - **Answer (MVP):** Store as comma-separated string in SYMBOL field
   - **Future:** Migrate to separate table if tag management needed

4. **File Thumbnails:** Should we generate thumbnails for images?
   - **Answer (MVP):** No, serve full images
   - **Future:** Add thumbnail generation with sharp library

## Success Metrics

**Adoption:**
- 10+ documentation ideas created in first month
- All documentation systems registered (Docusaurus, APIs)
- 3+ files uploaded per week

**Performance:**
- API response time p95 < 200ms
- Database query time p95 < 50ms
- Frontend page load < 2s

**Quality:**
- 80%+ test coverage
- Zero critical bugs in first 2 weeks
- API error rate < 1%
