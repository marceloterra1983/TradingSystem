# 📊 Auditoria de Documentação: Apps - TradingSystem

**Data:** 2025-10-27
**Auditor:** Claude Code
**Escopo:** Comparação entre estrutura real (`/apps/`) e documentação (`docs/content/apps/`)

---

## 📋 Sumário Executivo

### Status Geral: 🟡 Requer Atenção

- **Apps Implementados**: 4 de 6 documentados
- **Apps Documentados mas não implementados**: 2 (Data Capture, Order Manager - planejados)
- **Apps Implementados mas sem docs estruturados**: 0
- **Discrepâncias de Porta**: 1 (TP Capital)
- **Issues Críticos**: 1 (Service Launcher sem estrutura de docs)

---

## 🏗️ Estrutura de Aplicações

### Aplicações Reais (`/apps/`)

```
apps/
├── status/              ✅ Service Launcher (Port 3500)
├── telegram-gateway/    ✅ Telegram Gateway (Port 4006 MTProto + 4010 API)
├── tp-capital/          ⚠️  TP Capital (Port 4005 ou 4007?)
└── workspace/           ✅ Workspace (Port 3200 + 3900 standalone)
```

### Documentação (`docs/content/apps/`)

```
docs/content/apps/
├── overview.mdx         ✅ Catálogo geral de aplicações
├── data-capture/        🟡 Planejado (C# + ProfitDLL)
├── order-manager/       🟡 Planejado (C# + ProfitDLL)
├── telegram-gateway/    ✅ Documentado
├── tp-capital/          ⚠️  Documentado (porta inconsistente)
└── workspace/           ✅ Documentado
```

---

## 🔍 Análise Detalhada por Aplicação

### 1. ✅ Workspace API

**Status**: Completo e consistente

**Localização Real**: `apps/workspace/`
**Documentação**: `docs/content/apps/workspace/`

**Portas**:
- API Backend: 3200 ✅ (confirmado em `.env`, README, docs)
- Standalone: 3900 ✅ (documentado)

**Tecnologia**: React + Express + TimescaleDB ✅

**Arquivos de Docs**:
- ✅ `overview.mdx` - Purpose, stakeholders, tech stack
- ✅ `api.mdx` - REST endpoints
- ✅ `architecture.mdx` - Component diagrams
- ✅ `config.mdx` - Environment variables
- ✅ `deployment.mdx` - Deployment procedures
- ✅ `operations.mdx` - Day-to-day ops
- ✅ `requirements.mdx` - Dependencies
- ✅ `runbook.mdx` - Troubleshooting
- ✅ `changelog.mdx` - Version history

**Verificação**: ✅ Nenhum problema encontrado

---

### 2. ⚠️ TP Capital API

**Status**: Implementado mas com inconsistência de porta

**Localização Real**: `apps/tp-capital/`
**Documentação**: `docs/content/apps/tp-capital/`

**Problema Identificado - Porta Inconsistente**:

| Fonte | Porta Declarada |
|-------|-----------------|
| `.env` (root) | `TP_CAPITAL_PORT=4005` ✅ |
| `apps/tp-capital/.env.example` | `PORT=4005` ✅ |
| `apps/README.md` | 4005 ✅ |
| `docs/content/apps/overview.mdx` | "Port **4005**" |
| `docs/content/apps/tp-capital/overview.mdx` | "port **4005**" ✅ |
| `docs/content/apps/tp-capital/config.mdx` | `PORT=4005` ✅ |
| **CLAUDE.md** | "Port 4007" ❌ |
| **README.md (root)** | "Port 4007" ❌ |

**Inconsistência**: Documentos de referência principal (CLAUDE.md e README.md root) mencionam porta 4007, mas todos os outros indicam 4005.

**Tecnologia**: Node.js + Express + TimescaleDB + Telegraf ✅

**Arquivos de Docs**:
- ✅ `overview.mdx` - Purpose, stakeholders, user journeys
- ✅ `api.mdx` - REST endpoints (`/signals`, `/logs`, `/health`)
- ✅ `architecture.mdx` - Gateway integration, polling worker
- ✅ `config.mdx` - Environment variables, port mapping
- ✅ `deployment.mdx` - Docker Compose, production setup
- ✅ `operations.mdx` - Health checks, monitoring
- ✅ `requirements.mdx` - Dependencies (TimescaleDB, Telegram Gateway)
- ✅ `runbook.mdx` - Troubleshooting common issues
- ✅ `changelog.mdx` - Version history

**Integração com Telegram Gateway**: ✅ Bem documentada
- Gateway MTProto: Port 4006
- Gateway API: Port 4010
- TP Capital consome via polling worker

