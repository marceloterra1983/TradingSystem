---
change-id: update-docs-apps
status: proposal
---

# Design: Atualização de Apps no Docusaurus

## 1. Estrutura de Documentação

- **Apps Overview** (`docs/content/apps/overview.mdx`)
  - Atualizar texto introdutório para refletir catálogo real.
  - Referenciar cada app com link para `generated-index`.
- **TP Capital** (`docs/content/apps/tp-capital/**`)
  - Confirmar que overview, config, api, operations e runbook usam dados do código atual (`apps/tp-capital/src`, `apps/tp-capital/.env.example`).
  - Incluir detalhes do fluxo com Telegram Gateway (/sync-messages, /forwarded-messages).
- **Workspace** (`docs/content/apps/workspace/**`)
  - Revisar schema, portas, estratégias (TimescaleDB-only) conforme `backend/api/workspace/src/config.js`.
- **Telegram Gateway** (nova pasta)
  - Criar overview, architecture, config, operations/runbook e changelog stub.
  - Basear-se em `apps/telegram-gateway/README.md` e `backend/api/telegram-gateway/README.md`.

## 2. Fontes de Verdade

| Item | Fonte |
|------|-------|
| Portas por serviço | `config/services-manifest.json`, `.env.local` |
| Variáveis críticas | `apps/**/.env.example`, `backend/api/**/.env.example` |
| Endpoints REST | `apps/tp-capital/src/server.js`, `backend/api/telegram-gateway/src` |
| Fluxos operacionais | READMEs nos diretórios `apps/` e `backend/api/` |

## 3. Validação

- Rodar `npm run validate-docs` na raiz.
- `npm run lint` (assegurar MDX/TS validados).
- `npx openspec validate tools/openspec/changes/update-docs-apps`.

## 4. Riscos e Mitigações

- **Dados desatualizados**: Registrar achados de discovery em issues/linkar no `tasks.md`.
- **Quebra de build do Docusaurus**: validar localmente antes de merge.
- **Inconsistência com roadmap**: alinhar com DocsOps caso requisitos (SLAs, métricas) mudem.
