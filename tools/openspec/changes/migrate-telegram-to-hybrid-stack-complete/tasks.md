# Implementation Tasks: Telegram Hybrid Stack Migration

## 1. OpenSpec Structure & Validation

- [x] 1.1 Create `proposal.md`
- [x] 1.2 Create `design.md`
- [x] 1.3 Create `tasks.md` (this file)
- [ ] 1.4 Create spec delta: `specs/telegram-gateway-mtproto/spec.md` (MODIFIED)
- [ ] 1.5 Create spec delta: `specs/telegram-gateway-api/spec.md` (MODIFIED)
- [ ] 1.6 Create spec delta: `specs/tp-capital-polling/spec.md` (MODIFIED)
- [ ] 1.7 Create spec delta: `specs/telegram-timescaledb-dedicated/spec.md` (ADDED)
- [ ] 1.8 Create spec delta: `specs/telegram-pgbouncer/spec.md` (ADDED)
- [ ] 1.9 Create spec delta: `specs/telegram-redis-cluster/spec.md` (ADDED)
- [ ] 1.10 Create spec delta: `specs/telegram-rabbitmq-queue/spec.md` (ADDED)
- [ ] 1.11 Create spec delta: `specs/telegram-monitoring-stack/spec.md` (ADDED)
- [ ] 1.12 Validate OpenSpec: `npm run openspec -- validate migrate-telegram-to-hybrid-stack-complete --strict`

---

## 2. Infrastructure Configuration Files

### 2.1 Docker Compose Files
- [ ] 2.1.1 Create `tools/compose/docker-compose.telegram.yml` (7 containers)
  - [ ] TimescaleDB container with resource limits
  - [ ] PgBouncer container with pooling config
  - [ ] Redis Master container
  - [ ] Redis Replica container
  - [ ] Redis Sentinel container
  - [ ] RabbitMQ container with management plugin
  - [ ] Gateway API container
- [ ] 2.1.2 Create `tools/compose/docker-compose.telegram-monitoring.yml` (4 containers)
  - [ ] Prometheus container
  - [ ] Grafana container
  - [ ] Postgres Exporter container
  - [ ] Redis Exporter container

### 2.2 systemd Service
- [ ] 2.2.1 Create `/etc/systemd/system/telegram-gateway.service`
- [ ] 2.2.2 Add security hardening (PrivateTmp, NoNewPrivileges, ProtectSystem)
- [ ] 2.2.3 Configure restart policy (on-failure, 10s delay)
- [ ] 2.2.4 Setup logging (journal, SyslogIdentifier)

### 2.3 Configuration Files
- [ ] 2.3.1 Create `tools/compose/telegram/postgresql.conf` (TimescaleDB tuning)
- [ ] 2.3.2 Create `tools/compose/telegram/pgbouncer.ini` (pooling config)
- [ ] 2.3.3 Create `tools/compose/telegram/userlist.txt` (PgBouncer auth)
- [ ] 2.3.4 Create `tools/compose/telegram/sentinel.conf` (Redis HA)
- [ ] 2.3.5 Create `tools/compose/telegram/rabbitmq.conf` (queue settings)
- [ ] 2.3.6 Create `tools/compose/telegram/prometheus.yml` (scrape config)
- [ ] 2.3.7 Create `tools/compose/telegram/grafana-datasources.yml` (datasources)
- [ ] 2.3.8 Generate PgBouncer password hash for `userlist.txt`

---

## 3. Database Optimizations

### 3.1 SQL Optimization Scripts
- [ ] 3.1.1 Create `backend/data/timescaledb/telegram-gateway/03_optimization_indexes.sql`
  - [ ] Partial index for unprocessed messages
  - [ ] Partial index for processing messages
  - [ ] GIN index for JSONB metadata
  - [ ] Covering index for polling query
  - [ ] Function-based index for processed_by
  - [ ] Composite index for analytics
- [ ] 3.1.2 Create `backend/data/timescaledb/telegram-gateway/04_continuous_aggregates.sql`
  - [ ] Hourly materialized view
  - [ ] Daily materialized view
  - [ ] Refresh policies for both views
