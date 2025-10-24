from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.application.dto import OrchestrationResponse
from src.domain.entities import MarketSignal
from src.main import app


@pytest.fixture
def api_client():
    with TestClient(app) as client:
        yield client


def test_analyze_endpoint(monkeypatch: pytest.MonkeyPatch, api_client: TestClient):
    mock_signal = MarketSignal(
        symbol="PETR4",
        signal_type="BUY",
        confidence=0.9,
        price=37.5,
        timestamp=datetime.now(timezone.utc),
        source="TEST",
        metadata={},
    )
    mock_analyze = AsyncMock(return_value=[mock_signal])
    monkeypatch.setattr("src.interfaces.routes.analyze_market", mock_analyze)

    response = api_client.post(
        "/api/v1/agents/analyze",
        json={"symbols": ["PETR4"], "include_tp_capital": True, "include_b3": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["signals"][0]["symbol"] == "PETR4"
    assert "analysis_time" in body
    mock_analyze.assert_awaited_once()


def test_analyze_validation_error(api_client: TestClient):
    response = api_client.post("/api/v1/agents/analyze", json={})
    assert response.status_code == 422


def test_signals_endpoint(monkeypatch: pytest.MonkeyPatch, api_client: TestClient):
    mock_response = OrchestrationResponse(
        result={"signals": []},
        agents_involved=["MarketAnalysisAgent", "RiskManagementAgent"],
        total_time=0.42,
    )
    monkeypatch.setattr(
        "src.interfaces.routes.orchestrate_analysis",
        AsyncMock(return_value=mock_response),
    )

    response = api_client.post(
        "/api/v1/agents/signals",
        json={"action": "ANALYZE", "data": {"symbols": ["PETR4"]}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["agents_involved"] == ["MarketAnalysisAgent", "RiskManagementAgent"]


def test_status_endpoint(api_client: TestClient):
    response = api_client.get("/api/v1/agents/status")
    assert response.status_code == 200
    body = response.json()
    assert "market_analysis" in body


def test_analyze_endpoint_failure(monkeypatch: pytest.MonkeyPatch, api_client: TestClient):
    monkeypatch.setattr(
        "src.interfaces.routes.analyze_market",
        AsyncMock(side_effect=RuntimeError("boom")),
    )

    response = api_client.post(
        "/api/v1/agents/analyze",
        json={"symbols": ["PETR4"], "include_tp_capital": True, "include_b3": True},
    )

    assert response.status_code == 500
