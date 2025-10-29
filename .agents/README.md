# TradingSystem Development Agents

## Overview

This directory contains **agent configuration files** for specialized AI development agents working on the TradingSystem project.

Each agent has a defined **role, specialization, and responsibilities**, coordinated through **OpenSpec proposals** and **git workflows**.

---

## 🤖 Available Agents

| Agent | Role | Tech Stack | Focus |
|-------|------|-----------|-------|
| **[architect-agent](./architect-agent.md)** | Technical Leader | OpenSpec, Git, PlantUML | Architecture, ADRs, coordination |
| **[backend-csharp-agent](./backend-csharp-agent.md)** | Backend Developer | C# .NET 8.0, ProfitDLL | Core trading services (Windows) |
| **[api-nodejs-agent](./api-nodejs-agent.md)** | Backend Developer | Node.js, Express, Docker | Auxiliary services APIs |
| **[ml-python-agent](./ml-python-agent.md)** | ML Engineer | Python, Scikit-learn | ML pipeline, signal generation |
| **[frontend-agent](./frontend-agent.md)** | Frontend Developer | React, TypeScript, Zustand | Dashboard UI, components |
| **[database-agent](./database-agent.md)** | Database Engineer | TimescaleDB, PostgreSQL | Schema design, migrations |
| **[devops-agent](./devops-agent.md)** | DevOps Engineer | Docker, CI/CD, Bash | Infrastructure, deployment |
| **[technical-writer-agent](./technical-writer-agent.md)** | Technical Writer | Docusaurus, Markdown, PlantUML | Documentation, guides |
| **[testing-agent](./testing-agent.md)** | QA Engineer | xUnit, Vitest, Playwright | Testing, quality assurance |

---

## 🔄 Coordination Workflow

### Multi-Agent Feature Development

```
User Request: "Implement order history feature"
    ↓
┌───────────────────────────────────────────────────────────┐
│ Phase 1: Planning (Architect Agent)                       │
└───────────────────────────────────────────────────────────┘
    │
    ├─→ Create OpenSpec proposal
    │   └─> openspec/changes/add-order-history/
    │       ├── proposal.md (why, what, impact)
    │       ├── tasks.md (breakdown by agent)
    │       ├── design.md (technical decisions)
    │       └── specs/ (delta specs)
    │
    └─→ Assign tasks to agents
        ├─> Database Agent: Create schema
        ├─> Backend Agent: API endpoints
        ├─> Frontend Agent: UI components
        └─> Technical Writer: Documentation

┌───────────────────────────────────────────────────────────┐
│ Phase 2: Parallel Implementation                          │
└───────────────────────────────────────────────────────────┘
    │
    ├─→ Database Agent
    │   └─> Branch: claude/add-order-history-db-001ABC
    │       └─> PR #123: Add order_history table
    │
    ├─→ Backend Agent
    │   └─> Branch: claude/add-order-history-api-002DEF
    │       └─> PR #124: Order history endpoint
    │
    ├─→ Frontend Agent
    │   └─> Branch: claude/add-order-history-ui-003GHI
    │       └─> PR #125: OrderHistory component
    │
    └─→ Technical Writer
        └─> Branch: claude/add-order-history-docs-004JKL
            └─> PR #126: API docs + user guide

┌───────────────────────────────────────────────────────────┐
│ Phase 3: Review & Integration (Architect Agent)           │
└───────────────────────────────────────────────────────────┘
    │
    ├─→ Review all PRs (code quality, tests, docs)
    ├─→ Merge in dependency order (DB → API → UI → Docs)
    └─→ Archive OpenSpec proposal
```

---

## 🎯 How to Use Agents

### For Claude Code CLI

When working in Claude Code CLI, you can specify which agent role to adopt:

```bash
# Start Claude Code
claude

# In chat, prefix your request with agent role:
> [As Backend Agent] Implement order validation service

# Or reference the agent config:
> Follow @.agents/backend-csharp-agent.md to implement order validation
```

