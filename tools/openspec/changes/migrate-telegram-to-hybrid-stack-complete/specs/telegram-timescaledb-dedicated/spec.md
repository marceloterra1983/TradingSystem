---
capability-id: telegram-timescaledb-dedicated
capability-type: NEW
status: proposal
domain: infrastructure
tags: [telegram, database, timescaledb, dedicated]
---

# Specification: Dedicated TimescaleDB for Telegram Gateway

## Purpose

Provide isolated TimescaleDB instance exclusively for Telegram Gateway data with dedicated resources, optimized configuration, and independent scaling capability.

---

## ADDED Requirements

### Requirement: Dedicated Database Container

The Telegram stack SHALL provision a dedicated TimescaleDB container isolated from other system databases to prevent resource contention and ensure predictable performance.

#### Scenario: Container initialization with dedicated resources

- **WHEN** the Telegram stack is started via `docker compose -f docker-compose.telegram.yml up -d`
- **THEN** a container named `telegram-timescale` SHALL be created
- **AND** the container SHALL have dedicated resource limits: 2 CPU cores and 2GB RAM
- **AND** the container SHALL expose port 5434 on the host
- **AND** the database name SHALL be `telegram_gateway`
- **AND** the container SHALL be isolated in the `telegram_backend` network

#### Scenario: Schema restoration from shared database

- **WHEN** migrating from shared TimescaleDB to dedicated instance
- **THEN** the system SHALL dump the `telegram_gateway` schema from shared database
- **AND** restore the schema to the new dedicated database
- **AND** verify row count matches between source and destination
- **AND** preserve all indexes, hypertables, and compression policies

---

### Requirement: Optimized TimescaleDB Configuration

The dedicated TimescaleDB instance SHALL use performance-tuned configuration optimized for Telegram's write-heavy workload (20-50 msg/s inserts, 12 polls/min reads).

#### Scenario: PostgreSQL configuration applied on startup

- **WHEN** the TimescaleDB container starts
- **THEN** it SHALL load custom `postgresql.conf` from volume mount
- **AND** apply settings: `shared_buffers=512MB`, `effective_cache_size=1536MB`
- **AND** apply settings: `work_mem=4MB`, `maintenance_work_mem=128MB`
- **AND** apply settings: `max_connections=100`, `checkpoint_completion_target=0.9`
- **AND** enable extensions: `timescaledb`, `pg_stat_statements`

#### Scenario: Connection limit enforcement

- **WHEN** client attempts to connect directly to TimescaleDB (bypassing PgBouncer)
- **THEN** connections SHALL be accepted up to `max_connections=100`
- **AND** excess connections SHALL receive "too many connections" error
- **AND** clients SHOULD use PgBouncer (port 6434) instead for pooling

---

### Requirement: Data Retention and Compression

The dedicated database SHALL enforce automatic data lifecycle policies to manage storage costs and optimize query performance.

#### Scenario: Compression policy applied to old data

- **WHEN** message data exceeds 14 days old
- **THEN** TimescaleDB SHALL automatically compress the chunk
- **AND** achieve 5:1 compression ratio (expected)
- **AND** compressed data SHALL remain queryable

#### Scenario: Retention policy deletes expired data

- **WHEN** message data exceeds 90 days old
- **THEN** TimescaleDB SHALL automatically drop the chunk
- **AND** free disk space
- **AND** log retention policy execution

---

### Requirement: Database Health Monitoring

The dedicated database SHALL expose health metrics and diagnostic views for operational monitoring.

#### Scenario: Health check endpoint responds

- **WHEN** health check executes `pg_isready -U telegram -d telegram_gateway`
- **THEN** the command SHALL return exit code 0 if database is healthy
- **AND** Docker health check SHALL reflect container status

#### Scenario: Performance monitoring views available

- **WHEN** operator queries monitoring views
- **THEN** views `message_processing_stats`, `channel_health_summary`, `performance_metrics_realtime` SHALL be available
- **AND** return real-time metrics (query latency, connection count, cache hit rate)

---

### Requirement: Backup and Disaster Recovery

The dedicated database SHALL support automated backups with point-in-time recovery capability.

#### Scenario: Daily backup execution

- **WHEN** backup script executes `pg_dump` on the dedicated database
- **THEN** a custom-format dump file SHALL be created
- **AND** the dump SHALL include all schemas, tables, indexes, and data
- **AND** the dump SHALL be stored with timestamp: `telegram_gateway_YYYYMMDD_HHMMSS.dump`

#### Scenario: Restore from backup

- **WHEN** disaster recovery is needed
- **THEN** operator runs `pg_restore` with the latest dump file
- **AND** database SHALL be restored to the state at backup time
- **AND** all hypertables, compression policies SHALL be restored
- **AND** validation confirms row count matches backup metadata

