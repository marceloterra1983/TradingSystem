# Agno Agents Service

## Overview
The Agno Agents service provides an orchestration layer for multi-agent trading workflows within the TradingSystem platform. It leverages the Agno framework to coordinate specialized agents that analyze market data, evaluate risk, and orchestrate trading signals exposed through a FastAPI application.

## Architecture
- **Domain** (`src/domain/`): Contains entities and value objects that model trading signals, risk assessments, and agent decisions.
- **Application** (`src/application/`): Defines DTOs and ports (interfaces) that describe the use cases and external dependencies.
- **Infrastructure** (`src/infrastructure/`): Reserved for adapters that integrate with other services such as B3, TP Capital, and the Workspace API.
- **Interfaces** (`src/interfaces/`): Hosts the FastAPI entrypoint, agent definitions, and monitoring integrations.

## Agents
- **MarketAnalysisAgent**: Evaluates B3 market data and TP Capital signals to generate BUY/SELL/HOLD recommendations with confidence scores.
- **RiskManagementAgent**: Applies risk controls, verifying limits, trading hours, and compliance before approving signals.
- **SignalOrchestratorAgent**: Coordinates market analysis and risk validation workflows, aggregating results for downstream consumers.

## HTTP Client Adapters
- **WorkspaceClient** – Connects to Workspace API (port 3100) for idea bank operations (`get_ideas`, `create_idea`).
- **TPCapitalClient** – Fetches Telegram-derived signals from TP Capital API (port 3200) via `get_tp_capital_signals`.
- **B3Client** – Loads market overviews, adjustments, gamma levels, and indicators from B3 API (port 3302).
- **B3WebSocketConsumer** – Streams real-time market updates over `ws://localhost:3302/ws` with automatic reconnection.
- **RiskEngineClient** – Applies placeholder risk checks (daily limits, position sizing, trading hours, kill switch hook).

## Resilience Patterns
- **Retry Logic** – Exponential backoff driven by configurable delays (`RETRY_DELAYS`).
- **Circuit Breaker** – Prevents cascading failures after repeated errors (`CIRCUIT_BREAKER_FAILURE_THRESHOLD`, `CIRCUIT_BREAKER_TIMEOUT`).
- **Timeouts** – All HTTP calls honour `HTTP_TIMEOUT` to avoid hanging requests.

## API Endpoints
- `GET /` – Returns service metadata and status.
- `GET /health` – Health check endpoint with optional `?detailed=true` for dependency insights.
- `GET /metrics` – Prometheus metrics endpoint exposing agent and API metrics.
- `POST /api/v1/agents/analyze` – Generate market insights for a list of symbols.
- `POST /api/v1/agents/signals` – Execute orchestrated workflows across market and risk agents.
- `GET /api/v1/agents/status` – Report readiness for individual agents/adapters.

## Health Checks
The `/health` endpoint supports two modes:
- **Simple mode** (default) returns overall service status, name, and UTC timestamp.
- **Detailed mode** (`?detailed=true`) expands the payload with dependency and agent readiness data.

Dependency probes executed during detailed checks:
- `workspace_api` via `WorkspaceClient.get_ideas()`
- `tp_capital_api` via `TPCapitalClient.get_tp_capital_signals(limit=1)`
- `b3_api` via `B3Client.get_b3_data("")`

Status resolution:
- `healthy` – All dependencies respond successfully within the configured timeout.
- `degraded` – At least one dependency failed but others remain healthy.
- `unhealthy` – All dependencies failed or were unavailable.

Example responses:

```json
{
  "status": "healthy",
  "service": "agno-agents",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

```json
{
  "status": "degraded",
  "service": "agno-agents",
  "timestamp": "2025-01-15T10:30:00Z",
  "dependencies": {
    "workspace_api": {"status": "ok", "latency_ms": 42},
    "tp_capital_api": {"status": "error", "latency_ms": 5001},
    "b3_api": {"status": "ok", "latency_ms": 28}
  },
  "agents": {
    "market_analysis": "ready",
    "risk_management": "ready",
    "signal_orchestrator": "ready"
  }
}
```

Test locally:

```bash
curl -s http://localhost:8200/health
curl -s http://localhost:8200/health?detailed=true | jq
```

## Configuration
All environment variables must be defined in the project root `.env` file. See `.env.example` for the full list, including `AGNO_CORS_ORIGINS`, `AGNO_ENABLE_METRICS`, `AGNO_ENABLE_TRACING`, `WORKSPACE_API_URL`, `TP_CAPITAL_API_URL`, `B3_API_URL`, `B3_WEBSOCKET_URL`, `HTTP_TIMEOUT`, `AGNO_HEALTH_CHECK_TIMEOUT`, `RETRY_MAX_ATTEMPTS`, `RETRY_DELAYS`, `CIRCUIT_BREAKER_FAILURE_THRESHOLD`, and `CIRCUIT_BREAKER_TIMEOUT`.
`AGNO_HEALTH_CHECK_TIMEOUT` controls how long dependency probes wait before the service transitions to `degraded`.
When running locally without LLM access or WebSocket streaming you may disable those features via `AGNO_ENABLE_LLM=false` and `AGNO_ENABLE_B3_WEBSOCKET=false`.

## Development
```bash
pip install -r requirements.txt
pytest
python -m src.main
```

## Logging
Logging is emitted in JSON format (via `python-json-logger`) with fields such as `timestamp`, `service`, `agent`, `decision`, `trace_id`, and `span_id`. Uvicorn access and error logs share the same structured formatter for consistent aggregation.

## Docker
```bash
docker build -t agno-agents .
# See infrastructure/compose/docker-compose.infra.yml for runtime configuration
```

## Testing
Run `pytest` to execute unit tests, with coverage reports generated through `pytest-cov`.

## Monitoring
Prometheus metrics are exposed on `/metrics` and cover service, agent, and dependency health:
- `agent_decisions_total` – Counter of agent decisions grouped by agent name and decision type.
- `agent_processing_seconds` – Histogram capturing agent execution time.
- `agent_errors_total` – Counter of agent errors broken down by error type.
- `api_requests_total` – Counter of HTTP requests labelled by method, endpoint, and status.
- `api_request_duration_seconds` – Histogram of HTTP request latency per method and endpoint.
- `dependency_status` – Gauge indicating dependency health (`1` healthy, `0` unhealthy).

Enable console-based tracing spans by setting `AGNO_ENABLE_TRACING=true` (disabled by default to avoid noisy production logs).

## Alerts
Prometheus alert rules guard the Agno Agents service:
- `AgnoAgentsDown` (critical) – Service has not responded to scrapes for two minutes.
- `AgnoAgentErrorsHigh` (warning) – Agent error rate exceeds 0.1 errors/second over five minutes.
- `AgnoAgentProcessingSlow` (warning) – 95th percentile agent runtime surpasses 10 seconds.
- `AgnoDependencyUnhealthy` (warning) – Dependency health gauge reports `0` for three consecutive minutes.
- `AgnoCircuitBreakerOpen` (critical) – Circuit breaker errors accumulate (>5) within five minutes.

## Future Enhancements
- Implement concrete adapters under `src/infrastructure/adapters/` for B3, TP Capital, and Workspace services.
- Integrate live market data streams and risk engine APIs.
- Add comprehensive workflow orchestration scenarios and persistence.
