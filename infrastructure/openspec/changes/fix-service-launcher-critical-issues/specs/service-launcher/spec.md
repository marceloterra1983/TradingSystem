## ADDED Requirements

### Requirement: Service Launcher Port Configuration
The Service Launcher SHALL use port 3500 as the default HTTP port, overridable via the SERVICE_LAUNCHER_PORT environment variable.

#### Scenario: Default port is 3500
- **WHEN** the service starts without SERVICE_LAUNCHER_PORT configured
- **THEN** the service listens on port 3500
- **AND** logs indicate "Service running on http://localhost:3500"

#### Scenario: Port override via environment variable
- **WHEN** SERVICE_LAUNCHER_PORT=4000 is set before starting the service
- **THEN** the service listens on port 4000
- **AND** logs indicate "Service running on http://localhost:4000"

#### Scenario: Backward compatibility with PORT variable
- **WHEN** PORT=9999 is set (legacy variable) and SERVICE_LAUNCHER_PORT is not set
- **THEN** the service SHALL use port 9999 for backward compatibility
- **AND** logs SHALL warn about deprecated PORT variable

### Requirement: Centralized Environment Configuration
The Service Launcher SHALL load environment variables from the project root `.env` file, not from a local `.env` file, following the TradingSystem project standard.

#### Scenario: Load .env from project root
- **WHEN** the service starts
- **THEN** dotenv SHALL be configured to load from `../../../.env` (project root)
- **AND** all SERVICE_LAUNCHER_* variables are correctly loaded from root .env

#### Scenario: Fallback to defaults when .env missing
- **WHEN** no .env file exists in project root
- **THEN** the service SHALL use hardcoded defaults
- **AND** logs SHALL indicate using default values

### Requirement: Service Port Configuration Accuracy
The Service Launcher SHALL monitor services using their correct, documented port numbers according to the TradingSystem project standards.

#### Scenario: Library API uses port 3200
- **WHEN** Service Launcher configures library-api health check
- **THEN** the default port SHALL be 3200 (not 3102)
- **AND** the health URL SHALL be http://localhost:3200/health

#### Scenario: Service Launcher self-reference uses port 3500
- **WHEN** Service Launcher includes itself in SERVICE_TARGETS
- **THEN** it SHALL use port 3500 (not 9999)
- **AND** the health URL SHALL be http://localhost:3500/health

### Requirement: Structured Logging
The Service Launcher SHALL implement structured logging using Pino with JSON output and configurable log levels.

#### Scenario: Info level logs
- **WHEN** a health check completes successfully
- **THEN** the service SHALL log with level 'info'
- **AND** include metadata: serviceName, port, latencyMs, status

#### Scenario: Error level logs with stack traces
- **WHEN** a health check fails with an error
- **THEN** the service SHALL log with level 'error'
- **AND** include metadata: error message, stack trace, healthUrl, timeoutMs

#### Scenario: Log level configuration
- **WHEN** SERVICE_LAUNCHER_LOG_LEVEL=debug is set
- **THEN** the service SHALL output debug-level logs
- **WHEN** SERVICE_LAUNCHER_LOG_LEVEL is not set
- **THEN** the service SHALL default to 'info' level

### Requirement: Health Check API
The Service Launcher SHALL expose GET /health endpoint returning 200 OK with service status information.

#### Scenario: Health endpoint returns ok
- **WHEN** GET /health is requested
- **THEN** the response SHALL have status code 200
- **AND** the response body SHALL be `{"status": "ok", "service": "service-launcher-api"}`

### Requirement: Aggregated Service Status API
The Service Launcher SHALL expose GET /api/status endpoint returning aggregated health information for all monitored services.

#### Scenario: All services operational
- **WHEN** GET /api/status is requested and all services return 200
- **THEN** overallStatus SHALL be "ok"
- **AND** degradedCount SHALL be 0
- **AND** downCount SHALL be 0
- **AND** averageLatencyMs SHALL be calculated from all response times

#### Scenario: Some services degraded
- **WHEN** GET /api/status is requested and some services return 5xx
- **THEN** overallStatus SHALL be "degraded"
- **AND** degradedCount SHALL equal number of non-ok services
- **AND** services array SHALL be sorted by severity (down > degraded > ok)

#### Scenario: Some services down
- **WHEN** GET /api/status is requested and some services timeout or connection fails
- **THEN** overallStatus SHALL be "down"
- **AND** downCount SHALL equal number of unreachable services
- **AND** service details SHALL include error information

### Requirement: Service Launch API
The Service Launcher SHALL expose POST /launch endpoint to start services in new terminal windows (Windows/Linux support).

