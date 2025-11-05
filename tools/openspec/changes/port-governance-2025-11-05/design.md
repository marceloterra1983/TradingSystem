# Port Governance & Connectivity - Design Document

**Proposal:** port-governance-2025-11-05  
**Version:** 1.0.0  
**Last Updated:** 2025-11-05  
**Status:** DRAFT

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Registry Schema](#registry-schema)
3. [Automation Tools](#automation-tools)
4. [CI/CD Integration](#cicd-integration)
5. [MTProto Containerization](#mtproto-containerization)
6. [Migration Strategy](#migration-strategy)
7. [File Structure](#file-structure)
8. [API Contracts](#api-contracts)
9. [Security Considerations](#security-considerations)
10. [Performance Impact](#performance-impact)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PORT GOVERNANCE SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │  config/ports/       │  ◄── Single Source of Truth           │
│  │  registry.yaml       │                                       │
│  └──────┬───────────────┘                                       │
│         │                                                        │
│         │ read                                                   │
│         ↓                                                        │
│  ┌──────────────────────┐                                       │
│  │  tools/ports/sync.js │  ◄── Generation Engine               │
│  └──────┬───────────────┘                                       │
│         │                                                        │
│         ├──► .env.shared                                        │
│         ├──► tools/compose/*.yml (templates)                    │
│         ├──► docs/content/tools/ports-services.mdx              │
│         ├──► scripts/maintenance/ports-status.sh                │
│         └──► config/ports/index.json (runtime)                  │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  .github/workflows/  │  ◄── Validation & Enforcement         │
│  │  port-governance.yml │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  Pre-commit Hook     │  ◄── Developer Experience            │
│  │  .husky/pre-commit   │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Developer Workflow:
1. Edit registry.yaml (add/modify port)
2. Run: npm run ports:sync
3. Git add generated files
4. Git commit (pre-commit hook validates)
5. Push PR
6. CI validates (schema + duplicates + sync)
7. Architecture review + approval
8. Merge → deploy

Runtime:
Docker Compose → reads .env.shared → uses ${PORT_NAME} variables
Services → read generated config → connect using DNS names
Health checks → use ports from registry → validate connectivity
```

---

## Registry Schema

### YAML Structure

```yaml
version: string (semver)
lastUpdated: date (YYYY-MM-DD)

ranges:
  <category>: string (format: "XXXX-YYYY")

services:
  - name: string (unique identifier)
    stack: string (category from ranges)
    port: integer (1024-65535)
    protocol: enum [http, https, postgres, redis, rabbitmq, grpc, tcp, udp]
    owner: string (team/person)
    description: string
    container: boolean
    network?: string (Docker network)
    depends_on?: array<string> (service names)
    healthcheck?: object
      endpoint: string
      expected: integer (HTTP status)
    notes?: string
    deprecated?: boolean
    replacement?: string (service name)
```

### Validation Rules

**Schema Validation:**
```javascript
const schema = {
  version: required, semver,
  lastUpdated: required, date,
  ranges: required, object {
    [key]: required, pattern(/^\d{4}-\d{4}$/)
  },
  services: required, array[
    {
      name: required, unique, pattern(/^[a-z][a-z0-9-]*$/),
      stack: required, existsIn(ranges.keys),
      port: required, integer(1024, 65535), unique,
      protocol: required, enum,
      owner: required, string,
      description: required, string(10, 200),
      container: required, boolean,
      network: optional, string,
      depends_on: optional, array[string],
      healthcheck: optional, object,
      notes: optional, string,
      deprecated: optional, boolean,
      replacement: optional, string
    }
  ]
};
```

**Business Rules:**
- Port must be within declared range for stack
- Port must be unique across all services
- Service name must be unique
- Deprecated services must have replacement
- Dependencies must exist in registry
- Networks must match compose file definitions

### Example Entry

```yaml
services:
  - name: telegram-gateway-api
    stack: external-integrations
    port: 4010
    protocol: http
    owner: Telegram Team
    description: "Telegram Gateway REST API - handles message sync, webhooks"
    container: true
    network: telegram_net
    depends_on:
      - telegram-mtproto
      - telegram-timescale
      - telegram-redis-master
    healthcheck:
      endpoint: /health
      expected: 200
    notes: "Requires TELEGRAM_GATEWAY_API_KEY env var"
    deprecated: false
```

---

## Automation Tools

### 1. Port Sync (`tools/ports/sync.js`)

**Purpose:** Generate all configuration files from registry

**Architecture:**
```javascript
// tools/ports/sync.js
import { readRegistry, validateRegistry } from './lib/registry.js';
import { generateEnv } from './generators/env.js';
import { generateCompose } from './generators/compose.js';
import { generateDocs } from './generators/docs.js';
import { generateHealthScript } from './generators/health.js';

async function sync() {
  // 1. Read & validate
  const registry = await readRegistry('config/ports/registry.yaml');
  const validation = validateRegistry(registry);
  
  if (!validation.valid) {
    console.error('❌ Registry validation failed:', validation.errors);
    process.exit(1);
  }
  
  // 2. Generate files
  await generateEnv(registry.services);
  await generateCompose(registry.services);
  await generateDocs(registry);
  await generateHealthScript(registry.services);
  
  // 3. Write runtime JSON
  await writeJSON('config/ports/index.json', registry);
  
  console.log('✅ Port registry synced successfully');
}
```

**Generators:**

1. **ENV Generator (`generators/env.js`)**
```javascript
export async function generateEnv(services) {
  const envLines = [
    '# Auto-generated from config/ports/registry.yaml',
    '# DO NOT EDIT MANUALLY - Run: npm run ports:sync',
    `# Generated: ${new Date().toISOString()}`,
    ''
  ];
  
  for (const service of services) {
    const varName = service.name.toUpperCase().replace(/-/g, '_');
    envLines.push(`${varName}_PORT=${service.port}`);
    
    if (service.container && service.network) {
      envLines.push(`${varName}_URL=http://${service.name}:${service.port}`);
    }
  }
  
  await fs.writeFile('.env.shared', envLines.join('\n'));
}
```

2. **Compose Generator (`generators/compose.js`)**
```javascript
export async function generateCompose(services) {
  // Read template
  const template = await fs.readFile(
    'tools/ports/templates/docker-compose.template.yml',
    'utf8'
  );
  
  // Group by stack
  const stacks = groupBy(services, 'stack');
  
  // Generate compose file per stack
  for (const [stack, stackServices] of Object.entries(stacks)) {
    const rendered = renderTemplate(template, { services: stackServices });
    await fs.writeFile(
      `tools/compose/docker-compose.${stack}.yml`,
      rendered
    );
  }
}
```

3. **Docs Generator (`generators/docs.js`)**
```javascript
export async function generateDocs(registry) {
  const markdown = [
    '---',
    'title: Port Registry',
    'sidebar_position: 1',
    'tags: [infrastructure, ports]',
    'generated: true',
    `lastUpdated: ${new Date().toISOString()}`,
    '---',
    '',
    '# Port Registry',
    '',
    `Last synced: ${registry.lastUpdated}`,
    '',
    '## Port Ranges',
    '',
    '| Category | Range | Services |',
    '|----------|-------|----------|'
  ];
  
  for (const [category, range] of Object.entries(registry.ranges)) {
    const count = registry.services.filter(s => s.stack === category).length;
    markdown.push(`| ${category} | ${range} | ${count} |`);
  }
  
  markdown.push('', '## Services', '');
  
  for (const stack of Object.keys(registry.ranges)) {
    const stackServices = registry.services.filter(s => s.stack === stack);
    if (stackServices.length === 0) continue;
    
    markdown.push(`### ${stack}`, '');
    markdown.push('| Service | Port | Protocol | Owner | Status |');
    markdown.push('|---------|------|----------|-------|--------|');
    
    for (const svc of stackServices) {
      const status = svc.deprecated ? '⚠️ Deprecated' : '✅ Active';
      markdown.push(
        `| ${svc.name} | ${svc.port} | ${svc.protocol} | ${svc.owner} | ${status} |`
      );
    }
    
    markdown.push('');
  }
  
  await fs.writeFile('docs/content/tools/ports-services.mdx', markdown.join('\n'));
}
```

4. **Health Script Generator (`generators/health.js`)**
```javascript
export async function generateHealthScript(services) {
  const script = [
    '#!/bin/bash',
    '# Auto-generated port health check',
    '# DO NOT EDIT MANUALLY',
    '',
    'echo "🔍 Checking port health..."',
    'echo ""',
    ''
  ];
  
  for (const service of services) {
    if (!service.healthcheck) continue;
    
    const { endpoint, expected } = service.healthcheck;
    const url = service.container 
      ? `http://${service.name}:${service.port}${endpoint}`
      : `http://localhost:${service.port}${endpoint}`;
    
    script.push(
      `echo -n "${service.name} (${service.port}): "`,
      `STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${url} 2>/dev/null)`,
      `if [ "$STATUS" = "${expected}" ]; then`,
      `  echo "✅ HEALTHY"`,
      `else`,
      `  echo "❌ UNHEALTHY (got $STATUS, expected ${expected})"`,
      `fi`,
      ''
    );
  }
  
  await fs.writeFile('scripts/maintenance/ports-health.sh', script.join('\n'));
  await fs.chmod('scripts/maintenance/ports-health.sh', 0o755);
}
```

### 2. Port Validator (`tools/ports/validate.js`)

**Checks:**
1. Schema validation (YAML structure)
2. Duplicate ports
3. Duplicate names
4. Port within range
5. Dependencies exist
6. Networks defined in compose
7. Deprecated services have replacement

```javascript
export function validateRegistry(registry) {
  const errors = [];
  const warnings = [];
  
  // Check schema
  const schemaErrors = validateSchema(registry);
  errors.push(...schemaErrors);
  
  // Check duplicates
  const ports = new Set();
  const names = new Set();
  
  for (const service of registry.services) {
    if (ports.has(service.port)) {
      errors.push(`Duplicate port: ${service.port} (${service.name})`);
    }
    ports.add(service.port);
    
    if (names.has(service.name)) {
      errors.push(`Duplicate name: ${service.name}`);
    }
    names.add(service.name);
    
    // Check port in range
    const range = registry.ranges[service.stack];
    if (range) {
      const [min, max] = range.split('-').map(Number);
      if (service.port < min || service.port > max) {
        errors.push(
          `Port ${service.port} out of range ${range} for stack ${service.stack} (${service.name})`
        );
      }
    }
    
    // Check dependencies
    if (service.depends_on) {
      for (const dep of service.depends_on) {
        if (!names.has(dep)) {
          errors.push(`Unknown dependency: ${dep} (in ${service.name})`);
        }
      }
    }
    
    // Check deprecated
    if (service.deprecated && !service.replacement) {
      warnings.push(
        `Deprecated service ${service.name} has no replacement specified`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### 3. Hardcoded Port Scanner (`tools/ports/scan-hardcoded.js`)

**Purpose:** Find hardcoded ports in code

```javascript
import { glob } from 'glob';
import fs from 'fs/promises';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '*.min.js'
];

const PORT_PATTERNS = [
  /localhost:\d{4,5}/g,
  /127\.0\.0\.1:\d{4,5}/g,
  /ports?:\s*["']\d{4,5}:\d{4,5}["']/g,
  /PORT\s*=\s*\d{4,5}/g
];

export async function scanHardcodedPorts() {
  const files = await glob('**/*.{js,ts,yml,yaml,sh,json}', {
    ignore: IGNORE_PATTERNS
  });
  
  const violations = [];
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      for (const pattern of PORT_PATTERNS) {
        const matches = line.match(pattern);
        if (matches) {
          violations.push({
            file,
            line: idx + 1,
            match: matches[0],
            context: line.trim()
          });
        }
      }
    });
  }
  
  if (violations.length > 0) {
    console.error('❌ Hardcoded ports found:');
    violations.forEach(v => {
      console.error(`  ${v.file}:${v.line} - ${v.match}`);
    });
    process.exit(1);
  }
  
  console.log('✅ No hardcoded ports found');
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/port-governance.yml
name: Port Governance Check

on:
  pull_request:
    paths:
      - 'config/ports/registry.yaml'
      - 'tools/compose/**'
      - '.env.shared'
      - 'docs/content/tools/ports-services.mdx'
  push:
    branches: [main, develop]

jobs:
  validate:
    name: Validate Port Registry
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Validate Schema
        run: npm run ports:validate
      
      - name: Check Duplicates
        run: npm run ports:duplicates
      
      - name: Verify Sync
        run: |
          npm run ports:sync
          if ! git diff --exit-code; then
            echo "❌ Generated files out of sync!"
            echo "Run: npm run ports:sync"
            echo ""
            echo "Changed files:"
            git diff --name-only
            exit 1
          fi
      
      - name: Scan Hardcoded Ports
        run: npm run ports:scan-hardcoded
      
      - name: Check Range Compliance
        run: npm run ports:check-ranges
      
      - name: Generate Report
        if: always()
        run: npm run ports:report > port-governance-report.txt
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: port-governance-report
          path: port-governance-report.txt
      
      - name: Comment PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('port-governance-report.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ❌ Port Governance Check Failed\n\n\`\`\`\n${report}\n\`\`\``
            });
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/bash

echo "🔍 Checking port registry..."

# Check if registry was modified
if git diff --cached --name-only | grep -q "config/ports/registry.yaml"; then
  echo "📝 Registry modified, running sync..."
  
  # Sync
  npm run ports:sync
  
  # Add generated files
  git add .env.shared
  git add tools/compose/*.yml
  git add docs/content/tools/ports-services.mdx
  git add scripts/maintenance/ports-health.sh
  
  echo "✅ Port registry synced"
fi

# Validate
npm run ports:validate || exit 1

echo "✅ Port governance checks passed"
```

---

## MTProto Containerization

### Current State

**Problem:**
```
┌─────────────────────────┐
│  Host Machine (WSL2)    │
│                         │
│  ┌──────────────────┐   │
│  │ MTProto Gateway  │   │  Runs natively
│  │ Port: 4007       │   │  (Node.js process)
│  └──────────────────┘   │
│                         │
│  ┌──────────────────────────────────┐
│  │ Docker Container                 │
│  │ ┌────────────────────────────┐   │
│  │ │ Gateway API                │   │
│  │ │ Tries: localhost:4007      │   │
│  │ │ Result: ECONNREFUSED ❌    │   │
│  │ └────────────────────────────┘   │
│  └──────────────────────────────────┘
└─────────────────────────┘
```

### Proposed State

**Solution:**
```
┌────────────────────────────────────────────────┐
│  Docker Compose - telegram_net                │
│                                                │
│  ┌──────────────────────┐                      │
│  │ telegram-mtproto     │                      │
│  │ Port: 4007           │                      │
│  │ DNS: telegram-mtproto│                      │
│  └──────────┬───────────┘                      │
│             │                                   │
│             │ http://telegram-mtproto:4007     │
│             ↓                                   │
│  ┌──────────────────────┐                      │
│  │ telegram-gateway-api │                      │
│  │ MTPROTO_SERVICE_URL= │                      │
│  │ http://telegram-      │                      │
│  │   mtproto:4007       │                      │
│  └──────────────────────┘                      │
└────────────────────────────────────────────────┘
```

### Implementation

**Dockerfile for MTProto:**
```dockerfile
# apps/telegram-gateway/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4007/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Expose port
EXPOSE 4007

# Start
CMD ["node", "src/index.js"]
```

**Compose Definition:**
```yaml
# tools/compose/docker-compose.telegram.yml
services:
  telegram-mtproto:
    container_name: telegram-mtproto
    build:
      context: ../../apps/telegram-gateway
      dockerfile: Dockerfile
    environment:
      - PORT=${TELEGRAM_MTPROTO_PORT}
      - NODE_ENV=${NODE_ENV:-production}
      - TELEGRAM_API_ID=${TELEGRAM_API_ID}
      - TELEGRAM_API_HASH=${TELEGRAM_API_HASH}
      - TELEGRAM_SESSION_STRING=${TELEGRAM_SESSION_STRING}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - telegram-sessions:/app/sessions
    networks:
      - telegram_net
    ports:
      - "${TELEGRAM_MTPROTO_PORT}:4007"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4007/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    
  telegram-gateway-api:
    depends_on:
      telegram-mtproto:
        condition: service_healthy
      telegram-timescale:
        condition: service_healthy
      telegram-redis-master:
        condition: service_healthy
    environment:
      - MTPROTO_SERVICE_URL=http://telegram-mtproto:4007
    networks:
      - telegram_net

networks:
  telegram_net:
    name: telegram_net
    driver: bridge

volumes:
  telegram-sessions:
    name: telegram-sessions
```

### Migration Checklist

- [ ] Create Dockerfile for MTProto
- [ ] Test Docker build locally
- [ ] Update compose file with MTProto service
- [ ] Test connectivity (Gateway API → MTProto)
- [ ] Validate session persistence (volume)
- [ ] Update health checks
- [ ] Update documentation
- [ ] Rollback plan (fallback to native if issues)

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

**Goals:**
- Inventory current ports
- Create initial registry
- Validate schema

**Tasks:**
1. Scan codebase for all ports in use
2. Document owners and descriptions
3. Define port ranges
4. Create `registry.yaml` v1.0
5. Peer review with teams

**Deliverables:**
- `config/ports/registry.yaml`
- Migration plan document

### Phase 2: Tooling (Week 2)

**Goals:**
- Build automation tools
- Setup CI validation (warning mode)

**Tasks:**
1. Implement `sync.js` and generators
2. Implement `validate.js`
3. Implement `scan-hardcoded.js`
4. Create CI workflow (non-blocking)
5. Test generation locally

**Deliverables:**
- `tools/ports/*.js`
- `.github/workflows/port-governance.yml`
- Generated files (env, compose, docs)

### Phase 3: Gradual Migration (Week 3)

**Goals:**
- Migrate services to use generated configs
- Test in dev environment

**Tasks:**
1. **Day 1-2:** Migrate Telegram stack
   - Update compose files
   - Test MTProto containerization
   - Validate connectivity
   
2. **Day 3:** Migrate Frontend stack
   - Dashboard
   - Docs hub
   
3. **Day 4:** Migrate APIs stack
   - Workspace API
   - TP Capital
   - Documentation API
   
4. **Day 5:** Migrate Database/Cache stack
   - TimescaleDB
   - Redis
   - RabbitMQ

**Rollback:** Keep old configs as `.bak` files

### Phase 4: Enforcement (Week 4)

**Goals:**
- Enable CI blocking
- Deploy to production

**Tasks:**
1. Enable CI enforcement (block on failure)
2. Add pre-commit hook
3. Deploy to staging
4. Validate for 48h
5. Deploy to production
6. Monitor for issues

**Rollback:** Disable CI blocking, use backup configs

### Phase 5: Cleanup & Documentation (Week 5)

**Goals:**
- Remove old configs
- Complete documentation
- Train team

**Tasks:**
1. Delete `.bak` files
2. Update all README files
3. Create onboarding guide
4. Run team workshop
5. Publish ADR-015
6. Retrospective

---

## File Structure

```
TradingSystem/
├── config/
│   └── ports/
│       ├── registry.yaml           # Single source of truth
│       ├── index.json              # Runtime JSON (generated)
│       └── README.md               # Usage guide
│
├── tools/
│   └── ports/
│       ├── sync.js                 # Main sync tool
│       ├── validate.js             # Validator
│       ├── scan-hardcoded.js       # Port scanner
│       ├── lib/
│       │   ├── registry.js         # Registry I/O
│       │   ├── schema.js           # Schema validation
│       │   └── utils.js            # Helpers
│       ├── generators/
│       │   ├── env.js              # .env generator
│       │   ├── compose.js          # Compose generator
│       │   ├── docs.js             # Docs generator
│       │   └── health.js           # Health script generator
│       └── templates/
│           └── docker-compose.template.yml
│
├── .env.shared                     # Generated (DO NOT EDIT)
│
├── tools/compose/
│   ├── docker-compose.telegram.yml # Generated (DO NOT EDIT)
│   ├── docker-compose.frontend.yml # Generated (DO NOT EDIT)
│   └── ...
│
├── docs/content/tools/
│   └── ports-services.mdx          # Generated (DO NOT EDIT)
│
├── scripts/maintenance/
│   └── ports-health.sh             # Generated (DO NOT EDIT)
│
├── .github/workflows/
│   └── port-governance.yml         # CI validation
│
├── .husky/
│   └── pre-commit                  # Auto-sync on commit
│
└── docs/content/reference/adrs/
    └── 015-port-governance.md      # ADR
```

---

## API Contracts

### Registry CLI

**Commands:**
```bash
# Validate registry
npm run ports:validate

# Sync (generate files)
npm run ports:sync

# Check duplicates
npm run ports:duplicates

# Check ranges
npm run ports:check-ranges

# Scan hardcoded
npm run ports:scan-hardcoded

# Generate report
npm run ports:report

# Interactive new port
npm run ports:new
```

**Example: `npm run ports:new`**
```bash
$ npm run ports:new

? Service name: my-new-api
? Stack: apis
? Port: 3405
? Protocol: http
? Owner: Backend Team
? Description: My new API service
? Container? Yes
? Docker network: backend_net

✅ Port 3405 available
✅ Within range 3400-3499 for stack 'apis'

Registry entry:
  - name: my-new-api
    stack: apis
    port: 3405
    protocol: http
    owner: Backend Team
    description: "My new API service"
    container: true
    network: backend_net

? Add to registry? Yes

✅ Added to registry.yaml
🔄 Running sync...
✅ Synced successfully

Next steps:
1. Review generated files
2. Commit changes
3. Create PR
```

---

## Security Considerations

### 1. Secrets Management

**Problem:** Registry might expose sensitive port mappings

**Mitigation:**
- Registry is configuration, not secrets
- Actual credentials still in `.env` (gitignored)
- CI doesn't expose port numbers (just validates)

### 2. Port Scanning

**Risk:** Publicly documented ports aid attackers

**Mitigation:**
- Registry in private repo
- Docs require authentication
- Firewall rules independent of ports
- Intrusion detection monitors suspicious scans

### 3. CI/CD Pipeline

**Risk:** Malicious PR modifies registry

**Mitigation:**
- Required reviews (Architecture committee)
- CI validates before merge
- Audit trail (Git history)
- Rollback capability

---

## Performance Impact

### Build Time

**Registry Validation:**
- Schema check: ~50ms
- Duplicate check: ~20ms
- Range check: ~30ms
- Total: **~100ms**

**File Generation:**
- ENV: ~10ms
- Compose (6 files): ~60ms
- Docs: ~40ms
- Health script: ~20ms
- Total: **~130ms**

**CI Job:**
- Checkout: ~5s
- Install: ~20s
- Validation: ~1s
- Sync + diff: ~2s
- Total: **~30s**

**Impact:** Negligible (< 1% of typical CI time)

### Runtime

**Service Startup:**
- Reading .env.shared: +5ms
- No impact on actual service startup

**Docker Compose:**
- Variable substitution: +10ms
- No impact on container startup

**Overall:** Zero measurable impact on runtime performance

---

## Appendix

### A. Sample Registry (Full)

See: `config/ports/registry.yaml.example`

### B. Generated Files Examples

See: `tools/ports/examples/`

### C. Migration Checklist

See: `tools/ports/MIGRATION.md`

### D. Troubleshooting

See: `tools/ports/TROUBLESHOOTING.md`

---

**Review Status:**
- [ ] Architecture approved
- [ ] Security reviewed
- [ ] DevOps approved
- [ ] Teams consulted

**Next:** Create `tasks.md` with implementation breakdown

