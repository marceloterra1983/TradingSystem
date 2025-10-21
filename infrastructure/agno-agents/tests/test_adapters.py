from __future__ import annotations

import httpx
import pytest
from aiobreaker import CircuitBreakerError
from unittest.mock import AsyncMock

from src.infrastructure.adapters import B3Client, TPCapitalClient, WorkspaceClient


def _prepare_response(method: str, url: str, json_payload) -> httpx.Response:
    request = httpx.Request(method, url)
    return httpx.Response(200, json=json_payload, request=request)


@pytest.mark.asyncio
async def test_workspace_get_items(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.post = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = WorkspaceClient()
    response = _prepare_response("GET", "http://localhost/api/items", {"data": [{"id": "1", "title": "Test"}]})
    mock_client.get.return_value = response

    items = await client.get_items()

    assert len(items) == 1
    assert items[0]["title"] == "Test"
    mock_client.get.assert_awaited_once_with("/api/items")


@pytest.mark.asyncio
async def test_workspace_create_item(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.post = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = WorkspaceClient()
    response = _prepare_response("POST", "http://localhost/api/items", {"data": {"id": "2", "title": "New"}})
    mock_client.post.return_value = response

    item = await client.create_item({"title": "New", "description": "Test", "category": "strategy", "priority": "low"})

    assert item["title"] == "New"
    mock_client.post.assert_awaited_once()


@pytest.mark.asyncio
async def test_tp_capital_get_signals(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = TPCapitalClient()
    response = _prepare_response(
        "GET",
        "http://localhost/signals",
        {
            "data": [
                {
                    "asset": "PETR4",
                    "signal_type": "BUY",
                    "price": 37.5,
                    "confidence": 0.8,
                    "timestamp": "2025-10-16T00:00:00Z",
                }
            ]
        },
    )
    mock_client.get.return_value = response

    signals = await client.get_tp_capital_signals()

    assert len(signals) == 1
    assert signals[0]["symbol"] == "PETR4"
    assert signals[0]["size"] == pytest.approx(1.0)
    mock_client.get.assert_awaited_once()


@pytest.mark.asyncio
async def test_b3_get_data(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = B3Client()
    response = _prepare_response(
        "GET",
        "http://localhost/overview",
        {
            "data": {
                "snapshots": [
                    {"symbol": "PETR4", "price": 37.5},
                    {"symbol": "VALE3", "price": 62.3},
                ],
                "indicators": {"PETR4": {"sma": 35.2}},
                "gammaLevels": [],
                "dxy": 105.2,
            }
        },
    )
    mock_client.get.return_value = response

    data = await client.get_b3_data("PETR4")

    assert data["symbol"] == "PETR4"
    assert data["snapshots"][0]["price"] == 37.5
    mock_client.get.assert_awaited_once()


@pytest.mark.asyncio
async def test_b3_get_adjustments(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = B3Client()
    response = _prepare_response(
        "GET",
        "http://localhost/adjustments",
        {"data": [{"symbol": "PETR4", "adjustment": 1.23}]},
    )
    mock_client.get.return_value = response

    adjustments = await client.get_adjustments("PETR4")

    assert adjustments[0]["symbol"] == "PETR4"
    mock_client.get.assert_awaited_once_with("/adjustments", params={"instrument": "PETR4", "limit": 120})


@pytest.mark.asyncio
async def test_workspace_retry_on_failure(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.post = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = WorkspaceClient()
    request = httpx.Request("GET", "http://localhost/api/items")
    error = httpx.HTTPError("boom")
    error.request = request
    success_response = _prepare_response("GET", "http://localhost/api/items", {"data": []})
    mock_client.get.side_effect = [error, success_response]

    items = await client.get_items()

    assert items == []
    assert mock_client.get.await_count == 2


@pytest.mark.asyncio
async def test_workspace_circuit_breaker_opens(monkeypatch: pytest.MonkeyPatch):
    mock_client = AsyncMock()
    mock_client.get = AsyncMock()
    mock_client.post = AsyncMock()
    mock_client.aclose = AsyncMock()
    monkeypatch.setattr("httpx.AsyncClient", lambda *args, **kwargs: mock_client)

    client = WorkspaceClient()
    request = httpx.Request("GET", "http://localhost/api/items")

    def _raise_error(*args, **kwargs):
        err = httpx.HTTPError("boom")
        err.request = request
        raise err

    mock_client.get.side_effect = _raise_error

    breaker_error = None
    for _ in range(10):
        try:
            await client.get_items()
        except CircuitBreakerError as exc:
            breaker_error = exc
            break
        except httpx.HTTPError:
            continue

    assert breaker_error is not None
