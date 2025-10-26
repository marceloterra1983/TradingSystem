# TP Capital API Specification

**Domain**: Backend API
**Status**: NEW
**Created**: 2025-10-26

---

## ADDED Requirements

### Requirement: OpenAPI Specification

The system SHALL provide a comprehensive OpenAPI 3.1.0 specification for the TP Capital API that documents all endpoints, request/response schemas, and error responses.

#### Scenario: OpenAPI spec file exists
- **WHEN** a developer accesses the documentation repository
- **THEN** the spec file `docs/static/specs/tp-capital.openapi.yaml` SHALL exist
- **AND** the spec SHALL validate without errors using `@redocly/cli lint`
- **AND** the spec SHALL NOT include `jsonSchemaDialect` field (to avoid warnings)

#### Scenario: All endpoints documented
- **WHEN** a developer views the OpenAPI specification
- **THEN** all 20+ endpoints SHALL be documented with:
  - Path, HTTP method, operation ID
  - Request parameters (path, query, body)
  - Response schemas (200, 201, 400, 404, 500, 503)
  - Examples for requests and responses
  - Tags for categorization

#### Scenario: Component schemas defined
- **WHEN** the spec references data types
- **THEN** component schemas SHALL be defined for:
  - `Signal` (id, asset, signal_type, entry_price, stop_loss, targets, etc.)
  - `TelegramBot` (id, username, token, bot_type, description, status)
  - `TelegramChannel` (id, label, channel_id, channel_type, description, status)
  - `ForwardedMessage` (source_channel_id, message_text, timestamp)
  - `HealthResponse` (status, timescale)
  - `LogEntry` (level, message, timestamp)
  - `ErrorResponse` (error, details)

#### Scenario: Rate limiting documented
- **WHEN** endpoints document response headers
- **THEN** rate limiting headers SHALL be documented:
  - `RateLimit-Limit`: Maximum requests per window
  - `RateLimit-Remaining`: Remaining requests
  - `RateLimit-Reset`: Window reset time
- **AND** global rate limit SHALL be documented (120 requests/minute)

---

### Requirement: MDX Documentation Page

The system SHALL provide comprehensive API documentation in MDX format at `docs/content/api/tp-capital-api.mdx` following the same structure as Workspace API and Documentation API pages.

#### Scenario: MDX file structure
- **WHEN** the MDX documentation page is created
- **THEN** it SHALL include YAML frontmatter with:
  - `title`: TP Capital API
  - `tags`: [api, tp-capital, trading, telegram]
  - `domain`: backend
  - `type`: api-reference
  - `summary`: REST API for TP Capital trading signals
  - `status`: active
- **AND** it SHALL use Docusaurus components (ApiEndpoint, CodeBlock, Tabs)

#### Scenario: Content sections
- **WHEN** developers read the documentation
- **THEN** the page SHALL include these sections:
  - **Overview**: Service description, architecture, base URLs
  - **Authentication & Rate Limiting**: Current state (no auth), rate limits, security recommendations
  - **Endpoint Categories**: Grouped by functionality (Signals, Bots, Channels, Monitoring, Config)
  - **Integration Examples**: TypeScript/JavaScript, curl, React hooks
  - **Error Handling**: Status codes, error format, retry strategies
  - **Migration Guide**: Legacy endpoint deprecation, migration paths

#### Scenario: Code examples functional
- **WHEN** examples are provided
- **THEN** they SHALL be tested against the live API
- **AND** they SHALL use realistic data from TP Capital
- **AND** they SHALL include error handling

---

### Requirement: Redocusaurus Integration

The system SHALL integrate the TP Capital OpenAPI specification with Redocusaurus to provide an interactive API explorer accessible at `/api/tp-capital`.

#### Scenario: Docusaurus configuration updated
- **WHEN** the Docusaurus config is modified
- **THEN** the `docs/docusaurus.config.js` file SHALL include a new preset entry:
  ```javascript
  {
    id: 'tp-capital-api',
    spec: 'static/specs/tp-capital.openapi.yaml',
    route: '/api/tp-capital',
  }
  ```
- **AND** the configuration SHALL follow the same pattern as existing API integrations

#### Scenario: Interactive docs accessible
- **WHEN** a user navigates to `/api/tp-capital` in the documentation site
- **THEN** the Redocusaurus interactive API explorer SHALL render
- **AND** all endpoints SHALL be browsable
- **AND** request/response schemas SHALL be displayed
- **AND** examples SHALL be visible

---

### Requirement: Dashboard API Viewer Integration

The system SHALL make the TP Capital OpenAPI specification available to the Dashboard API viewer for testing and exploration.

#### Scenario: Spec copied to frontend
- **WHEN** the OpenAPI spec is finalized
- **THEN** it SHALL be copied to `frontend/dashboard/public/specs/tp-capital.openapi.yaml`
- **AND** the Dashboard API viewer SHALL be able to load and display the spec

