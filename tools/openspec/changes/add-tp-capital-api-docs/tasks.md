# Implementation Tasks: Add TP Capital API Documentation

**Change ID**: `add-tp-capital-api-docs`
**Estimated Time**: 4-6 hours
**Status**: Not Started

---

## 1. OpenAPI Specification Creation (2-3h)

### 1.1 Scaffold OpenAPI File
- [ ] 1.1.1 Create `docs/static/specs/tp-capital.openapi.yaml`
- [ ] 1.1.2 Add OpenAPI 3.1.0 header (no jsonSchemaDialect to avoid warnings)
- [ ] 1.1.3 Add info section (title, version, description, servers)
- [ ] 1.1.4 Add tags (Health, Signals, Bots, Channels, Config, Logs)

### 1.2 Define Component Schemas
- [ ] 1.2.1 Define `Signal` schema (id, asset, signal_type, entry_price, etc.)
- [ ] 1.2.2 Define `TelegramBot` schema (id, username, token, bot_type, etc.)
- [ ] 1.2.3 Define `TelegramChannel` schema (id, label, channel_id, channel_type, etc.)
- [ ] 1.2.4 Define `ForwardedMessage` schema
- [ ] 1.2.5 Define `HealthResponse` schema
- [ ] 1.2.6 Define `LogEntry` schema
- [ ] 1.2.7 Define `BotInfo` schema
- [ ] 1.2.8 Define `ChannelStats` schema
- [ ] 1.2.9 Define error response schemas (ValidationError, NotFound, ServerError)
- [ ] 1.2.10 Define common parameters (limit, from, to, channelId)

### 1.3 Document Health & Monitoring Endpoints
- [ ] 1.3.1 `GET /` - Service information
- [ ] 1.3.2 `GET /health` - Health check (include TimescaleDB status)
- [ ] 1.3.3 `GET /metrics` - Prometheus metrics (text/plain format)
- [ ] 1.3.4 `GET /logs` - Application logs (with level, limit filters)

### 1.4 Document Trading Signals Endpoints
- [ ] 1.4.1 `GET /signals` - Fetch signals (all query params: limit, channel, type, search, from, to)
- [ ] 1.4.2 `DELETE /signals` - Delete signal by ingestedAt
- [ ] 1.4.3 `GET /forwarded-messages` - Fetch forwarded messages

### 1.5 Document Telegram Bots CRUD
- [ ] 1.5.1 `GET /telegram/bots` - List all bots
- [ ] 1.5.2 `POST /telegram/bots` - Create bot (required: username, token)
- [ ] 1.5.3 `PUT /telegram/bots/:id` - Update bot
- [ ] 1.5.4 `DELETE /telegram/bots/:id` - Soft delete bot

### 1.6 Document Telegram Channels CRUD
- [ ] 1.6.1 `GET /telegram/channels` - List all channels
- [ ] 1.6.2 `POST /telegram/channels` - Create channel (required: label, channel_id)
- [ ] 1.6.3 `PUT /telegram/channels/:id` - Update channel
- [ ] 1.6.4 `DELETE /telegram/channels/:id` - Soft delete channel

### 1.7 Document Legacy Endpoints (mark deprecated)
- [ ] 1.7.1 `GET /telegram-channels` - Legacy channel list (deprecated: true)
- [ ] 1.7.2 `POST /telegram-channels` - Legacy create (deprecated: true)
- [ ] 1.7.3 `PUT /telegram-channels/:id` - Legacy update (deprecated: true)
- [ ] 1.7.4 Add deprecation notes with migration guide to `/telegram/channels`

### 1.8 Document Configuration Endpoints
- [ ] 1.8.1 `GET /bots` - Bot configuration info
- [ ] 1.8.2 `GET /channels` - Channels with stats from TimescaleDB
- [ ] 1.8.3 `GET /config/channels` - Configured source/destination channels
- [ ] 1.8.4 `POST /reload-channels` - Reload channels dynamically

### 1.9 Document Static Assets
- [ ] 1.9.1 `GET /telegram-images/{filename}` - Serve static images

### 1.10 Add Examples & Validation
- [ ] 1.10.1 Add request/response examples for all endpoints
- [ ] 1.10.2 Add rate limiting documentation (express-rate-limit)
- [ ] 1.10.3 Add error response examples (400, 404, 500, 503)
- [ ] 1.10.4 Validate spec: `npx @redocly/cli lint docs/static/specs/tp-capital.openapi.yaml`
- [ ] 1.10.5 Fix all linting errors/warnings
- [ ] 1.10.6 Test examples against live API (curl/Postman)