- [ ] 3.1.3 Create `backend/data/timescaledb/telegram-gateway/05_performance_functions.sql`
  - [ ] Function: get_unprocessed_messages_optimized()
  - [ ] Function: mark_batch_as_processed()
  - [ ] Function: cleanup_old_messages()
- [ ] 3.1.4 Create `backend/data/timescaledb/telegram-gateway/06_upsert_helpers.sql`
  - [ ] Function: upsert_message_status()
  - [ ] Function: bulk_upsert_messages()
- [ ] 3.1.5 Create `backend/data/timescaledb/telegram-gateway/07_monitoring_views.sql`
  - [ ] View: message_processing_stats
  - [ ] View: channel_health_summary
  - [ ] View: performance_metrics_realtime

### 3.2 Testing & Benchmarking
- [ ] 3.2.1 Test indexes on development database
- [ ] 3.2.2 Benchmark query performance (before/after)
- [ ] 3.2.3 Verify continuous aggregates refresh correctly
- [ ] 3.2.4 Document performance gains (expected: 30-50% improvement)

---

## 4. Redis Cache Implementation

### 4.1 Core Cache Layer
- [ ] 4.1.1 Create `apps/telegram-gateway/src/cache/RedisTelegramCache.js`
  - [ ] Constructor with Redis client
  - [ ] Method: cacheMessage(message)
  - [ ] Method: isDuplicate(channelId, messageId)
  - [ ] Method: getUnprocessedMessages(channelId, limit)
  - [ ] Method: markAsProcessed(channelId, messageId)
  - [ ] Method: cleanupExpired(channelId)
  - [ ] Method: disconnect()
  - [ ] Error handling with fallback to DB
- [ ] 4.1.2 Create `apps/telegram-gateway/src/cache/RedisKeySchema.js`
  - [ ] Constants for key prefixes
  - [ ] TTL management (HOT_CACHE_TTL, DEDUP_CACHE_TTL)
  - [ ] Key generation utilities
  - [ ] Validation helpers

### 4.2 Gateway Integration
- [ ] 4.2.1 Update `apps/telegram-gateway/src/index.js`
  - [ ] Initialize RedisTelegramCache
  - [ ] Add cache write on message reception
  - [ ] Add error handling (cache unavailable = fallback to DB)
- [ ] 4.2.2 Update `apps/telegram-gateway/src/config.js`
  - [ ] Add Redis configuration section
  - [ ] Validate Redis connection string

### 4.3 TP Capital Integration
- [ ] 4.3.1 Update `apps/tp-capital/src/gatewayPollingWorker.js`
  - [ ] Initialize RedisTelegramCache
  - [ ] Modify fetchUnprocessedMessages() to check Redis first
  - [ ] Fallback to PgBouncer/TimescaleDB if cache miss
  - [ ] Modify checkDuplicate() to use Redis
  - [ ] Update metrics (cache hits/misses)

### 4.4 Testing & Documentation
- [ ] 4.4.1 Create `apps/telegram-gateway/src/cache/__tests__/RedisTelegramCache.test.js`
  - [ ] Test: cacheMessage()
  - [ ] Test: isDuplicate()
  - [ ] Test: getUnprocessedMessages()
  - [ ] Test: markAsProcessed()
  - [ ] Test: cleanupExpired()
  - [ ] Test: Redis unavailable (fallback)
- [ ] 4.4.2 Create `apps/telegram-gateway/src/cache/redis-schema.md`
  - [ ] Document key naming conventions
  - [ ] Document data structures (strings, sorted sets)
  - [ ] Document TTL policies
  - [ ] Provide examples

---

## 5. RabbitMQ Queue Implementation (Optional Phase 2)

### 5.1 Queue Infrastructure
- [ ] 5.1.1 Create `apps/telegram-gateway/src/queue/TelegramMessageQueue.js`
  - [ ] Constructor with RabbitMQ connection
  - [ ] Method: initialize() - create exchange/queues
  - [ ] Method: publishMessage(message)
  - [ ] Method: setupDeadLetterQueue()
- [ ] 5.1.2 Create queue topology
  - [ ] Exchange: `telegram.messages` (topic)
  - [ ] Routing key: `telegram.channel.{channel_id}`
  - [ ] DLQ: `telegram.messages.dlq`

