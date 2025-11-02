# RAG Services API Documentation Index

**Last Updated:** 2025-11-01
**Version:** 1.0.0
**Status:** Production Documentation

## 📚 Quick Navigation

This index provides quick access to all RAG Services API documentation. All documents are located in `/tools/rag-services/`.

---

## 🎯 Start Here

### For New Developers
1. **[REST-API-DESIGN-COMPLETE.md](./REST-API-DESIGN-COMPLETE.md)** - Project overview and completion summary
2. **[API-DESIGN-V1.md](./API-DESIGN-V1.md)** - Complete API specification
3. **[OPENAPI-IMPLEMENTATION-NOTES.md](./OPENAPI-IMPLEMENTATION-NOTES.md)** - Implementation guidance

### For API Consumers
1. **[openapi.yaml](./openapi.yaml)** - OpenAPI 3.0 specification (import into Postman/Insomnia)
2. **Swagger UI:** http://localhost:3401/api-docs (when service is running)
3. **[API-DESIGN-V1.md](./API-DESIGN-V1.md)** - Client SDK examples (TypeScript, Python, cURL)

### For Security Reviewers
1. **[AUTH-DESIGN.md](./AUTH-DESIGN.md)** - Complete authentication/authorization design
2. **[CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md)** - Security audit findings

### For Project Managers
1. **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)** - 12-week roadmap with phases
2. **[REST-API-DESIGN-COMPLETE.md](./REST-API-DESIGN-COMPLETE.md)** - Current status and metrics

---

## 📖 Complete Documentation

### Core API Documentation

| Document | Description | Lines | Status |
|----------|-------------|-------|--------|
| **[API-DESIGN-V1.md](./API-DESIGN-V1.md)** | Complete REST API architecture, all 16 endpoints, resource models, examples | 500+ | ✅ Complete |
| **[openapi.yaml](./openapi.yaml)** | OpenAPI 3.0.3 specification, Swagger-compatible | 1000+ | ✅ Valid |
| **[OPENAPI-IMPLEMENTATION-NOTES.md](./OPENAPI-IMPLEMENTATION-NOTES.md)** | Implementation details, schemas, testing guide | 600+ | ✅ Complete |

### Security Documentation

| Document | Description | Lines | Status |
|----------|-------------|-------|--------|
| **[AUTH-DESIGN.md](./AUTH-DESIGN.md)** | JWT authentication, RBAC, middleware patterns, security best practices | 900+ | ✅ Complete |

### Planning Documentation

| Document | Description | Lines | Status |
|----------|-------------|-------|--------|
| **[API-VERSIONING-STRATEGY.md](./API-VERSIONING-STRATEGY.md)** | URL-based versioning, lifecycle, migration, deprecation | 700+ | ✅ Complete |
| **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)** | 5-phase roadmap, task breakdown, success metrics | 1000+ | ✅ Complete |

### Status Documentation

| Document | Description | Lines | Status |
|----------|-------------|-------|--------|
| **[REST-API-DESIGN-COMPLETE.md](./REST-API-DESIGN-COMPLETE.md)** | Project summary, deliverables, current status, next steps | 600+ | ✅ Complete |
| **[CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md)** | Comprehensive code quality review, issues, recommendations | 800+ | ✅ Complete |
| **[CODE-REVIEW-FIXES-2025-11-01.md](./CODE-REVIEW-FIXES-2025-11-01.md)** | Build and lint fixes applied, test results | 250+ | ✅ Complete |

---

## 🔍 Documentation by Topic

### API Endpoints

**Collections (6 endpoints):**
- GET /api/v1/rag/collections - List all
- POST /api/v1/rag/collections - Create new
- GET /api/v1/rag/collections/{name} - Get details
- PUT /api/v1/rag/collections/{name} - Update
- DELETE /api/v1/rag/collections/{name} - Delete
- GET /api/v1/rag/collections/{name}/stats - Get statistics

**Models (2 endpoints):**
- GET /api/v1/rag/models - List available models
- GET /api/v1/rag/models/{modelName} - Get model details

**Directories (3 endpoints):**
- GET /api/v1/rag/directories - List base directories
- GET /api/v1/rag/directories/browse - Browse contents
- GET /api/v1/rag/directories/validate - Validate path

