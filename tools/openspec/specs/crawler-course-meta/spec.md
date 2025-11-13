---
title: Crawler Course Meta Specification
sidebar_position: 1
tags: [crawler, metadata, automation]
domain: data-ingestion
type: spec
summary: Template full-stack para extração de metadados de cursos com backend Node.js/Crawlee e frontend Next.js.
status: archived
last_review: "2025-11-13"
---

# Crawler Course Meta Specification

> ⚠️ **Status:** Este capability foi descontinuado em 2025-11-13 com a remoção da stack `crawler-course-meta`. A especificação permanece arquivada apenas para consulta histórica.

## Purpose
Garantir que o template `Crawler Course Meta` entregue captura segura de metadados de cursos (Hotmart, Udemy, Moodle e similares) com backend Node.js + Crawlee + Playwright, frontend Next.js 15 e observabilidade completa (jobs, métricas, logs e artefatos).

## Requirements

### Requirement: Multi-Platform Metadata Extraction
O backend DEVE orquestrar Playwright e Crawlee para extrair metadados de cursos via plugins por plataforma, respeitando scroll infinito e seletores declarados no job.

#### Scenario: Playwright orchestrated crawl
- WHEN um job com `platform` configurado é executado via CLI ou `/api/jobs/{id}/run`
- THEN o orquestrador Crawlee abre um browser Playwright do pool configurado
- AND aplica scroll automático (`step`, `delay_ms`, `max_scrolls`) antes de extrair as seções `course`, `modules` e `lessons` definidas nos seletores
- AND persiste o estado do job (fila, runtime, retries) no storage interno

#### Scenario: Adapter plugins per platform
- WHEN um plugin de plataforma (Hotmart, Udemy, Moodle ou custom) é habilitado
- THEN o backend registra handlers específicos de login, DOM e paginação para aquela origem
- AND o job runner aplica o plugin antes de iniciar a coleta, permitindo reutilizar lógica por plataforma

### Requirement: Authentication & Session Reuse
O sistema DEVE suportar os métodos `none`, `form`, `cookie`, `bearer`, `oauth2` e `sso`, com sessões reutilizáveis e criptografadas por chave de ambiente.

#### Scenario: Form or credential-based login
- WHEN `auth.method` é `form` com `credentials_env`
- THEN o runner carrega usuário e senha de variáveis de ambiente, executa o formulário de login e valida o consentimento do dono (`owner_login: true`) antes do crawl

#### Scenario: Session import and encryption
- WHEN `auth.method` é `cookie`, `bearer`, `oauth2` ou `sso`
- THEN o job aceita cookies/tokens fornecidos, grava a sessão em `session_store.path`, criptografada com `encrypt_with_env`
- AND a sessão pode ser reutilizada em execuções futuras sem reautenticar, desde que a chave continue válida

### Requirement: Job Definition Schema
Cada job DEVE ser descrito em `job-file.yml` contendo identificador, plataforma, URLs iniciais, auth, seletores, política de scroll e formatos de saída.

#### Scenario: Declarative selectors and outputs
- WHEN um job é salvo ou enviado via API
- THEN o schema valida campos `id`, `platform`, `start_urls`, `selectors.course`, `selectors.modules`, `selectors.modules.lessons`, `scroll` e `output`
- AND `output.format` aceita `json` e/ou `md`, direcionando os arquivos para `output.directory` (ex.: `./outputs/hotmart`)

### Requirement: Backend API & CLI Surface
O backend DEVE expor endpoints REST e comandos CLI para criação, execução, dry-run e inspeção de jobs, artefatos e métricas.

#### Scenario: REST lifecycle endpoints
- WHEN clientes chamam os endpoints `/api/jobs`, `/api/jobs/{id}`, `/api/jobs/{id}/run`, `/api/jobs/{id}/dry-run`, `/api/jobs/{id}/artifacts`, `/api/jobs/{id}/report`, `/api/plugins`, `/api/sessions/login|logout`
- THEN o servidor responde com JSON estruturado contendo status, payloads de jobs, progresso em tempo real e links para artefatos

#### Scenario: CLI parity
- WHEN operadores usam `crawler-course-meta run|init|dry-run|export`
- THEN as execuções compartilham o mesmo código de orquestração do backend, garantindo paridade entre automação headless e operação via API

### Requirement: Frontend Operations Console
O frontend em Next.js 15 + Tailwind + shadcn/ui DEVE oferecer rotas autenticadas para monitorar jobs, execuções, artefatos e configurações.

#### Scenario: Core pages available
- WHEN usuários acessam `/login`, `/`, `/jobs`, `/jobs/new`, `/jobs/{id}`, `/jobs/{id}/run/{runId}`, `/artifacts`, `/metrics` e `/settings`
- THEN eles visualizam dashboards com KPIs, wizard para gerar `job-file.yml`, progresso em tempo real (SSE/WebSocket), logs e controle de plugins/sessões

### Requirement: Observability & Metrics
O sistema DEVE expor métricas Prometheus, logs estruturados e artefatos visuais para cada run.

#### Scenario: Metrics endpoint
- WHEN Prometheus ou operadores consultam `/api/metrics` ou `:9234/metrics`
- THEN recebem séries `crawler_pages_visited_total`, `crawler_items_extracted_total`, `crawler_errors_total`, `crawler_runtime_seconds` e demais KPIs prontos para Grafana

#### Scenario: Structured logs and screenshots
- WHEN um run avança
- THEN o backend registra logs JSON (`ts`, `level`, `msg`, `url`, `items`) e captura screenshots armazenadas em `outputs/screenshots/`, vinculando-as ao `report.json` final com job_id, status, runtime, items e consent info

### Requirement: Artifact Export & Storage Layout
Outputs DEvem ser salvos fora da raiz, sob `outputs/` e organizados por assunto (reports, screenshots, artifacts).

#### Scenario: Export JSON and Markdown
- WHEN um job finaliza com `output.format: ["json","md"]`
- THEN o backend gera os arquivos correspondentes em `outputs/<job>/` e expõe download via `/api/jobs/{id}/artifacts` e `/artifacts` no frontend

### Requirement: Testing & Quality Gates
O projeto DEVE manter suites de testes e cobertura mínima de 70% para backend e frontend.

#### Scenario: Test matrix
- WHEN os pipelines executam `pnpm test`, `pnpm test:integration` ou equivalentes
- THEN incluem testes unitários (Jest/Vitest), Playwright headless de integração, E2E completos contra site de teste e Testing Library/Playwright UI para o frontend, falhando se a cobertura ficar <70%

### Requirement: Compliance & Legal Guardrails
O template DEVE reforçar boas práticas legais e de consentimento durante a coleta.

#### Scenario: Consent and robots enforcement
- WHEN um job com conteúdo privado é configurado
- THEN o sistema exige confirmação de consentimento do proprietário, respeita `robots.txt` quando habilitado e impede bypass de DRM, paywalls ou autenticações de terceiros não autorizadas
- AND arquivos sensíveis (.env, sessões) nunca são versionados; variáveis obrigatórias residem em um `.env` centralizado

### Requirement: Deployment & Compose Baseline
O projeto DEVE oferecer docker-compose para API, UI e Prometheus, permitindo execução local reprodutível.

#### Scenario: Compose stack
- WHEN operadores executam `docker compose -f tools/compose/docker-compose.apps.yml up` ou o compose de exemplo do template
- THEN os serviços `api`, `ui` e `prometheus` sobem com portas publicadas (8080, 3000, 9090) e montagem de `./outputs`, garantindo paridade com ambiente de desenvolvimento
