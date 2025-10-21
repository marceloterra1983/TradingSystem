from __future__ import annotations

import asyncio
import json
from typing import Any, Awaitable, Callable, Dict, Optional

from websockets.asyncio.client import connect
from websockets.exceptions import ConnectionClosed

from ...config import settings
from ...logging_utils import get_agent_logger
from ...monitoring import track_error

logger = get_agent_logger("B3WebSocketConsumer")

MessageCallback = Callable[[Dict[str, Any]], Awaitable[None]]


class B3WebSocketConsumer:
    def __init__(self, callback: MessageCallback) -> None:
        self._callback = callback
        self._url = settings.b3_websocket_url
        self._task: Optional[asyncio.Task[None]] = None
        self._running = False
        self._reconnect_delay = 5
        self._max_reconnect_delay = 60

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Started B3 WebSocket consumer", extra={"url": self._url})

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Stopped B3 WebSocket consumer")

    async def _run(self) -> None:
        reconnect_delay = self._reconnect_delay
        while self._running:
            try:
                async with connect(self._url) as websocket:
                    logger.info("Connected to B3 WebSocket", extra={"url": self._url})
                    reconnect_delay = self._reconnect_delay
                    async for message in websocket:
                        if not self._running:
                            break
                        await self._handle_message(message)
            except ConnectionClosed as exc:
                track_error("B3WebSocketConsumer", exc.__class__.__name__)
                logger.warning(
                    "B3 WebSocket connection closed",
                    extra={"code": exc.code, "reason": exc.reason},
                )
            except Exception as exc:  # noqa: BLE001
                track_error("B3WebSocketConsumer", exc.__class__.__name__)
                logger.error(
                    "Unexpected error in B3 WebSocket consumer",
                    extra={"error": exc.__class__.__name__},
                )

            if self._running:
                logger.info(
                    "Attempting to reconnect to B3 WebSocket",
                    extra={"retry_in_seconds": reconnect_delay},
                )
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, self._max_reconnect_delay)

    async def _handle_message(self, message: str) -> None:
        try:
            payload = json.loads(message)
        except json.JSONDecodeError as exc:
            track_error("B3WebSocketConsumer", exc.__class__.__name__)
            logger.error("Invalid JSON payload from B3 WebSocket", extra={"message": message})
            return

        if not isinstance(payload, dict):
            logger.debug("Ignoring non-dict WebSocket payload")
            return

        symbol = payload.get("symbol")
        if not symbol:
            logger.debug("Ignoring WebSocket payload without symbol")
            return

        await self._callback(payload)
