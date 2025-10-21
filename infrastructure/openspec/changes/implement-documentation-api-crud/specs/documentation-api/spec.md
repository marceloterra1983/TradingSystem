# Documentation API Specification

## ADDED Requirements

### Requirement: Manage Documentation Systems Registry

The system SHALL provide CRUD operations for managing documentation systems (Docusaurus, APIs, tools) with status tracking.

#### Scenario: List all documentation systems

- **WHEN** client sends `GET /api/v1/systems`
- **THEN** return JSON array of systems with id, name, description, status, port, url, icon, color, tags, timestamps

#### Scenario: Create new documentation system

- **WHEN** client sends `POST /api/v1/systems` with valid system data
- **THEN** insert record into `documentation_systems` table
- **AND** return created system with HTTP 201
- **AND** generate unique UUID for system id

#### Scenario: Update documentation system

- **WHEN** client sends `PUT /api/v1/systems/:id` with partial update data
- **THEN** update matching record in `documentation_systems` table
- **AND** set `updated_at` to current timestamp
- **AND** return updated system

#### Scenario: Delete documentation system

- **WHEN** client sends `DELETE /api/v1/systems/:id`
- **THEN** remove record from `documentation_systems` table
- **AND** return success message with HTTP 200

#### Scenario: Reject invalid system data

- **WHEN** client sends system without required field (name or port)
- **THEN** return validation error with HTTP 400
- **AND** include specific field errors in response

### Requirement: Manage Documentation Ideas

The system SHALL provide CRUD operations for documentation improvement ideas with Kanban workflow (backlog, in_progress, done, cancelled).

#### Scenario: List ideas with filters

- **WHEN** client sends `GET /api/v1/ideas?status=backlog&category=guide&priority=high`
- **THEN** return filtered ideas matching all criteria
- **AND** support pagination with `limit` and `offset` parameters
- **AND** default limit to 20 items, max 100 per request

#### Scenario: Create new idea

- **WHEN** client sends `POST /api/v1/ideas` with valid idea data
- **THEN** insert record into `documentation_ideas` table
- **AND** set default status to "backlog"
- **AND** generate unique UUID for idea id
- **AND** return created idea with HTTP 201

#### Scenario: Update idea status via Kanban

- **WHEN** client sends `PUT /api/v1/ideas/:id` with `status: 'in_progress'`
- **THEN** update status field in `documentation_ideas` table
- **AND** set `updated_at` to current timestamp
- **AND** set `completed_at` if status changed to "done"
- **AND** return updated idea

#### Scenario: Delete idea

- **WHEN** client sends `DELETE /api/v1/ideas/:id`
- **THEN** remove record from `documentation_ideas` table
- **AND** cascade delete associated files
- **AND** return success message with HTTP 200

#### Scenario: Search ideas by text

- **WHEN** client sends `GET /api/v1/ideas?search=authentication`
- **THEN** return ideas where title or description contains search term
- **AND** perform case-insensitive matching

### Requirement: Handle File Attachments

The system SHALL support file uploads for documentation artifacts with metadata storage and filesystem persistence.

#### Scenario: Upload file to idea

