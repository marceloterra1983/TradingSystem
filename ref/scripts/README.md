# Scripts & Automation Reference

> **DevOps scripts and automation tools** - Bash, Node.js, Python
> **Last Updated:** 2025-11-05

## Overview

**Location:** `scripts/`

The TradingSystem includes comprehensive automation scripts for deployment, maintenance, testing, and governance. All scripts follow best practices with error handling, logging, and idempotency.

## Script Categories

```
scripts/
├── docker/              # Docker and container management
├── maintenance/         # System maintenance and health checks
├── docs/                # Documentation generation and validation
├── governance/          # Policy validation and security scans
├── env/                 # Environment variable management
├── qdrant/              # Qdrant vector database operations
├── rag/                 # RAG system management
├── neon/                # Neon database setup (planned)
├── setup/               # One-time setup scripts
├── deployment/          # Deployment automation
├── testing/             # Test automation
└── start.sh             # Universal startup script
```

## Universal Startup/Shutdown

### start.sh - Universal Startup

**Location:** `scripts/start.sh`

**Purpose:** Single command to start entire system (Docker + Node.js services)

**Usage:**
```bash
# Standard startup
bash scripts/start.sh

# Force kill processes on occupied ports
bash scripts/start.sh --force-kill

# Skip Docker stack
bash scripts/start.sh --skip-docker

# Skip Node.js services
bash scripts/start.sh --skip-services

# Dry run (show what would be done)
bash scripts/start.sh --dry-run

# Help
bash scripts/start.sh --help
```

**What it does:**
1. Validates environment variables
2. Starts Docker Compose stacks (databases, monitoring, RAG)
3. Waits for containers to be healthy
4. Starts Node.js services (dashboard, APIs)
5. Displays summary with URLs

**Output:**
```
🚀 TradingSystem Startup

✓ Docker stacks started
✓ Dashboard started (PID: 12345) - http://localhost:3103
✓ Documentation Hub started - http://localhost:3404

All services running! 🎉
```

---

### stop.sh - Universal Shutdown

**Location:** `scripts/stop.sh`

**Purpose:** Graceful shutdown of all services

**Usage:**
```bash
# Standard shutdown
bash scripts/stop.sh

# Force kill all processes
bash scripts/stop.sh --force

# Stop and remove Docker volumes
bash scripts/stop.sh --with-volumes

# Stop and clean logs
bash scripts/stop.sh --clean-logs

# Help
bash scripts/stop.sh --help
```

## Docker Management

### start-stacks.sh

**Location:** `scripts/docker/start-stacks.sh`

**Purpose:** Start all Docker Compose stacks in correct order

**Usage:**
```bash
bash scripts/docker/start-stacks.sh

# Start specific stack
bash scripts/docker/start-stacks.sh database
```

**Stacks started:**
1. Database stack (TimescaleDB, QuestDB, Redis)
2. Qdrant cluster
3. Monitoring (Prometheus, Grafana)
4. RAG services (LlamaIndex, Ollama)
5. Documentation hub
6. Application services

---

### stop-stacks.sh

**Location:** `scripts/docker/stop-stacks.sh`

**Purpose:** Stop all Docker Compose stacks gracefully

**Usage:**
```bash
bash scripts/docker/stop-stacks.sh

# Remove volumes
bash scripts/docker/stop-stacks.sh --volumes
```

---

### fix-unhealthy-containers.sh

**Location:** `scripts/docker/fix-unhealthy-containers.sh`

**Purpose:** Automatically fix unhealthy containers

**Usage:**
```bash
bash scripts/docker/fix-unhealthy-containers.sh

# Dry run
bash scripts/docker/fix-unhealthy-containers.sh --dry-run
```

**Actions:**
- Restarts unhealthy containers
- Recreates if restart fails
- Logs all actions
- Sends notifications (optional)

## System Maintenance

### health-check-all.sh

**Location:** `scripts/maintenance/health-check-all.sh`

**Purpose:** Comprehensive health check (services + containers + databases)