### 5.2 Gateway Publisher
- [ ] 5.2.1 Update Gateway to publish messages to queue
- [ ] 5.2.2 Add retry logic (3 attempts)
- [ ] 5.2.3 Metrics: messages_published_total

### 5.3 TP Capital Consumer
- [ ] 5.3.1 Create `apps/tp-capital/src/queue/TelegramQueueConsumer.js`
  - [ ] Method: subscribeToChannel(channelId, callback)
  - [ ] Message acknowledgment (manual ack)
  - [ ] Retry logic with exponential backoff
- [ ] 5.3.2 Update TP Capital to consume from queue (alternative to polling)
- [ ] 5.3.3 Implement dual-mode: Queue + Polling (for redundancy)

---

## 6. Monitoring & Alerting

### 6.1 Prometheus Configuration
- [ ] 6.1.1 Create `tools/compose/telegram/prometheus.yml`
  - [ ] Scrape config for all 5 services
  - [ ] Rule files configuration
  - [ ] External labels (cluster: telegram-stack)

### 6.2 Alerting Rules
- [ ] 6.2.1 Create `tools/compose/telegram/alerts/telegram-alerts.yml`
  - [ ] Alert: TelegramGatewayDown (critical)
  - [ ] Alert: HighPollingLag (critical)
  - [ ] Alert: RedisClusterDown (critical)
  - [ ] Alert: DatabaseConnectionPoolExhausted (warning)
  - [ ] Alert: MessageQueueBuilding (warning)
  - [ ] Alert: LowCacheHitRate (warning)
  - [ ] Alert: DiskSpaceLow (warning)
  - [ ] Alert: HighMemoryUsage (warning)

### 6.3 Grafana Dashboards
- [ ] 6.3.1 Create `tools/compose/telegram/dashboards/telegram-overview.json`
  - [ ] Panel: Message processing rate
  - [ ] Panel: End-to-end latency (p50, p95, p99)
  - [ ] Panel: Queue depth
  - [ ] Panel: Error rate
  - [ ] Panel: System health status
- [ ] 6.3.2 Create `tools/compose/telegram/dashboards/timescaledb-performance.json`
  - [ ] Panel: Query latency histogram
  - [ ] Panel: Connection pool stats
  - [ ] Panel: Cache hit rate
  - [ ] Panel: Lock waits
  - [ ] Panel: Table/index sizes
- [ ] 6.3.3 Create `tools/compose/telegram/dashboards/redis-cluster.json`
  - [ ] Panel: Cache hit/miss rate
  - [ ] Panel: Memory usage
  - [ ] Panel: Eviction rate
  - [ ] Panel: Replication lag
  - [ ] Panel: Commands/sec
- [ ] 6.3.4 Create `tools/compose/telegram/dashboards/rabbitmq-queue.json`
  - [ ] Panel: Messages ready/unacked
  - [ ] Panel: Publish/deliver rate
  - [ ] Panel: Consumer count
  - [ ] Panel: Queue depth
- [ ] 6.3.5 Create `tools/compose/telegram/dashboards/mtproto-service.json`
  - [ ] Panel: CPU/RAM usage (systemd metrics)
  - [ ] Panel: Network I/O
  - [ ] Panel: Connection status
  - [ ] Panel: Message reception rate
- [ ] 6.3.6 Create `tools/compose/telegram/dashboards/slo-dashboard.json`
  - [ ] Panel: Availability SLO (99.9% target)
  - [ ] Panel: Latency SLO (p95 <15ms target)
  - [ ] Panel: Error budget remaining
  - [ ] Panel: Incidents timeline

### 6.4 Datasources
- [ ] 6.4.1 Create `tools/compose/telegram/grafana-datasources.yml`
  - [ ] Prometheus datasource
  - [ ] PostgreSQL datasource (TimescaleDB direct)
  - [ ] Redis datasource

---

## 7. Migration & Operations Scripts

### 7.1 Migration Script
- [ ] 7.1.1 Create `scripts/telegram/migrate-to-hybrid.sh`
  - [ ] Pre-flight checks (dependencies, ports, permissions)
  - [ ] Backup session files (.session/ → tar.gz)
  - [ ] Dump telegram_gateway schema (pg_dump)
  - [ ] Start new Docker stack (7 containers)
  - [ ] Wait for health checks (all services healthy)
  - [ ] Restore schema to new TimescaleDB
  - [ ] Verify data integrity (row count comparison)
  - [ ] Install systemd service (instructions for manual sudo)
  - [ ] Generate migration report