- **WHEN** client sends `POST /api/v1/ideas/:id/files` with multipart/form-data
- **THEN** validate file MIME type is in whitelist (image/*, application/pdf, text/markdown)
- **AND** validate file size is under 10MB limit
- **AND** generate unique filename with timestamp and hash
- **AND** save file to `uploads/ideas/{idea-id}/` directory
- **AND** insert metadata into `documentation_files` table
- **AND** return file metadata with HTTP 201

#### Scenario: List files for idea

- **WHEN** client sends `GET /api/v1/ideas/:id/files`
- **THEN** return array of file metadata (id, originalName, size, mimeType, uploadedAt, url)

#### Scenario: Download file

- **WHEN** client sends `GET /api/v1/files/:id`
- **THEN** retrieve file metadata from `documentation_files` table
- **AND** stream file from filesystem with correct MIME type
- **AND** set Content-Disposition header for download

#### Scenario: Delete file

- **WHEN** client sends `DELETE /api/v1/files/:id`
- **THEN** remove file from filesystem
- **AND** remove metadata from `documentation_files` table
- **AND** return success message with HTTP 200

#### Scenario: Reject oversized file upload

- **WHEN** client uploads file larger than 10MB
- **THEN** return error with HTTP 413 (Payload Too Large)
- **AND** do not save file to filesystem

#### Scenario: Reject invalid file type

- **WHEN** client uploads file with disallowed MIME type
- **THEN** return error with HTTP 400
- **AND** include allowed MIME types in error message

### Requirement: Provide Statistics Dashboard

The system SHALL aggregate documentation metrics by status, category, and priority for analytics visualization.

#### Scenario: Get comprehensive statistics

- **WHEN** client sends `GET /api/v1/stats`
- **THEN** return aggregated metrics including:
  - `ideas.total` - total count of ideas
  - `ideas.byStatus` - count grouped by status (backlog, in_progress, done, cancelled)
  - `ideas.byCategory` - count grouped by category (api, guide, reference, tutorial)
  - `ideas.byPriority` - count grouped by priority (low, medium, high, critical)
  - `systems.total` - total count of systems
  - `systems.byStatus` - count grouped by status (online, offline, degraded)
  - `files.total` - total count of files
  - `files.totalSize` - sum of file sizes in bytes
  - `files.byMimeType` - count grouped by MIME type

#### Scenario: Cache statistics results

- **WHEN** statistics are calculated
- **THEN** cache result for 5 minutes
- **AND** serve cached result for subsequent requests within window
- **AND** recalculate after cache expiration

### Requirement: Validate All Inputs

The system SHALL validate all request inputs using express-validator middleware before processing.

#### Scenario: Validate system creation fields

- **WHEN** validating system creation
- **THEN** require `name` field (non-empty string)
- **AND** require `port` field (integer between 1-65535)
- **AND** validate `status` is one of: online, offline, degraded
- **AND** validate `url` is valid URL format if provided

#### Scenario: Validate idea creation fields

- **WHEN** validating idea creation
- **THEN** require `title` field (non-empty string, max 200 chars)
- **AND** require `category` field (one of: api, guide, reference, tutorial)
- **AND** validate `priority` is one of: low, medium, high, critical
- **AND** validate `status` is one of: backlog, in_progress, done, cancelled
- **AND** validate `tags` are comma-separated strings if provided

#### Scenario: Return validation errors with details

- **WHEN** validation fails for any field
- **THEN** return HTTP 400 with JSON error response
- **AND** include array of errors with field name, message, and location

### Requirement: Log All Operations

The system SHALL log all API requests and responses using Pino structured logger with appropriate log levels.

#### Scenario: Log successful requests

- **WHEN** request completes successfully
- **THEN** log at INFO level with method, URL, status code, duration

#### Scenario: Log validation failures

- **WHEN** request fails validation
- **THEN** log at WARN level with validation errors

#### Scenario: Log server errors

- **WHEN** unhandled exception occurs
- **THEN** log at ERROR level with full error stack
- **AND** include request context (method, URL, body)

### Requirement: Audit All Mutations

The system SHALL record all create, update, delete operations in `documentation_audit_log` table for compliance and debugging.

#### Scenario: Audit system creation

- **WHEN** new system is created via `POST /api/v1/systems`
- **THEN** insert audit record with entity_type='system', action='create', entity_id, user_id, changes JSON, timestamp

#### Scenario: Audit idea status change

- **WHEN** idea status is updated via `PUT /api/v1/ideas/:id`
- **THEN** insert audit record capturing old and new status values in changes JSON

#### Scenario: Audit file deletion

- **WHEN** file is deleted via `DELETE /api/v1/files/:id`
- **THEN** insert audit record with entity_type='file', action='delete', capturing file metadata before deletion

### Requirement: Enforce Rate Limiting

The system SHALL limit API requests to 100 requests per 15 minutes per IP address to prevent abuse.

#### Scenario: Allow requests within limit

- **WHEN** client makes 99th request within 15-minute window
- **THEN** process request normally

#### Scenario: Block requests exceeding limit

- **WHEN** client exceeds 100 requests within 15-minute window
- **THEN** return HTTP 429 (Too Many Requests)
- **AND** include Retry-After header with seconds until reset

#### Scenario: Exempt health check from rate limit

- **WHEN** client sends `GET /health`
- **THEN** do not count request toward rate limit

### Requirement: Support CORS for Dashboard Integration

The system SHALL configure CORS middleware to allow requests from frontend dashboard origin.

#### Scenario: Allow dashboard requests

- **WHEN** request includes Origin header matching `CORS_ORIGIN` env variable
- **THEN** include Access-Control-Allow-Origin header in response
- **AND** allow methods: GET, POST, PUT, DELETE
- **AND** allow headers: Content-Type, Authorization

#### Scenario: Reject unauthorized origins

- **WHEN** request includes Origin header not in whitelist
- **THEN** omit Access-Control-Allow-Origin header
- **AND** browser will block response

### Requirement: Provide OpenAPI Documentation

The system SHALL serve interactive API documentation at `/api-docs` endpoint using Swagger UI.

#### Scenario: Access API documentation

- **WHEN** user navigates to `http://localhost:3400/api-docs`
- **THEN** render Swagger UI with all endpoints, schemas, and examples
- **AND** enable "Try it out" functionality for testing requests

#### Scenario: Export OpenAPI JSON

- **WHEN** client sends `GET /api-docs.json`
- **THEN** return complete OpenAPI 3.0.3 specification as JSON