**Usage:**
```bash
# Complete health check
bash scripts/maintenance/health-check-all.sh

# JSON output (for automation)
bash scripts/maintenance/health-check-all.sh --format json

# Prometheus format (for monitoring)
bash scripts/maintenance/health-check-all.sh --format prometheus

# Check only services
bash scripts/maintenance/health-check-all.sh --services-only

# Check only containers
bash scripts/maintenance/health-check-all.sh --containers-only

# Check only databases
bash scripts/maintenance/health-check-all.sh --databases-only
```

**Output:**
```json
{
  "overallHealth": "healthy",
  "timestamp": "2025-11-05T10:00:00Z",
  "services": {
    "dashboard": {
      "status": "running",
      "port": 3103,
      "pid": 12345,
      "uptime": "2h 30m"
    }
  },
  "containers": {
    "timescaledb": {
      "status": "healthy",
      "uptime": "2h 31m"
    }
  },
  "databases": {
    "timescaledb": {
      "status": "connected",
      "latency": "5ms"
    }
  }
}
```

---

### restart-dashboard.sh

**Location:** `scripts/maintenance/restart-dashboard.sh`

**Purpose:** Restart dashboard with proper cleanup

**Usage:**
```bash
bash scripts/maintenance/restart-dashboard.sh
```

---

### cleanup-orphans.sh

**Location:** `scripts/maintenance/cleanup-orphans.sh`

**Purpose:** Remove orphaned Docker resources

**Usage:**
```bash
bash scripts/maintenance/cleanup-orphans.sh

# Include volumes
bash scripts/maintenance/cleanup-orphans.sh --volumes
```

## Documentation Scripts

### validate-frontmatter.py

**Location:** `scripts/docs/validate-frontmatter.py`

**Purpose:** Validate Docusaurus frontmatter in all MDX files

**Usage:**
```bash
python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content

# Generate report
python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content --output report.json
```

**Validations:**
- Required fields (title, tags, domain, type, summary, status, last_review)
- Valid values (status: active/deprecated/archived)
- Date formats (YYYY-MM-DD)
- Owner validation

---

### start-dashboard-with-docs.sh

**Location:** `scripts/docs/start-dashboard-with-docs.sh`

**Purpose:** Start dashboard and documentation hub together

**Usage:**
```bash
bash scripts/docs/start-dashboard-with-docs.sh
```

---

### pre-flight-check.sh

**Location:** `scripts/docs/pre-flight-check.sh`

**Purpose:** Pre-deployment validation for documentation

**Usage:**
```bash
bash scripts/docs/pre-flight-check.sh

# CI mode (stricter validation)
bash scripts/docs/pre-flight-check.sh --ci
```

**Checks:**
- Frontmatter validation
- Broken links detection
- Image references
- Code block syntax
- API spec validation

## Governance Scripts

### scan-secrets.mjs

**Location:** `governance/automation/scan-secrets.mjs`

**Purpose:** Scan codebase for exposed secrets

**Usage:**
```bash
node governance/automation/scan-secrets.mjs

# Generate audit report
node governance/automation/scan-secrets.mjs --audit

# Fix issues automatically
node governance/automation/scan-secrets.mjs --fix
```

**Detects:**
- API keys
- Passwords
- Tokens
- Private keys
- Connection strings

---

### validate-envs.mjs

**Location:** `governance/automation/validate-envs.mjs`

**Purpose:** Validate environment variables across all services

**Usage:**
```bash
node governance/automation/validate-envs.mjs

# Check specific service
node governance/automation/validate-envs.mjs --service workspace
```

**Validations:**
- Required variables present
- Valid formats (URLs, ports, etc.)
- No duplicate definitions
- Consistent naming conventions

---

### validate-policies.mjs

**Location:** `governance/automation/validate-policies.mjs`

**Purpose:** Validate compliance with governance policies

**Usage:**
```bash
node governance/automation/validate-policies.mjs

# Generate compliance report
node governance/automation/validate-policies.mjs --report
```

## RAG System Scripts

### query-llamaindex.sh

**Location:** `scripts/rag/query-llamaindex.sh`

**Purpose:** CLI interface for RAG queries