### 7.2 Rollback Script
- [ ] 7.2.1 Create `scripts/telegram/rollback-migration.sh`
  - [ ] Stop new stack (containers + native service)
  - [ ] Restore sessions from backup
  - [ ] Restore database dump to shared TimescaleDB
  - [ ] Update connection strings to old config
  - [ ] Restart old stack
  - [ ] Verify rollback successful

### 7.3 Stack Management
- [ ] 7.3.1 Create `scripts/telegram/start-telegram-stack.sh`
  - [ ] Start Docker containers (docker compose up)
  - [ ] Wait for health checks
  - [ ] Start native service (systemctl start)
  - [ ] Verify all components healthy
  - [ ] Display status summary
- [ ] 7.3.2 Create `scripts/telegram/stop-telegram-stack.sh`
  - [ ] Stop native service gracefully
  - [ ] Stop Docker containers (docker compose down)
  - [ ] Preserve data (no -v flag)
- [ ] 7.3.3 Create `scripts/telegram/health-check-telegram.sh`
  - [ ] Check native service (systemctl is-active)
  - [ ] Check Docker containers (docker ps)
  - [ ] Check TimescaleDB (psql connection)
  - [ ] Check Redis (redis-cli ping)
  - [ ] Check RabbitMQ (API health)
  - [ ] Check PgBouncer (SHOW POOLS)
  - [ ] JSON output option (--format json)
- [ ] 7.3.4 Create `scripts/telegram/backup-telegram-stack.sh`
  - [ ] Backup session files
  - [ ] Backup TimescaleDB (pg_dump)
  - [ ] Backup Redis (RDB snapshot)
  - [ ] Backup RabbitMQ definitions
  - [ ] Create timestamped archive

---

## 8. Database Schema Optimizations

### 8.1 Indexes
- [ ] 8.1.1 Create `backend/data/timescaledb/telegram-gateway/03_optimization_indexes.sql`
  - [ ] Partial index: idx_telegram_messages_unprocessed
  - [ ] Partial index: idx_telegram_messages_processing
  - [ ] GIN index: idx_telegram_messages_metadata
  - [ ] Covering index: idx_telegram_messages_polling_cover
  - [ ] Function index: idx_telegram_messages_processed_by
  - [ ] Composite index: idx_telegram_messages_analytics
  - [ ] Test index usage (EXPLAIN ANALYZE)

### 8.2 Continuous Aggregates
- [ ] 8.2.1 Create `backend/data/timescaledb/telegram-gateway/04_continuous_aggregates.sql`
  - [ ] Materialized view: messages_hourly
  - [ ] Materialized view: messages_daily
  - [ ] Refresh policy: hourly (every 1 hour)
  - [ ] Refresh policy: daily (every 24 hours)
  - [ ] Test view queries performance

### 8.3 Helper Functions
- [ ] 8.3.1 Create `backend/data/timescaledb/telegram-gateway/05_performance_functions.sql`
  - [ ] Function: get_unprocessed_messages_optimized(channel_id, limit)
  - [ ] Function: mark_batch_as_processed(message_ids[])
  - [ ] Function: cleanup_old_messages(days_old)
- [ ] 8.3.2 Create `backend/data/timescaledb/telegram-gateway/06_upsert_helpers.sql`
  - [ ] Function: upsert_message_status(channel_id, message_id, status)
  - [ ] Function: bulk_upsert_messages(messages[])
- [ ] 8.3.3 Create `backend/data/timescaledb/telegram-gateway/07_monitoring_views.sql`
  - [ ] View: message_processing_stats (real-time stats)
  - [ ] View: channel_health_summary (per-channel metrics)
  - [ ] View: performance_metrics_realtime (query performance)

---

## 9. Redis Cache Layer

### 9.1 Cache Implementation
- [ ] 9.1.1 Create `apps/telegram-gateway/src/cache/RedisTelegramCache.js`
  - [ ] Class constructor with Redis client (ioredis)
  - [ ] Method: cacheMessage(message) - Store with pipeline
  - [ ] Method: isDuplicate(channelId, messageId) - O(1) check
  - [ ] Method: getUnprocessedMessages(channelId, limit) - ZRANGE query
  - [ ] Method: markAsProcessed(channelId, messageId) - Update status
  - [ ] Method: cleanupExpired(channelId) - Remove old entries
  - [ ] Method: getStats() - Cache metrics
  - [ ] Error handling with graceful degradation

