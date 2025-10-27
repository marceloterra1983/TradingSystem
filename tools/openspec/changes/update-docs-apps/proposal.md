---
change-id: update-docs-apps
status: proposal
created: 2025-10-26
author: Codex AI Agent
affected-specs:
  - docs-apps (NEW)
breaking: false
---

# Proposal: Atualizar documentação de Apps com dados reais

## Por que

O menu **Apps** do Docusaurus ainda destaca exemplos legados (*Data Capture*, *Order Manager*), enquanto o projeto já opera com **TP Capital**, **Workspace** e **Telegram Gateway**. Isso gera divergência entre documentação e stack real:

- Páginas existentes de TP Capital/Workspace usam trechos desatualizados (porta 3200, QuestDB como primária) em desacordo com `apps/tp-capital/src/config.js` e `.env.local`.
- O Telegram Gateway já possui dois serviços (`apps/telegram-gateway`, `backend/api/telegram-gateway`) sem qualquer documentação na seção `docs/content/apps/`.
- Há links cruzados (overview de Apps, changelog) que ainda apontam para exemplos antigos, confundindo onboarding e revisão operacional.

## O que será entregue

1. **Nova mudança OpenSpec** sob `tools/openspec/changes/update-docs-apps/` com proposal, design, specs e tasks.
2. **Documentação atualizada** para TP Capital e Workspace refletindo:
   - Portas reais declaradas em `config/services-manifest.json`.
   - Variáveis de ambiente vigentes (`apps/tp-capital/.env.example`, `.env.local`).
   - Dependência do Telegram Gateway e fluxos `/sync-messages`, `/forwarded-messages`.
3. **Nova árvore Telegram Gateway** em `docs/content/apps/telegram-gateway` cobrindo overview, arquitetura, configuração, operações/runbook e changelog stub.
4. **Ajustes de navegação** em `docs/content/apps/overview.mdx` e referências cruzadas (changelog) apontando para os novos apps.

## Métricas de sucesso

- `npm run validate-docs` executa sem erros.
- `npx openspec validate tools/openspec/changes/update-docs-apps` marca todos os requisitos como cumpridos.
- Sidebar de Apps lista TP Capital, Workspace e Telegram Gateway, sem exemplos legados.
- Operadores confirmam que variáveis e portas documentadas batem com `.env.local` e manifests.

## Fora de escopo

- Alterar código fonte dos serviços.
- Atualizar specs OpenAPI.
- Migrar ou remover documentação legada em `docs_legacy/`.

## Próximos passos imediatos

1. Executar discovery nos arquivos MDX existentes para mapear divergências.
2. Abrir issues internas caso o discovery identifique lacunas que dependam de outros times (ex.: métricas ausentes).
3. Implementar os ajustes de documentação e validar com os comandos padrão (lint, validate-docs, openspec validate).
