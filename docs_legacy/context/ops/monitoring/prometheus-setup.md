---
title: Prometheus Setup
sidebar_position: 10
tags: [ops, monitoring, prometheus, runbook]
domain: ops
type: runbook
summary: Guia operacional para subir e manter o stack de monitoramento Prometheus/Grafana do TradingSystem
status: active
last_review: "2025-10-17"
---

# Prometheus Setup

Este documento descreve como inicializar e operar o stack de monitoramento adotado pelo TradingSystem, conforme o PRD **Monitoramento Prometheus**.

## Visão Geral

- **Prometheus** coleta métricas a cada 15s dos serviços principais (`Idea Bank API`, `Documentation API`) via `/metrics`.
- **Alertmanager** roteia alertas críticos para Slack e dispara um webhook interno que cria/encerra issues no GitHub.
- **Grafana** oferece dashboards pré-provisionados (`TradingSystem Core Services`).
- **Alert Router** (`alert-router`) é um microserviço Node que converte alertas *warning* em issues etiquetadas no GitHub.

## Pré-requisitos

- Docker Desktop ou Docker Engine + Compose v2.
- Serviços Idea Bank (3200) e Documentation API (5175) em execução com as rotas `/metrics` expostas.
- Credenciais externas:
  - `SLACK_WEBHOOK_URL` para o canal `#ops-alertas`.
  - `GITHUB_TOKEN` com escopo `repo` (criação de issues).
  - `GITHUB_OWNER` e `GITHUB_REPO` apontando para o repositório que receberá os tickets.

## Subindo o stack

```powershell
cd tools/monitoring
$env:SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/...'
$env:GITHUB_TOKEN = 'ghp_xxx'
$env:GITHUB_OWNER = 'org-ou-usuario'
$env:GITHUB_REPO = 'TradingSystem'
docker compose up -d --build
```

Serviços expostos:

| Serviço        | URL/Porta               | Função                                    |
|----------------|-------------------------|-------------------------------------------|
| Prometheus     | http://localhost:9090   | Console de métricas e alertas             |
| Alertmanager   | http://localhost:9093   | Visualização do pipeline de alertas       |
| Grafana        | http://localhost:3000   | Dashboards (admin/admin por padrão)       |
| Alert Router   | interno (`alert-router:8080`) | Recebe webhooks do Alertmanager e cria/atualiza issues |

> Para expor o `alert-router` externamente, adicione um mapeamento como `"7085:8080"` ao serviço correspondente no `docker compose` local e atualize o webhook configurado no Alertmanager, quando necessário.

> O script `tools/scripts/start-trading-system-dev.ps1 -StartMonitoring` dispara o mesmo comando em uma janela separada.

## Estrutura de arquivos

```
tools/monitoring/
├─ docker-compose.yml          # Define Prometheus, Alertmanager, Grafana, alert-router
├─ prometheus/
│  ├─ prometheus.yml           # Jobs de scrape + alertmanager
│  └─ rules/alert-rules.yml    # Regras (serviços, erros 5xx, exporters)
├─ alertmanager/alertmanager.yml
├─ grafana/
│  ├─ provisioning/datasources/prometheus.yml
│  ├─ provisioning/dashboards/dashboards.yml
│  └─ dashboards/core-services.json
└─ alert-router/               # Webhook GitHub (Dockerfile + Node app)
```

## Exporters de infraestrutura

- `prom/node-exporter` está configurado via profile `linux` (executar `COMPOSE_PROFILES=linux docker compose up`) para hosts Linux/WSL2.
- Em Windows utilize o `windows_exporter` (ver README do diretório) e adicione o alvo ao `prometheus.yml` (`localhost:9182`).

## Alertas

As regras vivem em `prometheus/rules/alert-rules.yml`:

- **IdeaBankApiDown (critical):** gatilha quando `up{job="idea-bank-api"} == 0` por 2m.
- **DocumentationApiErrors (warning):** monitora taxa de respostas 5xx (`tradingsystem_http_requests_total`).
- **NodeExporterDown (warning):** alerta para exporters offline.

Alertmanager roteia severidades:

- `critical` → Slack (mensagem detalhada + resolved).
- `warning` → webhook `alert-router`, que cria/atualiza issues etiquetadas `alert` + `severity:<nivel>` e fecha quando resolvido.

## Dashboards

Grafana provisiona automaticamente `TradingSystem Core Services`, com gráficos para:

- Taxa de requisições agregada por serviço.
- Taxa de erros 5xx.
- Latência p95 (`tradingsystem_http_request_duration_seconds`).

Adicione novos painéis salvando arquivos JSON em `grafana/dashboards/`.

## Troubleshooting rápido

| Sintoma                     | Ação sugerida                                                                  |
|----------------------------|---------------------------------------------------------------------------------|
| Prometheus indisponível    | Executar `docker compose logs prometheus` e verificar binds em `prometheus.yml`.|
| Alertas não chegam no Slack| Validar `SLACK_WEBHOOK_URL` e logs do `alertmanager`.                            |
| Issues não criadas no GitHub| Checar `alert-router` (`docker compose logs alert-router`) e tokens.            |
| `/metrics` retorna 404     | Garantir versão mais recente dos serviços Node (`npm install && npm start`).    |

## Próximos passos

- Adicionar exporters para componentes .NET e Python.
- Versionar dashboards adicionais por domínio (Ops, Backend, Dados).
- Avaliar persistência longa (EBS/Blob) caso métricas de 30d não sejam suficientes.
