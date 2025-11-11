# Quick Start - Comandos Essenciais

> **Guia rápido dos comandos mais úteis** para desenvolvimento e manutenção
> **Last Updated:** 2025-11-05

## 🚀 Comandos Diários

### Startup/Shutdown

```bash
# Iniciar tudo (Docker + Node.js)
start

# Parar tudo gracefully
stop

# Force kill tudo
stop --force

# Verificar status
status

# Health check
health

# Ver logs
logs
```

### Health Monitoring

```bash
# Health check completo
bash scripts/maintenance/health-check-all.sh

# JSON output
bash scripts/maintenance/health-check-all.sh --format json | jq '.overallHealth'

# Via API Gateway (recommended)
curl http://localhost:9080/api/health/full | jq

# Traefik Gateway health
curl http://localhost:9080/health | jq
```

### Logs

```bash
# Docker logs
docker logs timescaledb --tail 50
docker logs workspace --follow

# Service logs
tail -f frontend/dashboard/logs/app.log
tail -f apps/tp-capital/logs/service.log
```

---

## 📚 Comandos de Documentação

### Gerar/Atualizar Docs

```bash
# Gerar OpenAPI specs
/doc-api --service workspace --format openapi
/generate-api-documentation --format redoc

# Atualizar docs
/update-docs --api --sync

# Validar docs
npm run validate-docs
```

### Docusaurus

```bash
# Dev server
cd docs && npm run start -- --port 3400

# Build
cd docs && npm run build

# Deploy
cd docs && npm run deploy
```

---

## 🧪 Comandos de Testing

### Run Tests

```bash
# All tests
npm run test

# Specific service
cd apps/workspace && npm run test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Load tests
k6 run tests/performance/workspace-api.k6.js
```

### Setup Testing

```bash
# Complete testing suite
/setup-comprehensive-testing --full-stack

# Load testing
/setup-load-testing --capacity

# Generate test cases
/generate-test-cases --service workspace-api
```

---

## 🏗️ Comandos de Arquitetura

### Analysis

```bash
# Project health check
/project-health-check --30-days

# Architecture review
/architecture-review --scope modules --scope patterns

# Security audit
/security-audit --full
```

### Design

```bash
# Design new REST API
/design-rest-api --v1

# Create architecture docs
/create-architecture-documentation --c4-model --adr
```

---

## 🔧 Comandos de Manutenção

### Database

```bash
# Backup TimescaleDB
docker exec timescaledb pg_dump -U postgres trading_system | gzip > backup.sql.gz

# Backup Qdrant
bash scripts/qdrant/backup-cluster.sh

# Test connections
psql -h localhost -p 7032 -U postgres -d trading_system
redis-cli -h localhost -p 7079 ping
curl http://localhost:7040/  # QuestDB
```

### Docker

```bash
# Start database tooling stack
docker compose -p 5-0-database-stack -f tools/compose/docker-compose.5-0-database-stack.yml up -d

# Restart unhealthy containers
bash scripts/docker/fix-unhealthy-containers.sh

# Clean up
docker system prune -f
```

### Port Management

```bash
# Check port usage
lsof -i:9080

# Kill process on port
lsof -ti:9080 | xargs kill -9

# Validate port configuration
npm run ports:validate
```

---

## 🔐 Comandos de Governança

### Validation

```bash
# Full governance check
npm run governance:full

# Scan for secrets
npm run governance:scan-secrets

# Validate environment variables
npm run governance:validate-envs

# Validate policies
npm run governance:validate-policies
```

### Metrics

```bash
# Generate metrics
npm run governance:metrics

# Check documentation quality
npm run docs:check-sync
```

---

## ⚡ Comandos de Performance

### Optimization

```bash
# Optimize API
/optimize-api-performance workspace-api

# Analyze bundle size
cd frontend/dashboard && npm run analyze:bundle

# Check bundle size
npm run check:bundle
```

### Profiling

