---
title: Service Startup Guide
sidebar_position: 15
tags: [ops, onboarding, services, startup, guide]
domain: ops
type: guide
summary: Detailed guide for starting and stopping TradingSystem services
status: active
last_review: "2025-10-17"
---

# TradingSystem Services Startup Guide

**Last Updated:** 2025-10-13

---

## 🚀 Opção 1 — Script oficial (recomendado)

```bash
cd /home/marce/projetos/TradingSystem
bash install-dependencies.sh   # primeira vez ou quando package.json mudar
bash start-all-services.sh     # sobe todos os serviços locais em background
```

- Logs: `/tmp/tradingsystem-logs/*.log`
- Verificação rápida: `bash check-services.sh`
- Abrir URLs automaticamente: `bash open-services.sh`
- Parar tudo: `pkill -f "npm run dev"`

---

## 🛠️ Opção 2 — Inicialização manual serviço a serviço

Use esta abordagem quando quiser depurar ou subir apenas partes do sistema.

```bash
# Dashboard (Porta 3103)
cd /home/marce/projetos/TradingSystem/frontend/dashboard
npm install         # se ainda não tiver rodado
npm run dev

# TP-Capital (Porta 3200)
cd /home/marce/projetos/TradingSystem/apps/tp-capital
npm install
npm run dev

# Workspace (Porta 3100)
cd /home/marce/projetos/TradingSystem/apps/workspace
npm install
npm run dev

# B3 (Porta 3302)
cd /home/marce/projetos/TradingSystem/apps/b3-market-data
npm install
npm run dev

# Documentation API (Porta 3400)
cd /home/marce/projetos/TradingSystem/backend/api/documentation-api
npm install
npm run dev

# Documentation Hub (Porta 3004)
cd /home/marce/projetos/TradingSystem/docs
npm install
npm run start -- --port 3004
```

> Dica: abra cada comando em um terminal separado para visualizar logs em tempo real.

---

## 🔍 Como checar o que está rodando

```bash
# Resumo de portas locais e PIDs
bash status.sh

# Testar endpoints críticos
curl http://localhost:3103     # Dashboard
curl http://localhost:3200/health
curl http://localhost:3400/health  # Documentation API
curl http://localhost:3100/health
curl http://localhost:3302/health
```

---

## ⏹️ Parar ou reiniciar serviços

- Tudo de uma vez: `pkill -f "npm run dev"`
- Porta específica: `fuser -k <porta>/tcp`  (ex.: `fuser -k 3103/tcp`)
- Reiniciar: execute novamente o comando do serviço ou `bash start-all-services.sh`

---

## 🌐 Containers (Docker Compose)

QuestDB, Grafana, Prometheus e demais serviços de suporte rodam via Docker Compose.  
- Start completo: `bash start-all-stacks.sh`  
- Stop completo: `bash stop-all-stacks.sh`  
- Compose files: `tools/compose/`, `tools/monitoring/`, `frontend/compose/`, `ai/compose/`

---

### Referências
- [GUIA-INICIO-DEFINITIVO.md](GUIA-INICIO-DEFINITIVO.md)
- [Quick Start (Linux/WSL)](./QUICK-START-LINUX-WSL.md)
