---
capability-id: telegram-gateway-mtproto
capability-type: EXISTING
status: proposal
domain: backend
tags: [telegram, mtproto, gateway, native-service]
---

# Specification: Telegram Gateway MTProto Service (Modified for Hybrid Architecture)

## MODIFIED Requirements

### Requirement: Native Service Deployment

The Telegram Gateway MTProto service SHALL run as a native systemd service on the host system (previously containerized).

#### Scenario: systemd service installation

- **WHEN** operator installs Telegram Gateway
- **THEN** a systemd service file SHALL be created at `/etc/systemd/system/telegram-gateway.service`
- **AND** service SHALL be configured with `Type=simple`
- **AND** working directory SHALL be `/home/marce/Projetos/TradingSystem/apps/telegram-gateway`
- **AND** ExecStart SHALL point to `node src/index.js`
- **AND** service SHALL run as user `marce` (non-root)

#### Scenario: Automatic restart on failure

- **WHEN** MTProto Gateway process crashes or exits with error
- **THEN** systemd SHALL automatically restart the service
- **AND** apply restart policy: `on-failure` with `RestartSec=10s`
- **AND** limit restart attempts: `StartLimitBurst=5` within `StartLimitIntervalSec=60s`
- **AND** log restart events to journald

#### Scenario: Service status check

- **WHEN** operator runs `systemctl status telegram-gateway`
- **THEN** systemd SHALL report service state (active, inactive, failed)
- **AND** show uptime duration
- **AND** display last 10 log lines from journald

---

### Requirement: Session File Security

The Gateway SHALL store Telegram session files on native filesystem with strict permissions (previously in Docker volume).

#### Scenario: Session storage location

- **WHEN** Gateway authenticates with Telegram for first time
- **THEN** session string SHALL be saved to `/opt/telegram-gateway/.session/telegram.session`
- **AND** file permissions SHALL be set to 0600 (owner read/write only)
- **AND** file owner SHALL be `marce:marce`
- **AND** directory permissions SHALL be 0700

#### Scenario: Session file validation on startup

- **WHEN** Gateway service starts
- **THEN** it SHALL check if session file exists at configured path
- **AND** validate file permissions are 0600
- **AND** log warning if permissions are too permissive
- **AND** exit with error if session file is missing (first-time setup required)

---

### Requirement: Multi-Tier Data Persistence

The Gateway SHALL write received messages to three storage tiers: Redis cache, RabbitMQ queue, and TimescaleDB (previously database-only).

#### Scenario: Message reception with multi-tier write

- **WHEN** Gateway receives new Telegram message
- **THEN** it SHALL perform writes in sequence:
  1. Write to Redis cache (<5ms) - hot data
  2. Publish to RabbitMQ queue (<5ms) - event bus (optional)
  3. Write to TimescaleDB via PgBouncer (<100ms, async) - persistent storage
- **AND** total write latency SHALL be <15ms (Redis + Queue, DB async)
- **AND** failure in Redis or RabbitMQ SHALL NOT block TimescaleDB write

#### Scenario: Graceful degradation on cache unavailable

- **WHEN** Redis is unavailable or returns error
- **THEN** Gateway SHALL log warning "Redis cache unavailable, falling back to database-only"
- **AND** continue writing to TimescaleDB via PgBouncer
- **AND** increment metric `redis_failures_total`
- **AND** system SHALL function normally (with degraded performance)

---

### Requirement: Database Connection via PgBouncer

The Gateway SHALL connect to TimescaleDB exclusively through PgBouncer connection pooler (previously direct connection).

#### Scenario: Database connection pooling

- **WHEN** Gateway initializes database client
- **THEN** it SHALL connect to `localhost:6434` (PgBouncer port)
- **AND** use transaction pooling mode
- **AND** connection overhead SHALL be <5ms (vs 50ms direct connection)
- **AND** share connection pool with TP Capital and Gateway API

#### Scenario: Connection pool monitoring

- **WHEN** Gateway queries database
- **THEN** PgBouncer SHALL allocate connection from pool
- **AND** release connection after transaction completes
- **AND** Gateway SHALL monitor metric `pgbouncer_pools_sv_used` (server connections used)
- **AND** log warning if pool utilization >80%

---

### Requirement: Enhanced Logging for Native Service

The Gateway SHALL log to systemd journal with structured format for centralized monitoring.

#### Scenario: Logging to journald

- **WHEN** Gateway logs events
- **THEN** logs SHALL be written to systemd journal
- **AND** accessible via `journalctl -u telegram-gateway`
- **AND** include SyslogIdentifier `telegram-gateway`
- **AND** support log levels: debug, info, warn, error

#### Scenario: Log query and filtering

- **WHEN** operator queries logs with `journalctl -u telegram-gateway -f`
- **THEN** real-time log stream SHALL be displayed
- **AND** support filters: `--since`, `--until`, `--priority`, `--grep`
- **AND** logs SHALL be structured JSON format

