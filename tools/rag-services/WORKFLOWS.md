# RAG Services - Workflow Automation

Comprehensive workflow orchestration for development, testing, and deployment automation.

## Overview

The RAG Services project includes two workflow automation systems:

1. **GitHub Actions CI/CD** - Cloud-based continuous integration
2. **Local Workflow Runner** - Development task automation

## Local Workflows

### Quick Start

```bash
# List available workflows
npm run workflow

# Run pre-commit checks
npm run workflow:pre-commit

# Run full validation
npm run workflow:validate

# Health check all services
npm run workflow:health
```

### Available Workflows

#### 1. Pre-Commit Workflow

**Purpose**: Fast validation before committing code

**Tasks**:
- ESLint validation (auto-format on failure)
- TypeScript type checking
- Unit tests

**Usage**:
```bash
npm run workflow:pre-commit
```

**Duration**: ~30 seconds

#### 2. Full Validation Workflow

**Purpose**: Complete validation before creating PR

**Tasks**:
1. Clean build artifacts
2. Fresh dependency install (`npm ci`)
3. Lint code
4. Check code formatting
5. TypeScript type check
6. Run tests with coverage
7. Build TypeScript
8. Verify build artifacts

**Usage**:
```bash
npm run workflow:validate
```

**Duration**: ~2-3 minutes

**Coverage Requirements**:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

#### 3. Quick Test Workflow

**Purpose**: Rapid testing during development

**Tasks**:
- Auto-format code
- Run tests in watch mode (interactive)

**Usage**:
```bash
node run-workflow.js quick-test
```

#### 4. CI Local Workflow

**Purpose**: Simulate GitHub Actions CI pipeline locally

**Tasks**:
- **Parallel quality checks**:
  - ESLint
  - Prettier format check
  - TypeScript type check
- **Test matrix** (Node 18 & 20)
- Production build
- Generate CI report

**Usage**:
```bash
node run-workflow.js ci-local
```

**Duration**: ~3-5 minutes

#### 5. Health Check Workflow

**Purpose**: Verify all service dependencies

**Tasks**:
- Check Redis health
- Check Qdrant health
- Check LlamaIndex Ingestion service
- Check LlamaIndex Query service
- Check RAG Services API
- Generate health report

**Usage**:
```bash
npm run workflow:health
```

**Duration**: ~10 seconds

**Prerequisites**:
- All services must be running (use `start` command)

#### 6. Cache Maintenance Workflow

**Purpose**: Automated cache cleanup and backup

**Schedule**: Daily at 2 AM (configurable via cron)

**Tasks**:
1. Backup Redis cache to `/backup/redis-YYYYMMDD.rdb`
2. Clean expired cache entries
3. Verify cache health

**Usage**:
```bash
node run-workflow.js cache-maintenance
```

**Environment Variables Required**:
```env
ADMIN_JWT_TOKEN=your-admin-token
```

#### 7. Collection Sync Workflow

**Purpose**: Synchronize all collections with latest documents

**Schedule**: Every 6 hours (configurable)

**Tasks**:
1. Fetch all collections
2. Trigger ingestion for each collection
3. Verify collection stats

**Usage**:
```bash
node run-workflow.js collection-sync
```

**Duration**: Varies by collection size (~5-30 minutes)

---

## GitHub Actions CI/CD

### Pipeline Overview

```
Code Push/PR
    ↓
┌─────────────────────────────────────┐
│  Job 1: Code Quality                │
│  - ESLint                            │
│  - Prettier check                    │
│  - TypeScript type check             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 2: Unit Tests (Matrix)         │
│  - Node 18.x                         │
│  - Node 20.x                         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 3: Coverage Report              │
│  - Generate coverage                 │
│  - Upload to Codecov                 │
│  - Comment on PR                     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 4: Build                        │
│  - TypeScript build                  │
│  - Verify artifacts                  │
│  - Upload artifacts                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 5: Security Scan                │
│  - npm audit                         │
│  - Snyk scan                         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 6: Docker Build (main only)     │
│  - Build Docker image                │
│  - Push to registry                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 7: Deploy Staging (develop)     │
│  - Deploy to staging env             │
│  - Run smoke tests                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job 8: Deploy Production (main)     │
│  - Deploy to production              │
│  - Run smoke tests                   │
│  - Send notifications                │
└─────────────────────────────────────┘
```