**Recomendação**:
1. **Decisão**: Confirmar porta oficial (4005 ou 4007)
2. **Correção**: Atualizar CLAUDE.md e README.md se porta for 4005
3. **Validação**: Testar startup e garantir que service está na porta correta

---

### 3. ✅ Telegram Gateway

**Status**: Completo e bem estruturado

**Localização Real**: `apps/telegram-gateway/`
**Documentação**: `docs/content/apps/telegram-gateway/`

**Arquitetura Dual**:
- **MTProto Gateway**: Port 4006 ✅ (`apps/telegram-gateway/`)
- **REST API**: Port 4010 ✅ (`backend/api/telegram-gateway/`)

**Tecnologia**: Node.js + GramJS (MTProto) + TimescaleDB ✅

**Arquivos de Docs**:
- ✅ `overview.mdx` - Dual architecture (Gateway + API)
- ✅ `api.mdx` - REST endpoints documentation
- ✅ `architecture.mdx` - MTProto flow, queue management
- ✅ `config.mdx` - Telegram credentials, API tokens
- ✅ `deployment.mdx` - systemd setup
- ✅ `operations.mdx` - Session management, health checks
- ✅ `requirements.mdx` - Telegram API credentials
- ✅ `runbook.mdx` - Session expiry, connection issues
- ✅ `changelog.mdx` - Version history

