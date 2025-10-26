---
title: Quick Reference Guide
sidebar_position: 20
tags: [ops, onboarding, quick-reference, commands]
domain: ops
type: reference
summary: Quick reference for common commands and workflows
status: active
last_review: "2025-10-17"
---

# Quick Reference Guide - TradingSystem
**Last Updated**: 2025-10-13 20:30 BRT  
**Status**: ✅ Ambiente local operacional sem Docker

---

## 🚀 Comandos essenciais

```bash
# Instalar dependências Node.js
bash install-dependencies.sh

# Subir todos os serviços locais
bash start-all-services.sh

# Verificar saúde das portas
bash check-services.sh

# Abrir principais URLs no navegador
bash open-services.sh

# Desligar tudo (processos npm)
pkill -f "npm run dev"
```

Logs ficam em `/tmp/tradingsystem-logs/`.

---

## 📡 Serviços locais padrão

| Serviço | Porta | URL | Script/Comando |
|---------|------|-----|----------------|
| Dashboard | 3103 | http://localhost:3103 | `npm run dev` |
| TP-Capital | 3200 | http://localhost:3200 | `npm run dev` |
| Workspace | 3100 | http://localhost:3100 | `npm run dev` |
| B3 | 3302 | http://localhost:3302 | `npm run dev` |
| Documentation Hub | 3004 | http://localhost:3004 | `cd docs/docusaurus && npm run start -- --port 3004` |

---

## 🤖 Telegram Bots (referência segura)

- Tokens e chat IDs ficam no arquivo `.env.local` do serviço `apps/tp-capital`.
- Variáveis principais:
  - `TELEGRAM_FORWARDER_BOT_TOKEN`
  - `TELEGRAM_INGESTION_BOT_TOKEN`
  - `TELEGRAM_SOURCE_CHANNEL_ID`
  - `TELEGRAM_DESTINATION_CHANNEL_ID`
- Para atualizar, edite o `.env.local` e reinicie a API (`npm run dev`).

---

## 🌐 Containers e infraestrutura

- Containers auxiliares (QuestDB, Grafana, Prometheus, etc.) rodam via Docker Compose (`start-all-stacks.sh` / `stop-all-stacks.sh`).
- A antiga interface gráfica de containers foi removida; utilize os scripts em `scripts/docker/` para administrar os containers.

---

## 🔧 Scripts úteis

| Script | Descrição |
|--------|-----------|
| `install-dependencies.sh` | Instala `node_modules` em todos os serviços |
| `start-all-services.sh` | Sobe todos os serviços locais em segundo plano |
| `check-services.sh` | Valida se as portas esperadas estão respondendo |
| `status.sh` | Lista processos e portas ativas do TradingSystem |
| `open-services.sh` | Abre dashboard, docs e APIs no navegador |

---

## 📚 Documentação recomendada

- [GUIA-INICIO-DEFINITIVO.md](GUIA-INICIO-DEFINITIVO.md)
- [START-SERVICES.md](START-SERVICES.md)
- [System Overview](SYSTEM-OVERVIEW.md)
