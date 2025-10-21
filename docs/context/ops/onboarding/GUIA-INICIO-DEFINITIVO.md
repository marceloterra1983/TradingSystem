---
title: Guia de Início Definitivo
sidebar_position: 11
tags: [ops, onboarding, guide, complete, pt-br]
domain: ops
type: guide
summary: Guia completo e definitivo para iniciar o TradingSystem do zero
status: active
last_review: 2025-10-17
---

# 🚀 GUIA DEFINITIVO - Como Iniciar o TradingSystem

**ESTE É O GUIA OFICIAL PARA SUBIR O AMBIENTE LOCAL DO TRADINGSYSTEM**

**Última atualização:** 2025-10-13 20:30 BRT  
**Status:** Verificado em Linux + WSL2

---

## ⚡ Início Rápido (3 passos)

```bash
# 1. Entre no projeto
cd /home/marce/projetos/TradingSystem

# 2. Instale dependências (primeira vez ou quando houver mudanças)
bash install-dependencies.sh

# 3. Inicie todos os serviços locais em background
bash start-all-services.sh
```

**Depois disso:** abra http://localhost:3103 e comece a usar. 🎉

---

## ✅ O que o script inicia automaticamente

| Serviço | Porta | Componente | Observação |
|---------|-------|------------|------------|
| Dashboard | 3103 | React + Vite | UI em tempo real |
| TP-Capital API | 3200 | Node.js | Webhooks + integração Telegram |
| Idea Bank API | 3100 | Node.js | Gestão de ideias de trade |
| B3 API | 3302 | Node.js | Dados da B3 (mock/integração) |
| Documentation Hub | 3004 | Docusaurus | Hub de documentação |

> Para subir serviços de suporte (QuestDB, Prometheus, Grafana, etc.) utilize `bash start-all-stacks.sh` (Docker Compose).

---

## 🔍 Como verificar se tudo subiu

```bash
# Saúde geral das portas locais
bash check-services.sh

# Lista os serviços locais e seus PIDs
bash status.sh

# Abrir as principais URLs no navegador automaticamente
bash open-services.sh
```

Logs em tempo real ficam em `/tmp/tradingsystem-logs/*.log`.

---

## 🛠️ Inicialização manual (para desenvolvimento focado)

Use quando quiser controlar quais serviços sobem.

```bash
# Frontend
cd /home/marce/projetos/TradingSystem/frontend/apps/dashboard
npm run dev

# TP-Capital
cd /home/marce/projetos/TradingSystem/frontend/apps/tp-capital
npm run dev

# Idea Bank API
cd /home/marce/projetos/TradingSystem/backend/api/idea-bank
npm run dev

# B3 API
cd /home/marce/projetos/TradingSystem/frontend/apps/b3-market-data
npm run dev

# Documentation Hub
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run start -- --port 3004
```

---

## ⏹️ Como parar e reiniciar

```bash
# Parar tudo iniciado com o script padrão
pkill -f "npm run dev"

# Parar manualmente uma porta específica (exemplo: frontend)
fuser -k 3103/tcp
```

Para reiniciar, execute novamente `bash start-all-services.sh` ou o comando do serviço desejado.

---

## 🌐 Containers (Docker Compose)

- Containers de suporte (QuestDB, Grafana, Prometheus, etc.) sobem via Docker Compose.
- Scripts recomendados: `bash start-all-stacks.sh` e `bash stop-all-stacks.sh`.
- Compose files: `infrastructure/compose/`, `infrastructure/monitoring/`, `frontend/compose/`, `ai/compose/`.

---

## 📚 Recursos úteis

- **[Ops Documentation Hub](../README.md)** – Visão geral do projeto
- **[START-SERVICES.md](START-SERVICES.md)** – Detalhes de start/stop manual
- **[System Overview](SYSTEM-OVERVIEW.md)** – Arquitetura completa

> Dica: sempre rode `bash install-dependencies.sh` após um `git pull` que altere qualquer `package.json`.

---

✅ Ambiente pronto, com documentação enxuta e processos padronizados. Bons trades!