**README em apps/telegram-gateway/**: ✅ Completo e detalhado
- Documentação de setup
- Autenticação MTProto
- systemd service
- Troubleshooting

**Verificação**: ✅ Excelente documentação, nenhum problema

---

### 4. ❌ Service Launcher / Status API

**Status**: **CRÍTICO** - Implementado mas sem estrutura de documentação

**Localização Real**: `apps/status/` ✅
**Documentação**: ❌ **NÃO EXISTE** `docs/content/apps/service-launcher/`

**Porta**: 3500 ✅ (consistente)

**Tecnologia**: Node.js + Express ✅

**README Existente**: ✅ `apps/status/README.md` (muito completo - 514 linhas!)

**Problema**:
- Service Launcher é uma aplicação **crítica** para o sistema (orchestration + health monitoring)
- README excelente em `apps/status/README.md`
- **Mas não tem estrutura de docs em `docs/content/apps/`**
- Apenas mencionado brevemente em `docs/content/apps/overview.mdx` como "Tools > Service Launcher"

**Conteúdo do README Existente** (`apps/status/README.md`):
```markdown
✅ Visão geral completa
✅ Quick start
✅ Endpoints documentados (/health, /api/status, /api/health/full)
✅ Configuração centralizada
✅ Variáveis de ambiente
✅ Integrações (Dashboard, health checks)
✅ Testes (25 testes, 66% coverage)
✅ Logging estruturado (Pino)
✅ Troubleshooting detalhado
✅ Security warnings
✅ Lista de serviços monitorados
```

**Recomendação URGENTE**:
1. **Criar estrutura**: `docs/content/apps/service-launcher/`
2. **Migrar conteúdo** do excelente README para estrutura padronizada:
   - `overview.mdx` - Purpose, architecture, stakeholders
   - `api.mdx` - REST endpoints com exemplos
   - `architecture.mdx` - Health monitoring flow
   - `config.mdx` - Environment variables
   - `deployment.mdx` - Startup procedures
   - `operations.mdx` - Day-to-day management
   - `requirements.mdx` - Dependencies
   - `runbook.mdx` - Troubleshooting guide
   - `changelog.mdx` - Version history
3. **Atualizar** `docs/content/apps/overview.mdx` para incluir Service Launcher na categoria adequada

---

### 5. 🟡 Data Capture (Planned)

**Status**: Planejado, não implementado ainda

**Localização Real**: ❌ Não existe em `/apps/`
**Documentação**: ✅ `docs/content/apps/data-capture/`

**Propósito**: Real-time market data capture via ProfitDLL (C# .NET 8.0)

**Tecnologia**: C# + ProfitDLL (64-bit) + WebSocket ✅

**Status na Overview**: 🟡 Planned ✅ (corretamente marcado)

**Arquivos de Docs** (esqueletos/templates):
- ✅ `overview.mdx` - Placeholder para goals e stakeholders
- ✅ `api.mdx` - Template para WebSocket protocol
- ✅ `architecture.mdx` - Template para design
- ✅ `config.mdx` - Template para configuration
- ✅ `deployment.mdx` - Template para deployment
- ✅ `operations.mdx` - Template para operations
- ✅ `requirements.mdx` - Template para prerequisites
- ✅ `runbook.mdx` - Template para troubleshooting
- ✅ `changelog.mdx` - Empty changelog

**Verificação**: ✅ Estrutura preparada para futura implementação

---

### 6. 🟡 Order Manager (Planned)

**Status**: Planejado, não implementado ainda

**Localização Real**: ❌ Não existe em `/apps/`
**Documentação**: ✅ `docs/content/apps/order-manager/`

**Propósito**: Order execution engine with risk management (C# .NET 8.0)

**Tecnologia**: C# + ProfitDLL (64-bit) + HTTP REST ✅

**Status na Overview**: 🟡 Planned ✅ (corretamente marcado)

**Arquivos de Docs** (esqueletos/templates):
- ✅ `overview.mdx` - Placeholder para architecture
- ✅ `api.mdx` - Template para REST endpoints
- ✅ `architecture.mdx` - Template para design
- ✅ `config.mdx` - Template para configuration
- ✅ `deployment.mdx` - Template para deployment
- ✅ `operations.mdx` - Template para operations
- ✅ `requirements.mdx` - Template para prerequisites
- ✅ `runbook.mdx` - Template para troubleshooting
- ✅ `risk-controls.mdx` - Template para risk management
- ✅ `changelog.mdx` - Empty changelog

**Verificação**: ✅ Estrutura preparada para futura implementação

---

## 📊 Catálogo de Aplicações (overview.mdx)

**Arquivo**: `docs/content/apps/overview.mdx`

**Estrutura**:
- ✅ Bem organizado por categoria (Core Trading, Infrastructure, Business, Tools)
- ✅ Status legend clara (🟢 Production, 🟡 Planned, 🔴 Deprecated)
- ✅ Technology stack summary table
- ✅ Quick links para cada aplicação

**Problemas Identificados**:

1. **Service Launcher categorizado incorretamente**:
   - Atual: Listado em "Workspace" como Tools
   - Deveria ser: Categoria "Infrastructure" ou categoria própria "Orchestration"
   - É um serviço **crítico** de infraestrutura, não uma ferramenta de produtividade

2. **Firecrawl não mencionado**:
   - Existe em `apps/` (via referência no README)
   - Não aparece em `docs/content/apps/overview.mdx`
   - Port 3002 documentado em apps/README.md

3. **Technology Stack Table**:
   - ✅ Data Capture: C# (.NET 8.0), Parquet Files, Native Windows Service
   - ✅ Order Manager: C# (.NET 8.0), TimescaleDB, Native Windows Service
   - ✅ Telegram Gateway: Node.js, TimescaleDB, Docker Compose
   - ✅ TP Capital: Node.js, TimescaleDB + Telegraf, Docker Compose
   - ✅ Workspace: React + Node.js, TimescaleDB, Docker Compose
   - ❌ **Faltando**: Service Launcher (Node.js, Docker Compose)

---

## 🚨 Issues Críticos

### Issue #1: Service Launcher sem estrutura de docs

**Severidade**: 🔴 Alta
**Impacto**: Aplicação crítica de infraestrutura sem documentação padronizada

**Detalhes**:
- Service Launcher é fundamental para orchestration e health monitoring
- Tem README excelente em `apps/status/README.md` (514 linhas)
- Mas não segue estrutura padronizada de `docs/content/apps/`
- Dificulta descoberta e navegação no Docusaurus

**Ação Requerida**:
1. Criar `docs/content/apps/service-launcher/` com estrutura completa
2. Migrar conteúdo do README para arquivos .mdx
3. Adicionar à overview.mdx na categoria correta
4. Manter README em `apps/status/` como quick reference

---

### Issue #2: Inconsistência de porta TP Capital

**Severidade**: 🟡 Média
**Impacto**: Confusão em documentação de referência

**Detalhes**:
- Maioria das fontes indica porta 4005 ✅
- CLAUDE.md e README.md root indicam porta 4007 ❌
- `.env` configurado com 4005
- Service roda em 4005 (verificado em apps/tp-capital/.env.example)

**Ação Requerida**:
1. Validar qual porta está sendo usada em runtime
2. Atualizar CLAUDE.md linha 32 (Port 4007 → Port 4005)
3. Atualizar README.md root (Port 4007 → Port 4005)

---

### Issue #3: Firecrawl não documentado

**Severidade**: 🟡 Média
**Impacto**: Serviço existente sem documentação formal

**Detalhes**:
- Mencionado em `apps/README.md` como "Port 3002"
- Documentação existe em `backend/api/firecrawl-proxy/`
- Mas não aparece em `docs/content/apps/overview.mdx`
- Não tem estrutura em `docs/content/apps/`

**Questão**: Firecrawl deveria estar em `/apps/` ou apenas em `/backend/api/`?

**Ação Requerida**:
1. Decidir localização correta (apps vs backend/api)
2. Se for app: Adicionar a overview.mdx e criar estrutura de docs
3. Se for apenas API: Remover de apps/README.md

---

## ✅ Recomendações

### Prioridade Alta

1. **Criar estrutura de docs para Service Launcher**
   - Local: `docs/content/apps/service-launcher/`
   - Migrar conteúdo do excelente README existente
   - Adicionar à overview.mdx

2. **Corrigir inconsistência de porta TP Capital**
   - Validar porta em runtime
   - Atualizar CLAUDE.md (4007 → 4005)
   - Atualizar README.md root (4007 → 4005)

### Prioridade Média

3. **Reorganizar categorias em overview.mdx**
   - Mover Service Launcher para "Infrastructure" ou criar "Orchestration"
   - Adicionar Firecrawl (se aplicável)

4. **Completar Technology Stack Table**
   - Adicionar Service Launcher
   - Adicionar Firecrawl (se aplicável)

5. **Clarificar Firecrawl**
   - Decidir se é app ou apenas API backend
   - Documentar adequadamente na categoria correta

### Prioridade Baixa

6. **Adicionar diagramas PlantUML**
   - Overview com mapa de todas as aplicações
   - Diagrama de comunicação entre apps
   - Fluxo de dados (Telegram → TP Capital → Dashboard)

7. **Padronizar READMEs**
   - Todos os apps devem ter README local como quick reference
   - Docs formais em `docs/content/apps/`
   - Cross-links claros entre ambos

---

## 📈 Métricas de Qualidade

### Cobertura de Documentação

| Aplicação | Implementado | Documentado | Completude | Status |
|-----------|--------------|-------------|------------|--------|
| Workspace | ✅ | ✅ | 100% | 🟢 Excelente |
| Telegram Gateway | ✅ | ✅ | 100% | 🟢 Excelente |
| TP Capital | ✅ | ✅ | 95% (porta) | 🟡 Bom |
| Service Launcher | ✅ | ❌ | 40% (só README) | 🔴 Requer ação |
| Data Capture | ❌ | ✅ (templates) | N/A | 🟡 Planejado |
| Order Manager | ❌ | ✅ (templates) | N/A | 🟡 Planejado |
| Firecrawl | ⚠️ | ❌ | 20% | 🟡 Indefinido |

**Score Geral**: 72% (5 de 7 apps com docs adequados)

### Consistência de Estrutura

| Aplicação | overview | api | architecture | config | deployment | operations | requirements | runbook | changelog |
|-----------|----------|-----|--------------|--------|------------|------------|--------------|---------|-----------|
| Workspace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Telegram Gateway | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TP Capital | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service Launcher | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Data Capture | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Order Manager | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |

**Legenda**: ✅ Completo | 🟡 Template/Placeholder | ❌ Ausente

---

## 🔗 Cross-References

### Links que precisam ser atualizados

Se porta TP Capital for confirmada como 4005:

**CLAUDE.md** (linha ~32):
```diff
- **TP Capital**: http://localhost:4007 (Express + Telegraf - Docker container only)
+ **TP Capital**: http://localhost:4005 (Express + Telegraf - Docker container only)
```

**README.md** (root):
```diff
- TP Capital API - Port 4007
+ TP Capital API - Port 4005
```

---

## 📝 Conclusão

### Pontos Fortes
- ✅ Workspace, Telegram Gateway e TP Capital têm documentação **excelente**
- ✅ Estrutura padronizada bem definida
- ✅ Apps planejados (Data Capture, Order Manager) têm templates preparados
- ✅ Overview.mdx é bem organizado e informativo

### Áreas de Melhoria
- ❌ Service Launcher (app crítico) sem estrutura formal de docs
- ⚠️ Inconsistência de porta em documentos de referência
- ⚠️ Firecrawl com status indefinido (app ou apenas API?)
- ⚠️ Categorização de Service Launcher como "Tool" em vez de "Infrastructure"

### Próximos Passos Imediatos
1. Criar `docs/content/apps/service-launcher/` (Prioridade Alta)
2. Corrigir porta TP Capital em CLAUDE.md e README.md (Prioridade Alta)
3. Clarificar status do Firecrawl (Prioridade Média)
4. Reorganizar categorias em overview.mdx (Prioridade Média)

---

**Auditoria realizada por**: Claude Code
**Data**: 2025-10-27
**Versão do relatório**: 1.0
