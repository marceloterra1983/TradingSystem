from __future__ import annotations

import asyncio
import json
from typing import List
from unittest.mock import AsyncMock

import pytest
from websockets.exceptions import ConnectionClosed

from src.infrastructure.adapters import B3WebSocketConsumer


class DummyWebSocket:
    def __init__(self, messages: List[str]):
        self._messages = messages

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._messages:
            await asyncio.sleep(0)
            return self._messages.pop(0)
        raise StopAsyncIteration


@pytest.mark.asyncio
async def test_handle_message(monkeypatch: pytest.MonkeyPatch):
    callback = AsyncMock()
    consumer = B3WebSocketConsumer(callback)
    message = json.dumps({"symbol": "PETR4", "price": 37.5})
    await consumer._handle_message(message)
    callback.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_invalid_message(monkeypatch: pytest.MonkeyPatch):
    callback = AsyncMock()
    consumer = B3WebSocketConsumer(callback)
    await consumer._handle_message("not json")
    callback.assert_not_awaited()


@pytest.mark.asyncio
async def test_consumer_start_and_stop(monkeypatch: pytest.MonkeyPatch):
    called = False

    async def fake_run(self):  # type: ignore[override]
        nonlocal called
        called = True

    monkeypatch.setattr(
        "src.infrastructure.adapters.b3_websocket_consumer.B3WebSocketConsumer._run",
        fake_run,
    )

    consumer = B3WebSocketConsumer(AsyncMock())
    assert consumer._running is False
    await consumer.start()
    await asyncio.sleep(0.01)
    assert consumer._running is True
    await consumer.stop()

    assert called
    assert consumer._running is False
