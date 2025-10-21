# Scripts - TradingSystem

Direct access to project automation scripts with safety checks.

## Usage

```bash
/scripts <script-name> [options]
```

## Available Scripts

### Infrastructure Scripts

#### `start-all-stacks` - Start all Docker Compose stacks
Starts all infrastructure, monitoring, data, frontend, and AI stacks.

**Usage:**
```bash
/scripts start-all-stacks
```

**Equivalent to:**
```bash
bash scripts/services/start-all.sh
```

**Stacks started:**
- Infrastructure (Prometheus, Grafana)
- Data (QuestDB, TimescaleDB)
- Monitoring
- Frontend services
- AI tools

#### `stop-all-stacks` - Stop all Docker Compose stacks
Stops all running stacks gracefully.

**Usage:**
```bash
/scripts stop-all-stacks
```

**Equivalent to:**
```bash
bash scripts/services/stop-all.sh
```

### Maintenance Scripts

#### `health-check-all` - Full system health check
Comprehensive health check of all services, containers, and databases.

**Usage:**
```bash
/scripts health-check-all
/scripts health-check-all --format json
/scripts health-check-all --format prometheus
/scripts health-check-all --services-only
/scripts health-check-all --containers-only
```

**Equivalent to:**
```bash
bash scripts/maintenance/health-check-all.sh [options]
```

**Options:**
- `--format json` - JSON output
- `--format prometheus` - Prometheus metrics
- `--services-only` - Check only local services
- `--containers-only` - Check only Docker containers

### Environment Scripts

#### `validate-env` - Validate environment variables
Checks that all required environment variables are set correctly.

**Usage:**
```bash
/scripts validate-env
```

**Equivalent to:**
```bash
bash scripts/env/validate-env.sh
```

**Checks:**
- Required variables present
- Values format correct
- No conflicts
- Security issues (exposed secrets)

#### `backup-env` - Backup .env file
Creates timestamped backup of `.env` file.

**Usage:**
```bash
/scripts backup-env
```

**Backup location:** `.env.backup.YYYY-MM-DD-HHMMSS`

### Development Scripts

#### `start-services` - Start all development services
Starts all local Node.js services for development.

**Usage:**
```bash
/scripts start-services
```

**Services started:**
- Dashboard (port 3103)
- Docusaurus (port 3004)
- Workspace API (port 3200)
- TP Capital (port 3200)
- B3 Market Data (port 3302)
- Documentation API (port 3400)
- Service Launcher (port 3500)
- Firecrawl Proxy (port 3600)

**Note:** Each service runs in a separate terminal. Use `tmux` or `screen` for better management.

#### `stop-services` - Stop all development services
Stops all running Node.js development services.

**Usage:**
```bash
/scripts stop-services
```

### Database Scripts

#### `migrate-timescaledb` - Run TimescaleDB migrations
Executes pending database migrations for TimescaleDB.

**Usage:**
```bash
/scripts migrate-timescaledb
```

**Equivalent to:**
```bash
cd backend/data/schemas/workspace
node migrate-lowdb-to-timescaledb.js
```

#### `backup-databases` - Backup all databases
Creates backups of QuestDB, TimescaleDB, and PostgreSQL.

**Usage:**
```bash
/scripts backup-databases
```

**Backup location:** `data/backups/YYYY-MM-DD/`

### Testing Scripts

#### `test-all` - Run all tests
Executes test suites for all projects (frontend + backend).

**Usage:**
```bash
/scripts test-all
```

**Tests:**
- Frontend unit tests (Jest + React Testing Library)
- Backend API tests (Jest + Supertest)
- Integration tests (Playwright)
- E2E tests (Cypress)

#### `lint-all` - Run linters on all projects
Executes ESLint, Prettier, and TypeScript checks.

**Usage:**
```bash
/scripts lint-all
/scripts lint-all --fix
```

**Options:**
- `--fix` - Auto-fix issues when possible

### Monitoring Scripts

#### `export-metrics` - Export Prometheus metrics
Exports current metrics snapshot to file.

**Usage:**
```bash
/scripts export-metrics
```

**Output:** `data/metrics/metrics-YYYY-MM-DD-HHMMSS.txt`

#### `generate-report` - Generate system health report
Creates detailed health report with charts and statistics.

**Usage:**
```bash
/scripts generate-report
```

**Output:** `docs/reports/health-report-YYYY-MM-DD.html`

## Script Locations

```
TradingSystem/
├── start-all-stacks.sh                    # Root level
├── stop-all-stacks.sh                     # Root level
├── scripts/
│   ├── maintenance/
│   │   ├── health-check-all.sh
│   │   ├── backup-databases.sh
│   │   └── cleanup-logs.sh
│   ├── env/
│   │   ├── validate-env.sh
│   │   └── backup-env.sh
│   ├── development/
│   │   ├── start-services.sh
│   │   └── stop-services.sh
│   └── monitoring/
│       ├── export-metrics.sh
│       └── generate-report.sh
```

## Safety Checks

Before executing potentially destructive scripts, Claude Code will:

1. **Confirm action** - Ask for confirmation
2. **Show preview** - Display what will be executed
3. **Check prerequisites** - Verify dependencies
4. **Backup data** - Create backups if necessary

**Scripts requiring confirmation:**
- `stop-all-stacks` - Stops all containers
- `migrate-timescaledb` - Modifies database
- `backup-databases` - Accesses production data
- Database deletion/truncation scripts

## Creating New Scripts

To add new automation scripts:

1. **Create script file:**
   ```bash
   scripts/category/my-script.sh
   ```

2. **Make executable:**
   ```bash
   chmod +x scripts/category/my-script.sh
   ```

3. **Add to this documentation:**
   Update `scripts.md` with new script usage

4. **Test thoroughly:**
   ```bash
   /scripts my-script
   ```

## Error Handling

Scripts implement proper error handling:
- Exit codes (0 = success, non-zero = error)
- Error messages to stderr
- Rollback on failure (when applicable)
- Logging to `logs/scripts/`

**Check script logs:**
```bash
tail -f logs/scripts/script-name.log
```

## See Also

- [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)
- [Health Monitoring Guide](../../docs/context/ops/health-monitoring.md)
- [Environment Configuration](../../docs/context/ops/ENVIRONMENT-CONFIGURATION.md)
- [Maintenance Procedures](../../docs/context/ops/maintenance-procedures.md)