**Admin (4 endpoints):**
- GET /api/v1/admin/cache/stats - Cache statistics
- DELETE /api/v1/admin/cache/{key} - Delete cache entry
- DELETE /api/v1/admin/cache - Clear cache pattern
- POST /api/v1/admin/cache/cleanup - Trigger cleanup

**Health (1 endpoint):**
- GET /api/v1/health - Health check

**Total: 16 endpoints**

### Authentication

**JWT Authentication:**
- Token format: `Authorization: Bearer <token>`
- Algorithm: HS256
- Expiration: 24 hours (configurable)
- Secret: `JWT_SECRET` environment variable

**Roles:**
- `admin` - Full access
- `user` - Read/write collections, trigger ingestion
- `viewer` - Read-only access

**Middleware:**
- `verifyJWT` - Require authentication
- `requireRole(['admin'])` - Enforce RBAC
- `optionalJWT` - Conditional authentication

**Documentation:** [AUTH-DESIGN.md](./AUTH-DESIGN.md)

### Error Handling

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [ /* optional */ ]
  }
}
```

**HTTP Status Codes:**
- 200 - OK
- 201 - Created
- 400 - Bad Request (validation error)
- 401 - Unauthorized (missing/invalid JWT)
- 403 - Forbidden (insufficient permissions)
- 404 - Not Found
- 409 - Conflict (resource exists)
- 500 - Internal Server Error

**Documentation:** [API-DESIGN-V1.md](./API-DESIGN-V1.md#error-handling)

### Versioning

**Current Version:** v1
**Base URL:** `/api/v1`
**Strategy:** URL-based versioning
**Migration:** 6-month deprecation notice
**Documentation:** [API-VERSIONING-STRATEGY.md](./API-VERSIONING-STRATEGY.md)

---

## 🚀 Quick Start Guides

### Running the API

```bash
# Install dependencies
cd /home/marce/Projetos/TradingSystem/tools/rag-services
npm install

# Start development server
npm run dev

# API available at:
# http://localhost:3401/api/v1
# http://localhost:3401/api-docs (Swagger UI)
```

### Testing the API

```bash
# List collections
curl http://localhost:3401/api/v1/rag/collections

# Get collection stats
curl http://localhost:3401/api/v1/rag/collections/docs_index_mxbai/stats

# Create collection (requires JWT)
curl -X POST http://localhost:3401/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "my-collection",
    "directory": "/data/docs",
    "embeddingModel": "mxbai-embed-large"
  }'
```

### Generating Client SDK

```bash
# TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o client/typescript