- [ ] 9.1.2 Create `apps/telegram-gateway/src/cache/RedisKeySchema.js`
  - [ ] Constant: MESSAGE_KEY_PREFIX = 'telegram:msg'
  - [ ] Constant: DEDUP_KEY_PREFIX = 'telegram:dedup'
  - [ ] Constant: CHANNEL_RECENT_PREFIX = 'telegram:channel'
  - [ ] Function: generateMessageKey(channelId, messageId)
  - [ ] Function: generateDedupKey(channelId, messageId)
  - [ ] Function: generateChannelKey(channelId)
  - [ ] TTL constants and helpers

### 9.2 Gateway Integration
- [ ] 9.2.1 Update `apps/telegram-gateway/src/index.js`
  - [ ] Import RedisTelegramCache
  - [ ] Initialize cache client on startup
  - [ ] Add cache.cacheMessage() call in handleNewMessage()
  - [ ] Add graceful shutdown (cache.disconnect())
- [ ] 9.2.2 Update `apps/telegram-gateway/src/config.js`
  - [ ] Add redis configuration section
  - [ ] Validate REDIS_HOST, REDIS_PORT

### 9.3 TP Capital Integration
- [ ] 9.3.1 Update `apps/tp-capital/src/gatewayPollingWorker.js`
  - [ ] Import RedisTelegramCache
  - [ ] Initialize cache client
  - [ ] Modify fetchUnprocessedMessages() - check Redis first
  - [ ] Modify checkDuplicate() - use Redis
  - [ ] Add cache metrics (hits, misses, fallbacks)
  - [ ] Add fallback to PgBouncer on cache miss

### 9.4 Testing & Documentation
- [ ] 9.4.1 Create `apps/telegram-gateway/src/cache/__tests__/RedisTelegramCache.test.js`
  - [ ] Test: cacheMessage with pipeline
  - [ ] Test: isDuplicate (true/false cases)
  - [ ] Test: getUnprocessedMessages (empty, partial, full batch)
  - [ ] Test: markAsProcessed
  - [ ] Test: cleanupExpired
  - [ ] Test: Redis unavailable (error handling)
  - [ ] Test: TTL expiration
  - [ ] Coverage target: 100%
- [ ] 9.4.2 Create `apps/telegram-gateway/src/cache/redis-schema.md`
  - [ ] Key naming conventions
  - [ ] Data structure documentation
  - [ ] TTL policies explanation
  - [ ] Examples with redis-cli commands

---

## 10. RabbitMQ Queue Implementation (Phase 2)

### 10.1 Queue Infrastructure
- [ ] 10.1.1 Create `apps/telegram-gateway/src/queue/TelegramMessageQueue.js`
  - [ ] Class constructor with amqplib
  - [ ] Method: initialize() - create exchange, queues, bindings
  - [ ] Method: publishMessage(message)
  - [ ] Method: subscribeToChannel(channelId, callback)
  - [ ] Dead Letter Queue setup

### 10.2 Gateway Publisher
- [ ] 10.2.1 Update Gateway to publish messages
  - [ ] Initialize queue on startup
  - [ ] Publish after successful DB write
  - [ ] Add retry logic (3 attempts)

### 10.3 TP Capital Consumer
- [ ] 10.3.1 Create `apps/tp-capital/src/queue/TelegramQueueConsumer.js`
  - [ ] Subscribe to channel messages
  - [ ] Manual acknowledgment
  - [ ] Error handling with DLQ
- [ ] 10.3.2 Add dual-mode support (Queue + Polling fallback)

---

## 11. Documentation

### 11.1 PlantUML Diagrams
- [ ] 11.1.1 Create `docs/content/diagrams/telegram-hybrid-architecture.puml`
  - [ ] Show all 11 containers + 1 native service
  - [ ] Include resource allocations
  - [ ] Show network topology
  - [ ] Latency annotations
