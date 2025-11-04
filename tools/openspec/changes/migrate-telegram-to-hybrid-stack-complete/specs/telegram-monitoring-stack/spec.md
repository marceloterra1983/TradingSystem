---
capability-id: telegram-monitoring-stack
capability-type: NEW
status: proposal
domain: infrastructure
tags: [telegram, monitoring, prometheus, grafana, observability]
---

# Specification: Monitoring Stack for Telegram

## Purpose

Provide comprehensive monitoring, alerting, and visualization capabilities for Telegram stack through Prometheus metrics collection and Grafana dashboards.

---

## ADDED Requirements

### Requirement: Prometheus Metrics Collection

The system SHALL deploy Prometheus to scrape metrics from all Telegram services and exporters.

#### Scenario: Prometheus scrape configuration

- **WHEN** Prometheus container starts
- **THEN** it SHALL load config from `/etc/prometheus/prometheus.yml`
- **AND** scrape metrics from 5 endpoints:
  - `host.docker.internal:4006` (MTProto Gateway native)
  - `telegram-gateway-api:4010` (Gateway API container)
  - `telegram-postgres-exporter:9187` (TimescaleDB metrics)
  - `telegram-redis-exporter:9121` (Redis metrics)
  - `telegram-rabbitmq:15692` (RabbitMQ metrics)
- **AND** scrape interval SHALL be 15 seconds
- **AND** retention SHALL be 30 days

#### Scenario: Alert rule evaluation

- **WHEN** Prometheus evaluates alert rules every 15 seconds
- **THEN** it SHALL load rules from `/etc/prometheus/alerts/telegram-alerts.yml`
- **AND** fire alerts when conditions match (e.g., gateway down >2min)
- **AND** send notifications to AlertManager (if configured)

---

### Requirement: Grafana Visualization

The system SHALL deploy Grafana with pre-configured dashboards and datasources for Telegram stack monitoring.

#### Scenario: Grafana initialization with datasources

- **WHEN** Grafana container starts
- **THEN** it SHALL load datasources from `/etc/grafana/provisioning/datasources/datasources.yml`
- **AND** configure Prometheus datasource pointing to `telegram-prometheus:9090`
- **AND** configure PostgreSQL datasource pointing to `telegram-pgbouncer:5432`
- **AND** configure Redis datasource (via plugin)
- **AND** datasources SHALL be ready for use without manual configuration

#### Scenario: Dashboard provisioning

- **WHEN** Grafana starts
- **THEN** it SHALL load 6 dashboards from `/etc/grafana/provisioning/dashboards/`:
  - `telegram-overview.json` - System overview
  - `timescaledb-performance.json` - Database performance
  - `redis-cluster.json` - Cache metrics
  - `rabbitmq-queue.json` - Queue metrics
  - `mtproto-service.json` - Native service metrics
  - `slo-dashboard.json` - SLO tracking
- **AND** dashboards SHALL be accessible via Grafana UI at `http://localhost:3100`

---

### Requirement: Database Performance Monitoring

The stack SHALL export TimescaleDB metrics via Postgres Exporter for query performance and connection monitoring.

#### Scenario: Postgres Exporter metrics collection

- **WHEN** Postgres Exporter connects to PgBouncer
- **THEN** it SHALL query `pg_stat_database`, `pg_stat_statements`, `pg_stat_activity`
- **AND** expose metrics:
  - `pg_stat_database_tup_fetched` - Rows fetched
  - `pg_stat_statements_mean_exec_time_seconds` - Average query time
  - `pg_stat_activity_count` - Active connections
  - `pg_database_size_bytes` - Database size
- **AND** metrics SHALL update every 15 seconds

#### Scenario: Connection pool monitoring

- **WHEN** Prometheus queries PgBouncer stats
- **THEN** metrics SHALL include:
  - `pgbouncer_pools_cl_active` - Active client connections
  - `pgbouncer_pools_sv_active` - Active server connections
  - `pgbouncer_pools_cl_waiting` - Clients waiting for connection
  - `pgbouncer_pools_maxwait_seconds` - Max client wait time

