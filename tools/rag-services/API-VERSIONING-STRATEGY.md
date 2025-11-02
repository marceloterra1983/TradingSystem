# API Versioning Strategy

**Date:** 2025-11-01
**Current Version:** v1
**Status:** 📝 PLANNED (v1 implemented)

## Summary

This document defines the API versioning strategy for RAG Services, ensuring backward compatibility, smooth migrations, and clear deprecation paths as the API evolves.

---

## Table of Contents

1. [Versioning Approach](#versioning-approach)
2. [Current Implementation (v1)](#current-implementation-v1)
3. [Version Lifecycle](#version-lifecycle)
4. [Breaking vs Non-Breaking Changes](#breaking-vs-non-breaking-changes)
5. [Migration Strategy](#migration-strategy)
6. [Client Compatibility](#client-compatibility)
7. [Future Versions](#future-versions)
8. [Best Practices](#best-practices)

---

## Versioning Approach

### Selected Method: URL-Based Versioning

**Format:** `/api/{version}/{resource}`

**Example:** `/api/v1/rag/collections`

### Why URL-Based?

✅ **Advantages:**
- Explicit and visible in all requests
- Easy to route and maintain
- Simple for clients to understand
- Standard REST practice
- Cache-friendly (different URLs = different resources)

❌ **Alternatives Considered:**

**Header-Based:** `Accept: application/vnd.rag-services.v1+json`
- More RESTful, but less visible
- Harder for developers to debug
- Cache configuration complexity

**Query Parameter:** `/api/rag/collections?version=1`
- Mixes versioning with resource filtering
- Easy to omit accidentally
- Not standard practice

**Subdomain:** `v1-api.example.com`
- Requires DNS and SSL management
- Complex deployment
- Overkill for our use case

---

## Current Implementation (v1)

### Base URL Structure

```
http://localhost:3401/api/v1
```

**Components:**
- Protocol: `http://` (localhost), `https://` (production)
- Host: `localhost:3401` (dev), `api.example.com` (prod)
- API Prefix: `/api`
- Version: `/v1`
- Namespace: `/rag` or `/admin`
- Resource: `/collections`, `/models`, etc.

### v1 Endpoints

```
Collections:
  GET    /api/v1/rag/collections
  POST   /api/v1/rag/collections
  GET    /api/v1/rag/collections/{name}
  PUT    /api/v1/rag/collections/{name}
  DELETE /api/v1/rag/collections/{name}
  GET    /api/v1/rag/collections/{name}/stats
  POST   /api/v1/rag/collections/{name}/ingest

Models:
  GET    /api/v1/rag/models
  GET    /api/v1/rag/models/{modelName}

Directories:
  GET    /api/v1/rag/directories
  GET    /api/v1/rag/directories/browse
  GET    /api/v1/rag/directories/validate

Admin:
  GET    /api/v1/admin/cache/stats
  DELETE /api/v1/admin/cache/{key}
  DELETE /api/v1/admin/cache
  POST   /api/v1/admin/cache/cleanup

Health:
  GET    /api/v1/health
```

### v1 Stability Promise

**Guarantees:**
- No breaking changes to existing endpoints
- New fields may be added (non-breaking)
- Deprecated fields will have 6-month warning
- Security fixes applied immediately

---

## Version Lifecycle

### Version States

| State       | Description                              | Support Level    |
|-------------|------------------------------------------|------------------|
| Current     | Latest stable version                    | Full support     |
| Maintained  | Previous version, still supported        | Bug fixes only   |
| Deprecated  | Scheduled for removal                    | Critical fixes   |
| Retired     | No longer available                      | None             |

### Lifecycle Timeline

```
v1 Release      v2 Release      v1 Deprecation   v1 Retirement
    |               |                |                 |
    |---6 months----|                |                 |
    |                                |                 |
    [v1 Current]   [v1 Maintained]   [v1 Deprecated]   [v1 Retired]
                    |---6 months-----|                 |
                    |                                  |
                    [v2 Current]     [v2 Maintained]   [v2 Current]
```

**Timeline:**
- **v1 Current:** Initial release → v2 release (minimum 6 months)
- **v1 Maintained:** v2 release → v1 deprecation (minimum 6 months)
- **v1 Deprecated:** Deprecation → retirement (6 months notice)

### Support Policy

**Current Version (v1):**
- New features added
- Bug fixes applied
- Security patches immediate
- Performance optimizations
- Documentation updates

**Maintained Version:**
- Critical bug fixes only
- Security patches immediate
- No new features
- Documentation frozen

**Deprecated Version:**
- Security patches only
- No bug fixes (unless critical)
- Removal warnings in responses
- Migration guide provided

---

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require New Version)

❌ **Examples:**

1. **Removing an endpoint**
   ```diff
   - DELETE /api/v1/rag/collections/{name}
   ```

2. **Removing a required field**
   ```diff
   {
     "name": "my-collection",
   - "embeddingModel": "mxbai-embed-large"
   }
   ```

3. **Changing field type**
   ```diff
   {
   -  "chunkSize": "512"  // string
   +  "chunkSize": 512     // number
   }
   ```

4. **Renaming a field**
   ```diff
   {
   -  "directory": "/data/docs"
   +  "sourceDirectory": "/data/docs"
   }
   ```

5. **Changing response structure**
   ```diff
   {
   -  "collections": [...]
   +  "data": { "collections": [...] }
   }
   ```

6. **Stricter validation**
   ```diff
   {
   -  "name": "My Collection"  // spaces allowed
   +  "name": "my-collection"  // only lowercase, hyphens
   }
   ```

### Non-Breaking Changes (Same Version)

✅ **Examples:**

1. **Adding new endpoint**
   ```diff
   + POST /api/v1/rag/collections/{name}/duplicate
   ```

2. **Adding optional field**
   ```diff
   {
     "name": "my-collection",
   + "tags": ["documentation"]  // optional
   }
   ```

3. **Adding new enum value**
   ```diff
   {
     "embeddingModel": "mxbai-embed-large"
   + | "nomic-embed-text"
   + | "all-minilm-l6-v2"  // new option
   }
   ```

4. **Loosening validation**
   ```diff
   {
   -  "chunkSize": 512      // only 512
   +  "chunkSize": 512-2048  // range allowed
   }
   ```

5. **Adding response field**
   ```diff
   {
     "name": "my-collection",
   + "createdAt": "2025-11-01T00:00:00Z"  // new field
   }
   ```

6. **Deprecation warnings**
   ```diff
   {
     "collections": [...],
   + "warnings": ["Field 'directory' deprecated, use 'sourceDirectory'"]
   }
   ```

---

## Migration Strategy

### Dual-Version Support

During migration period, both versions run simultaneously:

```
/api/v1/rag/collections  →  v1 handler
/api/v2/rag/collections  →  v2 handler
```

### Implementation Pattern

```typescript
// src/server.ts
import collectionsV1 from './routes/v1/collections';
import collectionsV2 from './routes/v2/collections';

app.use('/api/v1/rag/collections', collectionsV1);
app.use('/api/v2/rag/collections', collectionsV2);
```

### Deprecation Warnings

**Response Headers:**
```
Deprecation: true
Sunset: Sat, 01 May 2026 00:00:00 GMT
Link: </api/v2/rag/collections>; rel="successor-version"
```

**Response Body:**
```json
{
  "success": true,
  "data": { /* ... */ },
  "warnings": [
    {
      "code": "DEPRECATED_VERSION",
      "message": "API v1 is deprecated. Please migrate to v2 by 2026-05-01.",
      "url": "https://docs.example.com/api/migration/v1-to-v2"
    }
  ]
}
```

### Client Migration Checklist

**For API Consumers:**

1. **Read Migration Guide**
   - Review breaking changes
   - Understand new features
   - Check deprecations

2. **Update Base URL**
   ```diff
   - const baseURL = 'http://localhost:3401/api/v1';
   + const baseURL = 'http://localhost:3401/api/v2';
   ```

3. **Update Request/Response Models**
   - Adjust field names
   - Handle new required fields
   - Update validation schemas

4. **Test Against v2**
   - Run integration tests
   - Verify all endpoints
   - Check error handling

5. **Deploy Gradually**
   - Canary deployment (1%)
   - Monitor errors
   - Rollback plan ready
   - Full rollout

---

## Client Compatibility

### Backward Compatibility Guarantee

**Within v1:**
- All v1 clients will continue to work
- New fields ignored by old clients
- Optional parameters remain optional
- No surprise breaking changes

**Across Versions:**
- v1 clients can't call v2 endpoints
- v2 clients can call v1 (during migration)
- Clear error messages for version mismatches

### Version Negotiation

**Client Specifies Version:**
```bash
# Client explicitly requests v1
curl http://localhost:3401/api/v1/rag/collections
```

**Error for Invalid Version:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_VERSION",
    "message": "API version 'v3' is not supported",
    "supportedVersions": ["v1", "v2"]
  }
}
```

---

## Future Versions

### Planned Changes for v2

**Breaking Changes:**

1. **Standardize Response Wrapper**
   ```diff
   # v1: Inconsistent wrappers
   {
     "collections": [...]
   }

   # v2: Consistent wrapper
   {
     "success": true,
     "data": {
       "collections": [...]
     },
     "meta": {
       "timestamp": "2025-11-01T00:00:00Z",
       "version": "v2"
     }
   }
   ```

2. **Rename Collection Fields**
   ```diff
   # v1
   {
     "directory": "/data/docs"
   }

   # v2
   {
     "sourceDirectory": "/data/docs"
   }
   ```

3. **Pagination Required**
   ```diff
   # v1: All results returned
   GET /api/v1/rag/collections

   # v2: Pagination mandatory
   GET /api/v2/rag/collections?page=1&limit=20
   ```

4. **Search API**
   ```diff
   # v2: New endpoint
   + POST /api/v2/rag/search
   ```

5. **Job Tracking**
   ```diff
   # v2: Async ingestion with job ID
   + GET /api/v2/rag/jobs/{jobId}
   ```

**New Features:**

- GraphQL endpoint (`/api/v2/graphql`)
- Batch operations
- Webhooks for events
- Advanced filtering (OData-style)

### v3 Considerations

**Potential Changes:**
- gRPC support for high-performance clients
- Real-time subscriptions (WebSocket)
- Multi-tenancy support
- Fine-grained permissions

---

## Best Practices

### For API Developers

✅ **DO:**

1. **Version All Endpoints**
   ```typescript
   // Good
   app.use('/api/v1/rag/collections', collectionsRoutes);

   // Bad
   app.use('/api/collections', collectionsRoutes);
   ```

2. **Document Breaking Changes**
   ```markdown
   ## v2 Breaking Changes
   - Removed `directory` field (use `sourceDirectory`)
   - Pagination now required (add `page` and `limit`)
   ```

3. **Add Deprecation Warnings Early**
   ```typescript
   res.setHeader('Deprecation', 'true');
   res.setHeader('Sunset', 'Sat, 01 May 2026 00:00:00 GMT');
   ```

4. **Maintain Changelogs**
   ```markdown
   # v1.2.0 (2025-03-01)
   - Added: `tags` field to collections (optional)
   - Deprecated: `directory` field (use `sourceDirectory`)
   ```

5. **Test Across Versions**
   ```bash
   npm run test:v1
   npm run test:v2
   npm run test:migration
   ```

❌ **DON'T:**

1. **Mix Versions in Code**
   ```typescript
   // Bad: v1 and v2 logic intertwined
   if (req.url.includes('v2')) {
     // v2 logic
   } else {
     // v1 logic
   }
   ```

2. **Remove Versions Without Warning**
   ```typescript
   // Bad: Immediate removal
   - app.use('/api/v1/...', ...);
   ```

3. **Change Versions Retroactively**
   ```typescript
   // Bad: Modifying v1 with breaking changes
   // Create v2 instead
   ```

### For API Consumers

✅ **DO:**

1. **Always Specify Version**
   ```typescript
   const baseURL = 'http://localhost:3401/api/v1';
   ```

2. **Handle Deprecation Warnings**
   ```typescript
   if (response.headers.get('Deprecation')) {
     logger.warn('Using deprecated API version');
   }
   ```

3. **Read Migration Guides**
   - Check documentation before upgrading
   - Test in staging environment
   - Plan migration timeline

4. **Pin Versions in Production**
   ```json
   {
     "apiVersion": "v1",
     "upgradeScheduled": "2026-04-15"
   }
   ```

❌ **DON'T:**

1. **Use Latest Without Testing**
   ```typescript
   // Bad: Auto-upgrade to v2
   const baseURL = `http://localhost:3401/api/v${LATEST_VERSION}`;
   ```

2. **Ignore Deprecation Warnings**
   ```typescript
   // Bad: Suppressing warnings
   if (response.warnings) {
     // Do nothing
   }
   ```

---

## Implementation Checklist

### When Introducing v2

- [ ] Create `/src/routes/v2/` directory
- [ ] Copy v1 routes as starting point
- [ ] Apply breaking changes to v2 only
- [ ] Add deprecation warnings to v1
- [ ] Update OpenAPI spec with both versions
- [ ] Create migration guide document
- [ ] Test both versions simultaneously
- [ ] Update client SDKs
- [ ] Announce deprecation timeline
- [ ] Monitor adoption metrics

### When Deprecating v1

- [ ] Send email notification to users
- [ ] Add Sunset header to all v1 responses
- [ ] Update documentation homepage
- [ ] Create automated migration script (if possible)
- [ ] Provide support for migration issues
- [ ] Monitor error rates on v1
- [ ] Track v2 adoption percentage
- [ ] Set retirement date (6 months out)

### When Retiring v1

- [ ] Final email notification (30 days before)
- [ ] Return 410 Gone for all v1 endpoints
- [ ] Redirect v1 docs to v2
- [ ] Remove v1 routes from codebase
- [ ] Archive v1 documentation
- [ ] Update monitoring dashboards
- [ ] Remove v1 tests
- [ ] Celebrate successful migration 🎉

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Version Adoption**
   - Requests per version (v1, v2)
   - Unique clients per version
   - Adoption rate over time

2. **Migration Progress**
   - Clients still on deprecated version
   - Clients migrated to new version
   - Migration completion percentage

3. **Error Rates**
   - Errors per version
   - Version mismatch errors
   - Compatibility issues

4. **Performance**
   - Response time per version
   - Throughput per version
   - Resource usage per version

### Dashboards

**Grafana Queries:**

```sql
-- Request count by version
SELECT
  version,
  COUNT(*) as requests
FROM http_requests
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY version;

-- Migration progress
SELECT
  (COUNT(CASE WHEN version = 'v2' THEN 1 END) * 100.0 / COUNT(*)) as migration_percentage
FROM http_requests
WHERE timestamp > NOW() - INTERVAL '1 day';
```

---

## Related Documentation

- **[API-DESIGN-V1.md](./API-DESIGN-V1.md)** - Complete v1 API specification
- **[openapi.yaml](./openapi.yaml)** - OpenAPI spec (v1)
- **[OPENAPI-IMPLEMENTATION-NOTES.md](./OPENAPI-IMPLEMENTATION-NOTES.md)** - Implementation details
- **[CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md)** - Technical review

---

**Prepared by:** Claude Code
**Review Status:** Ready for team review
**Last Updated:** 2025-11-01
