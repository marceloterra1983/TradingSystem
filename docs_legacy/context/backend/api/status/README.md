---
title: Launcher API Reference
sidebar_position: 1
tags: [service-launcher, api, health, tooling, backend]
domain: backend
type: reference
summary: Fluxo de lançamento de serviços locais e monitoramento agregado via `/api/status`
status: active
last_review: "2025-10-18"
---

# Launcher API

Backend utilitário que roda localmente em Windows/Linux para:

- Abrir serviços auxiliares em novos terminais (`/launch`).
- Expor health check simples (`/health`).
- Consolidar o estado dos serviços monitorados via `/api/status`, incluindo contagem de degradação e latência média.

> **Porta oficial:** 3500 (atualizada em 2025-10-18)  
> **Logging:** Pino estruturado (JSON)  
> **Testes:** 25 testes, 66% coverage  
> **Documentação completa:** [Service Launcher README](../../../../apps/service-launcher/README.md)

## Endpoints

| Método | Caminho        | Descrição                                                |
|--------|----------------|----------------------------------------------------------|
| `POST` | `/launch`      | Abre um terminal para executar um comando configurado.  |
| `GET`  | `/health`      | Health básico do próprio Laucher.              |
| `GET`  | `/api/status`  | Retorna status agregado dos serviços monitorados.       |

## `/api/status`

Endpoint utilizado pelo dashboard (`ConnectionsPage`) para exibir o semáforo de saúde.

- Consulta serviços definidos em `server.js` (`SERVICE_TARGETS`), cada um com `healthUrl` específico.
- Tempo limite padrão: `SERVICE_LAUNCHER_TIMEOUT_MS` (2.5 s). Timeout marca o serviço como `down`.
- Saída ordenada por severidade (down > degraded > ok) para destacar prioridades.

### Campos da resposta

| Campo                  | Tipo      | Descrição                                                                 |
|------------------------|-----------|---------------------------------------------------------------------------|
| `overallStatus`        | string    | `ok`, `degraded` ou `down`, baseado no pior serviço (default `unknown`). |
| `totalServices`        | number    | Quantidade de serviços avaliados.                                         |
| `degradedCount`        | number    | Quantos serviços não estão `ok` (inclui `down`).                          |
| `downCount`            | number    | Quantos serviços estão offline.                                          |
| `averageLatencyMs`     | number\|null | Média de latência (ms) dos serviços que responderam.                     |
| `lastCheckAt`          | string    | ISO UTC da última consolidação.                                          |
| `services[]`           | array     | Lista detalhada por serviço monitorado.                                  |
| `services[].status`    | string    | `ok` / `degraded` / `down` / `unknown`.                                   |
| `services[].latencyMs` | number\|null | Latência individual (ms).                                                |
| `services[].details`   | objeto    | Metadados (`healthUrl`, `httpStatus`, `error`, etc.).                     |

### Semântica de status

| Status     | Critério                                                                 | Ação sugerida                         |
|------------|--------------------------------------------------------------------------|---------------------------------------|
| `ok`       | Resposta `2xx` dentro do timeout.                                        | Nenhuma ação.                         |
| `degraded` | Resposta recebida mas com `status >= 400` ou outra anomalia reportada.   | Avaliar logs e cobertura.             |
| `down`     | Timeout ou erro na conexão (`ECONNREFUSED`, DNS, etc.).                  | Garantir que o serviço está rodando.  |
| `unknown`  | Valor não mapeado (fallback).                                            | Revisar configuração/env.             |

### Exemplo de resposta

```json
{
  "overallStatus": "degraded",
  "totalServices": 5,
  "degradedCount": 1,
  "downCount": 0,
  "averageLatencyMs": 124,
  "lastCheckAt": "2025-10-13T16:45:12.221Z",
  "services": [
    {
      "id": "idea-bank-api",
      "name": "Idea Bank API",
      "category": "api",
      "port": 3100,
      "status": "ok",
      "latencyMs": 88,
      "updatedAt": "2025-10-13T16:45:12.213Z",
      "details": {
        "healthUrl": "http://localhost:3100/health",
        "httpStatus": 200
      }
    },
    {
      "id": "documentation-api",
      "name": "Documentation API",
      "category": "api",
      "port": 3400,
      "status": "degraded",
      "latencyMs": 112,
      "updatedAt": "2025-10-13T16:45:12.213Z",
      "details": {
        "healthUrl": "http://localhost:3400/health",
        "httpStatus": 503,
        "body": "Service temporarily unavailable"
      }
    }
  ]
}
```

## Variáveis de ambiente relevantes

| Variável                               | Descrição                                                                    |
|----------------------------------------|-------------------------------------------------------------------------------|
| `SERVICE_LAUNCHER_PORT` / `PORT`       | Porta HTTP do Launcher (default `3500`).                              |
| `SERVICE_LAUNCHER_HOST` / `PROTOCOL`   | Host/Protocolo usados para montar `healthUrl` (default `localhost` / `http`).|
| `SERVICE_LAUNCHER_*_PORT/URL`          | Overrides por serviço (`IDEA_BANK`, `TP_CAPITAL`, `B3`, `DOCS`).             |
| `SERVICE_LAUNCHER_TIMEOUT_MS`          | Timeout individual das sondagens (ms).                                        |
| `SERVICE_LAUNCHER_USE_WT`              | Preferir Windows Terminal (`true` \| `false`).                                |
| `VITE_SERVICE_LAUNCHER_API_URL`        | URL consumida pelo dashboard para `/api/status`.                              |

> **Observação:** adicione novos serviços monitorados em `SERVICE_TARGETS` (server.js) mantendo nomes descritivos e `healthUrl` consistente com os endpoints reais.

## Integrações

- Dashboard (`ConnectionsPage` / `ConnectionsPageNew`) usa o endpoint para renderizar semáforo e KPIs.
- Scripts `start-service-launcher.{ps1,sh}` garantem que o serviço rode antes de abrir a interface.
- Para CI, considere rodar `npm test` dentro de `apps/service-launcher` para validar os probes.

## Próximos Passos

- [ ] Avaliar inclusão dos microserviços nativos (Order Manager, Data Capture) quando estiverem disponíveis.
- [ ] Automatizar alerta (Prometheus/Grafana) consumindo `/api/status` periodicamente.
- [ ] Documentar rotinas de incidentes baseadas nos campos `degradedCount` e `downCount`.
