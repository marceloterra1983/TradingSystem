---
title: Glossary
sidebar_position: 2
tags: [glossary, reference, terminology]
domain: shared
type: reference
summary: Central glossary for acronyms and project terminology
status: active
last_review: "2025-10-18"
---

# Glossary

| Term | Definition | Notes |
|------|------------|-------|
| **ADR** | Architecture Decision Record. Documento que registra decisões arquiteturais relevantes. | Salvos em `frontend/architecture/decisions/` ou `backend/architecture/decisions/`. |
| **PRD** | Product Requirements Document. Specifies what and why of a feature. | Templates in `shared/tools/templates/template-prd.md`. See [Idea Bank PRD](shared/product/prd/banco-ideias-prd.md) as example. |
| **RFC** | Request for Comments. Proposta técnica para discussão antes da implementação. | Índice em `shared/product/rfc/`. |
| **Roadmap** | Planejamento temporal de funcionalidades e milestones do projeto. Define prioridades, cronograma e entregas futuras. | Disponível na seção de Documentação do Dashboard. Inclui linha do tempo de desenvolvimento e marcos de cada versão. |
| **Runbook** | Procedimento operacional padronizado (ex.: restart, incident response). | Repositório em `shared/runbooks/`. |
| **ProfitDLL** | Biblioteca 64-bit da Nelogica usada para capturar dados de mercado em tempo real. | Requisito chave para execução nativa em Windows. Ver `CLAUDE.md` para detalhes. |
| **LowDB** | Banco de dados JSON file-based usado como solução MVP para Idea Bank & Documentation API. | Migração futura para PostgreSQL documentada em `backend/data/migrations/`. |
| **QuestDB** | Banco de dados time-series usado para persistir sinais do Telegram (TP Capital) com partições diárias. | Operado pelo serviço `apps/tp-capital`; documentação em `backend/data/schemas/trading-core/tables/tp-capital-signals.md`. |
| **Idea Bank API** | Serviço Express/Node (porta 3200) que gerencia ideias (CRUD) com validação via express-validator. | Documentado em `backend/guides/guide-idea-bank-api.md`. |
| **Documentation API** | Serviço Express/Node (porta 3400) para gerenciar sistemas, ideias e uploads de documentação. | Vide `backend/guides/guide-documentation-api.md`. |
| **TP-Capital API** | Serviço Node/Express (porta 3200) responsável por ingerir mensagens do Telegram, normalizar payloads e gravar no QuestDB. | Fornece endpoints `/signals`, `/logs`, `/telegram/bots`, `/telegram/channels` consumidos pelo dashboard. |
| **Dashboard** | Frontend React 18 + TypeScript + Tailwind + shadcn/ui (porta 3103), expõe Banco de Ideias e navegação de documentação interativa. | Ver `frontend/guides/guide-documentation-dashboard.md`. Navegar para `http://localhost:3103`. |
| **Docusaurus** | Plataforma de documentação em React/MDX executada a partir de `docs/` (porta 3004). | Configuração em `docusaurus.config.ts` e automações em `docker-compose.yml`. |
| **TradingSystem** | Plataforma local de trading com 6 sistemas independentes: Dashboard, Coleta de Dados, Banco de Dados, Análise de Dados, Gestão de Riscos e Documentação. | Visão geral em `index.md` e `shared/summaries/*.md`. Arquitetura completa em `CLAUDE.md`. |
| **Banco de Ideias** | Sistema de gestão de ideias integrado ao Dashboard. Permite criar, categorizar, priorizar e acompanhar ideias de melhorias. | PRD completo: `shared/product/prd/banco-ideias-prd.md`. API: porta 3200, UI: `http://localhost:3103/documentacao/banco-ideias`. |
| **API Gateway** | Serviço FastAPI que unifica chamadas REST aos serviços core (Data Capture, Order Manager). | Porta de entrada para APIs de trading. Ver `backend/api/README.md`. |
| **AsyncAPI** | Especificação para documentar APIs assíncronas (WebSocket, eventos). | 15+ canais documentados em `spec/asyncapi.yaml`. |
| **B3** | Bolsa de Valores do Brasil. Serviço de integração para dados de mercado B3. | Porta 3302. Ver `backend/api/README.md` e `backend/architecture/b3-integration-plan.md`. |
| **Clean Architecture** | Padrão arquitetural em camadas (Domain, Application, Infrastructure, Presentation). | Aplicado em serviços .NET. Ver `backend/architecture/overview.md`. |
| **Collapsible Card** | Componente UI reutilizável para seções expansíveis/colapsáveis no Dashboard. | Ver `frontend/guides/collapsible-card-standardization.md`. |
| **Customizable Layout** | Sistema de layout drag-and-drop com grid 1-4 colunas e persistência em localStorage. | Ver `frontend/features/customizable-layout.md`. |
| **Dark Mode** | Tema escuro implementado com Tailwind CSS `dark:` classes. | Ver `frontend/guides/dark-mode.md` (596 linhas). |
| **DDD** | Domain-Driven Design. Abordagem de design focada no domínio de negócio com Aggregates, Value Objects, Domain Events. | Aplicado em serviços core. Ver `backend/architecture/overview.md`. |
| **Docker Compose** | Ferramenta para orquestrar múltiplos containers Docker. | Usado para serviços auxiliares (QuestDB, monitoring, AI tools). Ver `tools/compose/`. |
| **Firecrawl** | Serviço de web scraping. Proxy em porta 3600. | Ver `backend/api/firecrawl-proxy.md`. |
| **FlexSearch** | Biblioteca de busca full-text em JavaScript. | Usada no Documentation API (porta 3400). |
| **Grafana** | Plataforma de visualização e dashboards para métricas. | Porta 3000. Ver `ops/monitoring/grafana-dashboards.md`. |
| **ILP** | InfluxDB Line Protocol. Protocolo para ingestão de dados time-series no QuestDB. | Porta 9009. Ver `backend/data/schemas/trading-core/`. |
| **Kanban** | Metodologia visual de gestão de tarefas. Implementado no Banco de Ideias. | Ver `frontend/features/feature-idea-bank.md`. |
| **Lazy Loading** | Técnica de carregamento sob demanda para reduzir bundle inicial. | 9 páginas implementadas. Ver `docs/reports/PERFORMANCE-OPTIMIZATION-SUMMARY.md`. |
| **Lucide Icons** | Biblioteca de ícones SVG para React. | Usada no Dashboard. Ver `frontend/references/design-system.md`. |
| **MVP** | Minimum Viable Product. Versão mínima viável de um produto. | LowDB usado como solução MVP. Ver `backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md`. |
| **OpenAPI** | Especificação para documentar APIs REST. | 25+ endpoints documentados em `spec/openapi.yaml`. |
| **OpenSpec** | Fluxo spec-driven para alinhar assistentes de IA, documentação e governança técnica. | Ver `shared/tools/openspec/README.md` e `shared/product/prd/documentation-specs-plan.md`. |
| **Parquet** | Formato de arquivo colunar comprimido para armazenamento eficiente de dados. | Usado para dados históricos. Ver `backend/data/warehouse/parquet-layout.md`. |
| **PlantUML** | Ferramenta para criar diagramas UML a partir de texto. | 20+ diagramas em `shared/diagrams/`. Ver `shared/diagrams/plantuml-guide.md`. |
| **PostgreSQL** | Banco de dados relacional open-source. | Migração futura do LowDB. Ver `backend/data/migrations/2025-11-01-migration-plan.md`. |
| **Prometheus** | Sistema de monitoramento e alerta baseado em métricas time-series. | Porta 9090. Ver `ops/monitoring/prometheus-setup.md`. |
| **React Query** | Biblioteca para gerenciamento de estado de servidor (data fetching, caching). | Usada no Dashboard. Ver `frontend/architecture/decisions/`. |
| **shadcn/ui** | Coleção de componentes React reutilizáveis baseados em Radix UI e Tailwind CSS. | Biblioteca de UI do Dashboard. Ver `frontend/references/design-system.md`. |
| **Spectral** | Ferramenta de linting para especificações OpenAPI/AsyncAPI. | Usado para validação de specs. Ver `docs/DOCSPECS-IMPLEMENTATION-GUIDE.md`. |
| **Tailwind CSS** | Framework CSS utility-first para estilização rápida. | Versão 3.4. Ver `frontend/guides/dark-mode.md`. |
| **TypeScript** | Superset tipado de JavaScript. | Versão 5.3. Usado no Dashboard. Ver `frontend/architecture/overview.md`. |
| **Vite** | Build tool moderno e rápido para projetos frontend. | Versão 5.x. Ver `frontend/README.md`. |
| **Vitest** | Framework de testes unitários para Vite. | Usado no Dashboard. Ver `frontend/guides/`. |
| **WebSocket** | Protocolo de comunicação bidirecional em tempo real. | Usado para streaming de dados de mercado. Ver `spec/asyncapi.yaml`. |
| **Zustand** | Biblioteca minimalista de gerenciamento de estado para React. | Usada no Dashboard. Ver `frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md`. |

