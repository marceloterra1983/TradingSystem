# Tasks - Governance Hub Consolidation

## Phase 1 – Blueprint & Inventory (2 dias)
- [ ] 1.1 Mapear todos os arquivos atuais em `governance/**`, `reports/**`, `docs/reports/**`, `TIMESTAMP-*.md`, `scripts/docs/**` (somente governança) e `review-tracking.csv`.
- [ ] 1.2 Definir taxonomia final (strategy, controls, evidence, registry, automation, archive) e aprovar com DocsOps + Platform Architecture.
- [ ] 1.3 Criar `governance/README.md` com visão geral e instruções de contribuição.
- [ ] 1.4 Criar `registry/registry.json` seed com todos os artefatos existentes (title, owner, reviewCycle, tags, etc.).
- [ ] 1.5 Criar `registry/schemas/registry.schema.json` para validação futura.

## Phase 2 – Infra & Automação Base (3 dias)
- [ ] 2.1 Adicionar scripts npm: `governance:auto`, `governance:metrics`, `governance:check` ao `package.json` raiz.
- [ ] 2.2 Implementar `automation/generate-docs-index.mjs` (lê registry → gera `governance/index.md` + `docs/content/governance/index.mdx`).
- [ ] 2.3 Implementar `automation/sync-docusaurus.mjs` (copia conteúdos selecionados + aplica frontmatter via registry).
- [ ] 2.4 Implementar `automation/governance-metrics.mjs` (consolida `evidence/*.json|csv` → MDX dashboards).
- [ ] 2.5 Implementar `automation/validate-registry.mjs` (schema + freshness + paths) e integrá-lo no `governance:check`.

## Phase 3 – Migração de Conteúdo (3-4 dias)
- [ ] 3.1 Criar subpastas `strategy/`, `controls/`, `evidence/`, `registry/`, `automation/`, `archive/` conforme design.
- [ ] 3.2 Mover cada arquivo de `governance/**` para sua nova categoria (ex.: `VALIDATION-GUIDE.md → controls/validation-guide.md`).
- [ ] 3.3 Migrar relatórios em `docs/reports/` e `reports/` relacionados à governança para `evidence/` mantendo histórico.
- [ ] 3.4 Atualizar scripts (ex.: `scripts/docs/validate-frontmatter.py`, `scripts/maintenance/health-check-all.sh`) para escrever saídas no novo caminho.
- [ ] 3.5 Atualizar referências internas (README, CLAUDE.md, AGENTS.md, docs) apontando para `/governance`.

## Phase 4 – Automação & Dashboards (2 dias)
- [ ] 4.1 Configurar pipeline `docs:auto` para invocar `npm run governance:auto` antes das rotinas atuais.
- [ ] 4.2 Gerar `docs/content/governance/**` e `docs/content/reports/governance-status.mdx` automaticamente (read-only).
- [ ] 4.3 Atualizar `docs/sidebars.js` para usar dados gerados (script).
- [ ] 4.4 Adicionar checagem de freshness na CI (falha se >10% dos itens acima de 90 dias sem action plan).
- [ ] 4.5 Publicar dashboard JSON em `reports/governance/latest.json` para consumo de agentes/CLI.
- [ ] 4.6 Monitorar os próximos PRs de docs para medir o tempo total após a reutilização do `docs-validation` (registrar duração e gargalos em `reports/governance/latest.json`) e, se ficar redundante com `docs-validation` standalone, propor remoção do trigger de PR em `docs-deploy`.

## Phase 5 – Knowledge Frontend (3 dias)
- [ ] 5.1 Criar endpoint/recurso compartilhado (`reports/governance/latest.json`) acessível pelo dashboard e versionado em build.
- [ ] 5.2 Construir página/aba “Governance” no header **Knowledge** (frontend/dashboard), com rota dedicada e breadcrumbs.
- [ ] 5.3 Implementar componentes: KPIs, tabela dinâmica, timeline de evidências, alertas de freshness.
- [ ] 5.4 Integrar hook de dados (SWR/React Query) para auto-atualizar quando JSON/registry mudarem; incluir fallback offline.
- [ ] 5.5 Adicionar testes end-to-end/Vitest cobrindo renderização dos KPIs e estados de erro.
- [ ] 5.6 Garantir que o dashboard execute apenas via container (`docker compose -f tools/compose/docker-compose.dashboard.yml up --build`) e atualizar scripts/README para refletir isso.

## Phase 6 – Cutover & Comunicação (1-2 dias)
- [ ] 6.1 Atualizar `CLAUDE.md`, `AGENTS.md`, `docs/README.md` e `README.md` raiz com a nova referência ao Governance Hub e ao frontend Knowledge.
- [ ] 6.2 Criar plano de comunicação (demo, treinamento curto, checklist “como contribuir”).
- [ ] 6.3 Configurar redirects permanentes no Docusaurus para caminhos antigos (`governance/...`).
- [ ] 6.4 Remover diretório legado `docs/governance` após validação final (git history preserva conteúdo antigo).
- [ ] 6.5 Registrar resultado e lições aprendidas em `governance/evidence/migration-report-2025-11-XX.md`.

## Acceptance Criteria
- [ ] Nenhum arquivo de governança fora de `/governance` (verificado pelo `governance:check`).
- [ ] `npm run governance:check` roda em ≤60s e dá status claro (OK / Erros).
- [ ] `docs` build continua funcionando via conteúdo gerado (CI verde) e o frontend Knowledge apresenta dados do registry em tempo real.
- [ ] Dashboard obrigatoriamente iniciado via container (`npm run dev:dashboard-docs` → `docker compose ... up --build`) documentado e validado.
- [ ] Documentação de contribuição atualizada (README, CLAUDE, AGENTS).
- [ ] Evidência da migração registrada em `evidence/` com métricas antes/depois.