```bash
# Load test
npm run test:load

# Performance test
npm run test:e2e:performance
```

---

## 🐛 Comandos de Troubleshooting

### Quick Diagnostics

```bash
# System info
docker ps
docker stats
df -h

# Check services
curl http://localhost:9080/  # Dashboard
curl http://localhost:3200/api/health  # Workspace
curl http://localhost:4005/health  # TP Capital
```

### Fix Common Issues

```bash
# Port conflicts
bash scripts/start.sh --force-kill

# Unhealthy containers
bash scripts/docker/fix-unhealthy-containers.sh

# Clear cache
redis-cli -h localhost -p 7079 FLUSHDB

# Restart services
bash scripts/maintenance/restart-dashboard.sh
bash scripts/maintenance/restart-docusaurus.sh
```

---

## 📦 Comandos de Build/Deploy

### Build

```bash
# Frontend build
cd frontend/dashboard && npm run build

# Docs build
cd docs && npm run build

# Docker build
docker compose build workspace
```

### Deploy (planned)

```bash
# Deploy to production
/deploy --environment production

# Blue-green deployment
/blue-green-deployment --validate-health

# Rollback
/rollback-deploy --previous
```

---

## 🔍 Comandos de Search/Exploration

### Code Search

```bash
# Search in code
grep -r "pattern" backend/

# Find files
find . -name "*.ts" -type f

# Glob patterns
npm run glob "**/*.test.ts"
```

### Task Management

```bash
# List agents
npm run agent:list

# Describe agent
npm run agent:describe workspace-agent

# Run agent
npm run agent:run workspace-agent
```

---

## 🎯 Comandos Slash Mais Úteis

### Daily Use

```bash
/health-check all                    # Check system health
/update-docs --api --sync            # Update API docs
/code-review src/                    # Review code quality
/write-tests src/lib/utils.ts       # Generate tests
```

### Weekly

```bash
/project-health-check --sprint       # Sprint health report
/security-audit --full               # Security scan
/performance-audit --full            # Performance analysis
/dependency-manager update           # Update dependencies
```

### Monthly

```bash
/architecture-review --full          # Architecture review
/test-coverage --report              # Test coverage report
/deployment-monitoring setup         # Update monitoring
```

---

## 💡 Pro Tips

### Aliases (add to ~/.bashrc)

```bash
alias ts-start="cd ~/Projetos/TradingSystem && start"
alias ts-stop="cd ~/Projetos/TradingSystem && stop"
alias ts-health="cd ~/Projetos/TradingSystem && health"
alias ts-logs="cd ~/Projetos/TradingSystem && logs"
alias ts-test="cd ~/Projetos/TradingSystem && npm run test"
```

### Quick Scripts

```bash
# Create quick script
echo '#!/bin/bash
bash scripts/maintenance/health-check-all.sh --format json | jq ".overallHealth"
' > ~/bin/ts-health && chmod +x ~/bin/ts-health

# Use it
ts-health
```

### VS Code Tasks

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start All Services",
      "type": "shell",
      "command": "bash scripts/start.sh",
      "group": "build"
    },
    {
      "label": "Health Check",
      "type": "shell",
      "command": "bash scripts/maintenance/health-check-all.sh"
    }
  ]
}
```

---

## 📞 Help & Support

### Get Help

```bash
# Script help
bash scripts/start.sh --help

# Command help
/help

# List all commands
ls .claude/commands/

# Documentation
open http://localhost:3404
```

### Emergency

```bash
# Full system reset (CAUTION!)
bash scripts/stop.sh --force
docker system prune -af --volumes
npm install

# Restore from backup
bash scripts/restore-from-backup.sh
```

---

## 🔗 Quick Links

- **Dashboard:** http://localhost:9080
- **Docs Hub:** http://localhost:3404
- **Workspace API:** http://localhost:3200
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000

---

**Tip:** Bookmark this file for quick reference! 🚀