### For Human Developers

Use agent configs as **development guides**:

1. **Read the relevant agent file** before working on a feature
2. **Follow the patterns** and best practices
3. **Use the checklists** to ensure quality
4. **Reference the examples** for implementation guidance

---

## 📚 Agent-Specific Guides

### 🎯 Architect Agent

**Use when:**
- Planning new features
- Creating OpenSpec proposals
- Making architecture decisions
- Coordinating multi-agent tasks

**Key workflows:**
- Creating proposals: `npm run openspec -- create feature-name`
- Creating ADRs: Follow template in `docs/content/prd/templates/`
- Reviewing PRs: Check alignment with proposal

---

### 🔧 Backend (C#) Agent

**Use when:**
- Implementing core trading services (Data Capture, Order Manager, Risk Engine)
- Integrating with ProfitDLL
- Working with Windows Services

**Critical constraints:**
- ✅ MUST compile x64 (ProfitDLL is 64-bit)
- ✅ MUST use static fields for callbacks (GC prevention)
- ✅ Latency < 500ms for trading operations

**Example task:**
```markdown
Task: Implement OrderValidationService
Location: backend/services/order-manager/
Tests: xUnit (>80% coverage)
References: docs/content/sdd/flows/v1/place-order.mdx
```

---

### 🌐 API (Node.js) Agent

**Use when:**
- Implementing auxiliary service APIs
- Working with Docker containers
- Integrating with databases (TimescaleDB, PostgreSQL)

**Services:**
- Workspace API (port 3200)
- TP Capital API (port 4005)
- Documentation API (port 3401)
- Service Launcher API (port 3500)

**Example task:**
```typescript
Task: Add GET /api/orders/:id/history endpoint
Validation: Joi/Zod schema
Database: TimescaleDB (workspace.order_history)
Tests: Integration tests with Supertest
```

---

### 🎨 Frontend Agent

**Use when:**
- Building Dashboard UI (React + TypeScript)
- Creating components (shadcn/ui)
- Managing state (Zustand)
- WebSocket integration

**Tech stack:**
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Zustand (state management)

**Example task:**
```typescript
Task: Create OrderHistory component
Features: Pagination, filters, real-time updates
Tests: Vitest + React Testing Library
Accessibility: WCAG 2.1 AA compliant
```

---

### 💾 Database Agent

**Use when:**
- Designing schemas
- Creating migrations
- Optimizing queries
- Managing retention policies

**Databases:**
- TimescaleDB (hypertables for time-series)
- PostgreSQL + Prisma
- QuestDB (legacy time-series)

**Example task:**
```sql
Task: Create order_history hypertable
Partitioning: Monthly chunks
Indexes: order_id, event_type, timestamp DESC
Migration: UP + DOWN scripts
```

---

### 🐳 DevOps Agent

**Use when:**
- Creating Docker compositions
- Setting up CI/CD pipelines
- Writing deployment scripts
- Configuring monitoring (Prometheus, Grafana)

**Example task:**
```yaml
Task: Create docker-compose for Signal Generator
Health checks: /health endpoint
Resource limits: 2 CPU, 2GB RAM
Network: tradingsystem_backend
```

---

### 📝 Technical Writer Agent

**Use when:**
- Writing documentation (Docusaurus)
- Creating API specs (OpenAPI)
- Drawing architecture diagrams (PlantUML)
- Maintaining docs quality

**Requirements:**
- ✅ MUST include YAML frontmatter
- ✅ MUST provide PlantUML diagrams for architecture docs
- ✅ Follow governance/VALIDATION-GUIDE.md

**Example task:**
```markdown
Task: Document order history API
Format: MDX with OpenAPI spec
Diagrams: Sequence diagram (PlantUML)
Location: docs/content/api/order-manager.mdx
```

---

## 🔍 Agent Coordination Matrix

