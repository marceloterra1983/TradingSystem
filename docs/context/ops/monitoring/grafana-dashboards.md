---
title: Grafana Dashboards
sidebar_position: 20
tags: [ops, grafana, monitoring, runbook]
domain: ops
type: runbook
summary: Dashboards provisionados e planejados no Grafana
status: active
last_review: "2025-10-17"
---

# Grafana Dashboards

| Dashboard | KPIs principais | Data source |
|-----------|-----------------|-------------|
| TradingSystem Core Services | Taxa de requisições, erros 5xx, latência p95 | Prometheus (	radingsystem_http_*) |
| Idea Bank API (planejado) | Fila por status, SLA por prioridade | Prometheus + métricas de domínio |
| Documentation API (planejado) | Upload success rate, tempo de indexação | Prometheus |

Os arquivos JSON ficam em tools/monitoring/grafana/dashboards/ e são provisionados automaticamente via docker-compose.
