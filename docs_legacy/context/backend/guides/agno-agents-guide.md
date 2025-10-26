---
title: Agno Agents Implementation Guide
sidebar_position: 20
tags:
  - agno
  - multi-agent
  - python
  - fastapi
  - implementation
  - backend
domain: backend
type: guide
summary: Installation, configuration, and usage guide for the Agno multi-agent trading system
status: active
last_review: "2025-10-17"
---

# Agno Agents Implementation Guide

## 1. Overview
The **Agno Agents** service é um microserviço em **Python 3.12** que utiliza o framework [Agno](https://github.com/agno-agi/agno) e **FastAPI** para executar um sistema multi-agente de trading composto por três agentes especializados:

- **MarketAnalysisAgent** — analisa dados do B3, sinais TP Capital e ideias do Workspace para gerar recomendações BUY/SELL/HOLD.
- **RiskManagementAgent** — valida cada recomendação contra limites diários, tamanho máximo de posição e janela de negociação.
- **SignalOrchestratorAgent** — coordena o fluxo entre os agentes, agrega respostas e expõe endpoints REST.

O serviço integra as APIs existentes (Workspace :3100, TP Capital :3200, B3 :3302) e consome dados em tempo real via WebSocket do B3. A arquitetura segue Clean Architecture (domain/application/tools/interfaces) com monitoramento baseado em Prometheus (`GET /metrics`) e logs estruturados.

## 2. Prerequisites
- Python **3.12** ou superior.
- Docker + Docker Compose para execução containerizada.
- Acesso configurado às APIs Workspace, TP Capital e B3.
- **OPENAI_API_KEY** válido para agentes habilitados por LLM.
- Stack de observabilidade (Prometheus/Grafana) opcional para métricas.

## 3. Setup

### 3.1 Local Development
```bash
cd tools/agno-agents
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Abra o arquivo `.env` na raiz do projeto e garanta que as chaves abaixo estejam presentes (ajuste valores conforme necessário):
```
AGNO_PORT=8200
AGNO_LOG_LEVEL=INFO
AGNO_MODEL_PROVIDER=openai
AGNO_MODEL_NAME=gpt-4o
OPENAI_API_KEY=sk-your-key-here
WORKSPACE_API_URL=http://localhost:3100
TP_CAPITAL_API_URL=http://localhost:3200
B3_API_URL=http://localhost:3302
```

```bash
# Executar o serviço
python -m src.main
```

### 3.2 Docker Deployment
```bash
# Construir/levantar pilha dos agentes
docker compose -f tools/compose/docker-compose.infra.yml up -d agno-agents

# Logs em tempo real
docker logs -f infra-agno-agents

# Health check detalhado
curl http://localhost:8200/health?detailed=true
```

## 4. Environment Variables

| Variável | Descrição | Default | Obrigatório |
|----------|-----------|---------|-------------|
| `AGNO_PORT` | Porta HTTP do serviço | `8200` | ✅ |
| `AGNO_LOG_LEVEL` | Nível de log (`DEBUG/INFO/WARNING`) | `INFO` | ⚠️ |
| `AGNO_MODEL_PROVIDER` | Provedor de LLM (`openai/anthropic`) | `openai` | ✅ |
| `AGNO_MODEL_NAME` | Modelo LLM (`gpt-4o`, `claude-3-opus`) | `gpt-4o` | ✅ |
| `OPENAI_API_KEY` | Chave de API para LLM | - | ✅ |
| `WORKSPACE_API_URL` | URL base da Workspace API | `http://localhost:3100` | ✅ |
| `TP_CAPITAL_API_URL` | URL base da TP Capital API | `http://localhost:3200` | ✅ |
| `B3_API_URL` | URL base da B3 API | `http://localhost:3302` | ✅ |
| `B3_WEBSOCKET_URL` | WebSocket de mercado B3 | `ws://localhost:3302/ws` | ⚠️ |
| `HTTP_TIMEOUT` | Timeout HTTP em segundos | `10` | ⚠️ |
| `RETRY_MAX_ATTEMPTS` | Tentativas máximas de retry | `4` | ⚠️ |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Falhas para abrir circuito | `5` | ⚠️ |
| `AGNO_HEALTH_CHECK_TIMEOUT` | Timeout health check (s) | `5` | ⚠️ |

## 5. Project Structure
```
tools/agno-agents/
├── src/
│   ├── domain/              # Entidades e value objects
│   │   ├── entities.py      # MarketSignal, RiskAssessment, AgentDecision
│   │   └── value_objects.py # Symbol, Price, Confidence
│   ├── application/         # DTOs, ports
│   │   ├── dto.py
│   │   └── ports.py
│   ├── tools/
│   │   ├── adapters/
│   │   │   ├── workspace_client.py
│   │   │   ├── tp_capital_client.py
│   │   │   ├── b3_client.py
│   │   │   ├── b3_websocket_consumer.py
│   │   │   └── risk_engine_client.py
│   │   └── resilience.py
│   ├── interfaces/
│   │   ├── agents/
│   │   │   ├── market_analysis.py
│   │   │   ├── risk_management.py
│   │   │   └── signal_orchestrator.py
│   │   └── routes.py
│   ├── config.py            # Pydantic settings
│   ├── main.py              # FastAPI entrypoint
│   └── monitoring.py        # Prometheus metrics
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

## 6. API Endpoints

| Método | Rota | Descrição | Request | Response |
|--------|------|-----------|---------|----------|
| POST | `/api/v1/agents/analyze` | Geração de sinais pelo MarketAnalysisAgent | `{ "symbols": ["PETR4"], "include_tp_capital": true, "include_b3": true }` | `{ "signals": [...], "analysis_time": 0.42 }` |
| POST | `/api/v1/agents/signals` | Orquestração completa entre agentes | `{ "action": "ORCHESTRATE", "data": {...} }` | `{ "result": {...}, "agents_involved": [...], "total_time": 0.78 }` |
| GET | `/api/v1/agents/status` | Status dos agentes | `-` | `{ "market_analysis": "ready", "risk_management": "ready", "signal_orchestrator": "ready" }` |
| GET | `/health` | Health check simples/detalhado | `?detailed=true` opcional | `{ "status": "healthy", "dependencies": {...} }` |
| GET | `/metrics` | Métricas Prometheus | `-` | formato texto Prometheus |

## 7. Agents

### 7.1 MarketAnalysisAgent
- **Responsabilidade:** consolidar dados de mercado e sinais para gerar recomendações.
- **Ferramentas internas:** `analyze_b3_data`, `analyze_tp_signals`, `_extract_size_value`.
- **Entrada:** lista de símbolos, flags `include_tp_capital`, `include_b3`.
- **Saída:** lista de `MarketSignal` com confiança, preço, metadados.

### 7.2 RiskManagementAgent
- **Responsabilidade:** validar cada `MarketSignal` contra políticas de risco.
- **Ferramentas internas:** `check_daily_loss_limit`, `check_position_size`, `check_trading_hours`.
- **Saída:** `RiskAssessment` com `approved`, `risk_level`, `reasons` e resultados de checks.

### 7.3 SignalOrchestratorAgent
- **Responsabilidade:** coordenar invocações do MarketAnalysisAgent e RiskManagementAgent.
- **Entrada:** `OrchestrationRequest` com ação (`ANALYZE`, `VALIDATE`, `ORCHESTRATE`).
- **Saída:** `OrchestrationResponse` com sinais aprovados, agentes envolvidos e `total_time`.

## 8. HTTP Client Adapters

### 8.1 WorkspaceClient
- Métodos: `ping()`, `get_ideas()`, `create_idea()`.
- Requisitos: retry exponencial, circuit breaker, logging estruturado.

### 8.2 TPCapitalClient
- Métodos: `ping()`, `get_tp_capital_signals(limit)`.
- Transformação de payload para formato unificado de sinais.

### 8.3 B3Client
- Métodos: `ping()`, `get_b3_data(symbol)`, `get_adjustments()`, `get_gamma_levels()`, `get_indicators_daily()`.
- Filtra snapshots por símbolo e agrega indicadores auxiliares.

### 8.4 B3WebSocketConsumer
- Recebe dados em tempo real e chama callback configurado (`handle_b3_message`).
- Possui reconexão automática e métricas de eventos recebidos.

## 9. Resilience Patterns

### 9.1 Retry (tenacity)
- Estratégia: backoff exponencial (500ms, 1500ms, 3000ms).
- Tentativas máximas configuráveis via `RETRY_MAX_ATTEMPTS`.
- Aplicado a todas as requisições HTTP.

### 9.2 Circuit Breaker (pybreaker)
- Threshold padrão de 5 falhas antes de abrir.
- Timeout de 60 segundos antes de HALF_OPEN.
- Métricas de erro (`agent_errors_total{error_type="CircuitBreakerError"}`) para alertas.

## 10. Monitoring & Observability

### 10.1 Métricas Prometheus
- `agent_decisions_total{agent_name,decision_type}`
- `agent_processing_seconds_bucket{agent_name}`
- `agent_errors_total{agent_name,error_type}`
- `api_requests_total{method,endpoint,status}`
- `api_request_duration_seconds_bucket{method,endpoint}`
- `dependency_status{dependency}`

### 10.2 Logging Estruturado
- Formato JSON com campos `service`, `agent`, `decision`, `dependency`, `latency_ms`.
- Correlação com IDs de trace (quando tracing habilitado).

### 10.3 Health Checks
- `GET /health` — usa snapshot em cache.
- `GET /health?detailed=true` — executa probes `ping()` com timeout configurável.
- Atualiza gauge `dependency_status` para Prometheus e dispara alertas conforme regras.

## 11. Testing

```bash
# Rodar suite completa
env PYTHONPATH=src pytest

# Cobertura de código
pytest --cov=src --cov-report=html

# Arquivo específico
pytest tests/test_main.py -v
```

Escopo de testes:
- **Unitários:** entidades Domain, value objects, funções auxiliares.
- **Integração:** clientes HTTP com httpx mockado e circuit breaker.
- **API:** endpoints FastAPI com `TestClient` e fixtures.
- **Agentes:** simulação de fluxos MarketAnalysis/RiskManagement/SignalOrchestrator.

## 12. Troubleshooting

| Sintoma | Possível causa | Ação recomendada |
|---------|----------------|-------------------|
| 503 em `/api/v1/agents/analyze` | B3 API indisponível | Verificar logs, aguardar circuito HALF_OPEN, conferir `/health?detailed=true`. |
| Métricas zeroadas | Prometheus não configurado | Garantir scrape job `agno-agents` na configuração. |
| LLM não responde | `OPENAI_API_KEY` inválida | Validar credenciais, checar quota, revisar logs de erro. |
| Alta latência | APIs externas lentas | Monitorar `dependency_status`, ajustar timeout, implementar cache se necessário. |

## 13. Roadmap
- **Fase 2:** modelos ML customizados, integração com backtesting e replay.
- **Fase 3:** suporte multi-ativo paralelo, otimização de portfólio.
- **Fase 4:** execução assistida com aprovação humana, streaming em tempo real para o dashboard.

## 14. Related Documentation
- 🏗️ ADR: [`docs/context/backend/architecture/decisions/2025-10-16-adr-0002-agno-framework.md`](../architecture/decisions/2025-10-16-adr-0002-agno-framework.md)
- 📘 README do serviço: [`tools/agno-agents/README.md`](https://github.com/marceloterra/TradingSystem/blob/main/tools/agno-agents/README.md)
- 📊 Alertas Prometheus: [`tools/monitoring/prometheus/rules/alert-rules.yml`](https://github.com/marceloterra/TradingSystem/blob/main/tools/monitoring/prometheus/rules/alert-rules.yml)
- 🔍 Swagger/OpenAPI: [http://localhost:8200/docs](http://localhost:8200/docs)

---