- [ ] 11.1.2 Create `docs/content/diagrams/telegram-hybrid-with-monitoring.puml`
  - [ ] Complete architecture with monitoring stack
  - [ ] Metrics flow (services → exporters → Prometheus → Grafana)
  - [ ] Alert flow
- [ ] 11.1.3 Create `docs/content/diagrams/telegram-redis-cache-flow.puml`
  - [ ] Sequence diagram showing cache operations
  - [ ] Cache hit vs cache miss paths
  - [ ] TTL expiration handling
- [ ] 11.1.4 Create `docs/content/diagrams/telegram-deployment-layers.puml`
  - [ ] Native layer (systemd)
  - [ ] Container layer (Docker)
  - [ ] Network layer (internal vs external)

### 11.2 Docusaurus Guides
- [ ] 11.2.1 Create `docs/content/apps/telegram-gateway/hybrid-deployment.mdx`
  - [ ] Deployment prerequisites
  - [ ] Step-by-step installation
  - [ ] Configuration guide
  - [ ] Verification procedures
  - [ ] Embed PlantUML diagrams
- [ ] 11.2.2 Create `docs/content/apps/telegram-gateway/monitoring-guide.mdx`
  - [ ] Accessing Grafana (port 3100)
  - [ ] Dashboard walkthrough (6 dashboards)
  - [ ] Alerting rules explanation
  - [ ] Troubleshooting with metrics
- [ ] 11.2.3 Create `docs/content/apps/telegram-gateway/redis-cache-guide.mdx`
  - [ ] Cache architecture overview
  - [ ] Key naming conventions
  - [ ] TTL policies
  - [ ] Troubleshooting cache misses
- [ ] 11.2.4 Create `docs/content/apps/telegram-gateway/performance-tuning.mdx`
  - [ ] TimescaleDB tuning guide
  - [ ] PgBouncer optimization
  - [ ] Redis memory management
  - [ ] Query optimization tips
- [ ] 11.2.5 Create `docs/content/apps/telegram-gateway/troubleshooting.mdx`
  - [ ] Common issues & solutions
  - [ ] Debug checklist
  - [ ] Log analysis guide
  - [ ] Performance debugging
- [ ] 11.2.6 Create `docs/content/apps/telegram-gateway/migration-runbook.mdx`
  - [ ] Pre-migration checklist
  - [ ] Step-by-step migration
  - [ ] Validation procedures
  - [ ] Rollback instructions
  - [ ] Post-migration monitoring

### 11.3 Docusaurus Integration
- [ ] 11.3.1 Verify PlantUML plugin configured in `docs/docusaurus.config.ts`
- [ ] 11.3.2 Test diagram rendering locally (`cd docs && npm run start`)
- [ ] 11.3.3 Update sidebar configuration for new pages
- [ ] 11.3.4 Update architecture review docs with new diagrams

---

## 12. Integration Testing

### 12.1 Test Suite
- [ ] 12.1.1 Create `apps/telegram-gateway/src/__tests__/integration/hybrid-stack.test.js`
  - [ ] Test: End-to-end message flow (Telegram → Gateway → Redis → TP Capital)
  - [ ] Test: Cache hit scenario
  - [ ] Test: Cache miss fallback to DB
  - [ ] Test: Redis unavailable (fallback to direct DB)
  - [ ] Test: Duplicate message handling
  - [ ] Test: Message expiration (TTL)
- [ ] 12.1.2 Create `apps/tp-capital/src/__tests__/integration/cache-polling.test.js`
  - [ ] Test: Polling with Redis cache
  - [ ] Test: Fallback to PgBouncer
  - [ ] Test: Deduplication via cache
- [ ] 12.1.3 Create performance benchmark script
  - [ ] Benchmark: 1000 messages ingestion
  - [ ] Benchmark: Concurrent polling (5 workers)
  - [ ] Benchmark: Cache hit rate measurement
  - [ ] Compare with baseline (current architecture)

### 12.2 Failover Tests
- [ ] 12.2.1 Test Redis Sentinel failover
  - [ ] Stop master, verify replica promotion
  - [ ] Verify client reconnection
  - [ ] Verify no data loss
- [ ] 12.2.2 Test systemd auto-restart
  - [ ] Kill MTProto process, verify restart
  - [ ] Verify session persistence
  - [ ] Verify automatic reconnection to Telegram