---

## 📚 Semantic Groups

### Trading & Market Data
**ProfitDLL**, **B3**, **QuestDB**, **TP Capital**, **WebSocket**, **ILP**

### Data Storage & Processing
**LowDB**, **QuestDB**, **PostgreSQL**, **TimescaleDB**, **Parquet**

### Frontend Technologies
**React**, **TypeScript**, **Vite**, **Tailwind CSS**, **shadcn/ui**, **Zustand**, **React Query**, **Lucide Icons**, **Vitest**

### Backend Technologies
**Express**, **FastAPI**, **FlexSearch**, **OpenAPI**, **AsyncAPI**, **Spectral**

### Infrastructure & Operations
**Docker Compose**, **Prometheus**, **Grafana**, **Firecrawl**

### Architecture & Design
**Clean Architecture**, **DDD**, **ADR**, **PRD**, **RFC**, **OpenSpec**, **PlantUML**

### UI/UX Components
**Dashboard**, **Idea Bank**, **Customizable Layout**, **Collapsible Card**, **Dark Mode**, **Kanban**, **Lazy Loading**

---

> **Para AI agents**: Use semantic groups acima para buscar termos relacionados. Ao criar novos termos, adicione linhas nesta tabela e atualize os grupos semânticos para manter consistência entre equipes e facilitar ingestão por IA.