#### Scenario: Dashboard can select TP Capital spec
- **WHEN** a user opens the Dashboard API viewer
- **THEN** TP Capital SHALL appear in the spec selection dropdown
- **AND** selecting it SHALL render the full specification
- **AND** all endpoints SHALL be testable (if "Try it out" enabled)

---

### Requirement: Health & Monitoring Endpoints

The API documentation SHALL comprehensively document health check, metrics, and logging endpoints.

#### Scenario: Service information endpoint
- **WHEN** `GET /` is documented
- **THEN** it SHALL specify:
  - Response: `{ status: "ok", endpoints: [...], message: "..." }`
  - No authentication required
  - Always returns 200 OK

#### Scenario: Health check endpoint
- **WHEN** `GET /health` is documented
- **THEN** it SHALL specify:
  - Response: `{ status: "ok", timescale: boolean }`
  - timescale field indicates TimescaleDB connectivity
  - Returns 200 OK even if database is down (degraded state)

#### Scenario: Prometheus metrics
- **WHEN** `GET /metrics` is documented
- **THEN** it SHALL specify:
  - Content-Type: `text/plain; version=0.0.4`
  - Response format: Prometheus text exposition format
  - Includes process metrics and custom counters

#### Scenario: Application logs
- **WHEN** `GET /logs` is documented
- **THEN** it SHALL specify query parameters:
  - `limit` (number): Maximum logs to return
  - `level` (string): Filter by log level (info, warn, error)
- **AND** response format: `{ data: [{ level, message, timestamp, ... }] }`

---

### Requirement: Trading Signals Endpoints

The API documentation SHALL document trading signal retrieval and management endpoints with comprehensive filtering options.

#### Scenario: Fetch signals with filters
- **WHEN** `GET /signals` is documented
- **THEN** it SHALL specify query parameters:
  - `limit` (number): Max signals to return
  - `channel` (string): Filter by Telegram channel ID
  - `type` (string): Filter by signal type
  - `search` (string): Full-text search on asset and raw_message
  - `from` (string|number): Start timestamp (ISO 8601 or Unix)
  - `to` (string|number): End timestamp
- **AND** response format: `{ data: [Signal] }`

#### Scenario: Delete signal
- **WHEN** `DELETE /signals` is documented
- **THEN** it SHALL specify:
  - Request body: `{ ingestedAt: string }` (required)
  - Success response: `{ status: "ok" }`
  - Error 400 if ingestedAt missing
  - Error 500 if database operation fails

#### Scenario: Fetch forwarded messages
- **WHEN** `GET /forwarded-messages` is documented
- **THEN** it SHALL specify query parameters:
  - `limit` (number, default: 100)
  - `channelId` (number): Source channel ID filter
  - `from`, `to`: Timestamp filters
- **AND** response format: `{ data: [ForwardedMessage] }`

---

### Requirement: Telegram Bots CRUD

The API documentation SHALL document complete CRUD operations for Telegram bot management.

#### Scenario: List bots
- **WHEN** `GET /telegram/bots` is documented
- **THEN** it SHALL specify:
  - Response: `{ data: [TelegramBot], timestamp: string }`
  - Returns all bots including soft-deleted (status: 'deleted')

#### Scenario: Create bot
- **WHEN** `POST /telegram/bots` is documented
- **THEN** it SHALL specify:
  - Required fields: `username`, `token`
  - Optional fields: `bot_type`, `description`
  - Success response (200): `{ status: "ok", id: string }`
  - Error 400 if required fields missing

#### Scenario: Update bot
- **WHEN** `PUT /telegram/bots/:id` is documented
- **THEN** it SHALL specify:
  - Path parameter: `id` (string)
  - Request body: Partial TelegramBot (username, token, bot_type, description, status)
  - Success response: `{ status: "ok" }`
  - Error 500 if database operation fails

#### Scenario: Delete bot (soft delete)
- **WHEN** `DELETE /telegram/bots/:id` is documented
- **THEN** it SHALL specify:
  - Path parameter: `id` (string)
  - Performs soft delete (sets status to 'deleted')
  - Success response: `{ status: "ok" }`

---

### Requirement: Telegram Channels CRUD

The API documentation SHALL document complete CRUD operations for Telegram channel management.

#### Scenario: List channels
- **WHEN** `GET /telegram/channels` is documented
- **THEN** it SHALL specify:
  - Response: `{ data: [TelegramChannel], timestamp: string }`
  - Returns all channels including soft-deleted

#### Scenario: Create channel
- **WHEN** `POST /telegram/channels` is documented
- **THEN** it SHALL specify:
  - Required fields: `label`, `channel_id`
  - Optional fields: `channel_type` (source|destination), `description`
  - Auto-generated: `id` (channel-{timestamp}-{random})
  - Success response (200): `{ status: "ok", id: string }`
  - Error 400 if required fields missing

