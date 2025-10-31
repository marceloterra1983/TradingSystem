---
title: 📚 TradingSystem – Scripts
sidebar_position: 1
tags:
  - automation
domain: shared
type: index
summary: Visão objetiva dos scripts de automação do TradingSystem
status: active
last_review: '2025-10-30'
---

# Scripts do TradingSystem

Coleção de utilitários que orquestram a stack local, automatizam tarefas de documentação e cuidam de rotinas de infraestrutura.

## 🔑 Atalhos Essenciais

```bash
# Subir containers + serviços locais
bash scripts/start.sh [--force-kill]

# Conferir serviços, containers e dependências
bash scripts/status.sh [--watch]

# Encerrar tudo com segurança
bash scripts/stop.sh [--force]
```

> Dica: exporte aliases com `install-shortcuts.sh` para usar `start`, `status`, `stop` direto no shell.

## 🗂️ Estrutura Atual

| Caminho | Conteúdo |
| ------- | -------- |
| `scripts/start.sh` / `status.sh` / `stop.sh` | entrada única para subir, inspecionar e derrubar o stack |
| `scripts/agents/`  | automações MCP/agents (Node.js) |
| `scripts/database/`| migrações, backups e provisionamento Timescale/QuestDB/Firecrawl |
| `scripts/docker/`  | wrappers para Docker Compose, build e limpeza |
| `scripts/docs/`    | ferramentas Docusaurus (lint, build, scaffolding, health checks) |
| `scripts/env/`     | verificação e ajuste de `.env` compartilhado |
| `scripts/temp/`    | zona de staging para novos scripts aguardarem categorização |

## 📦 Pastas em Detalhe

### `agents/`
- `runner.mjs` – despacha automações cadastradas.
- `new-agent.mjs` – scaffolder para agentes MCP auxiliares.
- `docusaurus-daily.mjs` – agenda tarefas diárias ligadas à documentação.

### `database/`
- `backup-timescaledb.sh` / `restore-questdb.sh` – rotinas de backup e restauração.
- `migrate-database-structure.sh` + `.sql` – migra base legada para a nova topologia.
- `setup-timescaledb-stack.sh`, `firecrawl-start.sh` / `firecrawl-stop.sh` – controle de serviços auxiliares.
- `langgraph-*.sh` – proxies e start/stop do ambiente LangGraph local.

### `docker/`
- `start-stacks.sh` / `stop-stacks.sh` – liga/desliga todos os stacks Compose suportados.
- `docker-manager.sh` – CLI unificada (`start|stop|status|logs|clean` por grupo).
- `build-images.sh` – build+tag das imagens internas `img-*`.
- `cleanup-orphans.sh`, `migrate-container-names.sh`, `verify-docker.sh` – utilidades de manutenção.
- `start-llamaindex-local.sh` / `validate-llamaindex-local.sh` – pipelines dedicadas ao LlamaIndex.

### `docs/`
- `build.sh`, `serve.sh`, `lint.sh`, `check-links.sh`, `new.sh` – wrappers bash para os comandos do workspace `docs/`.
- `docs-auto.mjs`, `prd-index.js`, `frontend-sync-tokens.js` – geração de conteúdo automático (tabelas de portas, tokens, índices).
- `validate-*.sh` / `.py` – health checks (frontmatter, integridade, produção) usados em CI.
- `common.sh` – resolve paths e exporta variáveis para os demais scripts.

### `env/`
- `validate-env.sh` – garante que variáveis obrigatórias estejam presentes e sem conflitos.
- `set-ro-password.sh` – rotaciona o usuário read-only e atualiza `MCP_POSTGRES_URL`.

## ✅ Checklist Rápido

- **Precisou subir o stack?** `bash scripts/start.sh --force-kill`
- **Algo fora do ar?** `bash scripts/status.sh --detailed`
- **Fim do dia?** `bash scripts/stop.sh`
- **Migrar ou fazer backup de banco?** veja `scripts/database/README.md`
- **Trabalhando na docs?** use os wrappers em `scripts/docs/`

Mantemos este arquivo enxuto de propósito: qualquer script ausente ou renomeado deve ser refletido aqui imediatamente.

## 🆕 Fluxo para Novos Scripts

1. Crie o script em `scripts/temp/` (subpasteie arquivos auxiliares se precisar).
2. Valide localmente (`bash`, `shellcheck`, `node --check`, etc.) e adicione mini README se necessário.
3. Quando a responsabilidade estiver clara, mova para uma das pastas oficiais e atualize este guia na mesma PR.