#### Scenario: Launch service with valid parameters
- **WHEN** POST /launch is called with valid serviceName, workingDir, and command
- **THEN** the service SHALL be launched in a new terminal window
- **AND** response SHALL return 200 with success message

#### Scenario: Missing required fields
- **WHEN** POST /launch is called without required fields
- **THEN** the service SHALL return 400 Bad Request
- **AND** error message SHALL indicate missing fields

### Requirement: Environment Variables Documentation
All configurable environment variables SHALL be documented in the project's `.env.example` file with comments explaining their purpose and default values.

#### Scenario: SERVICE_LAUNCHER_PORT documented
- **WHEN** a developer reviews .env.example
- **THEN** SERVICE_LAUNCHER_PORT SHALL be listed with default value 3500
- **AND** comment SHALL explain this is the main service port

#### Scenario: Timeout configuration documented
- **WHEN** a developer reviews .env.example
- **THEN** SERVICE_LAUNCHER_TIMEOUT_MS SHALL be listed with default 2500
- **AND** comment SHALL explain this is the health check timeout

### Requirement: Test Coverage
The Service Launcher SHALL have automated tests covering at least 80% of the codebase, including endpoints, configuration, and integration scenarios.

#### Scenario: Endpoint tests exist
- **WHEN** npm test is executed
- **THEN** tests SHALL validate GET /health, GET /api/status, and POST /launch endpoints
- **AND** tests SHALL cover success, error, and validation cases

#### Scenario: Configuration tests exist
- **WHEN** npm test is executed
- **THEN** tests SHALL validate environment variable loading
- **AND** tests SHALL validate default values when env vars not set

#### Scenario: Integration tests exist
- **WHEN** npm test is executed
- **THEN** tests SHALL validate CORS configuration
- **AND** tests SHALL validate rate limiting
- **AND** tests SHALL validate Dashboard integration

### Requirement: Documentation Standards Compliance
The Service Launcher documentation SHALL follow the TradingSystem DOCUMENTATION-STANDARD.md, including YAML frontmatter and PlantUML diagrams for architecture.

#### Scenario: README has YAML frontmatter
- **WHEN** the README.md is viewed
- **THEN** it SHALL contain YAML frontmatter with required fields
- **AND** fields SHALL include: title, tags, domain, type, summary, status, last_review

#### Scenario: Architecture diagrams exist
- **WHEN** documentation is reviewed
- **THEN** PlantUML diagrams SHALL exist for service health flow
- **AND** PlantUML diagrams SHALL exist for launch sequence
- **AND** diagrams SHALL render correctly in Docusaurus

### Requirement: Consistent Naming
All references to the service SHALL use "Launcher" (not "Laucher") consistently across code, documentation, logs, and configuration.

#### Scenario: Code uses correct spelling
- **WHEN** source code is searched for "laucher" (case-insensitive)
- **THEN** zero occurrences SHALL be found in .js files
- **AND** zero occurrences SHALL be found in .sh/.ps1 files

#### Scenario: Documentation uses correct spelling
- **WHEN** documentation is searched for "laucher" (case-insensitive)
- **THEN** zero occurrences SHALL be found in .md files under frontend/apps/service-launcher/
- **AND** zero occurrences SHALL be found in .md files under docs/context/backend/api/service-launcher/

#### Scenario: Logs use correct spelling
- **WHEN** the service is running and logs are emitted
- **THEN** all log messages SHALL use "Launcher" in service name references
- **AND** no logs SHALL contain "Laucher"

### Requirement: CORS Configuration
The Service Launcher SHALL allow cross-origin requests from configured Dashboard origins to enable frontend integration.

#### Scenario: Dashboard origin allowed
- **WHEN** a request is made from http://localhost:3103 (Dashboard)
- **THEN** the response SHALL include appropriate CORS headers
- **AND** access-control-allow-origin header SHALL match the Dashboard origin

#### Scenario: Docusaurus origin allowed
- **WHEN** a request is made from http://localhost:3004 (Docusaurus)
- **THEN** the response SHALL include appropriate CORS headers

### Requirement: Rate Limiting
The Service Launcher SHALL implement rate limiting to prevent abuse, with configurable window and maximum requests.

#### Scenario: Default rate limiting
- **WHEN** rate limiting is configured with defaults
- **THEN** maximum 200 requests per 60-second window SHALL be allowed
- **WHEN** limit is exceeded
- **THEN** HTTP 429 Too Many Requests SHALL be returned

#### Scenario: Rate limiting configuration
- **WHEN** RATE_LIMIT_MAX=100 and RATE_LIMIT_WINDOW_MS=30000 are set
- **THEN** maximum 100 requests per 30-second window SHALL be allowed