---

### Requirement: Redis Performance Monitoring

The stack SHALL export Redis metrics via Redis Exporter for cache performance and replication monitoring.

#### Scenario: Redis Exporter metrics collection

- **WHEN** Redis Exporter connects to `telegram-redis-master:6379`
- **THEN** it SHALL collect metrics:
  - `redis_memory_used_bytes` - Memory usage
  - `redis_keyspace_hits_total` - Cache hits
  - `redis_keyspace_misses_total` - Cache misses
  - `redis_connected_clients` - Client count
  - `redis_replication_lag_seconds` - Replica lag
- **AND** expose metrics on port 9121

#### Scenario: Cache hit rate monitoring

- **WHEN** Grafana displays Redis dashboard
- **THEN** it SHALL calculate cache hit rate as percentage
- **AND** show trend over time (last 24 hours)
- **AND** alert if hit rate drops below 50%

---

### Requirement: Alerting Rules

The system SHALL evaluate 8 alerting rules to detect critical and warning conditions proactively.

#### Scenario: Critical alert - Gateway down

- **WHEN** Prometheus detects `up{job="telegram-gateway"} == 0` for 2 minutes
- **THEN** alert `TelegramGatewayDown` SHALL fire with severity critical
- **AND** annotation SHALL include: "MTProto service has been down for 2 minutes"
- **AND** notification SHALL be sent to AlertManager/PagerDuty

#### Scenario: Warning alert - High polling lag

- **WHEN** Prometheus detects `tp_capital_polling_lag_seconds > 30` for 5 minutes
- **THEN** alert `HighPollingLag` SHALL fire with severity warning
- **AND** description SHALL include current lag value
- **AND** operator SHALL investigate TP Capital Worker

#### Scenario: Critical alert - Redis cluster unavailable

- **WHEN** Prometheus detects `redis_up{job="telegram-redis"} == 0` for 1 minute
- **THEN** alert `RedisClusterDown` SHALL fire with severity critical
- **AND** system SHALL fallback to database-only mode
- **AND** performance SHALL degrade (10ms → 50ms polling)

---

### Requirement: SLO Tracking and Error Budgets

The monitoring stack SHALL track Service Level Objectives and calculate error budgets for availability and latency.

#### Scenario: Availability SLO calculation

- **WHEN** Grafana SLO dashboard queries Prometheus
- **THEN** availability SHALL be calculated as:
  ```
  (time_uptime_seconds / time_total_seconds) * 100
  ```
- **AND** target SHALL be 99.9% (monthly)
- **AND** error budget SHALL be 0.1% (43 minutes downtime/month)
- **AND** dashboard SHALL show remaining error budget

#### Scenario: Latency SLO calculation

- **WHEN** Grafana queries polling latency metrics
- **THEN** p95 latency SHALL be calculated from histogram
- **AND** target SHALL be <15ms (p95)
- **AND** dashboard SHALL show percentage of requests meeting SLO
- **AND** alert SHALL fire if <95% of requests meet SLO for 1 hour

---

### Requirement: Dashboard Accessibility

Grafana SHALL be accessible via web browser with authentication for secure access.

#### Scenario: Access Grafana UI

- **WHEN** operator navigates to `http://localhost:3100`
- **THEN** Grafana login page SHALL load
- **AND** accept credentials: admin / password from `.env`
- **AND** redirect to homepage with 6 provisioned dashboards visible

#### Scenario: Dashboard navigation

- **WHEN** operator selects "Telegram Overview" dashboard
- **THEN** dashboard SHALL load with real-time data (last 15 minutes)
- **AND** auto-refresh every 30 seconds
- **AND** allow time range selection (last 1h, 6h, 24h, 7d, 30d)
- **AND** export capabilities (PNG, PDF, JSON)