| Scenario | Lead Agent | Supporting Agents | OpenSpec? | ADR? |
|----------|-----------|-------------------|-----------|------|
| New multi-component feature | Architect | Backend, Frontend, DB, Docs | ✅ | Maybe |
| Single API endpoint | API Agent | Docs | ✅ | No |
| UI component | Frontend | Docs | ✅ | No |
| Database schema change | Database | Backend, API | ✅ | Maybe |
| Bug fix (single component) | Specialist | - | ❌ | No |
| Architecture change | Architect | All | ✅ | ✅ |
| Security fix | Architect | Affected agents | ✅ | ✅ |
| Breaking change | Architect | All affected | ✅ | ✅ |

---

## 📖 Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Project instructions for all agents
- **[OpenSpec AGENTS.md](../tools/openspec/AGENTS.md)** - OpenSpec workflow guide
- **[Git Workflows](../docs/content/tools/git-workflows/)** - Branching and PR conventions
- **[ADR Process](../docs/content/reference/adrs/)** - Architecture decision records

---

## 🚀 Getting Started

### 1. Choose Agent Role
Identify which agent should handle the task based on specialization.

### 2. Read Agent Config
```bash
cat .agents/backend-csharp-agent.md
# or
cat .agents/frontend-agent.md
```

### 3. Follow Workflow
- Read OpenSpec proposal (if exists)
- Create git branch: `claude/{feature}-{session-id}`
- Implement following agent guidelines
- Create PR with checklist from agent config

### 4. Coordinate with Other Agents
- For multi-agent features, Architect coordinates
- Use OpenSpec `tasks.md` for task breakdown
- Comment on PRs for cross-agent communication

---

## ⚠️ Important Notes

### For All Agents
1. **ALWAYS use centralized `.env`** from project root
2. **NEVER create local `.env` files** in subdirectories
3. **Follow git branch naming**: `claude/{feature}-{session-id}`
4. **Write tests** before creating PR
5. **Update documentation** for user-facing changes

### For Core Trading Agents (C# Backend)
1. **MUST compile x64** (ProfitDLL requirement)
2. **MUST run on Windows natively** (no Docker)
3. **Latency < 500ms** for trading operations
4. **Keep callbacks alive** with static fields

### For Auxiliary Service Agents (Node.js, Python)
1. **Run in Docker containers**
2. **Use `tradingsystem_backend` network**
3. **Implement health checks** (`/health` endpoint)
4. **Export Prometheus metrics** (`/metrics` endpoint)

---

## 🆘 Troubleshooting

### "Which agent should I use?"

**Decision tree:**
```
Is it trading logic (ProfitDLL, orders, risk)?
  → Backend (C#) Agent

Is it an auxiliary service API?
  → API (Node.js) Agent

Is it UI/dashboard work?
  → Frontend Agent

Is it database schema?
  → Database Agent

Is it infrastructure/deployment?
  → DevOps Agent

Is it documentation?
  → Technical Writer Agent

Is it architecture/planning?
  → Architect Agent
```

### "Can multiple agents work on the same feature?"

**Yes!** Architect coordinates multi-agent features:
1. Architect creates OpenSpec proposal
2. Architect assigns tasks in `tasks.md`
3. Agents work in parallel on separate branches
4. Architect reviews and merges PRs in order

### "Do I need OpenSpec for bug fixes?"

**No**, simple bug fixes don't need OpenSpec:
- Direct fix by specialist agent
- Create PR with fix
- Architect reviews if significant

**Yes**, complex bug fixes might need OpenSpec:
- If requires architecture changes
- If affects multiple components
- If introduces breaking changes

---

## 📞 Support

For questions about agent workflows:
1. Read the specific agent config file
2. Check `CLAUDE.md` for project-wide guidelines
3. Review `tools/openspec/AGENTS.md` for OpenSpec workflow
4. Ask Architect Agent for coordination help

---

**Last Updated:** 2025-10-29
**Maintained by:** Architect Agent
**Version:** 1.0.0
