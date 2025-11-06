# TradingSystem - AI Agents & Tools Configuration

> **Canonical Source for AI Agents**
> Este arquivo contém todas as informações sobre agentes de IA, MCPs (Model Context Protocol), skills, e configurações do Claude Code/Codex para o projeto TradingSystem.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [AI Tools Ecosystem](#ai-tools-ecosystem)
- [Claude Code CLI](#claude-code-cli)
- [MCP Servers](#mcp-servers)
- [Project Agents](#project-agents)
- [Skills & Capabilities](#skills--capabilities)
- [Development Guidelines](#development-guidelines)
- [Architecture & Structure](#architecture--structure)

---

## 🎯 Project Overview

**TradingSystem** é um sistema de trading local com Clean Architecture + DDD, integrando ProfitDLL da Nelogica para captura de dados de mercado, análise com ML e execução automatizada de ordens. 100% on-premise, sem dependências de cloud.

**Stack Principal:**
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (APIs REST)
- **Database**: TimescaleDB + QuestDB + LowDB
- **Documentation**: Docusaurus v3
- **Infrastructure**: Docker Compose + systemd

**Arquitetura**: Microservices + Event-Driven + Domain-Driven Design

---

## 🤖 AI Tools Ecosystem

### Claude Code (CLI)
- **Status**: ✅ Instalado globalmente
- **Localização**: `~/.claude.json`
- **Comando**: `claude` (no terminal WSL2)
- **Features**:
  - Custom commands (`claude/commands/`)
  - MCP servers integration
  - Project-aware context
  - Terminal-based workflow

### Cline/Codex (VSCode Extension)
- **Status**: ✅ Instalado no VSCode
- **Config**: `config/mcp/servers.json`
- **Features**:
  - GUI-based interaction
  - MCP servers (importa de `claude/mcp-servers.json`)
  - File tree navigation
  - Inline code suggestions
  - Codex bridges para os comandos críticos `/quality-check`, `/health-check`, `/docker-compose`, `/service-launcher` e `/scripts` via `npm run codex:<cmd>` (ver `scripts/codex/README.md`)

### OpenSpec Framework
- **Status**: ✅ Configurado
- **Docs**: `tools/openspec/AGENTS.md`
- **Purpose**: Spec-driven development workflow
- **Commands**: `npm run openspec -- <command>`

---

## 🖥️ Claude Code CLI

### Configuration Files

```
~/.claude.json                          # Global config (API key, settings)
claude/
├── README.md                           # Overview of Claude configuration
├── MCP-FILESYSTEM-SETUP.md            # Filesystem server setup guide
├── mcp-servers.json                   # MCP servers definitions
├── settings.local.json                # Local Claude CLI settings
├── test-mcp-fs.sh                     # Test script for filesystem server
└── agents/                            # Specialized agent configurations
    ├── docker-health-optimizer.md     # Docker health & optimization agent
    └── rag-analyzer.md                # RAG analysis agent
```

### Quick Start

```bash
# Navigate to project
cd /home/marce/Projetos/TradingSystem

# Start Claude Code CLI
claude

# Custom commands available:
/health-check all              # System health monitoring
/docker-compose start-all      # Start all Docker services
/service-launcher start <svc>  # Start specific service
/git-workflows                 # Git operations with Conventional Commits
/scripts                       # Access project scripts
```

### Features

- ✅ **7 MCP Servers** integrated (filesystem, git, docker, postgres, etc.)
- ✅ **Custom Commands** in `claude/commands/`
- ✅ **Terminal Integration** (works seamlessly in Cursor's terminal)
- ✅ **Project Configuration** (auto-loads rules and settings)

### Documentation

**Complete CLI guide**: [CLAUDE.md](../CLAUDE.md)

---

## 🔌 MCP Servers

### Active Servers (6 configured)

#### 1. **fs-tradingsystem** - Filesystem Server
- **Purpose**: File operations on project directory
- **Path**: `/home/marce/Projetos/TradingSystem`
- **Status**: ✅ Configured and tested
- **Command**: `npx @modelcontextprotocol/server-filesystem`
- **Capabilities**:
  - Read/write files
  - List directories
  - Search files
  - Glob patterns

#### 2. **github** - GitHub Integration
- **Purpose**: GitHub API operations
- **Repository**: `marceloterra1983/TradingSystem`
- **Status**: ✅ Enabled
- **Command**: `npx @modelcontextprotocol/server-github`
- **Capabilities**:
  - Create/update PRs
  - Manage issues
  - Search repositories
  - View commits

#### 3. **openapi-docs** - OpenAPI Specifications
- **Purpose**: API documentation and specs
- **Specs**:
  - `workspace.openapi.yaml`
  - `documentation-api.openapi.yaml`
  - `tp-capital.openapi.yaml`
- **Status**: ✅ Enabled
- **Command**: `npx mcp-server-openapi`
- **Capabilities**:
  - Query API specs
  - Generate client code
  - Validate endpoints

#### 4. **docker-compose** - Docker Management
- **Purpose**: Docker container operations
- **Status**: ✅ Enabled
- **Command**: `npx mcp-server-docker`
- **Capabilities**:
  - List containers
  - Start/stop services
  - View logs
  - Inspect configurations

#### 5. **postgres-frontend-apps** - PostgreSQL Integration
- **Purpose**: Database operations
- **Connection**: Via `${MCP_POSTGRES_URL}`
- **Status**: ✅ Enabled
- **Command**: `npx @modelcontextprotocol/server-postgres`
- **Capabilities**:
  - Query databases
  - List tables/schemas
  - Execute SQL
  - View table structures

#### 6. **sentry** - Error Tracking
- **Purpose**: Error monitoring and debugging
- **Auth**: `${SENTRY_AUTH_TOKEN}`
- **Status**: ✅ Enabled
- **Command**: `npx @modelcontextprotocol/server-sentry`
- **Capabilities**:
  - Query errors
  - View stack traces
  - Manage issues
  - Track performance

### Configuration Files

```json
// .claude/mcp-servers.json - Server definitions
{
  "mcpServers": {
    "fs-tradingsystem": { ... },
    "github": { ... },
    "openapi-docs": { ... },
    "docker-compose": { ... },
    "postgres-frontend-apps": { ... },
    "sentry": { ... }
  }
}

// config/mcp/servers.json - Enabled servers list
{
  "version": 1,
  "imports": ["../../claude/mcp-servers.json"],
  "servers": [
    { "ref": "fs-tradingsystem", "enabled": true },
    { "ref": "github", "enabled": true },
    ...
  ]
}
```

### Testing MCP Servers

```bash
# Test filesystem server
bash claude/test-mcp-fs.sh

# Check installation
npm list @modelcontextprotocol/server-filesystem

# View VSCode logs (for Cline)
# Ctrl+Shift+P → "Developer: Show Logs" → "Extension Host"
```

---

## 🤖 Project Agents

### Diretório, Taxonomia e CI

- `npm run agents:generate` – sincroniza `.claude/agents/agents-raiox.md`, gera as visões filtradas e exporta `frontend/dashboard/src/data/aiAgentsDirectory.ts`. O log estruturado fica em `reports/agents/last-run.json`.
- `npm run agents:test` – executa testes unitários do parser (frontmatter complexo, tags, schema).
- `npm run agents:ci` – encadeia testes + geração; usado pelo workflow `agents-directory.yml`.
- Tags dos agentes **devem** seguir taxonomia ASCII em `kebab-case`. Exemplos canônicos: `arquitetura`, `backend`, `frontend`, `dados-analytics`, `ia-ml`, `documentacao`, `pesquisa`, `qa`, `observabilidade`, `mcp`, `automacao`, `needs-curation`, `hidden`, `lang-en`, `model-sonnet`, `tool-bash`.
- Sempre que o prompt do agente estiver em outra língua, inclua a tag `lang-en` (ou correspondente) no resumo e mantenha a descrição em português.

> Qualquer erro de schema, tag ou link inválido faz o gerador falhar com `exit 1`, garantindo que o dashboard só consuma catálogos válidos.

### Catálogo de Comandos

- `npm run commands:generate` – valida `.claude/commands/commands-raiox.md`, sincroniza `frontend/dashboard/src/data/commands-db.json` (com `schemaVersion`) e registra `reports/commands/last-run.json`.
- `npm run commands:test` – garante parsing correto de frontmatter com colchetes, pipes e arrays.
- `npm run commands:ci` – encadeia testes + geração; usado pelo workflow `commands-directory.yml`.
- Use `npm run commands:generate -- --include-auto` para reativar temporariamente a seção **Novos Comandos Automatizados** (delimitada por `<!-- AUTO-COMMANDS:START/END -->`). Rode sem a flag para removê-la após a curadoria.

### 1. Docusaurus Daily Agent

**Purpose**: Daily documentation analysis and reporting

**File**: `scripts/agents/docusaurus-daily.mjs`

**Capabilities**:
- Analyzes repository changes since midnight
- Summarizes diffs using Ollama (optional)
- Generates daily MDX reports in `docs/content/reports/daily`
- Validates documentation frontmatter

**Usage**:
```bash
node scripts/agents/docusaurus-daily.mjs --since "yesterday" --model "llama2"
```

**Flags**:
- `--since` - Start date for analysis
- `--dry` - Dry-run mode (no file writes)
- `--model` - Ollama model for summaries
- `--maxContext` - Context limit
- `--noValidate` - Skip frontmatter validation
- `--outDir` - Custom output directory

---

### 2. New Agent Creator

**Purpose**: Scaffold new agents from template

**File**: `scripts/agents/new-agent.mjs`

**Capabilities**:
- Creates agent structure from template
- Sets up basic boilerplate
- Configures agent metadata

**Usage**:
```bash
node scripts/agents/new-agent.mjs <agent-name>
```

**Template**: `scripts/agents/templates/node-agent-template.mjs`

---

### 3. Agent Runner

**Purpose**: Orchestrate and execute multiple agents

**File**: `scripts/agents/runner.mjs`

**Capabilities**:
- Run agents in sequence or parallel
- Manage agent lifecycle
- Collect and aggregate results

**Usage**:
```bash
node scripts/agents/runner.mjs <agent-name>
```

---

### 4. Docker Health Optimizer (Claude Agent)

**Purpose**: Docker health monitoring and optimization

**File**: `claude/agents/docker-health-optimizer.md`

**Capabilities**:
- Verify Docker installation health
- Validate container configurations
- Analyze performance metrics
- Propose optimization improvements

**Usage**: Auto-invoked by Claude when:
- User asks about Docker health
- Container performance issues detected
- Docker configuration validation needed

---

### 5. RAG Analyzer (Claude Agent)

**Purpose**: Retrieval-Augmented Generation analysis

**File**: `claude/agents/rag-analyzer.md`

**Capabilities**:
- Analyze RAG pipeline performance
- Evaluate document embeddings
- Optimize retrieval strategies
- Debug search quality issues

**Usage**: Auto-invoked by Claude when:
- User asks about search/retrieval
- Documentation search issues occur
- RAG performance analysis needed

---

## 🎨 Skills & Capabilities

### Available Skills (via Claude Code)

#### Document Processing Skills
- **xlsx**: Spreadsheet creation, editing, analysis
- **docx**: Document creation with tracked changes
- **pptx**: Presentation creation and editing
- **pdf**: PDF manipulation, text extraction

#### Development Skills
- **skill-creator**: Guide for creating new skills
- **mcp-builder**: MCP server development guide
- **webapp-testing**: Playwright-based testing
- **artifacts-builder**: React artifacts for claude.ai

#### Creative Skills
- **canvas-design**: Visual design creation (PNG/PDF)
- **algorithmic-art**: p5.js generative art
- **slack-gif-creator**: Animated GIFs for Slack

#### Communication Skills
- **internal-comms**: Internal communications templates
- **theme-factory**: Styling artifacts with themes
- **brand-guidelines**: Anthropic branding standards

### Usage

```bash
# Invoke skill in Claude Code
/skill xlsx          # Spreadsheet operations
/skill pdf           # PDF processing
/skill webapp-testing # Frontend testing
```

---

## 📐 Development Guidelines

### Project Structure

```
TradingSystem/
├── frontend/                       # Frontend applications
│   └── dashboard/                  # Main React dashboard (port 3103)
├── backend/                        # Backend services
│   ├── api/                       # REST APIs (Express)
│   │   ├── workspace/             # Port 3200 (Docker)
│   │   ├── tp-capital/           # Port 4005 (Docker)
│   │   ├── documentation-api/    # Port 3400 (Docker)
│   │   └── telegram-gateway/     # Port 3201
│   ├── data/                      # Data layer
│   │   ├── questdb/              # QuestDB schemas
│   │   └── timescaledb/          # TimescaleDB schemas
│   └── shared/                    # Shared libraries
├── docs/                          # Docusaurus documentation (port 3205)
│   ├── content/                   # Documentation content
│   └── governance/                # Documentation standards
├── tools/                         # DevOps & infrastructure
│   ├── compose/                   # Docker Compose files
│   ├── monitoring/                # Prometheus, Grafana
│   └── openspec/                  # OpenSpec framework
├── scripts/                       # Automation scripts
│   └── agents/                    # AI agents
└── claude/                        # Claude Code configuration
```

### Política para Geração de Arquivos por IA

- Nenhum agente, script ou automação pode criar arquivos diretamente na raiz do repositório; qualquer saída deve ser redirecionada para `outputs/`.
- A pasta `outputs/` é o único hub autorizado para artefatos produzidos por IA e deve ser organizada por assuntos (ex.: `outputs/reports`, `outputs/logs`); crie a subpasta antes de gravar novos arquivos.
- Use apenas nomes ASCII em `kebab-case` para subpastas e arquivos, evitando espaços ou acentos para manter pipelines determinísticos.
- Ferramentas existentes precisam validar o caminho de destino e falhar caso detectem gravações fora de `outputs/`, evitando lixo na raiz e facilitando a limpeza dos artefatos temporários.

### Coding Style

**TypeScript/JavaScript**:
- 2-space indentation
- Named exports preferred
- PascalCase for React components
- camelCase for functions
- snake_case for SQL entities

**ESLint**: Source of truth for style
- Run `npm run lint:fix` to auto-fix issues

**Commits**: Conventional Commits format
- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance
- `docs:` - Documentation
- `refactor:` - Code refactoring

### Testing

**Frontend**: Vitest
```bash
cd frontend/dashboard
npm run test              # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

**Backend**: Integration tests
```bash
cd backend/api/<service>
npm run test
```

**Documentation**: Validation
```bash
npm run validate-docs    # Validate frontmatter
```

---

## 🏗️ Architecture & Structure

### Clean Architecture Layers

1. **Domain Layer** - Entities, Value Objects, Business Rules
2. **Application Layer** - Use Cases, Commands, Queries
3. **Infrastructure Layer** - External integrations (ProfitDLL, WebSocket)
4. **Presentation Layer** - Controllers, APIs, UI Components

### Domain-Driven Design

**Aggregates**:
- `OrderAggregate` - Order management
- `TradeAggregate` - Trade execution
- `PositionAggregate` - Position tracking

**Value Objects**:
- `Price`, `Symbol`, `Quantity`, `Timestamp`

**Domain Events**:
- `OrderFilledEvent`
- `SignalGeneratedEvent`
- `PositionUpdatedEvent`

### Microservices

Each service has:
- Single responsibility
- Independent deployment
- Communication via WebSocket (data) + HTTP (commands)

---

## 🔐 Environment Variables

**Critical**: ALL applications must use the centralized `.env` file from project root.

**NEVER** create local `.env` files!

```bash
# Root .env structure
DATABASE_URL=...
QUESTDB_URL=...
TIMESCALE_URL=...
MCP_POSTGRES_URL=...
GITHUB_PERSONAL_ACCESS_TOKEN=...
SENTRY_AUTH_TOKEN=...
```

**Validation**:
```bash
bash scripts/env/validate-env.sh
```

**Documentation**: `docs/content/tools/security-config/env.mdx`

---

## 📚 Key Documentation Files

### For AI Agents

1. **[CLAUDE.md](../CLAUDE.md)** - Main instructions for Claude Code
2. **[AGENTS.md](AGENTS.md)** - This file (AI tools overview)
3. **[tools/openspec/AGENTS.md](tools/openspec/AGENTS.md)** - OpenSpec framework guide
4. **[agents-raiox.md](.claude/agents/agents-raiox.md)** - Catálogo completo dos agentes com filtros por domínio

### For Development

1. **[docs/README.md](docs/README.md)** - Documentation hub
2. **[governance/](governance/README.md)** - Governance standards hub
3. **[docs/content/reference/adrs/](docs/content/reference/adrs/)** - Architecture decisions

### For Operations

1. **[.claude/README.md](claude/README.md)** - Claude configuration
2. **[.claude/MCP-FILESYSTEM-SETUP.md](claude/MCP-FILESYSTEM-SETUP.md)** - MCP setup guide
3. **[tools/compose/](tools/compose/)** - Docker Compose stacks
- **Dashboard → Knowledge → Governance** - Live governance snapshot powered by `/governance`

---

## 🚀 Quick Start Commands

### Universal Startup

```bash
# Install shortcuts (one-time)
bash install-shortcuts.sh
source ~/.bashrc

# Daily usage
start                    # Start all services (Docker + Node.js)
stop                     # Stop all services gracefully
status                   # View status of all services
health                   # Run health checks
logs                     # View real-time logs
```

### Manual Service Management

```bash
# Dashboard (Port 3103)
cd frontend/dashboard
npm install && npm run dev

# Documentation Hub (Port 3205)
cd docs
npm install && npm run start -- --port 3205

# Docker Services (Ports 3200-4005)
docker compose -f tools/compose/docker-compose.apps.yml up -d
```

### Health Monitoring

```bash
# Check all services, containers, and databases
bash scripts/maintenance/health-check-all.sh

# JSON output for automation
bash scripts/maintenance/health-check-all.sh --format json

# Via Service Launcher API
curl http://localhost:3500/api/health/full | jq '.overallHealth'
```

---

## 🔗 External Resources

### MCP (Model Context Protocol)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)

### Claude
- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)

### Tools
- [Cline Extension](https://github.com/cline/cline)
- [Docusaurus v3](https://docusaurus.io/)
- [OpenSpec Framework](https://github.com/anthropics/openspec)

---

## 📞 Support & Troubleshooting

### Common Issues

**Claude Code CLI not working**:
```bash
# Reinstall globally
npm install -g @anthropic-ai/claude-code

# Check config
cat ~/.claude.json
```

**MCP Servers not loading**:
```bash
# Test filesystem server
bash claude/test-mcp-fs.sh

# Reload VSCode
# Ctrl+Shift+P → "Reload Window"
```

**Docker services failing**:
```bash
# Check Docker status
docker ps -a

# View logs
docker logs <container-name>

# Restart services
docker compose -f tools/compose/docker-compose.apps.yml restart
```

### Health Check Script

```bash
# Comprehensive health check
bash scripts/maintenance/health-check-all.sh

# Expected output:
# ✅ Dashboard (3103)
# ✅ Documentation Hub (3205)
# ✅ Workspace API (3200)
# ✅ TP Capital (4005)
# ✅ Documentation API (3400)
```

---

## 📝 Version History

### 2025-10-29: Complete AI Tools Documentation
- ✅ Added comprehensive MCP servers documentation
- ✅ Documented all project agents
- ✅ Added Claude Code CLI configuration
- ✅ Included skills and capabilities reference
- ✅ Updated development guidelines
- ✅ Added troubleshooting section

### 2025-10-25: Initial AI Configuration
- ✅ Created `ai/` directory structure
- ✅ Basic guidelines for AI agents
- ✅ Repository structure overview

---

**Last Updated**: 2025-10-29
**Maintained By**: TradingSystem Development Team
**AI Agent Compatibility**: Claude Code CLI, Cline/Codex (VSCode)