---

## 2. MDX Documentation Page (1-2h)

### 2.1 Create MDX File Structure
- [ ] 2.1.1 Create `docs/content/api/tp-capital-api.mdx`
- [ ] 2.1.2 Add frontmatter (title, tags, domain, type, summary, status)
- [ ] 2.1.3 Add imports (ApiEndpoint, CodeBlock, Tabs components)

### 2.2 Write Overview Section
- [ ] 2.2.1 Service description (TP Capital trading signals ingestion)
- [ ] 2.2.2 Architecture diagram or description (Telegram → Gateway → TP Capital → TimescaleDB)
- [ ] 2.2.3 Base URL and ports (http://localhost:3200, tradingsystem.local/api/tp-capital)
- [ ] 2.2.4 Link to Redocusaurus interactive docs

### 2.3 Write Authentication & Rate Limiting Section
- [ ] 2.3.1 Document current state (no authentication)
- [ ] 2.3.2 Document rate limiting (120 requests/minute per IP)
- [ ] 2.3.3 Security recommendations for production
- [ ] 2.3.4 Example rate limit headers (RateLimit-Limit, RateLimit-Remaining)

### 2.4 Write Endpoint Categories Section
- [ ] 2.4.1 **Signals Management** - GET /signals, DELETE /signals, GET /forwarded-messages
- [ ] 2.4.2 **Telegram Bots** - CRUD operations with examples
- [ ] 2.4.3 **Telegram Channels** - CRUD operations with examples
- [ ] 2.4.4 **Configuration** - GET /bots, /channels, /config/channels
- [ ] 2.4.5 **Monitoring** - GET /health, /metrics, /logs
- [ ] 2.4.6 **Management** - POST /reload-channels

### 2.5 Write Integration Examples
- [ ] 2.5.1 TypeScript/JavaScript fetch examples
- [ ] 2.5.2 curl examples for common operations
- [ ] 2.5.3 Dashboard integration example (React hooks)
- [ ] 2.5.4 Error handling patterns

### 2.6 Write Error Handling Guide
- [ ] 2.6.1 HTTP status codes used (200, 201, 400, 404, 500, 503)
- [ ] 2.6.2 Error response format (JSON with error field)
- [ ] 2.6.3 Common errors and solutions
- [ ] 2.6.4 Retry strategies for 503 (database connection failures)

### 2.7 Write Migration Guide
- [ ] 2.7.1 Legacy endpoints deprecation notice
- [ ] 2.7.2 Migration from /telegram-channels to /telegram/channels
- [ ] 2.7.3 Breaking changes (none, but document API evolution)

---

## 3. Docusaurus Integration (1h)

### 3.1 Configure Redocusaurus
- [ ] 3.1.1 Open `docs/docusaurus.config.js`
- [ ] 3.1.2 Add new preset entry in `redocusaurus.specs` array:
  ```javascript
  {
    id: 'tp-capital-api',
    spec: 'static/specs/tp-capital.openapi.yaml',
    route: '/api/tp-capital',
  }
  ```
- [ ] 3.1.3 Verify preset configuration syntax matches existing entries

### 3.2 Copy Spec to Frontend
- [ ] 3.2.1 Copy `docs/static/specs/tp-capital.openapi.yaml` to `frontend/dashboard/public/specs/`
- [ ] 3.2.2 Verify Dashboard API viewer can load the spec
- [ ] 3.2.3 Test rendering in Dashboard at `http://localhost:3103`

### 3.3 Update API Overview Page
- [ ] 3.3.1 Open `docs/content/api/overview.mdx`
- [ ] 3.3.2 Add TP Capital API to the API catalog table
- [ ] 3.3.3 Add link to `/api/tp-capital` (Redocusaurus)
- [ ] 3.3.4 Add link to `/api/tp-capital-api` (MDX guide)

### 3.4 Update Navigation
- [ ] 3.4.1 Verify `tp-capital-api.mdx` appears in sidebar
- [ ] 3.4.2 Check _category_.json ordering
- [ ] 3.4.3 Test navigation from API overview to TP Capital docs

---

## 4. Validation & Testing (30min)

### 4.1 OpenAPI Validation
- [ ] 4.1.1 Run `npx @redocly/cli lint docs/static/specs/tp-capital.openapi.yaml`
- [ ] 4.1.2 Verify no errors or warnings
- [ ] 4.1.3 Check no jsonSchemaDialect warnings
- [ ] 4.1.4 Validate against OpenAPI 3.1.0 spec

### 4.2 Live API Testing
- [ ] 4.2.1 Start TP Capital service: `cd apps/tp-capital && npm run dev`
- [ ] 4.2.2 Test GET /health - verify 200 OK
- [ ] 4.2.3 Test GET /signals - verify response format matches schema
- [ ] 4.2.4 Test GET /telegram/bots - verify response format
- [ ] 4.2.5 Test GET /telegram/channels - verify response format
- [ ] 4.2.6 Test all examples from OpenAPI spec
- [ ] 4.2.7 Fix any schema mismatches

### 4.3 Docusaurus Rendering
- [ ] 4.3.1 Start Docusaurus: `cd docs && npm run start`
- [ ] 4.3.2 Navigate to `/api/tp-capital` - verify Redocusaurus renders
- [ ] 4.3.3 Navigate to `/api/tp-capital-api` - verify MDX renders
- [ ] 4.3.4 Test all code examples render correctly
- [ ] 4.3.5 Test search finds TP Capital endpoints
- [ ] 4.3.6 Verify no console errors

### 4.4 Dashboard Integration
- [ ] 4.4.1 Start Dashboard: `cd frontend/dashboard && npm run dev`
- [ ] 4.4.2 Navigate to API Viewer page
- [ ] 4.4.3 Select TP Capital spec from dropdown
- [ ] 4.4.4 Verify spec renders correctly
- [ ] 4.4.5 Test "Try it out" functionality (if enabled)

### 4.5 Cross-Reference Validation
- [ ] 4.5.1 Compare spec with Workspace/Documentation API for consistency
- [ ] 4.5.2 Verify similar formatting and structure
- [ ] 4.5.3 Check component schemas follow same patterns
- [ ] 4.5.4 Verify MDX follows same template as workspace-api.mdx

---

## 5. Documentation Updates (30min)

### 5.1 Update Related Documentation
- [ ] 5.1.1 Update `TP-CAPITAL-SERVICE-GUIDE.md` with link to API docs
- [ ] 5.1.2 Update `apps/tp-capital/README.md` with API documentation link
- [ ] 5.1.3 Update `docs/content/apps/tp-capital/` with API reference
- [ ] 5.1.4 Update `QUICK-START.md` with TP Capital API info (if applicable)

### 5.2 Update Port Map
- [ ] 5.2.1 Verify `docs/content/tools/ports-services/` includes TP Capital (port 3200)
- [ ] 5.2.2 Document API endpoints availability

---

## 6. Optional Enhancements (Future)

### 6.1 TypeScript Type Generation (Optional - 1h)
- [ ] 6.1.1 Install `openapi-typescript`: `npm install -D openapi-typescript`
- [ ] 6.1.2 Generate types: `npx openapi-typescript docs/static/specs/tp-capital.openapi.yaml -o frontend/dashboard/src/types/tp-capital-api.ts`
- [ ] 6.1.3 Update Dashboard components to use generated types
- [ ] 6.1.4 Add npm script: `"generate:types": "openapi-typescript ..."`

### 6.2 API Client Generation (Optional - 1h)
- [ ] 6.2.1 Evaluate client generators (openapi-generator, orval)
- [ ] 6.2.2 Generate client SDK if beneficial
- [ ] 6.2.3 Update Dashboard to use generated client

### 6.3 CI Validation (Optional - 30min)
- [ ] 6.3.1 Add GitHub Action to validate OpenAPI spec on changes
- [ ] 6.3.2 Add spec linting to pre-commit hooks
- [ ] 6.3.3 Add contract testing (spec vs actual API)

---

## Completion Criteria

- [ ] **All endpoints documented**: 20+ endpoints in OpenAPI spec
- [ ] **Spec validates**: No errors with `@redocly/cli lint`
- [ ] **MDX page complete**: All sections written with examples
- [ ] **Redocusaurus works**: Interactive docs render at `/api/tp-capital`
- [ ] **Dashboard integration**: Spec available in API viewer
- [ ] **Examples tested**: All examples verified against live API
- [ ] **Consistent formatting**: Matches Workspace/Documentation API style
- [ ] **Search enabled**: Endpoints discoverable via Docusaurus search

---

## Notes

- Follow existing patterns from `workspace.openapi.yaml` and `documentation-api.openapi.yaml`
- Use same component schema naming conventions
- Keep examples realistic with actual data from TP Capital
- Document rate limiting headers in all endpoint responses
- Mark legacy endpoints as deprecated with clear migration path
- Test all changes locally before committing
