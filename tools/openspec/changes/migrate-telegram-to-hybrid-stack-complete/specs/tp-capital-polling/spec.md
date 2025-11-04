---
capability-id: tp-capital-polling
capability-type: EXISTING
status: proposal
domain: backend
tags: [tp-capital, polling, telegram, cache, performance]
---

# Specification: TP Capital Polling Worker (Modified for Cache-First Architecture)

## MODIFIED Requirements

### Requirement: Cache-First Message Polling

The TP Capital polling worker SHALL query Redis cache as primary data source before falling back to database queries.

#### Scenario: Fetch unprocessed messages from cache

- **WHEN** polling worker executes every 5 seconds
- **THEN** it SHALL call `redisCache.getUnprocessedMessages(channelId, limit=100)`
- **AND** Redis SHALL return results in <10ms (vs 50ms database query)
- **AND** if messages found in cache, skip database query
- **AND** increment metric `polling_cache_hits_total`

#### Scenario: Cache miss fallback to database

- **WHEN** Redis cache returns empty result or is unavailable
- **THEN** worker SHALL fallback to SQL query via PgBouncer:
  ```sql
  SELECT * FROM telegram_gateway.messages
  WHERE channel_id = $1 AND status = 'received'
  ORDER BY received_at ASC LIMIT $2
  ```
- **AND** query via PgBouncer (localhost:6434) instead of direct TimescaleDB
- **AND** warm Redis cache with results for future polls
- **AND** increment metric `polling_cache_misses_total{reason="empty"}`

---

### Requirement: Fast Deduplication via Cache

The worker SHALL use Redis cache for duplicate checking instead of SQL queries to achieve 90% latency reduction.

#### Scenario: Duplicate check via Redis

- **WHEN** worker processes message and checks if already exists
- **THEN** it SHALL call `redisCache.isDuplicate(channelId, messageId)`
- **AND** Redis SHALL execute EXISTS command on key `telegram:dedup:{channel_id}:{message_id}`
- **AND** return result in <2ms (vs 20ms SQL query)
- **AND** skip signal insertion if duplicate found

#### Scenario: Deduplication fallback to database

- **WHEN** Redis is unavailable
- **THEN** worker SHALL fallback to SQL duplicate check:
  ```sql
  SELECT id FROM tp_capital_signals
  WHERE source_channel_id = $1 AND source_message_id = $2
  LIMIT 1
  ```
- **AND** query via PgBouncer
- **AND** log warning "Redis unavailable, using database for dedup"
- **AND** increment metric `dedup_cache_misses_total{reason="redis_unavailable"}`

---

### Requirement: Database Connection via PgBouncer

The polling worker SHALL connect to TimescaleDB (both Gateway and TP Capital databases) exclusively through PgBouncer.

#### Scenario: Gateway database connection pooling

- **WHEN** worker initializes Gateway database client
- **THEN** it SHALL connect to `localhost:6434` (PgBouncer for Telegram stack)
- **AND** use connection string: `postgresql://telegram:${PASSWORD}@localhost:6434/telegram_gateway`
- **AND** share connection pool with Gateway and Gateway API (max 20 server connections)

#### Scenario: TP Capital database connection

- **WHEN** worker initializes TP Capital database client for signal insertion
- **THEN** it SHALL maintain separate connection to TP Capital database
- **AND** use existing connection configuration (unchanged)

---

### Requirement: Dual-Mode Operation (Polling + Queue)

The worker SHALL support both polling mode (cache/database) and queue mode (RabbitMQ consumer) with runtime configuration.

#### Scenario: Polling mode (default)

- **WHEN** environment variable `TP_CAPITAL_QUEUE_MODE=false` or unset
- **THEN** worker SHALL use polling pattern:
  - Check Redis cache every 5 seconds
  - Fallback to PgBouncer/TimescaleDB on cache miss
  - Process messages in batch (up to 100)

#### Scenario: Queue mode (optional)

- **WHEN** environment variable `TP_CAPITAL_QUEUE_MODE=true`
- **THEN** worker SHALL subscribe to RabbitMQ queue `telegram.consumer.tp-capital.{channel_id}`
- **AND** consume messages as they arrive (push model)
- **AND** disable polling loop
- **AND** acknowledge messages after successful processing

#### Scenario: Hybrid mode (redundancy)

- **WHEN** environment variable `TP_CAPITAL_QUEUE_MODE=hybrid`
- **THEN** worker SHALL run both polling and queue consumer
- **AND** use queue as primary (lower latency)
- **AND** use polling as backup (every 30s) to catch missed messages
- **AND** deduplicate across both sources

---

### Requirement: Performance Monitoring

The worker SHALL expose enhanced metrics for cache performance and database connection pooling.

#### Scenario: Cache performance metrics

- **WHEN** Prometheus scrapes TP Capital metrics
- **THEN** metrics SHALL include:
  - `tp_capital_cache_hits_total{operation="fetch|dedup"}` - Cache hits
  - `tp_capital_cache_misses_total{operation="fetch|dedup",reason="empty|unavailable"}` - Cache misses
  - `tp_capital_cache_hit_rate` - Hit rate percentage (gauge)
  - `tp_capital_fallback_to_db_total` - Database fallback count

#### Scenario: Connection pool metrics

- **WHEN** worker queries database via PgBouncer
- **THEN** metrics SHALL include:
  - `tp_capital_db_queries_total{database="gateway|tpcapital"}` - Query count
  - `tp_capital_db_query_duration_seconds` - Query latency histogram
  - `tp_capital_db_connection_errors_total` - Connection failures

---

### Requirement: Graceful Shutdown

The worker SHALL gracefully stop processing and release resources on service termination.

#### Scenario: Graceful shutdown sequence

- **WHEN** worker receives SIGTERM signal
- **THEN** it SHALL stop polling loop immediately
- **AND** wait for current batch to complete processing (max 30s)
- **AND** disconnect from Redis cache (`cache.disconnect()`)
- **AND** close database connections (both Gateway and TP Capital)
- **AND** disconnect from RabbitMQ queue (if enabled)
- **AND** exit with code 0 after cleanup completes