- [ ] 12.2.3 Test PgBouncer failover
  - [ ] Restart TimescaleDB, verify PgBouncer handles reconnection
  - [ ] Verify connection pool recovery

### 12.3 Load Testing
- [ ] 12.3.1 Setup load test (50 msg/s sustained for 1 hour)
  - [ ] Generate synthetic Telegram messages
  - [ ] Monitor latency (p50, p95, p99)
  - [ ] Monitor resource usage (CPU, RAM, disk I/O)
  - [ ] Verify no degradation over time
- [ ] 12.3.2 Spike test (100 msg/s for 5 minutes)
  - [ ] Verify queue buffering
  - [ ] Verify cache performance
  - [ ] Verify no message loss

---

## 13. Environment Configuration

### 13.1 Environment Variables
- [ ] 13.1.1 Add to `.env`:
  ```bash
  # Telegram Stack - Dedicated Infrastructure
  TELEGRAM_DB_HOST=localhost
  TELEGRAM_DB_PORT=5434
  TELEGRAM_DB_NAME=telegram_gateway
  TELEGRAM_DB_USER=telegram
  TELEGRAM_DB_PASSWORD=<generate>
  
  # PgBouncer
  TELEGRAM_PGBOUNCER_PORT=6434
  
  # Redis
  TELEGRAM_REDIS_PORT=6379
  TELEGRAM_REDIS_REPLICA_PORT=6380
  TELEGRAM_REDIS_SENTINEL_PORT=26379
  
  # RabbitMQ
  TELEGRAM_RABBITMQ_PORT=5672
  TELEGRAM_RABBITMQ_MGMT_PORT=15672
  TELEGRAM_RABBITMQ_USER=telegram
  TELEGRAM_RABBITMQ_PASSWORD=<generate>
  
  # Monitoring
  TELEGRAM_PROMETHEUS_PORT=9090
  TELEGRAM_GRAFANA_PORT=3100
  GRAFANA_ADMIN_PASSWORD=<generate>
  ```

### 13.2 Security
- [ ] 13.2.1 Generate secure passwords for databases
- [ ] 13.2.2 Generate API keys for authentication
- [ ] 13.2.3 Create password hash for PgBouncer userlist.txt
- [ ] 13.2.4 Document credential rotation procedure

---

## 14. Code Updates

### 14.1 Gateway Code Updates
- [ ] 14.1.1 Update database connection to use PgBouncer
- [ ] 14.1.2 Add Redis cache client initialization
- [ ] 14.1.3 Add RabbitMQ publisher (optional)
- [ ] 14.1.4 Update metrics (cache hits, queue publishes)

### 14.2 TP Capital Code Updates
- [ ] 14.2.1 Update polling worker to use Redis cache
- [ ] 14.2.2 Update database connection to use PgBouncer
- [ ] 14.2.3 Add cache fallback logic
- [ ] 14.2.4 Update metrics (cache performance)

### 14.3 Gateway API Code Updates
- [ ] 14.3.1 Update database connection to use PgBouncer
- [ ] 14.3.2 Add Redis cache for API responses (optional)

---

## 15. Validation & Approval

### 15.1 OpenSpec Validation
- [ ] 15.1.1 Run `npm run openspec -- validate migrate-telegram-to-hybrid-stack-complete --strict`
- [ ] 15.1.2 Fix any validation errors
- [ ] 15.1.3 Generate spec diff report

### 15.2 Stakeholder Review
- [ ] 15.2.1 Present to Architecture Team
- [ ] 15.2.2 Present to DevOps Team
- [ ] 15.2.3 Present to Database Team
- [ ] 15.2.4 Get Product Owner approval

### 15.3 Final Checklist
- [ ] 15.3.1 All 42 files created
- [ ] 15.3.2 All tests passing
- [ ] 15.3.3 Documentation complete
- [ ] 15.3.4 Deployment window scheduled
- [ ] 15.3.5 Rollback plan tested
- [ ] 15.3.6 Team trained on new architecture

---

## Summary

**Total Tasks:** 150+  
**Phases:** 8  
**Duration:** 13 days  
**Deliverables:** 42 files  
**Success Criteria:** Zero data loss, <10ms polling latency, 99.9% availability