### Triggers

**Push Events**:
- `main` branch → Deploy to production
- `develop` branch → Deploy to staging

**Pull Request Events**:
- All PRs → Run quality checks + tests

**Paths Filtered**:
- `tools/rag-services/**`
- `.github/workflows/rag-services-ci.yml`

### Required Secrets

Configure in GitHub repository settings:

```env
# Docker Hub
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Security scanning
SNYK_TOKEN=your-snyk-token

# Notifications (optional)
SLACK_WEBHOOK_URL=your-slack-webhook
```

### Branch Protection Rules

Recommended settings for `main` and `develop`:

- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass:
  - `code-quality`
  - `test`
  - `coverage`
  - `build`
  - `security`
- ✅ Require branches to be up to date
- ✅ Include administrators
- ✅ Restrict pushes to specific users

---

## Workflow Configuration

### Custom Workflows

Create custom workflows by editing `workflow.json`:

```json
{
  "workflows": {
    "my-custom-workflow": {
      "description": "My custom automation",
      "tasks": [
        {
          "id": "task-1",
          "name": "My task",
          "type": "shell",
          "command": "echo 'Hello'",
          "timeout": 30000
        }
      ]
    }
  }
}
```

**Task Types**:

1. **shell** - Execute shell commands
2. **parallel** - Run multiple tasks simultaneously
3. **http** - Make HTTP requests
4. **loop** - Iterate over items
5. **conditional** - Conditional execution

### Task Dependencies

```json
{
  "id": "build",
  "name": "Build application",
  "type": "shell",
  "command": "npm run build",
  "depends_on": ["lint", "test"]
}
```

### Error Handling

```json
{
  "id": "deploy",
  "name": "Deploy to production",
  "type": "shell",
  "command": "npm run deploy",
  "on_success": ["notify-success"],
  "on_failure": ["rollback", "notify-failure"],
  "retry": {
    "attempts": 3,
    "delay": 5000
  }
}
```

### Parallel Execution

```json
{
  "id": "parallel-tests",
  "name": "Run parallel test suites",
  "type": "parallel",
  "tasks": [
    { "id": "unit", "command": "npm run test:unit" },
    { "id": "integration", "command": "npm run test:integration" },
    { "id": "e2e", "command": "npm run test:e2e" }
  ],
  "wait_for": "all",
  "timeout": 180000
}
```

---

## Scheduling Workflows

### Using Cron

```bash
# Add to crontab (crontab -e)

# Daily cache maintenance at 2 AM
0 2 * * * cd /path/to/rag-services && node run-workflow.js cache-maintenance

# Collection sync every 6 hours
0 */6 * * * cd /path/to/rag-services && node run-workflow.js collection-sync

# Health check every hour
0 * * * * cd /path/to/rag-services && node run-workflow.js health-check
```

### Using Systemd Timers (Linux)

Create timer file:

```ini
# /etc/systemd/system/rag-services-cache-maintenance.timer
[Unit]
Description=RAG Services Cache Maintenance Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:

```bash
sudo systemctl enable rag-services-cache-maintenance.timer
sudo systemctl start rag-services-cache-maintenance.timer
```

---

## Monitoring and Alerts

### Workflow Execution Logs

Logs are written to stdout with timestamps and task IDs:

```
✓ Loaded workflow: rag-services-local-workflow

🚀 Running workflow: pre-commit
📝 Description: Pre-commit validation workflow

⏳ [lint-check] ESLint validation
✓ [lint-check] Completed in 2.34s

⏳ [type-check] TypeScript type checking
✓ [type-check] Completed in 4.12s

⏳ [unit-tests] Run unit tests
✓ [unit-tests] Completed in 8.67s