# Python
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o client/python
```

---

## 📊 Current Status

### Implementation Progress

| Category | Progress | Status |
|----------|----------|--------|
| Documentation | 100% | ✅ Complete |
| Core Endpoints | 100% | ✅ Implemented |
| Authentication | 100% | ✅ Implemented |
| Test Coverage | 12.55% | ⏳ In Progress |
| Production Readiness | 60% | ⏳ In Progress |

### Code Quality

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| TypeScript Compilation | ✅ Pass | ✅ Pass | ✅ Met |
| ESLint Errors | 0 | 0 | ✅ Met |
| ESLint Warnings | 75 | < 10 | ⏳ In Progress |
| Test Coverage | 12.55% | 70% | ⏳ In Progress |
| Tests Passing | 41/47 | 47/47 | ⏳ 87.2% |

### Next Milestones

**Phase 1 (Week 1) - Critical Fixes:**
- Fix floating promise errors
- Replace `any` types
- Implement rate limiting
- Add circuit breakers

**Phase 2 (Weeks 2-3) - Core Features:**
- Implement Search API
- Add job tracking
- Add pagination
- Increase test coverage to 70%

**Documentation:** [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)

---

## 🔧 Development Resources

### Code Structure

```
src/
├── routes/           # API route handlers
│   ├── collections.ts
│   ├── models.ts
│   ├── directories.ts
│   ├── admin.ts
│   └── docs.ts
├── middleware/       # Express middleware
│   ├── auth.ts
│   ├── validation.ts
│   ├── responseWrapper.ts
│   └── errorHandler.ts
├── services/         # Business logic
│   ├── ingestionService.ts
│   ├── collectionStatsService.ts
│   ├── cacheService.ts
│   └── fileWatcher.ts
├── schemas/          # Zod validation schemas
│   └── collection.ts
├── utils/            # Utilities
│   └── logger.ts
└── server.ts         # Express app
```

### Key Dependencies

```json
{
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2",
  "zod": "^3.22.4",
  "express-rate-limit": "^8.2.1",
  "opossum": "^5.0.1",
  "swagger-ui-express": "^5.0.0",
  "winston": "^3.11.0"
}
```

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

---

## 📝 Contributing

### Before Making Changes

1. Read [API-DESIGN-V1.md](./API-DESIGN-V1.md) for architecture
2. Review [AUTH-DESIGN.md](./AUTH-DESIGN.md) for security patterns
3. Check [API-VERSIONING-STRATEGY.md](./API-VERSIONING-STRATEGY.md) for breaking changes

### Adding New Endpoints

1. Update [openapi.yaml](./openapi.yaml) with new endpoint
2. Implement route handler in `src/routes/`
3. Add validation schema in `src/schemas/`
4. Write unit tests in `src/__tests__/`
5. Update [API-DESIGN-V1.md](./API-DESIGN-V1.md)
6. Test with Swagger UI

### Code Quality Standards

- TypeScript strict mode: ON
- Test coverage: > 70%
- ESLint errors: 0
- All tests passing
- OpenAPI spec validated

---

## 🔗 Related Documentation

### Project Documentation
- **[/tools/rag-services/package.json](./package.json)** - Dependencies and scripts
- **[/tools/rag-services/tsconfig.json](./tsconfig.json)** - TypeScript configuration
- **[/tools/rag-services/eslint.config.js](./eslint.config.js)** - ESLint rules
- **[/CLAUDE.md](/CLAUDE.md)** - Project overview and guidelines

### External Resources
- **OpenAPI Specification:** https://swagger.io/specification/
- **Express.js Documentation:** https://expressjs.com/
- **Zod Validation:** https://zod.dev/
- **JWT.io:** https://jwt.io/
- **Swagger UI:** https://swagger.io/tools/swagger-ui/

---

## 💡 Tips & Best Practices

### For API Developers

1. **Always version endpoints:** Use `/api/v1` prefix
2. **Validate input:** Use Zod schemas for all requests
3. **Use standard responses:** Follow `sendSuccess`/`sendError` patterns
4. **Protect sensitive endpoints:** Apply `verifyJWT` middleware
5. **Document everything:** Update OpenAPI spec with changes

### For API Consumers

1. **Pin API version:** Don't rely on "latest"
2. **Handle errors gracefully:** Check `success` field
3. **Respect rate limits:** Max 100 req/15min
4. **Use JWT properly:** Include `Bearer` prefix
5. **Read deprecation warnings:** Plan migrations early

### For Security Reviewers

1. **JWT secrets:** Never commit to git
2. **RBAC enforcement:** Verify on every protected endpoint
3. **Input validation:** All user input validated with Zod
4. **Path traversal:** Directory browsing restricted to allowed paths
5. **Rate limiting:** Prevent abuse and DoS

---

## 📞 Support

### Getting Help

1. **Documentation:** Start with this index
2. **Swagger UI:** http://localhost:3401/api-docs (interactive testing)
3. **Code Review:** [CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md)
4. **Implementation Plan:** [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)

### Reporting Issues

1. Check [CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md) for known issues
2. Review [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) for planned fixes
3. Create issue with:
   - API endpoint affected
   - Expected vs actual behavior
   - Request/response samples
   - Environment details

---

## ✅ Documentation Checklist

**Before Using This API:**
- [ ] Read [API-DESIGN-V1.md](./API-DESIGN-V1.md)
- [ ] Review [openapi.yaml](./openapi.yaml) in Swagger UI
- [ ] Understand [AUTH-DESIGN.md](./AUTH-DESIGN.md) authentication
- [ ] Check [API-VERSIONING-STRATEGY.md](./API-VERSIONING-STRATEGY.md)
- [ ] Test endpoints with cURL examples

**Before Contributing:**
- [ ] Read all documentation above
- [ ] Run tests locally (`npm run test`)
- [ ] Validate OpenAPI spec changes
- [ ] Update relevant documentation
- [ ] Add/update tests for changes

---

**Last Updated:** 2025-11-01
**Maintainer:** Development Team
**Version:** 1.0.0
**Status:** ✅ Production Documentation
