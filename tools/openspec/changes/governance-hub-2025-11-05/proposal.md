## Why

TradingSystem amadureceu diversos artefatos de governança (auditorias, planos, guias de validação, checklists, CSVs), porém eles permanecem espalhados entre `governance/**`, `reports/`, `scripts/`, `docs/content/**` e arquivos CSV isolados. Isso gera problemas:

- **Descoberta lenta:** novos membros precisam abrir múltiplos diretórios para entender onde estão planos, evidências e controles.
- **Índices manuais:** `governance/DOCUMENTATION-INDEX.md` exige manutenção manual e já ficou desatualizado após reorganizações recentes.
- **Governança ≠ Docusaurus:** materiais operacionais (planilhas, JSONs, logs) não cabem bem em `docs/`, mas continuam lá por falta de lugar oficial.
- **Automação fragmentada:** scripts de validação escrevem relatórios em `docs/reports`, enquanto checklists pedem atualizações no CSV — não existe um pipeline único.

## What Changes

Criar o **Governance Hub** na raiz do repositório, com taxonomia e automação próprias:

1. **Nova estrutura `/governance`**
   - `strategy/`: planos, comunicação, cutover, roadmap, ADRs relacionados.
   - `controls/`: guias, checklists, políticas, runbooks de validação.
   - `evidence/`: auditorias, relatórios, métricas, anexos CSV/JSON.
   - `registry/`: arquivos estruturados (`registry.json`, `review-tracking.csv`, templates) + scripts de ingestão.
   - `automation/`: scripts de sync (ex.: gerar índice, dashboard, publicar para docs).

2. **Automação de Índice, Dashboards e Frontend**
   - `registry/registry.json` descreve cada artefato (categoria, owner, revisão, rota Docusaurus).
   - Scripts `automation/*.mjs` lêem o registry e produzem:
     - `governance/index.md` (markdown para leitura local).
     - `docs/content/governance/index.mdx` (gerado automaticamente, substitui DOCUMENTATION-INDEX atual).
     - `docs/content/reports/governance-status.mdx` com métricas (progress bars, KPIs).
     - **Frontend Governance** em `frontend/dashboard` (seção **Knowledge**) com cards e indicadores sempre atualizados.

3. **Migração dos Conteúdos Existentes**
   - Todos os arquivos de `governance/**` movidos para `/governance` respeitando a nova taxonomia.
   - Relatórios em `docs/reports`, `reports/`, `TIMESTAMP-*.md` e planilhas relevantes migradas para `governance/evidence/`.
   - Scripts relacionados (ex.: `scripts/docs/validate-frontmatter.py`) passam a gravar saídas em `governance/evidence/`.

4. **Integração com Docusaurus e Pipelines**
   - Docusaurus passa a consumir conteúdo gerado a partir do hub (novo plugin ou passos em `docs:auto`).
   - Jobs de CI (`docs:check`, `agents:ci`, `commands:ci`) atualizados para ler o registry e falhar caso governança esteja desatualizada (>90 dias sem review).

5. **Execução Containerizada do Dashboard**
   - `npm run dev:dashboard-docs` vira wrapper de `docker compose -p 1-dashboard-stack -f tools/compose/docker-compose.1-dashboard-stack.yml up --build`.
   - Documentação e scripts deixam claro que o dashboard (Knowledge) só deve rodar via container para garantir paridade com QA/Prod e acesso aos snapshots gerados.

## Impact

| Impacto | Descrição |
|---------|-----------|
| **DocsOps** | Um único diretório para manter governança; redução de tempo gasto em inventários manuais. |
| **DevOps / CI** | Scripts claros para validar freshness e gerar dashboards; logs ficam versionados em `/governance/evidence`. |
| **Stakeholders** | Facilidade para auditorias internas/externas; histórico e evidências acessíveis fora do Docusaurus e em visão Knowledge. |
| **AI Agents** | `CLAUDE.md` e `AGENTS.md` passam a apontar para `/governance` como referência, simplificando instruções. |

## Success Metrics

1. **100% dos arquivos de governança versionados sob `/governance`** (nenhum `governance/**` remanescente).
2. **Índice e dashboard gerados automaticamente** a cada `npm run docs:auto` (sem instruções manuais no checklist).
3. **Frontend Governance** (header Knowledge) reflete novos/alterados artefatos em ≤1 min após commit.
4. **Tempo de descoberta** (quantidade de cliques para achar guia/relatório) reduzido de ~5 diretórios para ≤2.
5. **Freshness compliance** monitorada automaticamente — script falha se >10% dos artefatos excederem 90 dias.

## Out of Scope

- Revisão de conteúdo técnico (texto, diagramas) das páginas migradas — foco apenas em reestruturação e automação.
- Criação de novas políticas de governança ou certificações externas; o objetivo é organizar e habilitar governança existente.
- Alterações em bases de dados operacionais ou integrações com ferramentas externas (Confluence, SharePoint). Em fase futura poderemos exportar, mas não neste change.

## Risks & Mitigations

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Quebra de links no Docusaurus após mover arquivos | Média | Automatizar geração dos novos MDX + configurar redirects no sidebar/`static/_redirects`. |
| Pipelines legadas apontam para `docs/governance` | Alta | Checklist de migração garante atualização de scripts e CI antes de remover pasta antiga. |
| Volume grande de arquivos binários (logs) aumenta o repo | Baixa | Armazenar apenas sumários versionados; anexos grandes permanecem em storage externo com links. |
| Falta de adoção da nova estrutura | Média | Treinamento e atualização das instruções em `CLAUDE.md`, onboarding e README. |