**Usage:**
```bash
# Ask a question
bash scripts/rag/query-llamaindex.sh "What is the workspace API?"

# Semantic search
bash scripts/rag/query-llamaindex.sh --search "database schema"

# List collections
bash scripts/rag/query-llamaindex.sh --list-collections
```

---

### ingest-documents.py

**Location:** `scripts/rag/ingest-documents.py`

**Purpose:** Ingest documents into Qdrant vector database

**Usage:**
```bash
# Ingest all docs
python3 scripts/rag/ingest-documents.py --docs-dir ./docs/content

# Ingest specific directory
python3 scripts/rag/ingest-documents.py --docs-dir ./docs/content/api

# Force reindex
python3 scripts/rag/ingest-documents.py --force
```

## Qdrant Management

### backup-cluster.sh

**Location:** `scripts/qdrant/backup-cluster.sh`

**Purpose:** Backup Qdrant vector database

**Usage:**
```bash
bash scripts/qdrant/backup-cluster.sh

# Specify backup directory
bash scripts/qdrant/backup-cluster.sh --output /backups/qdrant
```

---

### migrate-to-ha-cluster.sh

**Location:** `scripts/qdrant/migrate-to-ha-cluster.sh`

**Purpose:** Migrate single-node Qdrant to HA cluster

**Usage:**
```bash
bash scripts/qdrant/migrate-to-ha-cluster.sh

# Dry run
bash scripts/qdrant/migrate-to-ha-cluster.sh --dry-run
```

## Environment Management

### validate-env.sh

**Location:** `scripts/env/validate-env.sh`

**Purpose:** Validate root .env file

**Usage:**
```bash
bash scripts/env/validate-env.sh

# Verbose output
bash scripts/env/validate-env.sh --verbose

# CI mode (strict)
bash scripts/env/validate-env.sh --ci
```

**Checks:**
- Required variables present
- Valid port ranges (7000-7999 for databases)
- No port conflicts
- Valid URLs and paths
- Password strength

## Setup Scripts

### setup-direnv.sh

**Location:** `scripts/setup/setup-direnv.sh`

**Purpose:** Install and configure direnv for automatic Python venv activation

**Usage:**
```bash
bash scripts/setup/setup-direnv.sh

# Test installation
direnv version
```

---

### install-shortcuts.sh

**Location:** `install-shortcuts.sh` (root)

**Purpose:** Install universal startup/shutdown shortcuts

**Usage:**
```bash
bash install-shortcuts.sh

# After installation, reload shell
source ~/.bashrc

# Use shortcuts
start      # Start all services
stop       # Stop all services
health     # Health check
logs       # View logs
```

## Testing Scripts

### test-ports-endpoint.sh

**Location:** `scripts/testing/test-ports-endpoint.sh`

**Purpose:** Test service launcher ports endpoint

**Usage:**
```bash
bash scripts/testing/test-ports-endpoint.sh
```

## Deployment Scripts

### deploy.sh (planned)

**Location:** `scripts/deployment/deploy.sh`

**Purpose:** Automated deployment to production

**Usage:**
```bash
bash scripts/deployment/deploy.sh --environment production

# Dry run
bash scripts/deployment/deploy.sh --environment production --dry-run
```

## Script Best Practices

### Error Handling

```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined variable, pipe failure

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}ERROR: $1${NC}" >&2
  exit 1
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Usage
command || error "Command failed"
success "Operation completed"
```

### Logging

```bash
LOG_FILE="logs/script-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Script started"
```

### Idempotency

```bash
# Check if service is already running
if lsof -ti:3103 > /dev/null 2>&1; then
  warning "Service already running on port 3103"
  exit 0
fi

# Start service
npm run dev &
success "Service started"
```

### Argument Parsing

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      ;;
  esac
done
```

## Additional Resources

- **Bash Style Guide:** https://google.github.io/styleguide/shellguide.html
- **ShellCheck:** https://www.shellcheck.net/ (linter)
- **Automation Best Practices:** [governance/standards/automation.md](../../governance/standards/automation.md)
