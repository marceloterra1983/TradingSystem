# TradingSystem Reference Documentation

> **Auto-generated reference documentation** created by `/initref` command
> **Last Updated:** 2025-11-05

This directory contains comprehensive reference documentation for the TradingSystem project implementation details.

## 📚 Table of Contents

- [Overview](#overview) - Project structure and architecture
- [Backend Services](./backend/README.md) - All backend APIs and services
- [Frontend Applications](./frontend/README.md) - Dashboard and UI components
- [Infrastructure](./infrastructure/README.md) - Docker, databases, monitoring
- [Scripts & Automation](./scripts/README.md) - DevOps scripts and tools
- [Documentation System](./docs/README.md) - Docusaurus and governance

## Overview

### Project Structure

```
TradingSystem/
├── apps/                    # Standalone applications
│   ├── workspace/          # Workspace API (Port 3200)
│   ├── tp-capital/         # TP Capital ingestion (Port 4005)
│   ├── telegram-gateway/   # Telegram Gateway API (reference)
│   └── status/             # Status monitoring service
│
├── backend/                # Backend services layer
│   ├── api/               # REST APIs
│   ├── data/              # Data storage layer
│   ├── services/          # Core microservices
│   └── shared/            # Shared libraries
│
├── frontend/              # Frontend applications
│   ├── dashboard/         # Main React dashboard (Port 3103)
│   └── shared/            # Shared UI components
│
├── docs/                  # Documentation hub (Docusaurus)
│   ├── content/           # All documentation content
│   ├── src/               # Docusaurus source code
│   └── static/            # Static assets
│
├── governance/            # Documentation governance
│   ├── controls/          # Quality controls
│   ├── evidence/          # Audit evidence
│   └── policies/          # Documentation policies
│
├── scripts/              # Automation scripts
│   ├── docker/           # Docker management
│   ├── maintenance/      # System maintenance
│   ├── docs/             # Documentation scripts
│   └── governance/       # Governance automation
│
└── tools/                # Infrastructure tools
    ├── compose/          # Docker Compose files
    ├── monitoring/       # Prometheus + Grafana
    └── openspec/         # OpenSpec system
```

### Technology Stack

#### Backend
- **Runtime:** Node.js 20+ (ESM modules)
- **Framework:** Express.js 4.x
- **Databases:**
  - TimescaleDB (time-series data)
  - QuestDB (high-performance analytics)
  - Redis (caching and sessions)
  - Qdrant (vector database for RAG)
- **Message Queue:** Redis Pub/Sub
- **Testing:** Node.js native test runner, Vitest

#### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 7
- **Routing:** React Router DOM v6
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **UI Components:** Radix UI
- **Styling:** Tailwind CSS 3.4
- **Animation:** Framer Motion
- **Testing:** Vitest + Playwright

#### Infrastructure
- **Containerization:** Docker Compose
- **Reverse Proxy:** NGINX
- **Monitoring:** Prometheus + Grafana
- **Documentation:** Docusaurus v3
- **AI/RAG:** LlamaIndex + Ollama + Qdrant

#### DevOps
- **CI/CD:** GitHub Actions
- **Code Quality:** ESLint, Prettier, Husky
- **Environment:** direnv (automatic Python venv)
- **Scripts:** Bash (universal startup/shutdown)

### Port Allocation

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| Dashboard | 3103 | HTTP | ✅ Active (container) |
| Workspace API | 3200 | HTTP | ✅ Active (container) |
| Documentation Hub | 3404 | HTTP | ✅ Active (container) |
| Documentation API | 3405 | HTTP | ✅ Active (container) |
| Service Launcher | 3500 | HTTP | ✅ Active |
| Firecrawl Proxy | 3600 | HTTP | ✅ Active (container) |
| TP Capital | 4005 | HTTP | ✅ Active (container) |
| TimescaleDB | 7032 | TCP | ✅ Active (container) |
| QuestDB | 7040 | HTTP | ✅ Active (container) |
| QuestDB ILP | 7039 | TCP | ✅ Active (container) |
| Qdrant | 7050 | HTTP | ✅ Active (container) |
| Redis | 7079 | TCP | ✅ Active (container) |
| Prometheus | 9090 | HTTP | ✅ Active (container) |
| Grafana | 3000 | HTTP | ✅ Active (container) |

**Port Ranges:**
- **7000-7099**: Database services (primary ports)
- **7100-7199**: Database UI/management interfaces
- **7200-7299**: Database exporters (Prometheus)
- **3000-3999**: Application services
- **8000-8999**: AI/ML services
- **9000-9999**: Monitoring services

### Architecture Patterns

#### Clean Architecture
- **Domain Layer**: Business entities and rules
- **Application Layer**: Use cases and services
- **Infrastructure Layer**: External integrations (DB, APIs)
- **Presentation Layer**: Controllers, UI components

#### Domain-Driven Design (DDD)
- **Aggregates**: OrderAggregate, TradeAggregate, PositionAggregate
- **Value Objects**: Price, Symbol, Quantity, Timestamp
- **Domain Events**: OrderFilledEvent, SignalGeneratedEvent
- **Repositories**: ITradeRepository, IOrderRepository

#### Microservices
- Single responsibility per service
- Independent deployment
- Communication via HTTP REST + WebSocket
- Health checks and observability

### Key Features

#### Current Implementation
- ✅ React dashboard with real-time updates
- ✅ Workspace API (TimescaleDB persistence)
- ✅ TP Capital ingestion pipeline (Telegram → QuestDB)
- ✅ Documentation Hub (Docusaurus v3 + RAG)
- ✅ Service health monitoring
- ✅ Docker Compose orchestration
- ✅ Comprehensive governance system
- ✅ Automated startup/shutdown scripts

#### Planned/In Progress
- 🚧 Data Capture service (C# + ProfitDLL)
- 🚧 Order Manager service (C# + Risk Engine)
- 🚧 ML Analytics Pipeline (Python)
- 🚧 WebSocket real-time data streaming
- 🚧 API Gateway (Kong/Traefik)
- 🚧 Test coverage expansion (target: 80%)

## Quick Links

### Backend Services
- **[Backend Overview](./backend/README.md)** - All backend services and patterns
- **[Workspace API](./backend/workspace-api.md)** - Complete API reference with diagrams
- **[TP Capital](./backend/tp-capital.md)** - Signal ingestion pipeline details

### Frontend Applications
- **[Frontend Overview](./frontend/README.md)** - React, TypeScript, Vite architecture
- **[Component Library](./frontend/component-library.md)** - UI components catalog (Radix UI + Tailwind)

### Infrastructure
- [Docker Compose](./infrastructure/docker-compose.md) - All compose files
- [Databases](./infrastructure/databases.md) - Database configurations
- [Monitoring](./infrastructure/monitoring.md) - Prometheus + Grafana
- [RAG System](./infrastructure/rag-system.md) - LlamaIndex + Qdrant

### Scripts & Automation
- **[Scripts Overview](./scripts/README.md)** - All automation scripts and DevOps tools

### Code Examples & Patterns
- **[Examples Directory](./examples/README.md)** - Production-ready code snippets
  - Authentication (JWT, API keys)
  - Circuit Breaker patterns
  - Database clients
  - API integration
  - State management
  - Testing examples

### Troubleshooting
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions

### Improvement Plans
- **[API Improvement Plan](./API-IMPROVEMENT-PLAN.md)** - Complete roadmap for API enhancement
  - 📊 Current state analysis
  - 🎯 10 available slash commands
  - 🚀 5-phase implementation plan (10-14 weeks)
  - ✅ Checklist and success metrics

### Quick Reference
- **[Quick Start Commands](./QUICK-START-COMMANDS.md)** - Essential commands cheat sheet
  - Daily commands (start, stop, health, logs)
  - Testing, documentation, troubleshooting
  - Slash commands reference
  - Pro tips and aliases

### Documentation
- [Docusaurus Setup](./docs/README.md) - Documentation hub configuration
- [Content Structure](./docs/README.md) - Content organization
- [Governance System](./docs/README.md) - Quality standards

## Development Workflow

### Quick Start
```bash
# Install dependencies (one-time)
bash scripts/setup/setup-direnv.sh
source ~/.bashrc
cd /home/marce/Projetos/TradingSystem
direnv allow

# Daily startup
start                    # Start all services
health                   # Check system health
logs                     # Monitor logs

# Daily shutdown
stop                     # Graceful shutdown
stop --force             # Force kill all
```

### Common Tasks
```bash
# Frontend development
cd frontend/dashboard
npm run dev

# Documentation
cd docs
npm run start -- --port 3404

# Testing
npm run test             # Run all tests
npm run lint             # Lint all code
npm run type-check       # TypeScript validation

# Governance
npm run governance:full  # Complete governance check
npm run governance:scan-secrets  # Scan for secrets
```

## Architecture Review

**Last Review:** 2025-11-01
**Grade:** B+ (Good, with room for optimization)
**Full Report:** [governance/evidence/reports/reviews/architecture-2025-11-01/index.md](../governance/evidence/reports/reviews/architecture-2025-11-01/index.md)

### Strengths
✅ Clean Architecture + DDD
✅ Microservices with clear boundaries
✅ Security-first approach (JWT, rate limiting)
✅ Modern stack (React 18, TypeScript, Vite)
✅ Comprehensive documentation (135+ pages)
✅ Observability (health checks, metrics)

### Improvement Areas
⚠️ No API Gateway
⚠️ Inter-service auth missing
⚠️ Single DB instance (needs HA)
⚠️ Limited test coverage (~30%)
⚠️ No API versioning
⚠️ Frontend bundle size (800KB)

## Additional Resources

- **Main Documentation:** [CLAUDE.md](../CLAUDE.md)
- **OpenSpec System:** [tools/openspec/README.md](../tools/openspec/README.md)
- **Governance Policies:** [governance/policies/](../governance/policies/)
- **Architecture Reviews:** [governance/evidence/reports/reviews/](../governance/evidence/reports/reviews/)
- **API Documentation:** http://localhost:3404/api/

## Contributing

When updating this reference documentation:

1. **Keep it synchronized** with actual implementation
2. **Use concrete examples** with file paths and line numbers
3. **Include port numbers** and service URLs
4. **Document dependencies** and their versions
5. **Link to source code** for detailed implementation
6. **Update timestamps** when making changes

## Notes

- This reference is **automatically generated** - manual edits may be overwritten
- For project-wide instructions, see [CLAUDE.md](../CLAUDE.md)
- For feature implementation details, see [docs/content/](../docs/content/)
- For API specifications, see [docs/content/api/](../docs/content/api/)
