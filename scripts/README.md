---
title: 📚 TradingSystem – Scripts
sidebar_position: 1
tags:
  - automation
domain: shared
type: index
summary: Visão objetiva dos scripts de automação do TradingSystem
status: active
last_review: '2025-11-05'
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
> Compatibilidade: os scripts históricos em `scripts/universal/*.sh` continuam disponíveis como wrappers, mas o caminho oficial agora é `scripts/start.sh`, `scripts/status.sh` e `scripts/stop.sh`.

## 🗂️ Estrutura Atual

| Caminho | Conteúdo |
| ------- | -------- |
| `scripts/start.sh` / `status.sh` / `stop.sh` | entrada oficial para subir, inspecionar e derrubar o stack (com wrappers legacy em `scripts/universal/`) |
| `scripts/maintenance/` | health checks, restarts e utilitários; inclui `ports/` (liberação de portas) e `dangerous/` (limpezas destrutivas com README próprio) |
| `scripts/presets/` | startups alternativas (`start-minimal`, `start-clean`, `ultimate-startup`, etc.) agrupadas em um só lugar |
| `scripts/docker/`  | wrappers para Docker Compose, build, limpeza e novos helpers como `ligar-todos-containers.sh` e `fix-unhealthy-containers.sh` |
| `scripts/docs/`    | ferramentas Docusaurus + `start-dashboard-with-docs.sh` para subir a stack de documentação isolada |
| `scripts/agents/`  | automações MCP/agents (Node.js) |
| `scripts/qdrant/`  | manutenção do cluster vetorial (`fix-qdrant-and-retest`, `quick-populate-qdrant`, backups HA) |
| `scripts/rag/`     | ingestão e testes do pipeline RAG (ex.: `ingest-documents.py`) |
| `scripts/telegram/`| utilitários para o gateway/MTProto (`fix-checar-mensagens`, `restart-telegram-api`) |
| `scripts/env/`     | verificação e ajuste do `.env` compartilhado |
| `scripts/testing/` / `validation/` | smoke tests, validação de manifests, portas e READMEs |
| `scripts/temp/`    | zona de staging para novos scripts aguardarem categorização |

## 📦 Pastas em Detalhe

### `agents/`
- `runner.mjs` – despacha automações cadastradas.
- `new-agent.mjs` – scaffolder para agentes MCP auxiliares.
- `docusaurus-daily.mjs` – agenda tarefas diárias ligadas à documentação.

### `maintenance/`
- `health-check-all.sh`, `code-quality-check.sh`, `restart-dashboard.sh` e afins.
- `validate-n8n-gateway-login.sh` – valida login do n8n via API Gateway (previne regressões)
- `ports/` concentra liberações rápidas (kill docker-proxy, Postgres nativo, porta 5050).
- `dangerous/` ganhou README próprio com checklists para `cleanup-and-restart.sh`, `nuclear-reset.sh` e `limpar-portas-e-iniciar-tudo.sh`.

### `docker/`
- `start-stacks.sh` / `stop-stacks.sh` + `docker-manager.sh` continuam como wrappers principais.
- Novos residentes: `fix-unhealthy-containers.sh` e `ligar-todos-containers.sh`.
- Scripts de build/teste (`build-images.sh`, `verify-docker.sh`, `start-llamaindex-local.sh`) seguem no mesmo lugar.

### `docs/`
- `build.sh`, `serve.sh`, `lint.sh`, `check-links.sh`, `new.sh` e os validadores Python.
- `start-dashboard-with-docs.sh` agora mora aqui junto com os geradores `docs-auto.mjs`, `prd-index.js`, etc.

### `presets/`
- Guarda todos os startups alternativos (`start-minimal`, `start-clean`, `start-with-gateway`, `ultimate-startup`, …).
- README local descreve cada preset e avisa que o desenvolvimento continua em `scripts/start.sh`.

### `qdrant/`
- `fix-qdrant-and-retest.sh`, `quick-populate-qdrant.sh`, `backup-cluster.sh`, `setup-automated-backups.sh`.
- Use esta pasta para tudo que envolve HA, migrações ou seed do cluster vetorial.

### `rag/`
- `ingest-documents.py` + demais utilitários de ingestão/teste para o stack RAG.

### `telegram/`
- Scripts operacionais do gateway (ex.: `fix-checar-mensagens.sh`, `restart-telegram-api.sh`).

### `env/`
- `validate-env.sh` garante variáveis obrigatórias.
- `set-ro-password.sh` rotaciona o usuário read-only e reflete em `MCP_POSTGRES_URL`.

### `testing/` e `validation/`
- `validation/` cobre manifests, portas duplicadas e READMEs (usado em CI).

## ✅ Checklist Rápido

- **Precisou subir o stack?** `bash scripts/start.sh --force-kill`
- **Algo fora do ar?** `bash scripts/status.sh --detailed`
- **Fim do dia?** `bash scripts/stop.sh`
- **Migrar ou fazer backup de banco?** confira `scripts/migration/` (Timescale/Neon) e `scripts/qdrant/`
- **Trabalhando na docs?** use os wrappers em `scripts/docs/`
- **Precisa de startup minimalista?** consulte `scripts/presets/README.md`
- **Vai rodar algum reset agressivo?** leia `scripts/maintenance/dangerous/README.md` antes
- **Mudou configuração do gateway/n8n?** `bash scripts/maintenance/validate-n8n-gateway-login.sh`
- **Precisa reverter centralização do gateway?** `bash scripts/maintenance/rollback-gateway-centralization.sh`

Mantemos este arquivo enxuto de propósito: qualquer script ausente ou renomeado deve ser refletido aqui imediatamente.

---

## 📖 Gateway Centralization Project

Uma iniciativa completa de centralização de URLs do gateway está documentada em:
- **[Sumário Final](../docs/GATEWAY-CENTRALIZATION-FINAL-SUMMARY.md)** - Visão geral executiva
- **[Índice](../docs/GATEWAY-CENTRALIZATION-INDEX.md)** - Hub de navegação
- **[Guia de Implantação](../docs/DEPLOYMENT-CHECKLIST-GATEWAY-CENTRALIZATION.md)** - Checklist passo-a-passo

Incluindo scripts de validação automática e rollback de emergência.

## 🆕 Fluxo para Novos Scripts

1. Crie o script em `scripts/temp/` (subpasteie arquivos auxiliares se precisar).
2. Valide localmente (`bash`, `shellcheck`, `node --check`, etc.) e adicione mini README se necessário.
3. Quando a responsabilidade estiver clara, mova para uma das pastas oficiais e atualize este guia na mesma PR.
