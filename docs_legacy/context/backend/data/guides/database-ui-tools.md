---
title: Database UI Tools Guide - TimescaleDB
sidebar_position: 3
tags:
  - database
  - timescaledb
  - ui-tools
  - pgadmin
  - pgweb
  - adminer
  - azimutt
  - postgresql
domain: backend
type: guide
summary: Comprehensive guide for accessing and using database UI tools (pgAdmin, pgweb, Adminer, Azimutt) with TimescaleDB.
status: active
last_review: "2025-10-16"
---

## Overview

The TradingSystem TimescaleDB stack ships with four complementary database UI tools that help developers, DBAs, and analysts manage, explore, and document the time-series datasets captured by the platform. Each tool targets a specific workflow, from production-grade administration to rapid data exploration and schema visualization. This guide explains how to access, configure, and validate each tool so teams can work efficiently and securely.

All services share the centralized environment configuration defined in the project root `.env` file, ensuring consistent credentials and localhost-only bindings. Review the [Environment Configuration](../../../ops/ENVIRONMENT-CONFIGURATION.md) guide for details on managing secrets and loading environment variables across stacks. Infrastructure-level operational procedures, including backup and restore workflows, são mantidos no [TimescaleDB Infrastructure README](https://github.com/marceloterra/TradingSystem/blob/main/backend/data/timescaledb/README.md).

## Quick Access

### Access URLs

| Tool | URL | Port | Status | Profile |
|------|-----|------|--------|---------|
| pgAdmin | http://localhost:5050 | 5050 | Always Running | default |
| pgweb | http://localhost:8081 | 8081 | Always Running | default |
| Adminer | http://localhost:8082 | 8082 | Optional | optional |
| Azimutt | http://localhost:8084 | 8084 | Optional | optional |

### Default Credentials

- **pgAdmin**: Email `${PGADMIN_DEFAULT_EMAIL}`, password `${PGADMIN_DEFAULT_PASSWORD}` (configured in root `.env`)
- **pgweb**: No authentication required (auto-connects using `DATABASE_URL`)
- **Adminer**: Server `timescaledb`, username `${TIMESCALEDB_USER}`, password `${TIMESCALEDB_PASSWORD}`, database `${TIMESCALEDB_DB}`
- **Azimutt**: Prompted for password if `${AZIMUTT_AUTH_PASSWORD}=true`; uses database credentials when connecting to TimescaleDB

> 🔒 All UI endpoints bind to `127.0.0.1`, restricting access to the local machine. Use SSH tunneling or VPN for remote sessions.

### Starting Optional Tools

```bash
# Start optional Adminer + Azimutt
docker compose -f tools/compose/docker-compose.timescale.yml --profile optional up -d

# Stop optional Adminer + Azimutt
docker compose -f tools/compose/docker-compose.timescale.yml --profile optional down
```

## Architecture Diagram

### PlantUML Source

Download the source file: [`database-ui-tools-architecture.puml`](../../../shared/diagrams/database-ui-tools-architecture.puml)

### Rendered Diagram

```plantuml
@startuml database-ui-tools-architecture
!theme cerulean-outline

title TimescaleDB Database UI Tools - Architecture

skinparam actor {
  BackgroundColor LightBlue
  BorderColor Black
  FontSize 12
}

skinparam component {
  BackgroundColor<<Default>> LightGreen
  BackgroundColor<<Optional>> LightYellow
  BorderColor Black
  FontSize 11
}

skinparam database {
  BackgroundColor LightCyan
  BorderColor Black
  FontSize 12
}

skinparam cloud {
  BackgroundColor WhiteSmoke
  BorderColor Gray
}

actor "Developer/DBA" as User

cloud "Localhost Access\n(127.0.0.1)" as Localhost {
  component "pgAdmin 4\nPort: 5050\n(Full Admin)" as PgAdmin <<Default>>
  component "pgweb\nPort: 8081\n(Quick Queries)" as PgWeb <<Default>>
  component "Adminer\nPort: 8082\n(Lightweight)" as Adminer <<Optional>>
  component "Azimutt\nPort: 8084\n(ERD Viewer)" as Azimutt <<Optional>>
}

package "Docker Network\n(compose_default)" {
  database "TimescaleDB\nPostgreSQL 15\nPort: 5432 (internal)\nPort: 5433 (external)" as TimescaleDB
}

User -down-> Localhost : "Browser\nhttp://localhost:XXXX"

PgAdmin -down-> TimescaleDB : "timescaledb:5432\n(internal)"
PgWeb -down-> TimescaleDB : "timescaledb:5432\n(internal)"
Adminer -down-> TimescaleDB : "timescaledb:5432\n(internal)"
Azimutt -down-> TimescaleDB : "timescaledb:5432\n(internal)"

note right of PgAdmin
  **Always Running**
  - Full-featured admin UI
  - Query editor with autocomplete
  - Backup/restore tools
  - User management
  - Performance monitoring
end note

note right of PgWeb
  **Always Running**
  - Lightweight query tool
  - Auto-connected via DATABASE_URL
  - CSV/JSON export
  - Session history
end note

note right of Adminer
  **Optional (--profile optional)**
  - Single PHP file
  - Quick CRUD operations
  - Import/export
  - No session persistence
end note

note right of Azimutt
  **Optional (--profile optional)**
  - Interactive ERD visualization
  - Schema exploration
  - Relationship discovery
  - Export diagrams
end note

note bottom of Localhost
  **Security:**
  - All tools bound to 127.0.0.1
  - Not accessible from external networks
  - Use SSH tunneling for remote access
  
  **Optional Tools:**
  - Start with: docker compose --profile optional up -d
  - Stop with: docker compose --profile optional down
end note

legend right
  |<#LightGreen>| Default Profile (Always Running) |
  |<#LightYellow>| Optional Profile (Start When Needed) |
  
  **Connection Methods:**
  • From UI tools: timescaledb:5432 (internal)
  • From host: localhost:5433 (external)
  
  **Credentials:**
  • Defined in root .env file
  • TIMESCALEDB_USER, TIMESCALEDB_PASSWORD
  • PGADMIN_DEFAULT_EMAIL, PGADMIN_DEFAULT_PASSWORD
end legend

@enduml
```

## Tool Comparison

### Feature Matrix

| Feature | pgAdmin | pgweb | Adminer | Azimutt |
|---------|---------|-------|---------|---------|
| Purpose | Full-featured administration console | Lightweight web-based SQL client | Single-file admin tool | Schema visualization and ERD |
| Best For | Production management, complex workflows | Development queries, ad-hoc analysis | Quick CRUD, import/export | Understanding data model, onboarding |
| Query Editor | Advanced editor with autocomplete, explain, history | Minimal editor with syntax highlight | Basic SQL textarea | Read-only (no query execution) |
| Schema Browser | Full tree (databases, schemas, tables, functions) | Table list with basic metadata | Full tree with quick links | Interactive ERD with relationships |
| Data Export | CSV, JSON, SQL, custom formats | CSV, JSON, XML | CSV, SQL | Export diagrams (PNG/SVG), JSON |
| Data Import | CSV, SQL scripts, backup/restore | Not supported | CSV, SQL | JSON project import |
| Visual Query Builder | Yes | No | No | No |
| ERD Visualization | Basic (ERD Tool) | No | No | Advanced interactive diagram |
| Backup / Restore | pg_dump, pg_restore integration | No | Basic SQL export | No |
| User Management | Roles, privileges, password reset | No | Basic (depending on permissions) | No |
| Performance Impact | High (full-featured, heavier container) | Low (Go binary, lightweight) | Very low (single PHP file) | Medium (Elixir app, schema analysis) |
| Learning Curve | Moderate to steep | Low | Low | Low |
| Session Persistence | Yes (volume `timescaledb-pgadmin`) | Yes (volume `timescaledb-pgweb`) | No | Yes (stored in TimescaleDB via `DATABASE_URL`) |

### When to Use Each Tool

- **pgAdmin**: Default choice for production-grade administration, complex query tuning, backup/restore workflow, user/role management, and scheduled maintenance tasks.
- **pgweb**: Ideal for developers needing quick access to run queries, browse tables, or export CSV during development and debugging sessions.
- **Adminer**: Useful when you need a lightweight all-in-one admin tool, to validate credentials, perform quick CRUD operations, or import small datasets without the overhead of pgAdmin.
- **Azimutt**: Best for exploring schema relationships, generating ERDs, onboarding new team members, and documenting database structure for architecture reviews.

## Connection Setup

### pgAdmin

1. Open **http://localhost:5050**.
2. Sign in using `${PGADMIN_DEFAULT_EMAIL}` / `${PGADMIN_DEFAULT_PASSWORD}` from the root `.env`.
3. Right-click **Servers** → **Register → Server…**.
4. **General** tab:
   - Name: `TradingSystem TimescaleDB`
5. **Connection** tab:
   - Host name/address: `timescaledb` (inside Docker) or `localhost` (host machine)
   - Port: `5432` (internal) or `5433` (external port binding)
   - Maintenance database: `${TIMESCALEDB_DB}` (default `tradingsystem`)
   - Username: `${TIMESCALEDB_USER}` (default `timescale`)
   - Password: `${TIMESCALEDB_PASSWORD}`
   - Save password: ✅ enable
6. **SSL** tab: set SSL Mode to **Disable** (local development) or configure certificates for production.
7. Click **Save**. The server tree should populate.

> Troubleshooting: If `timescaledb` host fails, try `host.docker.internal` (Docker Desktop) or `localhost` with port `5433`.

### pgweb

1. Open **http://localhost:8081**.
2. pgweb auto-connects via `DATABASE_URL`, so the status badge in the top-right should show **Connected**.
3. Browse tables from the left sidebar and run SQL in the editor.
4. Query history and settings persist inside volume `timescaledb-pgweb`.

> If disconnected, restart the container and verify `DATABASE_URL` matches the TimescaleDB credentials.

### Adminer (optional)

1. Start optional services:
   ```bash
   docker compose -f tools/compose/docker-compose.timescale.yml --profile optional up -d
   ```
2. Open **http://localhost:8082**.
3. Fill in the login form:
   - System: **PostgreSQL**
   - Server: `timescaledb`
   - Username: `${TIMESCALEDB_USER}`
   - Password: `${TIMESCALEDB_PASSWORD}`
   - Database: `${TIMESCALEDB_DB}` (or leave empty to browse all)
4. Click **Login** to access schema browser and query editor.

> Adminer does not persist sessions—re-enter credentials after restart.

### Azimutt (optional)

1. Start optional services (if not already running):
   ```bash
   docker compose -f tools/compose/docker-compose.timescale.yml --profile optional up -d
   ```
2. Open **http://localhost:8084**.
3. If prompted, authenticate using the password defined by `${AZIMUTT_AUTH_PASSWORD}`.
4. Create a project or open an existing one.
5. Add database source with connection string:
   ```
   postgresql://${TIMESCALEDB_USER}:${TIMESCALEDB_PASSWORD}@timescaledb:5432/${TIMESCALEDB_DB}
   ```
   Alternatively, fill the discrete fields:
   - Host: `timescaledb`
   - Port: `5432`
   - Database: `${TIMESCALEDB_DB}`
   - Username: `${TIMESCALEDB_USER}`
   - Password: `${TIMESCALEDB_PASSWORD}`
6. Run schema analysis to generate an interactive ERD. Project metadata is stored inside the configured database.

## Common Use Cases

### Query Hypertables

- List hypertables:
  ```sql
  SELECT * FROM timescaledb_information.hypertables;
  ```
- Inspect recent data:
  ```sql
  SELECT *
  FROM trading_signals
  WHERE timestamp > NOW() - INTERVAL '1 hour'
  ORDER BY timestamp DESC
  LIMIT 100;
  ```
- Tools: pgweb for quick checks; pgAdmin for advanced analysis and explain plans.

### Review Continuous Aggregates

- List aggregates:
  ```sql
  SELECT * FROM timescaledb_information.continuous_aggregates;
  ```
- Query aggregate view:
  ```sql
  SELECT *
  FROM hourly_trading_metrics
  WHERE bucket >= NOW() - INTERVAL '24 hours';
  ```
- Tools: pgAdmin (metadata, refresh control) or pgweb (fast exploration).

### Export Data to CSV

- **pgAdmin**: Execute query → Right-click result grid → **Export** → choose CSV → download.
- **pgweb**: Run query → Click **Export** → select CSV → download file.
- **Adminer**: Select table → **Export** → choose CSV → download.

### Explore Schema Relationships

- **Azimutt**: Analyze schema → Explore interactive ERD, highlight foreign keys, export diagrams.
- **pgAdmin**: Inspect schema tree, view constraints under each table, use ERD Tool for quick diagrams.

### Inspect Compression Policies

- Check settings:
  ```sql
  SELECT * FROM timescaledb_information.compression_settings;
  ```
- Check compressed chunks:
  ```sql
  SELECT *
  FROM timescaledb_information.compressed_chunk_stats;
  ```
- Tools: pgAdmin (detailed UI) or pgweb (quick verification).

### Monitor Replication Lag

- Track sync status:
  ```sql
  SELECT NOW() - last_synced AS lag
  FROM sync_control
  ORDER BY last_synced DESC
  LIMIT 1;
  ```
- Tools: pgweb for quick glance; pgAdmin for scheduled monitoring dashboards.

## Backup Procedures

### TimescaleDB Backups

- Automated daily backups run via `timescaledb-backup` (`0 2 * * *`).
- Trigger manual backup:
  ```bash
  docker exec data-timescaledb-backup /backup.sh
  ```
- List backups:
  ```bash
  docker exec data-timescaledb-backup ls -lh /backups
  ```
- Copy backup to host:
  ```bash
  docker cp data-timescaledb-backup:/backups/tradingsystem_2025-10-16.sql.gz ./backup.sql.gz
  ```
- Detailed restore workflows live in the [TimescaleDB infrastructure README](https://github.com/marceloterra/TradingSystem/blob/main/backend/data/timescaledb/README.md).

### pgAdmin Configuration Backup

pgAdmin stores server definitions, preferences, and history inside volume `timescaledb-pgadmin`.

```bash
# Backup pgAdmin volume
docker run --rm \
  -v timescaledb-pgadmin:/source:ro \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/pgadmin-backup-$(date +%Y%m%d).tar.gz -C /source .

# Restore pgAdmin volume
docker compose -f tools/compose/docker-compose.timescale.yml stop timescaledb-pgadmin
docker run --rm \
  -v timescaledb-pgadmin:/target \
  -v "$(pwd)":/backup \
  alpine sh -c "cd /target && tar xzf /backup/pgadmin-backup-20251016.tar.gz"
docker compose -f tools/compose/docker-compose.timescale.yml start timescaledb-pgadmin
```

- Export server connections via UI: **File → Backup → Server Groups/Servers**.
- Import server connections: **File → Restore → Server Groups/Servers**.

### pgweb Session Backup

- pgweb query history persists in volume `timescaledb-pgweb`.
- Backup volume (same pattern):
  ```bash
  docker run --rm \
    -v timescaledb-pgweb:/source:ro \
    -v "$(pwd)":/backup \
    alpine tar czf /backup/pgweb-backup-$(date +%Y%m%d).tar.gz -C /source .
  ```

### Azimutt Project Backup

- Azimutt stores project metadata inside the configured database (via `DATABASE_URL`), so there is no separate container volume to back up.
- Export projects from the UI: Project **Settings → Export** (JSON) and re-import via **Settings → Import** when restoring.

## Troubleshooting

| Issue | Symptoms | Likely Causes | Resolutions |
|-------|----------|---------------|-------------|
| UI not reachable | Browser shows “Connection refused” | Container stopped, port conflict, firewall | `docker ps | grep timescaledb`, `docker port data-timescaledb-pgadmin`, check logs, restart service, confirm optional profile started |
| pgAdmin login fails | “Invalid username/password” | Wrong credentials, `.env` not loaded | Verify `.env` values, `docker exec data-timescaledb-pgadmin env | grep PGADMIN`, recreate container with updated vars |
| pgAdmin cannot connect to DB | “Could not connect to server” | Wrong host/port, DB unavailable | Use `timescaledb:5432` internally or `localhost:5433` externally, `docker exec data-timescaledb pg_isready -U timescale`, inspect logs |
| pgweb disconnected | Red status badge | Invalid `DATABASE_URL`, TimescaleDB down | `docker exec data-timescaledb-pgweb env | grep DATABASE_URL`, restart container, validate credentials |
| Adminer unable to connect | Login error | Wrong server name, network isolation | Use `timescaledb` host, ensure container shares network (`compose_default`), verify DB running |
| Azimutt schema analysis fails | “Failed to connect” | Bad connection string, missing permissions | Use `postgresql://user:pass@timescaledb:5432/db`, grant schema usage, inspect logs |
| Slow queries / timeouts | Long-running requests | Large result set, missing indexes | Add `LIMIT`, analyze query via pgAdmin, inspect indexes, consider continuous aggregates |
| Port already in use | Compose start fails | Previous service bound to port | `lsof -i :5050`, change port in `.env`, stop conflicting process, restart stack |

## Validation Checklist

### UI Accessibility

- [ ] pgAdmin reachable at http://localhost:5050 and login succeeds.
- [ ] pgweb reachable at http://localhost:8081 with green “Connected” badge.
- [ ] Adminer reachable at http://localhost:8082 after starting optional profile.
- [ ] Azimutt reachable at http://localhost:8084 with successful authentication.

### Database Connectivity

- [ ] pgAdmin server “TradingSystem TimescaleDB” connected; schemas visible.
- [ ] pgweb displays database name and table list.
- [ ] Adminer shows database dropdown and table rows.
- [ ] Azimutt completes schema analysis and displays ERD.

### Hypertable & Aggregate Queries

- [ ] `SELECT * FROM timescaledb_information.hypertables;` returns rows.
- [ ] `SELECT * FROM trading_signals LIMIT 10;` executes successfully.
- [ ] `SELECT * FROM timescaledb_information.chunks ...;` shows chunks.
- [ ] `SELECT * FROM timescaledb_information.continuous_aggregates;` returns data.
- [ ] Aggregate query (e.g., `hourly_trading_metrics`) returns expected results.

### CSV Exports

- [ ] pgAdmin exports CSV correctly (verified by opening file).
- [ ] pgweb exports CSV with correct headers.
- [ ] Adminer exports CSV without errors.

### Backup Procedures

- [ ] `timescaledb-backup` container running and producing files.
- [ ] Manual backup (`/backup.sh`) succeeds.
- [ ] Backup copied to host and validated.
- [ ] pgAdmin volume backup archive created.
- [ ] Azimutt project export (JSON) generated and stored securely.

### Health & Performance

- [ ] `docker ps --filter "name=timescaledb"` shows all containers **Up (healthy)**.
- [ ] `docker stats` reveals stable CPU/memory usage.
- [ ] No restart loops in `docker ps`.
- [ ] UI responsiveness acceptable (`<2s` for clicks/navigation).

### Security

- [ ] `docker port` shows bindings to `127.0.0.1`.
- [ ] External access blocked (verified from different host).
- [ ] Strong passwords configured in `.env` (no defaults).
- [ ] `.env` permissions restricted (e.g., `chmod 600 .env`).
- [ ] Optional tools stopped when not in active use.

## Security Best Practices

### Access Control

- Keep all UI bindings on `127.0.0.1`. For remote access, use SSH tunneling:
  ```bash
  ssh -L 5050:localhost:5050 user@server
  ```
- Prefer VPN-based access for teams instead of exposing ports.
- Audit access regularly and revoke unused credentials.

### Credential Management

- Store secrets only in the centralized `.env`; never commit `.env` to Git.
- Use long, randomly generated passwords (`openssl rand -base64 32`).
- Rotate passwords at least every 90 days.
- Share credentials securely (password manager or secret management process).

### Network Security

- UI tools communicate internally with TimescaleDB via Docker network `compose_default`.
- External port 5433 exists for direct connections—restrict to trusted hosts.
- Start optional tools only when needed to reduce attack surface.
- Monitor container logs for suspicious access attempts.

### Data Protection

- Rely on automated nightly backups plus periodic manual snapshots.
- Test restore procedures quarterly to ensure readiness.
- Backup pgAdmin and pgweb volumes and export Azimutt projects before upgrades.
- Encrypt off-site backup archives when required by policy.

### Audit & Monitoring

- Review container logs: `docker logs data-timescaledb-pgadmin --tail 100`.
- Track failed login attempts and unusual activity.
- Use pgAdmin query history for audit trails.
- Configure monitoring alerts for container restarts or health-check failures.

## Additional Resources

- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [pgweb GitHub](https://github.com/sosedoff/pgweb)
- [Adminer Documentation](https://www.adminer.org/)
- [Azimutt Documentation](https://azimutt.app/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [TimescaleDB Operations Guide](timescaledb-operations.md)
- [TimescaleDB Infrastructure README](https://github.com/marceloterra/TradingSystem/blob/main/backend/data/timescaledb/README.md)
- [Environment Configuration Guide](../../../ops/ENVIRONMENT-CONFIGURATION.md)
- [Docker Compose Stack](../../../../../tools/compose/docker-compose.timescale.yml)

## Conclusion

The TimescaleDB stack provides pgAdmin, pgweb, Adminer, and Azimutt to cover administration, rapid querying, lightweight CRUD, and schema visualization workflows respectively. By following the connection instructions, validation checklist, and security best practices in this guide, teams can operate safely and efficiently. Use the centralized start script (`scripts/docker/start-stacks.sh`) to launch the stack and start optional tools only when necessary. For deeper operational topics, consult the TimescaleDB infrastructure README and related documentation.
