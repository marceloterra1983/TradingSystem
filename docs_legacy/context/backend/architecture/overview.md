---
title: Backend Architecture Overview
sidebar_position: 10
tags: [backend, architecture, overview, services]
domain: backend
type: reference
summary: High-level overview of backend architecture including services, data flow, and integration patterns
status: active
last_review: "2025-10-17"
---

# Backend Architecture Overview

## Visao Macro

```
ProfitDLL -> Data Capture (.NET) -> Kafka (futuro) -> API Gateway (FastAPI)
                                               |
                                               v
                                        Order Manager (.NET)
                                               |
             ---------------------------------------------------------------
             |                                                             |
    TP-Capital (Node + QuestDB)                          Documentation API (Node)
             |                                                             |
            Clients (desktop)                                Documentation Dashboard (React)
```

## Caracteristicas Principais

- **Execucao nativa Windows**: obrigatorio pelo suporte do ProfitDLL (DLL 64-bit) e requisitos de latencia &lt;500ms.
- **Mensageria**: atualmente chamada direta; plano para introduzir filas/event bus documentado no backlog de ADRs.
- **Observabilidade**: logging em JSON (pino para Node, Serilog para .NET) e metricas Prometheus (a configurar).

## Responsabilidades

| Servico | Responsabilidade chave | Notas |
|---------|------------------------|-------|
| Data Capture | Subscribe em callbacks ProfitDLL, serializa ticks, reconecta automaticamente. | Persistencia inicial em Parquet. |
| Order Manager | Gestao de ordens (market/limit/stop), positions, limites diarios, kill switch. | Comunica com gateways externos (Nelogica). |
| API Gateway | Normaliza chamadas (REST) para os servicos core; serve como ponto de entrada. | Documentar OpenAPI quando disponivel. |
| Documentation API | CRUD de sistemas, ideias, links e uploads (multer). | Porta padrao 5175. |
| Idea Bank API | CRUD de ideias, validacao express-validator, LowDB. | Porta padrao 3200; logging estruturado com pino. |
| TP-Capital API | Normaliza mensagens do Telegram, persiste no QuestDB (`tp_capital_signals`) e expoe endpoints para o dashboard (`/signals`, `/telegram/*`). | Porta padrao 4005; inclui metricas Prometheus e healthcheck do QuestDB. |

## Tecnologias

| Stack | Uso |
|-------|-----|
| .NET 8 / C# | Data Capture, Order Manager, servicos de risco. |
| Python 3.11 | Serviços auxiliares (observabilidade, automação). |
| Node.js 18/20 | Idea Bank, Documentation APIs e TP-Capital. |
| FastAPI | API gateway e servicos Python. |
| LowDB | Persistencia MVP para docs/ideias (JSON). |
| QuestDB | Banco de series temporais para sinais TP Capital e cadastro de bots/canais do Telegram. |
| Parquet | Armazenamento historico de ticks. |

## Roadmap Arquitetural

1. Migrar Idea Bank/Documentation API para PostgreSQL (ver `data/migrations`).
2. Consolidar observabilidade (Prometheus + Grafana) com dashboards de latency/health (incluir metricas do TP-Capital).
3. Avaliar event bus (RabbitMQ / Kafka) para desacoplar produtores de dados vs. order manager.
4. Criar ADRs especificos para seguranca/autenticacao de APIs Node (incluindo armazenamento seguro de tokens do Telegram).
