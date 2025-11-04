---
capability-id: telegram-redis-cluster
capability-type: NEW
status: proposal
domain: infrastructure
tags: [telegram, cache, redis, performance, high-availability]
---

# Specification: Redis Cache Cluster for Telegram

## Purpose

Provide high-performance in-memory cache layer for Telegram messages with automatic failover, reducing polling latency by 80% and database load by 70%.

---

## ADDED Requirements

### Requirement: Redis Master-Replica Topology

The system SHALL deploy Redis in master-replica configuration with 3 containers to provide read scaling and high availability.

#### Scenario: Redis Master initialization

- **WHEN** Telegram stack starts
- **THEN** a container named `telegram-redis-master` SHALL be created
- **AND** configure `maxmemory=1gb` with `allkeys-lru` eviction policy
- **AND** disable persistence (`save ""`, `appendonly no`) for pure cache
- **AND** expose port 6379 on host
- **AND** accept write operations only

#### Scenario: Redis Replica initialization

- **WHEN** Telegram stack starts
- **THEN** a container named `telegram-redis-replica` SHALL be created
- **AND** configure replication from `telegram-redis-master:6379`
- **AND** configure `maxmemory=512mb` with `allkeys-lru` eviction
- **AND** expose port 6380 on host
- **AND** accept read operations only (`replica-read-only yes`)

#### Scenario: Automatic replication sync

- **WHEN** data is written to Redis Master
- **THEN** changes SHALL replicate to Redis Replica automatically
- **AND** replication lag SHALL be <50ms (p95)
- **AND** Prometheus metric `redis_replication_lag_seconds` SHALL track lag

---

### Requirement: Redis Sentinel for High Availability

The system SHALL deploy Redis Sentinel to monitor master/replica health and perform automatic failover.

#### Scenario: Sentinel monitors master and replica

- **WHEN** Redis Sentinel starts
- **THEN** it SHALL monitor `telegram-redis-master:6379`
- **AND** detect master failure within `down-after-milliseconds=5000` (5 seconds)
- **AND** track replica status

#### Scenario: Automatic failover on master failure

- **WHEN** Redis Master becomes unavailable (stopped, crashed, network partition)
- **AND** Sentinel confirms failure after 5 seconds
- **THEN** Sentinel SHALL promote Redis Replica to master
- **AND** notify clients of configuration change
- **AND** complete failover within 10 seconds total
- **AND** log failover event to Prometheus

---

### Requirement: Message Caching with TTL

The cache layer SHALL store recent messages with automatic expiration to optimize memory usage.

#### Scenario: Cache incoming message

- **WHEN** Gateway receives new Telegram message
- **THEN** Gateway SHALL call `cache.cacheMessage(message)`
- **AND** store message hash at key `telegram:msg:{channel_id}:{message_id}`
- **AND** set TTL to 3600 seconds (1 hour)
- **AND** add message ID to sorted set `telegram:channel:{channel_id}:recent` with timestamp score
- **AND** complete cache operation in <5ms

#### Scenario: TTL expiration

- **WHEN** cached message reaches 1 hour age
- **THEN** Redis SHALL automatically delete the key
- **AND** remove entry from sorted set
- **AND** free memory without manual intervention

---

### Requirement: Fast Deduplication Cache

The cache SHALL provide O(1) duplicate checking with 2-hour TTL to prevent reprocessing of messages.

#### Scenario: Duplicate check via cache

- **WHEN** TP Capital Worker checks if message already processed
- **THEN** Worker SHALL call `cache.isDuplicate(channelId, messageId)`
- **AND** Redis SHALL execute EXISTS command on key `telegram:dedup:{channel_id}:{message_id}`
- **AND** return result in <2ms (vs 20ms SQL query)
- **AND** cache hit rate SHALL be >70% for duplicate checks

#### Scenario: Deduplication cache population

- **WHEN** message is successfully processed and inserted into `tp_capital_signals`
- **THEN** system SHALL set dedup key `telegram:dedup:{channel_id}:{message_id}` to "1"
- **AND** set TTL to 7200 seconds (2 hours)
- **AND** prevent reprocessing within 2-hour window

---

### Requirement: Optimized Message Retrieval

The cache SHALL provide fast retrieval of unprocessed messages using sorted sets for time-ordered queries.

#### Scenario: Fast polling query

- **WHEN** TP Capital Worker polls for unprocessed messages
- **THEN** Worker SHALL call `cache.getUnprocessedMessages(channelId, limit=100)`
- **AND** Redis SHALL execute ZRANGE on sorted set `telegram:channel:{channel_id}:recent`
- **AND** fetch message hashes via pipeline (batch GET)
- **AND** return results in <10ms (vs 50ms SQL query)
- **AND** filter by status = 'received'

#### Scenario: Cache miss fallback to database

- **WHEN** Redis returns empty result set (cache miss)
- **THEN** Worker SHALL fallback to SQL query via PgBouncer
- **AND** fetch messages from TimescaleDB
- **AND** warm cache with results for future polls
- **AND** increment metric `cache_misses_total{reason="empty"}`

---

### Requirement: Cache Invalidation and Cleanup

The cache SHALL automatically remove expired entries and provide manual cleanup capabilities.

#### Scenario: Automatic TTL cleanup

- **WHEN** keys reach their TTL expiration
- **THEN** Redis SHALL automatically delete expired keys
- **AND** no manual intervention required
- **AND** memory SHALL be freed for new messages

#### Scenario: Manual cleanup of old entries in sorted sets

- **WHEN** cleanup job executes `cache.cleanupExpired(channelId)`
- **THEN** Redis SHALL execute ZREMRANGEBYSCORE to remove entries older than 1 hour
- **AND** remove corresponding message hashes
- **AND** log count of removed entries
- **AND** execute cleanup daily via cron job

---

### Requirement: Monitoring and Observability

The cache layer SHALL export metrics to Prometheus for performance tracking and alerting.

#### Scenario: Cache performance metrics

- **WHEN** Prometheus scrapes Redis Exporter
- **THEN** metrics SHALL include:
  - `redis_memory_used_bytes` - Current memory usage
  - `redis_commands_processed_total` - Total commands
  - `redis_keyspace_hits_total` - Cache hits
  - `redis_keyspace_misses_total` - Cache misses
  - `redis_connected_clients` - Active client connections
  - `redis_replication_lag_seconds` - Replication delay

#### Scenario: Cache hit rate calculation

- **WHEN** Grafana dashboard queries Prometheus
- **THEN** cache hit rate SHALL be calculated as:
  ```
  rate(redis_keyspace_hits_total[5m]) / 
  (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
  ```
- **AND** alert SHALL fire if hit rate <50% for 10 minutes
- **AND** target hit rate is >70%

