# TimescaleDB Stack

Este diretório contém artefatos para operar a camada analítica TimescaleDB mantendo o QuestDB como fonte primária de ingestão.

## Componentes
- `schema.sql` — criação de hypertables (`trading_signals`, `executions`, `performance_metrics`) e índice para replication lag.
- `maintenance.sql` — políticas de compressão/retention e job de análise básica.
- `seed.sql` — exemplo de seed inicial a partir de arquivos CSV exportados do QuestDB.

## WebScraper Schema

**Database:** `webscraper`  
**Schema File:** `webscraper-schema.sql`  
**Seed File:** `webscraper-seed.sql`  
**Documentation:** `docs/context/backend/data/webscraper-schema.md`

**Tables:**
- `scrape_templates` - Reusable scraping configurations
- `scrape_jobs` - Scraping and crawling job history (hypertable)
- `job_schedules` - Scheduled scraping jobs (cron, interval, one-time)

**Features:**
- TimescaleDB hypertable for time-series job data
- Automatic compression after 7 days (70-90% storage reduction)
- Automatic retention policy (90 days, configurável)
- Continuous aggregate for daily statistics
- JSONB storage for flexible options and results

**Initialization:**
```bash
# Create database and apply schema
bash scripts/webscraper/init-database.sh --seed

# Or manually:
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE webscraper;"
psql -h localhost -p 5433 -U postgres -d webscraper -f infrastructure/timescaledb/webscraper-schema.sql
psql -h localhost -p 5433 -U postgres -d webscraper -f infrastructure/timescaledb/webscraper-seed.sql
```

**Prisma Integration:**
```bash
cd backend/api/webscraper-api
npm run prisma:migrate  # Apply migrations
npm run prisma:generate # Generate Prisma Client
```

**Monitoring:**
```sql
-- Check hypertable size
SELECT 
  hypertable_size('scrape_jobs') AS total_size,
  hypertable_compressed_size('scrape_jobs') AS compressed_size,
  pg_size_pretty(hypertable_size('scrape_jobs')) AS total_pretty,
  pg_size_pretty(hypertable_compressed_size('scrape_jobs')) AS compressed_pretty;

-- Check compression ratio
SELECT 
  chunk_name,
  before_compression_total_bytes,
  after_compression_total_bytes,
  ROUND(100.0 * after_compression_total_bytes / before_compression_total_bytes, 2) AS compression_ratio
FROM chunk_compression_stats('scrape_jobs')
ORDER BY before_compression_total_bytes DESC
LIMIT 10;
```

## Fluxo de ingestão
1. O serviço `timescaledb-sync` (ver `backend/services/timescaledb-sync/`) executa a cada N minutos.
2. Novos registros em QuestDB são inseridos em TimescaleDB com até 5 minutos de atraso aceitável.
3. Monitoração do atraso é feita via exporter (`quay.io/prometheuscommunity/postgres-exporter`).

## Backup

### Database Backups (Automated)

Use `scripts/database/backup-timescaledb.sh` para backup pontual ou rely na rotina do container `timescaledb-backup`.

**Automated backups run daily at 2 AM** via the `timescaledb-backup` container using `pg_dump`.

**Backup location:** Volume `timescaledb-backups` (mapped to `/backups` in container)

**Manual backup:**

```bash
# Trigger manual backup
docker exec data-timescaledb-backup /backup.sh

# List available backups
docker exec data-timescaledb-backup ls -lh /backups

# Copy backup to host
docker cp data-timescaledb-backup:/backups/tradingsystem_2025-10-15.sql.gz ./backup.sql.gz
```

**Restore from backup:**

```bash
# Copy backup file into container
docker cp ./backup.sql.gz data-timescaledb:/tmp/backup.sql.gz

# Restore database
docker exec -it data-timescaledb bash
gunzip /tmp/backup.sql.gz
psql -U timescale -d tradingsystem < /tmp/backup.sql
```

### PgAdmin Backup & Restore

The PgAdmin volume contains server connections, user preferences, and saved queries.

**Backup PgAdmin volume:**

```bash
# Create volume backup
docker run --rm \
  -v timescaledb-pgadmin:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/pgadmin-backup-$(date +%Y%m%d).tar.gz -C /source .

# Backup created: pgadmin-backup-20251015.tar.gz
```

