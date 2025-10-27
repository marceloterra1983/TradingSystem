---
change-id: update-docs-apps
status: proposal
owner: DocsOps
---

# Task Plan: Update Docs Apps

## 1. Discovery & Alignment

- [x] 1.1 Revisar `docs/content/apps/overview.mdx` para listar itens desatualizados.
- [x] 1.2 Mapear conteúdo atual de TP Capital (`overview`, `config`, `api`, `operations`, `runbook`).
- [x] 1.3 Mapear conteúdo atual de Workspace (mesmas seções).
- [x] 1.4 Levantar dados necessários do Telegram Gateway nos diretórios `apps/telegram-gateway` e `backend/api/telegram-gateway`.
- [x] 1.5 Registrar divergências encontradas em issues ou anexar notas neste arquivo (referenciar linhas/arquivos).
      *Notas de discovery (2025-10-26)*:
      - `docs/content/apps/overview.mdx:14` ainda cita Data Capture e Order Manager.
      - `docs/content/apps/tp-capital/overview.mdx:13` e demais páginas (`config.mdx`, `operations.mdx`, `architecture.mdx`, `runbook.mdx`) continuam apontando QuestDB/porta 3200, divergindo do código (`apps/tp-capital/src/config.js:283`, `.env.local` → Timescale/porta 4005).
      - `docs/content/apps/tp-capital/api.mdx:13` documenta base URL `http://localhost:3200` e não inclui endpoints `/sync-messages` e `/forwarded-messages` existentes em `apps/tp-capital/src/server.js:200`.
      - `docs/content/apps/workspace/api.mdx:140` referencia tabela `frontend_apps.workspace`, porém schema real é `workspace.workspace_items` (`backend/data/timescaledb/workspace/01_workspace_items.sql`).
      - Falta completa de diretório `docs/content/apps/telegram-gateway` apesar de existir serviço descrito em `apps/telegram-gateway/README.md` e `backend/api/telegram-gateway/README.md`.
      - `docs/content/changelog.mdx:66` mantém links para Data Capture e Order Manager em vez dos apps atuais.

## 2. Design & Spec Alignment

- [x] 2.1 Validar que a proposta cobre todas as páginas impactadas.
- [x] 2.2 Atualizar/expandir `specs/` se discovery revelar novos requisitos.

## 3. Implementação

- [x] 3.1 Atualizar TP Capital docs com dados reais (portas, variáveis, endpoints).
- [x] 3.2 Atualizar Workspace docs com schema e fluxos atuais.
- [x] 3.3 Criar árvore `docs/content/apps/telegram-gateway` com overview, architecture, config, operations/runbook, changelog.
- [x] 3.4 Ajustar referências cruzadas (overview de Apps, changelog, dashboards).

## 4. Validação

- [x] 4.1 Executar `npm run validate-docs`.
- [x] 4.2 Executar `npm run lint`.
- [x] 4.3 Executar `npx openspec validate tools/openspec/changes/update-docs-apps`.
- [x] 4.4 Atualizar `lastReviewed` nas páginas tocadas.

## 5. Revisão & Rollout

- [ ] 5.1 Solicitar revisão de DocsOps/owners.
- [ ] 5.2 Anexar logs de validação na PR.
- [ ] 5.3 Arquivar proposta OpenSpec quando mergeada.
