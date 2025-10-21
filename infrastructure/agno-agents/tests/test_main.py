import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Dict
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def reset_health_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    from src import main as main_module

    main_module._cached_health_snapshot = {
        "status": "unknown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {},
        "agents": {
            "market_analysis": "initializing",
            "risk_management": "initializing",
            "signal_orchestrator": "initializing",
        },
    }


@pytest.fixture
def mock_http_clients(monkeypatch: pytest.MonkeyPatch) -> Dict[str, SimpleNamespace]:
    from src import main as main_module
    from src.interfaces.agents import market_analysis as market_module

    workspace = SimpleNamespace(
        ping=AsyncMock(return_value=None),
        get_items=AsyncMock(return_value=[{"id": 1, "title": "Idea"}]),
        close=AsyncMock(return_value=None),
    )
    tp_capital = SimpleNamespace(
        ping=AsyncMock(return_value=None),
        get_tp_capital_signals=AsyncMock(return_value=[{"symbol": "PETR4", "signal_type": "BUY"}]),
        close=AsyncMock(return_value=None),
    )
    b3 = SimpleNamespace(
        ping=AsyncMock(return_value=None),
        get_b3_data=AsyncMock(return_value={"snapshots": [], "symbol": ""}),
        close=AsyncMock(return_value=None),
    )

    async def fake_initialize_clients() -> None:
        market_module.workspace_client = workspace
        market_module.tp_capital_client = tp_capital
        market_module.b3_client = b3

    async def fake_shutdown_clients() -> None:
        await workspace.close()
        await tp_capital.close()
        await b3.close()
        market_module.workspace_client = None
        market_module.tp_capital_client = None
        market_module.b3_client = None

    monkeypatch.setattr(market_module, "initialize_clients", fake_initialize_clients)
    monkeypatch.setattr(market_module, "shutdown_clients", fake_shutdown_clients)
    monkeypatch.setattr(main_module, "initialize_market_clients", fake_initialize_clients)
    monkeypatch.setattr(main_module, "shutdown_market_clients", fake_shutdown_clients)

    return {
        "workspace": workspace,
        "tp_capital": tp_capital,
        "b3": b3,
    }


def test_health_check_simple(mock_http_clients, test_client: TestClient):
    test_client.get("/health?detailed=true")
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "agno-agents"
    assert "dependencies" not in data
    assert "agents" not in data


def test_health_check_detailed(mock_http_clients, test_client: TestClient):
    response = test_client.get("/health?detailed=true")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "agno-agents"
    assert "dependencies" in data
    assert "agents" in data

    deps = data["dependencies"]
    assert deps["workspace_api"]["status"] == "ok"
    assert isinstance(deps["workspace_api"]["latency_ms"], int)
    assert deps["tp_capital_api"]["status"] == "ok"
    assert deps["b3_api"]["status"] == "ok"

    agents = data["agents"]
    assert agents["market_analysis"] == "ready"
    assert agents["risk_management"] == "ready"
    assert agents["signal_orchestrator"] == "ready"


def test_health_check_degraded(mock_http_clients, test_client: TestClient):
    mock_http_clients["tp_capital"].ping.side_effect = httpx.HTTPError("boom")
    response = test_client.get("/health?detailed=true")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "degraded"
    deps = data["dependencies"]
    assert deps["tp_capital_api"]["status"] == "error"
    assert deps["workspace_api"]["status"] == "ok"
    assert deps["b3_api"]["status"] == "ok"


def test_health_check_timeout(mock_http_clients, test_client: TestClient):
    mock_http_clients["workspace"].ping.side_effect = asyncio.TimeoutError()

    response = test_client.get("/health?detailed=true")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in {"degraded", "unhealthy"}
    assert data["dependencies"]["workspace_api"]["status"] == "error"


def test_root_endpoint(test_client: TestClient):
    response = test_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "agno-agents"
    assert data["status"] == "running"


def test_metrics_endpoint(test_client: TestClient):
    response = test_client.get("/metrics")
    assert response.status_code == 200
    assert "agent_decisions_total" in response.text


def test_cors_headers(test_client: TestClient):
    origin = "http://localhost:3103"
    response = test_client.options(
        "/",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == origin