✅ Workflow completed successfully in 15.13s
```

### Failure Notifications

Configure notifications in `workflow.json`:

```json
{
  "notifications": {
    "slack": {
      "webhook_url": "${env.SLACK_WEBHOOK_URL}",
      "channel": "#rag-services"
    },
    "email": {
      "smtp_host": "${env.SMTP_HOST}",
      "from": "noreply@tradingsystem.com",
      "to": ["dev-team@tradingsystem.com"]
    }
  }
}
```

---

## Best Practices

### 1. Pre-Commit Workflow

Always run before committing:

```bash
npm run workflow:pre-commit
```

**Or add as Git hook** (`.git/hooks/pre-commit`):

```bash
#!/bin/bash
npm run workflow:pre-commit
```

### 2. Pre-Push Validation

Run full validation before pushing:

```bash
npm run workflow:validate
```

### 3. CI Local Testing

Test CI pipeline locally before pushing:

```bash
node run-workflow.js ci-local
```

### 4. Health Monitoring

Set up cron job for automated health checks:

```bash
# Every 5 minutes
*/5 * * * * cd /path/to/rag-services && node run-workflow.js health-check >> /var/log/rag-health.log 2>&1
```

### 5. Cache Maintenance

Schedule daily cache cleanup:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/rag-services && node run-workflow.js cache-maintenance
```

---

## Troubleshooting

### Workflow Not Found

```bash
# List available workflows
npm run workflow

# Or check workflow.json directly
cat workflow.json | jq '.workflows | keys'
```

### Task Timeout

Increase timeout in `workflow.json`:

```json
{
  "id": "slow-task",
  "timeout": 600000  // 10 minutes
}
```

### Dependency Issues

Ensure all dependencies are installed:

```bash
npm ci
```

### Permission Errors

Make workflow runner executable:

```bash
chmod +x run-workflow.js
```

### Service Health Check Failures

Verify all services are running:

```bash
docker ps | grep -E "(redis|qdrant|llamaindex)"
```

---

## Examples

### Example 1: Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."
npm run workflow:pre-commit

if [ $? -ne 0 ]; then
  echo "Pre-commit checks failed!"
  exit 1
fi
```

### Example 2: Custom Deployment Workflow

```json
{
  "workflows": {
    "deploy-staging": {
      "description": "Deploy to staging environment",
      "tasks": [
        {
          "id": "validate",
          "name": "Run full validation",
          "type": "shell",
          "command": "npm run workflow:validate"
        },
        {
          "id": "build",
          "name": "Build for production",
          "type": "shell",
          "command": "NODE_ENV=production npm run build",
          "depends_on": ["validate"]
        },
        {
          "id": "deploy",
          "name": "Deploy to staging",
          "type": "shell",
          "command": "rsync -avz dist/ staging:/var/www/rag-services/",
          "depends_on": ["build"]
        },
        {
          "id": "smoke-test",
          "name": "Run smoke tests",
          "type": "http",
          "method": "GET",
          "url": "https://staging.example.com/api/v1/rag/health",
          "depends_on": ["deploy"]
        }
      ]
    }
  }
}
```

---

## Integration with Development Tools

### VS Code Tasks

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Workflow: Pre-commit",
      "type": "npm",
      "script": "workflow:pre-commit",
      "problemMatcher": []
    },
    {
      "label": "Workflow: Full Validation",
      "type": "npm",
      "script": "workflow:validate",
      "problemMatcher": []
    },
    {
      "label": "Workflow: Health Check",
      "type": "npm",
      "script": "workflow:health",
      "problemMatcher": []
    }
  ]
}
```

### NPM Scripts

Already configured in `package.json`:

```json
{
  "scripts": {
    "workflow": "node run-workflow.js",
    "workflow:pre-commit": "node run-workflow.js pre-commit",
    "workflow:validate": "node run-workflow.js full-validation",
    "workflow:health": "node run-workflow.js health-check"
  }
}
```

---

## Resources

- **Workflow Configuration**: [workflow.json](workflow.json)
- **Workflow Runner**: [run-workflow.js](run-workflow.js)
- **GitHub Actions**: [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)
- **Package Scripts**: [package.json](package.json)

---

**Generated with Claude Code** - 2025-11-01
