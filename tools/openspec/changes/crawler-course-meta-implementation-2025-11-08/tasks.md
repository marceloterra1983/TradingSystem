# Tasks - Crawler Course Meta Implementation

## Phase 0 – Kickoff & Foundations (1 dia)
- [ ] 0.1 Revisar spec `tools/openspec/specs/crawler-course-meta/spec.md` com stakeholders e confirmar escopo (backend, frontend, observabilidade).
- [ ] 0.2 Criar `apps/crawler-course-meta` e `apps/crawler-course-meta-ui` (ou reutilizar diretórios dedicados) com `package.json`, lint e tsconfig alinhados ao monorepo.
- [ ] 0.3 Provisionar `.env.example` com todas as variáveis (auth credentials, Playwright, storage, Prometheus) e adicionar validação via `scripts/env/validate-env.sh`.
- [ ] 0.4 Configurar Git hooks/CI básicos (lint, tests, secret-scan) e instruções em README.

## Phase 1 – Backend Core (4 dias)
- [ ] 1.1 Implementar CLI (`run|init|dry-run|export`) compartilhando a mesma camada de orquestração do servidor.
- [ ] 1.2 Configurar Crawlee (fila, persistência, retries) e pool de Playwright browsers (headless/headful, throttling, proxies).
- [ ] 1.3 Criar plugins Hotmart/Udemy/Moodle com abstrações para login, navegação, scroll e seletores dinâmicos.
- [ ] 1.4 Implementar motor de autenticação (`none`, `form`, `cookie`, `bearer`, `oauth2`, `sso`) com `session_store` criptografado.
- [ ] 1.5 Validar schema de `job-file.yml` (Zod/Yup) garantindo campos obrigatórios e diretórios dentro de `outputs/`.

## Phase 2 – API & Storage (3 dias)
- [ ] 2.1 Expor endpoints REST `/api/jobs*`, `/api/plugins`, `/api/sessions/*`, `/api/metrics` com DTOs tipados.
- [ ] 2.2 Implementar SSE/WebSocket ou long-polling para progresso em tempo real e logs de run.
- [ ] 2.3 Persistir run state (fila, retries, status, consent) em storage local ou Postgres opcional.
- [ ] 2.4 Gerar `report.json`, JSON/Markdown e screenshots por job em `outputs/<job>/...`; documentar contratos de arquivo.
- [ ] 2.5 Adicionar Prometheus metrics server (`crawler_pages_visited_total`, `crawler_items_extracted_total`, etc.) e hooks de export.

## Phase 3 – Frontend Next.js 15 (4 dias)
- [ ] 3.1 Configurar projeto Next.js 15 com app router, Tailwind, shadcn/ui e autenticação (local + SSO stub).
- [ ] 3.2 Implementar rotas `/login`, `/` (KPIs), `/jobs`, `/jobs/new`, `/jobs/{id}`, `/jobs/{id}/run/{runId}`, `/artifacts`, `/metrics`, `/settings`.
- [ ] 3.3 Construir wizard visual para montar `job-file.yml` (validando seletores e preview).
- [ ] 3.4 Criar componentes de logs/progresso com SSE/WebSocket e viewer de artefatos (JSON/MD, screenshots).
- [ ] 3.5 Integrar página `/metrics` com gráficos Prometheus/Grafana embutidos ou API agregada.

## Phase 4 – Observabilidade & Compliance (2 dias)
- [ ] 4.1 Padronizar logs JSON (pino/winston) e anexar metadata (job_id, run_id, consent, auth).
- [ ] 4.2 Publicar dashboards Grafana (ou JSON) com KPIs e alertas mínimos (erros, long runtime).
- [ ] 4.3 Implementar checklist legal (consentimento explícito, robots.txt, rate limits) e registrar resultado por run.
- [ ] 4.4 Documentar processos de auditoria em `docs/content/reports/crawler-course-meta.mdx` e outputs dedicados.

## Phase 5 – Testes & CI (3 dias)
- [ ] 5.1 Configurar suites unitárias (Jest/Vitest) para backend e frontend, com coverage reports.
- [ ] 5.2 Criar testes de integração Playwright headless para cada plugin + autenticadores.
- [ ] 5.3 Adicionar E2E completo: criar job → executar via API → validar export JSON/MD + screenshots.
- [ ] 5.4 Configurar Testing Library/Playwright UI para rotas críticas e smoke tests no CI.
- [ ] 5.5 Habilitar badge de coverage no README e gate de 70% na pipeline principal.

## Phase 6 – Packaging & Release (2 dias)
- [ ] 6.1 Criar `docker-compose` (api/ui/prometheus) + documentação de uso (start/stop, volumes, limpeza `outputs/`).
- [ ] 6.2 Publicar README principal + `outputs/README-CRAWLER-COURSE-META.md` com instruções rápidas, badges e exemplos de jobs.
- [ ] 6.3 Preparar templates de job (`templates/job-hotmart.yml`, etc.) e script `npm run job:example`.
- [ ] 6.4 Rodar review final (security, legal, DX) e registrar evidências.

## Acceptance Criteria
- [ ] Job real executado via CLI e via frontend com os mesmos resultados (paridade comprovada).
- [ ] Métricas Prometheus e logs JSON visíveis em dashboards durante runs.
- [ ] Artefatos `json`, `md`, `report.json`, `screenshots` gerados em `outputs/<job>/...` e acessíveis pelo frontend.
- [ ] Test suites (unit, integration, E2E, frontend) com cobertura ≥70% e pipeline CI verde.
- [ ] Documentação (README, docs, templates) atualizada e validada por 1 reviewer de DX + 1 de Compliance.