#### Scenario: Update channel
- **WHEN** `PUT /telegram/channels/:id` is documented
- **THEN** it SHALL specify:
  - Path parameter: `id` (string)
  - Request body: Partial TelegramChannel
  - Success response: `{ status: "ok" }`

#### Scenario: Delete channel (soft delete)
- **WHEN** `DELETE /telegram/channels/:id` is documented
- **THEN** it SHALL specify:
  - Path parameter: `id` (string)
  - Performs soft delete
  - Success response: `{ status: "ok" }`

---

### Requirement: Legacy Endpoints Deprecation

The API documentation SHALL clearly mark legacy telegram channel endpoints as deprecated and provide migration guidance.

#### Scenario: Legacy endpoints marked deprecated
- **WHEN** legacy endpoints are documented
- **THEN** `GET /telegram-channels`, `POST /telegram-channels`, `PUT /telegram-channels/:id` SHALL be marked with:
  - `deprecated: true` in OpenAPI spec
  - Warning: "Deprecated. Use /telegram/channels instead."
  - Link to migration guide in MDX documentation

#### Scenario: Migration guide provided
- **WHEN** the MDX documentation covers legacy endpoints
- **THEN** it SHALL include a migration section explaining:
  - Why endpoints were deprecated (naming consistency)
  - Mapping: `/telegram-channels` → `/telegram/channels`
  - No breaking changes (both work, but new one preferred)
  - Timeline for removal (if any)

---

### Requirement: Configuration Endpoints

The API documentation SHALL document configuration and management endpoints.

#### Scenario: Bot configuration info
- **WHEN** `GET /bots` is documented
- **THEN** it SHALL specify response format:
  ```json
  {
    "data": {
      "configured": boolean,
      "mode": "webhook" | "polling",
      "webhook": { "url": string, "hasSecretToken": boolean },
      "status": "running",
      "timestamp": string
    }
  }
  ```

#### Scenario: Channels with stats
- **WHEN** `GET /channels` is documented
- **THEN** it SHALL specify:
  - Fetches channels from TimescaleDB with message counts
  - Response: `{ data: [ChannelStats], source: "timescale", timestamp: string }`

#### Scenario: Configured channels
- **WHEN** `GET /config/channels` is documented
- **THEN** it SHALL specify:
  - Returns channels from environment configuration
  - Response: `{ data: [{ channelId: number, type: "source"|"destination" }], timestamp: string }`

#### Scenario: Reload channels
- **WHEN** `POST /reload-channels` is documented
- **THEN** it SHALL specify:
  - Reloads active channels from database and updates forwarder
  - Success response: `{ success: true, channels: [number] }`
  - Error 503 if forwarder not running

---

### Requirement: Error Response Consistency

The API documentation SHALL define consistent error response formats across all endpoints.

#### Scenario: Validation errors (400)
- **WHEN** a validation error occurs
- **THEN** the response SHALL be:
  - Status: 400 Bad Request
  - Body: `{ error: "Validation failed", details: [string] }`
  - Example: Missing required field

#### Scenario: Not found errors (404)
- **WHEN** a resource is not found
- **THEN** the response SHALL be:
  - Status: 404 Not Found
  - Body: `{ error: "Resource not found" }`
  - Example: Bot or channel ID doesn't exist

#### Scenario: Server errors (500)
- **WHEN** an internal error occurs
- **THEN** the response SHALL be:
  - Status: 500 Internal Server Error
  - Body: `{ error: "Failed to {operation}" }`
  - Logged with full stack trace

#### Scenario: Service unavailable (503)
- **WHEN** database connection fails
- **THEN** the response SHALL be:
  - Status: 503 Service Unavailable
  - Body: `{ error: "Database connection failed" }`
  - Example: TimescaleDB unreachable

---

### Requirement: Search and Discovery

The documentation SHALL be discoverable via Docusaurus search and navigation.

#### Scenario: Search indexing
- **WHEN** Docusaurus builds the documentation
- **THEN** TP Capital API endpoints SHALL be indexed for search
- **AND** searching for "signals", "telegram", "tp capital" SHALL return relevant results

#### Scenario: API catalog integration
- **WHEN** `docs/content/api/overview.mdx` is viewed
- **THEN** TP Capital API SHALL appear in the API catalog table
- **AND** it SHALL link to both:
  - `/api/tp-capital` (Redocusaurus interactive)
  - `/api/tp-capital-api` (MDX guide)

#### Scenario: Sidebar navigation
- **WHEN** the API section sidebar is rendered
- **THEN** "TP Capital API" SHALL appear alongside Workspace API and Documentation API
- **AND** clicking it SHALL navigate to the MDX documentation page
