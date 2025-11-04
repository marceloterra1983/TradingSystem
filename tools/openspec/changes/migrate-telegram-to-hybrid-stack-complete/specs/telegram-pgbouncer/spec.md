---
capability-id: telegram-pgbouncer
capability-type: NEW
status: proposal
domain: infrastructure
tags: [telegram, database, connection-pooling, pgbouncer, performance]
---

# Specification: PgBouncer Connection Pooling for Telegram

## Purpose

Provide connection pooling layer between Telegram services (Gateway, TP Capital, Gateway API) and TimescaleDB to reduce connection overhead, improve performance, and enable higher concurrency.

---

## ADDED Requirements

### Requirement: Transaction-Mode Connection Pooling

The system SHALL deploy PgBouncer in transaction mode to pool database connections from multiple Telegram services while maintaining transaction isolation.

#### Scenario: Connection pooling initialization

- **WHEN** PgBouncer container starts
- **THEN** it SHALL connect to `telegram-timescaledb:5432`
- **AND** create connection pool with `default_pool_size=20`
- **AND** set `pool_mode=transaction` (server released after transaction commit)
- **AND** accept client connections on port 5432 (exposed as host port 6434)
- **AND** authenticate using credentials from `userlist.txt`

#### Scenario: Multiple clients share connection pool

- **GIVEN** MTProto Gateway (native), TP Capital Worker, and Gateway API are running
- **WHEN** all three services connect to PgBouncer (localhost:6434)
- **THEN** PgBouncer SHALL maintain maximum 20 server connections to TimescaleDB
- **AND** allow up to 100 client connections (`max_client_conn=100`)
- **AND** reuse server connections across clients (transaction pooling)
- **AND** reduce total database connections by 67% (from 60 to 20)

---

### Requirement: Connection Lifecycle Management

PgBouncer SHALL manage server connection lifecycle with configurable timeouts to optimize resource usage.

#### Scenario: Idle server connection timeout

- **WHEN** a server connection is idle for `server_idle_timeout=600` seconds (10 min)
- **THEN** PgBouncer SHALL close the connection
- **AND** release resources on the TimescaleDB side

#### Scenario: Server connection lifetime limit

- **WHEN** a server connection has been open for `server_lifetime=3600` seconds (1 hour)
- **THEN** PgBouncer SHALL close the connection even if active
- **AND** open a fresh connection for the next transaction
- **AND** prevent long-lived connection issues (memory leaks, state corruption)

---

### Requirement: Performance Optimization

PgBouncer SHALL reduce connection overhead and improve query latency through connection reuse.

#### Scenario: Connection overhead reduction

- **GIVEN** direct TimescaleDB connection has 50ms connection overhead
- **WHEN** client connects to PgBouncer (pooled connection)
- **THEN** connection overhead SHALL be reduced to <5ms
- **AND** total query latency SHALL decrease by ~45ms

#### Scenario: High concurrency support

- **WHEN** 100 concurrent clients connect to PgBouncer
- **THEN** PgBouncer SHALL queue clients waiting for server connections
- **AND** serve clients within `query_wait_timeout=120` seconds
- **AND** log warning if clients wait >10 seconds

---

### Requirement: Monitoring and Diagnostics

PgBouncer SHALL expose connection pool statistics via administrative interface for operational visibility.

#### Scenario: Query pool statistics

- **WHEN** operator executes `SHOW POOLS` via pgbouncer admin
- **THEN** PgBouncer SHALL return current pool stats:
  - Total client connections
  - Active server connections
  - Idle server connections
  - Waiting clients count
- **AND** stats SHALL update every `stats_period=60` seconds

#### Scenario: Health check validation

- **WHEN** Docker health check executes `psql -h localhost -U telegram -d pgbouncer -c "SHOW POOLS"`
- **THEN** the command SHALL return exit code 0 if PgBouncer is healthy
- **AND** Docker container status SHALL reflect "healthy"

---

### Requirement: Graceful Degradation

PgBouncer SHALL handle database unavailability gracefully without failing all clients.

#### Scenario: TimescaleDB temporarily unavailable

- **WHEN** TimescaleDB container stops or becomes unhealthy
- **THEN** PgBouncer SHALL return connection errors to clients
- **AND** retry server connection every `server_login_retry=15` seconds
- **AND** log connection failures
- **AND** automatically resume when TimescaleDB recovers

#### Scenario: Connection pool saturation

- **WHEN** all server connections are in use and client queue reaches 10
- **THEN** PgBouncer SHALL log warning "connection pool saturated"
- **AND** Prometheus alert `DatabaseConnectionPoolExhausted` SHALL fire
- **AND** clients SHALL wait up to `query_wait_timeout=120` seconds before timeout