**Restore PgAdmin volume:**

```bash
# Stop PgAdmin container
docker compose -f infrastructure/compose/docker-compose.timescale.yml stop timescaledb-pgadmin

# Restore from backup
docker run --rm \
  -v timescaledb-pgadmin:/target \
  -v $(pwd):/backup \
  alpine sh -c "cd /target && tar xzf /backup/pgadmin-backup-20251015.tar.gz"

# Restart PgAdmin
docker compose -f infrastructure/compose/docker-compose.timescale.yml start timescaledb-pgadmin
```

**Export server groups (via PgAdmin UI):**

1. Open PgAdmin at http://localhost:5050
2. Right-click "Servers" → "Backup Globals..."
3. Save server connections to file
4. Import on new installation: "Restore Globals..."

**Persistent storage configuration:**

The PgAdmin container stores data in `/var/lib/pgadmin` mapped to volume `timescaledb-pgadmin`:

- Server connections: `/var/lib/pgadmin/storage/`
- User preferences: `/var/lib/pgadmin/pgadmin4.db`
- Query history: `/var/lib/pgadmin/sessions/`

**IMPORTANT:** Always backup both database AND PgAdmin volume for complete disaster recovery.

## UI Tools

The TimescaleDB stack includes four complementary UI tools to cover administration, querying, lightweight CRUD, and schema visualization workflows.

| Tool | URL | Port | Status | Best For |
|------|-----|------|--------|----------|
| **pgAdmin** | http://localhost:5050 | 5050 | Always Running | Full database administration |
| **pgweb** | http://localhost:8081 | 8081 | Always Running | Quick queries & data exploration |
| **Adminer** | http://localhost:8082 | 8082 | Optional | Lightweight CRUD operations |
| **Azimutt** | http://localhost:8084 | 8084 | Optional | ERD visualization & schema exploration |

### Default Credentials

- **pgAdmin**: Email/password from root `.env` (`PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`)
- **pgweb**: Auto-connected via `DATABASE_URL` (no login required)
- **Adminer**: Server `timescaledb`, credentials from `.env` (`TIMESCALEDB_USER`, `TIMESCALEDB_PASSWORD`, `TIMESCALEDB_DB`)
- **Azimutt**: Password authentication controlled by `.env` (`AZIMUTT_AUTH_PASSWORD`)

### Starting Optional Tools

Optional services (Adminer, Azimutt) run only when requested:

```bash
# Start optional tools
docker compose -f infrastructure/compose/docker-compose.timescale.yml --profile optional up -d

# Stop optional tools
docker compose -f infrastructure/compose/docker-compose.timescale.yml --profile optional down
```

### Quick Start

**pgAdmin (full admin)**
- Open http://localhost:5050
- Sign in with `.env` credentials
- Register server using host `timescaledb`, port `5432`, database `${TIMESCALEDB_DB}`

**pgweb (quick queries)**
- Open http://localhost:8081
- Already connected via `DATABASE_URL`
- Browse tables on the left, run SQL from the editor

### When to Use Each Tool

- **pgAdmin**: Production management, complex queries, backup/restore, user/role administration
- **pgweb**: Development queries, CSV exports, lightweight troubleshooting
- **Adminer**: Quick CRUD tasks, import/export, smoke-testing credentials
- **Azimutt**: Schema exploration, ERD documentation, onboarding sessions

### Security

- ✅ All UI services bind to `127.0.0.1` (localhost-only)
- ✅ Not exposed to external networks — use SSH tunneling (`ssh -L 5050:localhost:5050 user@server`) if needed
- ✅ Strong passwords required; configure in root `.env`
- ✅ Optional tools should run only when actively used to minimize attack surface

### Comprehensive Guide

For detailed setup instructions, feature comparison, troubleshooting, validation checklist, and backup procedures for UI configurations, see the full **[Database UI Tools Guide](../../docs/context/backend/data/guides/database-ui-tools.md)**.

### Related Documentation

- [TimescaleDB Operations Guide](../../docs/context/backend/data/guides/timescaledb-operations.md)
- [Environment Configuration](../../docs/context/ops/ENVIRONMENT-CONFIGURATION.md)
- [Docker Compose Stack](../compose/docker-compose.timescale.yml)
