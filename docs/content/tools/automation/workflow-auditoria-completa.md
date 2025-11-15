---
title: "Audit Workflow Blueprint"
slug: /tools/automation/workflow-auditoria-completa
sidebar_position: 4
description: "End to end workflow proposal for auditing TradingSystem with local agents."
tags:
  - automation
  - governance
  - workflow
owner: OpsGuild
lastReviewed: '2025-11-02'
---
# 🔍 Workflow de Auditoria Completa do TradingSystem
## Proposta de Análise, Revisão e Correção Sistemática

> **Versão:** 1.0
> **Data:** 2025-11-02
> **Objetivo:** Criar um workflow inteligente utilizando os melhores agentes e comandos disponíveis para análise profunda, revisão e correção do projeto TradingSystem.

---

## Indice

1. [Visão Geral do Workflow](#visao-geral-do-workflow)
2. [Fases do Workflow](#fases-do-workflow)
3. [Detalhamento por Fase](#detalhamento-por-fase)
4. [Outputs Esperados](#outputs-esperados)
5. [Dependências e Pré-requisitos](#dependencias-e-pre-requisitos)
6. [Cronograma Estimado](#cronograma-estimado)

---

## Visao Geral do Workflow

### Princípios Fundamentais

1. **Iterativo e Incremental**: Cada fase gera documentação que alimenta a próxima
2. **Validação Progressiva**: Questionamentos obrigatórios ao final de cada fase
3. **Rastreabilidade**: Todos os outputs salvos em `outputs/workflow-auditoria-2025-11-02/`
4. **Especialização**: Uso de agentes específicos para cada domínio
5. **Qualidade Contínua**: Validação automática e manual em cada etapa

### Estrutura de Outputs

```
outputs/workflow-auditoria-2025-11-02/
├── fase-01-inventario/
│   ├── 01-inventario-completo.md
│   ├── 02-metricas-iniciais.json
│   └── 03-decisoes-fase-02.md
├── fase-02-arquitetura/
│   ├── 01-analise-arquitetural.md
│   ├── 02-pontos-criticos.md
│   └── 03-plano-acao-arquitetura.md
├── fase-03-codigo/
│   ├── 01-code-review-backend.md
│   ├── 02-code-review-frontend.md
│   ├── 03-security-audit.md
│   └── 04-refactoring-plan.md
├── fase-04-dados/
│   ├── 01-database-audit.md
│   ├── 02-schema-optimization.md
│   └── 03-migration-plan.md
├── fase-05-testes/
│   ├── 01-test-coverage-analysis.md
│   ├── 02-test-plan.md
│   └── 03-test-automation.md
├── fase-06-performance/
│   ├── 01-performance-audit.md
│   ├── 02-bottlenecks.md
│   └── 03-optimization-roadmap.md
├── fase-07-documentacao/
│   ├── 01-docs-audit.md
│   ├── 02-content-gaps.md
│   └── 03-update-plan.md
└── fase-08-consolidacao/
    ├── 01-executive-summary.md
    ├── 02-roadmap-priorizacao.md
    └── 03-next-actions.md
```

---

## Fases do Workflow

### Fase 1: Inventário e Diagnóstico Inicial
**Duração Estimada:** 2-3 horas
**Agentes:** `@context-manager`, `@documentation-expert`, `@database-admin`
**Comandos:** `/quality-check`, `/audit`, `/git-status`

### Fase 2: Análise Arquitetural
**Duração Estimada:** 3-4 horas
**Agentes:** `@architect-reviewer`, `@architecture-modernizer`, `@backend-architect`
**Comandos:** `/architecture-review`, `/ultra-think`, `/create-architecture-documentation`

### Fase 3: Revisão de Código e Segurança
**Duração Estimada:** 4-5 horas
**Agentes:** `@code-reviewer`, `@security-specialist`, `@typescript-pro`, `@javascript-pro`
**Comandos:** `/code-review`, `/security-audit`, `/lint`, `/type-check`

### Fase 4: Auditoria de Dados e Banco de Dados
**Duração Estimada:** 2-3 horas
**Agentes:** `@database-architect`, `@database-optimizer`, `@sql-pro`
**Comandos:** `/design-database-schema`, `/performance-audit --database`

### Fase 5: Cobertura de Testes e Qualidade
**Duração Estimada:** 3-4 horas
**Agentes:** `@test-engineer`, `@test-automator`, `@load-testing-specialist`
**Comandos:** `/test-coverage`, `/generate-tests`, `/setup-comprehensive-testing`

### Fase 6: Performance e Otimização
**Duração Estimada:** 3-4 horas
**Agentes:** `@performance-engineer`, `@react-performance-optimizer`, `@database-optimizer`
**Comandos:** `/performance-audit`, `/optimize-memory-usage`, `/implement-caching-strategy`

### Fase 7: Documentação e Governança
**Duração Estimada:** 2-3 horas
**Agentes:** `@documentation-expert`, `@technical-writer`, `@docusaurus-expert`
**Comandos:** `/docs-maintenance`, `/update-docs`, `/create-onboarding-guide`

### Fase 8: Consolidação e Roadmap
**Duração Estimada:** 2-3 horas
**Agentes:** `@report-generator`, `@research-synthesizer`, `@task-decomposition-expert`
**Comandos:** `/start`, `/create-feature`, `/project-health-check`

---

## Detalhamento por Fase

### FASE 1: Inventário e Diagnóstico Inicial

#### Objetivos
- Mapear o estado atual completo do projeto
- Identificar serviços ativos e suas dependências
- Coletar métricas de baseline
- Validar ambiente e configurações

#### Sequência de Execução

**1.1 - Inventário de Estrutura**
```bash
Agente: @context-manager
Comando: Manual (Read + Glob)
Ação: Mapear todos os diretórios, serviços, APIs, containers
Output: outputs/workflow-auditoria-2025-11-02/fase-01-inventario/01-inventario-completo.md
```

**1.2 - Health Check Completo**
```bash
Agente: @devops-troubleshooter
Comando: bash scripts/maintenance/health-check-all.sh --format json
Ação: Validar saúde de todos os serviços e containers
Output: outputs/workflow-auditoria-2025-11-02/fase-01-inventario/02-health-check.json
```

**1.3 - Auditoria de Dependências**
```bash
Agente: @dependency-manager
Comando: /audit all --json
Ação: Verificar vulnerabilidades e dependências desatualizadas
Output: outputs/workflow-auditoria-2025-11-02/fase-01-inventario/03-dependencies-audit.json
```

**1.4 - Quality Baseline**
```bash
Agente: @code-reviewer
Comando: /quality-check --full --format json
Ação: Executar pipeline completo de qualidade
Output: outputs/workflow-auditoria-2025-11-02/fase-01-inventario/04-quality-baseline.json
```

**1.5 - Git Status e Histórico**
```bash
Agente: @git-flow-manager
Comando: /git-status
Ação: Analisar estado do repositório, branches, commits recentes
Output: outputs/workflow-auditoria-2025-11-02/fase-01-inventario/05-git-analysis.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-01-inventario/CONSOLIDACAO-FASE-01.md`

**Estrutura:**
- Executive Summary
- Inventário Completo (Serviços, APIs, Containers, DBs)
- Métricas de Baseline
  - Health Score Geral
  - Vulnerabilidades Críticas
  - Cobertura de Testes Atual
  - Performance Baseline (build time, bundle size)
- Áreas de Preocupação Identificadas
- Priorização Preliminar

#### 🤔 Questionamentos Obrigatórios (Fase 1)

**Antes de prosseguir para Fase 2, responder:**

1. **Serviços Críticos:** Todos os serviços essenciais estão rodando? Há algum container failed?
2. **Vulnerabilidades:** Há vulnerabilidades críticas (high/critical) que precisam ser corrigidas imediatamente?
3. **Baseline Aceitável:** O quality score atual é aceitável para continuar? Ou precisamos corrigir issues críticos antes?
4. **Ambiente Estável:** O ambiente está suficientemente estável para uma auditoria profunda?
5. **Escopo:** Há alguma área que deve ser excluída ou priorizada na auditoria?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 2 ❓**

---

### FASE 2: Análise Arquitetural

#### Objetivos
- Avaliar aderência aos princípios de Clean Architecture e DDD
- Identificar padrões arquiteturais aplicados e oportunidades
- Validar separação de camadas e responsabilidades
- Detectar dívida técnica arquitetural

#### Sequência de Execução

**2.1 - Revisão Arquitetural Completa**
```bash
Agente: @architect-reviewer
Comando: /architecture-review --full
Ação: Auditoria completa da arquitetura do sistema
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/01-architecture-review-complete.md
```

**2.2 - Análise Backend (APIs e Serviços)**
```bash
Agente: @backend-architect
Comando: /architecture-review backend --dependencies
Ação: Avaliar arquitetura de backend, APIs, contratos REST
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/02-backend-analysis.md
```

**2.3 - Análise Frontend (Dashboard)**
```bash
Agente: @frontend-developer
Comando: /architecture-review frontend --modules
Ação: Avaliar estrutura do dashboard, componentes, state management
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/03-frontend-analysis.md
```

**2.4 - Padrões e Anti-Padrões**
```bash
Agente: @architecture-modernizer
Comando: Manual (análise com base nos outputs anteriores)
Ação: Identificar padrões aplicados corretamente e anti-padrões
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/04-patterns-antipatterns.md
```

**2.5 - Decisões Críticas (Ultra Think)**
```bash
Agente: @task-decomposition-expert
Comando: /ultra-think "Quais são as principais decisões arquiteturais que precisam ser tomadas?"
Ação: Análise profunda das decisões arquiteturais críticas
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/05-critical-decisions.md
```

**2.6 - Documentação Arquitetural**
```bash
Agente: @documentation-expert
Comando: /create-architecture-documentation --c4-model --adr
Ação: Gerar/atualizar documentação arquitetural (C4, ADRs)
Output: outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/06-architecture-docs.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/CONSOLIDACAO-FASE-02.md`

**Estrutura:**
- Executive Summary Arquitetural
- Aderência a Clean Architecture (Score por camada)
- Aderência a DDD (Score por bounded context)
- Padrões Arquiteturais Identificados
  - ✅ Padrões bem aplicados
  - ⚠️ Padrões parcialmente aplicados
  - ❌ Anti-padrões detectados
- Dívida Técnica Arquitetural
  - Crítica (P0)
  - Alta (P1)
  - Média (P2)
  - Baixa (P3)
- Plano de Ação Arquitetural (Quick Wins + Roadmap)

#### 🤔 Questionamentos Obrigatórios (Fase 2)

**Antes de prosseguir para Fase 3, responder:**

1. **Dívida Técnica P0:** Há dívidas arquiteturais críticas que bloqueiam evolução? Devem ser corrigidas antes de continuar?
2. **Refatorações Estruturais:** Há necessidade de refatorações grandes (ex: separar serviços, criar API Gateway)? Devem entrar no roadmap?
3. **Bounded Contexts:** Os limites de domínio (DDD) estão claros? Precisam ser redefinidos?
4. **Documentação ADRs:** As decisões arquiteturais críticas estão documentadas? Precisam de ADRs novos?
5. **Priorização:** Qual a prioridade: corrigir dívida técnica ou avançar com novas features?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 3 ❓**

---

### FASE 3: Revisão de Código e Segurança

#### Objetivos
- Revisar qualidade do código (backend e frontend)
- Identificar vulnerabilidades de segurança
- Detectar code smells e duplicações
- Validar aderência a padrões de código

#### Sequência de Execução

**3.1 - Code Review Backend**
```bash
Agente: @code-reviewer
Comando: /code-review backend --full
Ação: Revisão completa do código backend
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/01-code-review-backend.md
```

**3.2 - Code Review Frontend**
```bash
Agente: @react-performance-optimizer
Comando: /code-review frontend --full
Ação: Revisão completa do código frontend
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/02-code-review-frontend.md
```

**3.3 - Auditoria de Segurança**
```bash
Agente: @security-specialist (criar se necessário)
Comando: /security-audit --full
Ação: Auditoria de segurança completa
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/03-security-audit.md
```

**3.4 - Type Safety (TypeScript)**
```bash
Agente: @typescript-pro
Comando: /type-check all --pretty
Ação: Validar tipagem em todos os projetos TypeScript
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/04-type-check-report.md
```

**3.5 - Linting e Formatting**
```bash
Agente: @javascript-pro
Comando: /lint all && /format --check
Ação: Validar padrões de código e formatação
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/05-lint-format-report.md
```

**3.6 - Code Smells e Duplicações**
```bash
Agente: @legacy-modernizer
Comando: Manual (análise de code smells)
Ação: Identificar código legado, duplicações, complexidade ciclomática
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/06-code-smells.md
```

**3.7 - Plano de Refactoring**
```bash
Agente: @architecture-modernizer
Comando: Manual (baseado nos outputs anteriores)
Ação: Criar plano de refactoring priorizado
Output: outputs/workflow-auditoria-2025-11-02/fase-03-codigo/07-refactoring-plan.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-03-codigo/CONSOLIDACAO-FASE-03.md`

**Estrutura:**
- Executive Summary de Qualidade de Código
- Métricas de Qualidade
  - Complexidade Ciclomática (McCabe)
  - Duplicação de Código (%)
  - Type Safety Score
  - Lint Issues (critical, high, medium, low)
- Vulnerabilidades de Segurança
  - Critical (P0)
  - High (P1)
  - Medium (P2)
  - Low (P3)
- Code Smells Principais
  - Top 10 code smells
  - Áreas mais afetadas
- Plano de Refactoring Priorizado
  - Quick Wins (< 1 dia)
  - Short Term (1-2 semanas)
  - Medium Term (3-4 semanas)
  - Long Term (backlog)

#### 🤔 Questionamentos Obrigatórios (Fase 3)

**Antes de prosseguir para Fase 4, responder:**

1. **Vulnerabilidades Críticas:** Há vulnerabilidades de segurança P0/P1 que devem ser corrigidas imediatamente?
2. **Bloqueadores:** Há code smells ou dívidas técnicas que bloqueiam desenvolvimento de novas features?
3. **Refactoring Urgente:** Há refatorações que devem ser feitas antes de continuar (ex: separar lógica de negócio de controllers)?
4. **Padrões de Código:** Os padrões de código são consistentes? Precisam de guidelines atualizados?
5. **Priorização:** Corrigir dívida técnica de código ou avançar com outras fases?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 4 ❓**

---

### FASE 4: Auditoria de Dados e Banco de Dados

#### Objetivos
- Avaliar esquemas de banco de dados (TimescaleDB, QuestDB, LowDB)
- Identificar queries lentas e gargalos
- Validar estratégias de indexação
- Propor otimizações e migrações

#### Sequência de Execução

**4.1 - Database Schema Audit**
```bash
Agente: @database-architect
Comando: /design-database-schema --relational --analyze-current
Ação: Avaliar esquemas atuais (TimescaleDB, QuestDB)
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/01-schema-audit.md
```

**4.2 - Query Performance Analysis**
```bash
Agente: @database-optimizer
Comando: Manual (análise de queries via logs/explain)
Ação: Identificar queries lentas e oportunidades de otimização
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/02-query-performance.md
```

**4.3 - Indexing Strategy**
```bash
Agente: @sql-pro
Comando: Manual (análise de índices)
Ação: Avaliar estratégia de indexação atual e propor melhorias
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/03-indexing-strategy.md
```

**4.4 - Data Lifecycle e Retenção**
```bash
Agente: @database-admin
Comando: Manual (revisar políticas de retenção)
Ação: Avaliar políticas de retenção, backup e arquivamento
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/04-data-lifecycle.md
```

**4.5 - Migration Plan**
```bash
Agente: @database-architect
Comando: /create-database-migrations --plan
Ação: Criar plano de migrações necessárias
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/05-migration-plan.md
```

**4.6 - Caching Strategy**
```bash
Agente: @nosql-specialist
Comando: /implement-caching-strategy --redis
Ação: Propor estratégia de caching (LowDB, Redis)
Output: outputs/workflow-auditoria-2025-11-02/fase-04-dados/06-caching-strategy.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-04-dados/CONSOLIDACAO-FASE-04.md`

**Estrutura:**
- Executive Summary de Dados
- Health Score por Banco
  - TimescaleDB
  - QuestDB
  - LowDB
- Queries Lentas (Top 10)
- Índices Faltantes ou Ineficientes
- Oportunidades de Otimização
  - Particionamento
  - Compression
  - Materialized Views
  - Caching
- Plano de Migrações Priorizadas
- Roadmap de Otimização de Dados

#### 🤔 Questionamentos Obrigatórios (Fase 4)

**Antes de prosseguir para Fase 5, responder:**

1. **Performance Crítica:** Há queries ou operações de DB que estão impactando performance crítica do sistema?
2. **Escalabilidade:** Os esquemas atuais suportam o crescimento esperado de dados?
3. **Migrações Urgentes:** Há migrações que devem ser executadas imediatamente?
4. **Caching:** A estratégia de caching atual é adequada? Precisa de Redis ou outras soluções?
5. **Backup e Retenção:** As políticas de backup e retenção são adequadas para compliance e recovery?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 5 ❓**

---

### FASE 5: Cobertura de Testes e Qualidade

#### Objetivos
- Avaliar cobertura de testes atual
- Identificar gaps críticos de cobertura
- Propor estratégia de testes (unit, integration, e2e)
- Criar plano de automação de testes

#### Sequência de Execução

**5.1 - Test Coverage Analysis**
```bash
Agente: @test-engineer
Comando: /test-coverage --detailed
Ação: Análise completa de cobertura de testes
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/01-coverage-analysis.md
```

**5.2 - Test Quality Assessment**
```bash
Agente: @test-quality-analyzer
Comando: /test-quality-analyzer --full
Ação: Avaliar qualidade dos testes existentes
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/02-test-quality.md
```

**5.3 - Critical Paths Coverage**
```bash
Agente: @test-engineer
Comando: Manual (identificar caminhos críticos sem testes)
Ação: Mapear caminhos críticos sem cobertura adequada
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/03-critical-paths-gaps.md
```

**5.4 - Test Strategy Plan**
```bash
Agente: @test-automator
Comando: /setup-comprehensive-testing --full-stack
Ação: Criar estratégia de testes (unit, integration, e2e, load)
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/04-test-strategy.md
```

**5.5 - Test Generation Plan**
```bash
Agente: @test-automator
Comando: /generate-test-cases --critical-modules
Ação: Gerar plano de testes para módulos críticos
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/05-test-generation-plan.md
```

**5.6 - Load Testing Strategy**
```bash
Agente: @load-testing-specialist
Comando: /setup-load-testing --stress
Ação: Propor estratégia de testes de carga e stress
Output: outputs/workflow-auditoria-2025-11-02/fase-05-testes/06-load-testing-plan.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-05-testes/CONSOLIDACAO-FASE-05.md`

**Estrutura:**
- Executive Summary de Testes
- Métricas de Cobertura
  - Cobertura Geral (%)
  - Cobertura por Módulo
  - Cobertura de Caminhos Críticos
- Gaps Críticos de Cobertura
  - Módulos sem testes (P0)
  - Caminhos críticos sem cobertura (P1)
  - Features recentes sem testes (P2)
- Estratégia de Testes Proposta
  - Unit Tests (target: 80%)
  - Integration Tests (target: 60%)
  - E2E Tests (critical paths)
  - Load Tests (performance baseline)
- Roadmap de Automação de Testes
  - Quick Wins (< 1 semana)
  - Short Term (2-4 semanas)
  - Medium Term (1-2 meses)

#### 🤔 Questionamentos Obrigatórios (Fase 5)

**Antes de prosseguir para Fase 6, responder:**

1. **Cobertura Aceitável:** A cobertura atual (30%) é aceitável para produção? Qual o target mínimo?
2. **Caminhos Críticos:** Os caminhos críticos (execução de ordens, risco, auth) têm cobertura adequada?
3. **Priorização de Testes:** Quais módulos devem ter testes escritos primeiro?
4. **Load Testing:** É necessário realizar load testing antes de produção? Com qual volume?
5. **CI/CD Integration:** Os testes devem bloquear deploy se falharem?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 6 ❓**

---

### FASE 6: Performance e Otimização

#### Objetivos
- Avaliar performance end-to-end (frontend + backend + DB)
- Identificar gargalos críticos
- Propor otimizações priorizadas
- Criar roadmap de performance

#### Sequência de Execução

**6.1 - Performance Audit Completo**
```bash
Agente: @performance-engineer
Comando: /performance-audit --full
Ação: Auditoria completa de performance
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/01-performance-audit.md
```

**6.2 - Frontend Performance**
```bash
Agente: @react-performance-optimizer
Comando: /web-vitals-audit frontend/dashboard
Ação: Avaliar métricas Web Vitals e bundle size
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/02-frontend-performance.md
```

**6.3 - Backend Performance**
```bash
Agente: @performance-engineer
Comando: Manual (análise de latência de APIs)
Ação: Medir latência de endpoints críticos
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/03-backend-performance.md
```

**6.4 - Database Performance**
```bash
Agente: @database-optimizer
Comando: Manual (análise de query execution time)
Ação: Avaliar performance de queries críticas
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/04-database-performance.md
```

**6.5 - Memory Profiling**
```bash
Agente: @performance-profiler
Comando: /optimize-memory-usage --backend --frontend
Ação: Identificar memory leaks e otimizações
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/05-memory-profiling.md
```

**6.6 - Caching Implementation**
```bash
Agente: @nosql-specialist
Comando: /implement-caching-strategy --application
Ação: Propor implementação de caching (Redis, in-memory)
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/06-caching-implementation.md
```

**6.7 - Optimization Roadmap**
```bash
Agente: @performance-engineer
Comando: Manual (consolidação de todas as análises)
Ação: Criar roadmap priorizado de otimizações
Output: outputs/workflow-auditoria-2025-11-02/fase-06-performance/07-optimization-roadmap.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-06-performance/CONSOLIDACAO-FASE-06.md`

**Estrutura:**
- Executive Summary de Performance
- Métricas Baseline
  - Frontend: LCP, FID, CLS, Bundle Size
  - Backend: P50, P95, P99 latency por endpoint
  - Database: Query execution time (P50, P95, P99)
- Gargalos Críticos (Top 10)
- Oportunidades de Otimização
  - Frontend (code splitting, lazy loading, memoization)
  - Backend (caching, connection pooling, async processing)
  - Database (índices, materialized views, particionamento)
- Roadmap de Otimização Priorizado
  - Quick Wins (< 1 dia, alto impacto)
  - Short Term (1-2 semanas)
  - Medium Term (3-4 semanas)
  - Long Term (backlog)
- Targets de Performance (SLA)

#### 🤔 Questionamentos Obrigatórios (Fase 6)

**Antes de prosseguir para Fase 7, responder:**

1. **Performance Aceitável:** A performance atual atende aos SLAs de trading (< 500ms)?
2. **Gargalos Críticos:** Há gargalos que impedem operação em produção?
3. **Priorização:** Quais otimizações devem ser implementadas antes de produção?
4. **SLA Definition:** Quais são os SLAs de performance para cada serviço crítico?
5. **Monitoramento:** Os alertas de performance estão configurados corretamente?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 7 ❓**

---

### FASE 7: Documentação e Governança

#### Objetivos
- Auditar documentação existente
- Identificar gaps de documentação
- Atualizar documentação desatualizada
- Criar guias operacionais

#### Sequência de Execução

**7.1 - Documentation Audit**
```bash
Agente: @documentation-expert
Comando: /docs-maintenance --comprehensive
Ação: Auditoria completa da documentação
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/01-docs-audit.md
```

**7.2 - Content Gaps Analysis**
```bash
Agente: @content-curator
Comando: Manual (identificar gaps de documentação)
Ação: Mapear documentação faltante ou incompleta
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/02-content-gaps.md
```

**7.3 - Docusaurus Health Check**
```bash
Agente: @docusaurus-expert
Comando: Manual (validar build, links, frontmatter)
Ação: Verificar saúde do hub Docusaurus
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/03-docusaurus-health.md
```

**7.4 - Update Plan**
```bash
Agente: @technical-writer
Comando: /update-docs --comprehensive
Ação: Criar plano de atualização de documentação
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/04-update-plan.md
```

**7.5 - Onboarding Guide**
```bash
Agente: @documentation-expert
Comando: /create-onboarding-guide --comprehensive
Ação: Criar/atualizar guia de onboarding
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/05-onboarding-guide.md
```

**7.6 - Operational Guides**
```bash
Agente: @technical-writer
Comando: /troubleshooting-guide --comprehensive
Ação: Criar guias operacionais e troubleshooting
Output: outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/06-operational-guides.md
```

#### Output Consolidado
**Documento:** `outputs/workflow-auditoria-2025-11-02/fase-07-documentacao/CONSOLIDACAO-FASE-07.md`

**Estrutura:**
- Executive Summary de Documentação
- Métricas de Documentação
  - Cobertura de APIs (%)
  - Cobertura de Features (%)
  - Docs com frontmatter válido (%)
  - Links quebrados (count)
- Gaps Críticos de Documentação
  - APIs sem documentação
  - Features sem guias
  - Processos operacionais sem runbooks
- Plano de Atualização Priorizado
  - Critical (P0): APIs e features em produção
  - High (P1): Guias operacionais e troubleshooting
  - Medium (P2): Onboarding e tutoriais
  - Low (P3): Melhorias incrementais
- Roadmap de Documentação

#### 🤔 Questionamentos Obrigatórios (Fase 7)

**Antes de prosseguir para Fase 8, responder:**

1. **Documentação Crítica:** A documentação de APIs e features críticas está completa?
2. **Runbooks:** Os runbooks operacionais existem e estão atualizados?
3. **Onboarding:** O guia de onboarding é suficiente para um novo desenvolvedor?
4. **ADRs:** As decisões arquiteturais críticas estão documentadas em ADRs?
5. **Priorização:** Qual documentação deve ser criada/atualizada primeiro?

**❓ AGUARDAR RESPOSTA DO USUÁRIO ANTES DE PROSSEGUIR PARA FASE 8 ❓**

---

### FASE 8: Consolidação e Roadmap

#### Objetivos
- Consolidar todos os achados das fases anteriores
- Priorizar ações e criar roadmap executivo
- Gerar plano de ação detalhado
- Definir métricas de sucesso e KPIs

#### Sequência de Execução

**8.1 - Synthesis de Todos os Achados**
```bash
Agente: @research-synthesizer
Comando: Manual (consolidação de todas as fases)
Ação: Sintetizar achados de todas as 7 fases anteriores
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/01-synthesis.md
```

**8.2 - Executive Summary**
```bash
Agente: @report-generator
Comando: Manual (criar sumário executivo)
Ação: Criar sumário executivo para stakeholders
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/02-executive-summary.md
```

**8.3 - Priorização de Ações**
```bash
Agente: @task-decomposition-expert
Comando: Manual (matriz de priorização)
Ação: Priorizar todas as ações (impacto x esforço)
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/03-prioritization-matrix.md
```

**8.4 - Roadmap Executivo**
```bash
Agente: @task-decomposition-expert
Comando: /start --analyze-only
Ação: Criar roadmap executivo com fases e milestones
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/04-roadmap.md
```

**8.5 - Action Plan Detalhado**
```bash
Agente: @task-decomposition-expert
Comando: Manual (plano de ação detalhado)
Ação: Criar plano de ação com tarefas, responsáveis, prazos
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/05-action-plan.md
```

**8.6 - KPIs e Métricas de Sucesso**
```bash
Agente: @report-generator
Comando: Manual (definir KPIs)
Ação: Definir KPIs e métricas de sucesso para acompanhamento
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/06-kpis-metrics.md
```

**8.7 - Next Actions (Quick Wins)**
```bash
Agente: @task-decomposition-expert
Comando: Manual (identificar quick wins)
Ação: Listar ações imediatas (quick wins) para começar
Output: outputs/workflow-auditoria-2025-11-02/fase-08-consolidacao/07-next-actions.md
```

#### Output Consolidado Final
**Documento:** `outputs/workflow-auditoria-2025-11-02/FINAL-REPORT.md`

**Estrutura:**
- **Executive Summary Geral**
  - Visão geral do projeto
  - Saúde atual (score geral)
  - Principais achados
  - Recomendações estratégicas

- **Métricas Baseline vs Target**
  - Qualidade de Código: 65% → 85%
  - Cobertura de Testes: 30% → 80%
  - Performance (P95): 800ms → 500ms
  - Vulnerabilidades: 12 critical → 0 critical
  - Documentação: 60% → 90%

- **Dívida Técnica Total**
  - Critical (P0): X items, Y dias
  - High (P1): X items, Y dias
  - Medium (P2): X items, Y semanas
  - Low (P3): X items, backlog

- **Roadmap Executivo (6 meses)**
  - Sprint 1 (2 semanas): Quick Wins + P0
  - Sprint 2-3 (4 semanas): P1 + Foundation
  - Sprint 4-6 (6 semanas): P2 + Optimization
  - Backlog: P3 + Long Term

- **Action Plan Imediato (Next 30 days)**
  - Week 1: Critical fixes + Security patches
  - Week 2: Test coverage (critical paths)
  - Week 3: Performance optimization (quick wins)
  - Week 4: Documentation updates

- **KPIs de Acompanhamento**
  - Semanais: Build status, Test coverage, Open critical issues
  - Mensais: Code quality score, Performance metrics, Debt reduction
  - Trimestrais: Architecture evolution, Feature delivery, Team velocity

#### 🤔 Questionamentos Finais (Fase 8)

**Antes de executar o plano, responder:**

1. **Priorização Geral:** O roadmap proposto reflete as prioridades do negócio?
2. **Recursos:** Há recursos (time, budget) suficientes para executar o plano?
3. **Timeline:** O timeline proposto é realista para o contexto da equipe?
4. **Risk Management:** Os riscos identificados estão cobertos no plano?
5. **Stakeholder Buy-in:** Os stakeholders aprovam o plano e as prioridades?

**❓ AGUARDAR APROVAÇÃO FINAL DO USUÁRIO PARA INICIAR EXECUÇÃO ❓**

---

## Outputs Esperados

### Por Fase

| Fase | Documentos Principais | Formato | Tamanho Estimado |
|------|----------------------|---------|------------------|
| Fase 1 | Inventário + Health Check + Baseline | MD + JSON | 5-8 páginas |
| Fase 2 | Análise Arquitetural + Padrões | MD + Diagramas | 10-15 páginas |
| Fase 3 | Code Review + Security Audit | MD + JSON | 15-20 páginas |
| Fase 4 | Database Audit + Migration Plan | MD + SQL | 8-12 páginas |
| Fase 5 | Test Coverage + Strategy | MD + Test Plans | 10-15 páginas |
| Fase 6 | Performance Audit + Roadmap | MD + Metrics | 12-18 páginas |
| Fase 7 | Docs Audit + Update Plan | MD | 8-12 páginas |
| Fase 8 | Executive Summary + Roadmap | MD | 15-25 páginas |

### Documento Final

**`FINAL-REPORT.md`** - Documento executivo consolidado
- **Tamanho:** 40-60 páginas
- **Seções:** 8 (correspondentes às fases)
- **Anexos:** Todos os relatórios detalhados de cada fase
- **Formato:** Markdown com tabelas, gráficos (mermaid), listas priorizadas
- **Audiência:** C-level, Tech Leads, Product Owners, Developers

---

## Dependencias e Pre-requisitos

### Ambiente

- ✅ Todos os serviços rodando (Dashboard, APIs, Containers)
- ✅ Acesso aos bancos de dados (TimescaleDB, QuestDB, LowDB)
- ✅ Git em estado consistente (sem uncommitted changes críticos)
- ✅ Ferramentas instaladas: Node.js, Docker, CLI tools

### Ferramentas

- ✅ Claude Code CLI configurado
- ✅ Agentes e comandos customizados disponíveis
- ✅ MCP servers ativos (filesystem, docker, github, postgres)
- ✅ Scripts de health-check funcionando

### Acesso

- ✅ Permissões de leitura em todo o codebase
- ✅ Permissões de escrita em `outputs/`
- ✅ Acesso a logs de serviços
- ✅ Acesso a métricas de performance

---

## Cronograma Estimado

### Execução Completa

**Total:** 22-30 horas (3-4 dias úteis)

| Fase | Duração Estimada | Tipo de Trabalho | Dependências |
|------|------------------|------------------|--------------|
| Fase 1 | 2-3 horas | Automático + Manual | Nenhuma |
| Fase 2 | 3-4 horas | Manual + Análise | Fase 1 |
| Fase 3 | 4-5 horas | Automático + Manual | Fase 2 |
| Fase 4 | 2-3 horas | Manual + Análise | Fase 3 |
| Fase 5 | 3-4 horas | Manual + Análise | Fase 4 |
| Fase 6 | 3-4 horas | Automático + Manual | Fase 5 |
| Fase 7 | 2-3 horas | Manual + Análise | Fase 6 |
| Fase 8 | 2-3 horas | Manual + Síntese | Fases 1-7 |

### Distribuição Sugerida

**Dia 1 (6-8h):** Fases 1, 2, 3 (parcial)
**Dia 2 (6-8h):** Fase 3 (conclusão), 4, 5
**Dia 3 (6-8h):** Fases 6, 7
**Dia 4 (4-6h):** Fase 8 + Review final

---

## 🎯 Critérios de Sucesso

### Por Fase

- ✅ Todos os outputs gerados e salvos em `outputs/workflow-auditoria-2025-11-02/`
- ✅ Questionamentos respondidos pelo usuário
- ✅ Validação de qualidade de cada documento
- ✅ Aprovação para prosseguir para próxima fase

### Workflow Completo

- ✅ Relatório final consolidado gerado
- ✅ Roadmap executivo aprovado
- ✅ Action plan detalhado com responsáveis e prazos
- ✅ KPIs definidos e baseline estabelecido
- ✅ Quick wins identificados e priorizados
- ✅ Stakeholders alinhados e comprometidos

---

## 📋 Checklist de Aprovação

Antes de iniciar a execução, validar:

- [ ] **Ambiente estável** - Todos os serviços críticos rodando
- [ ] **Acesso completo** - Permissões de leitura/escrita em todos os diretórios necessários
- [ ] **Ferramentas prontas** - CLI, agentes, comandos testados
- [ ] **Tempo disponível** - 3-4 dias dedicados para execução completa
- [ ] **Stakeholders alinhados** - Expectativas claras sobre outputs e timeline
- [ ] **Outputs directory criado** - `outputs/workflow-auditoria-2025-11-02/`
- [ ] **Backup realizado** - Estado atual do projeto salvo
- [ ] **Aprovação para iniciar** - Usuário confirma início do workflow

---

## 🚀 Próximos Passos

**Após aprovação desta proposta:**

1. **Criar estrutura de diretórios** em `outputs/workflow-auditoria-2025-11-02/`
2. **Validar ambiente** com health-check completo
3. **Iniciar Fase 1** - Inventário e Diagnóstico Inicial
4. **Seguir workflow sequencial** respeitando questionamentos obrigatórios
5. **Documentar progressivamente** cada fase com outputs detalhados
6. **Consolidar ao final** com relatório executivo completo

---

## 📞 Contato e Suporte

**Para dúvidas durante execução:**
- Consultar `CLAUDE.md` para guidelines gerais
- Revisar `agents-raiox.md` para capacidades de agentes
- Consultar `commands-raiox.md` para comandos disponíveis
- Pedir esclarecimentos ao usuário quando necessário

---

**Versão:** 1.0
**Última Atualização:** 2025-11-02
**Autor:** Claude (Sonnet 4.5)
**Status:** Aguardando Aprovação

---

## ❓ Pergunta Final

**Você aprova esta proposta de workflow?**

Se sim, vou criar a estrutura de diretórios e iniciar a Fase 1.

Se houver ajustes necessários, por favor especifique:
- Fases que devem ser priorizadas ou removidas
- Agentes ou comandos específicos que deseja utilizar
- Escopo que deve ser reduzido ou expandido
- Timeline ou recursos disponíveis

**Aguardando sua resposta para prosseguir... 🎯**
