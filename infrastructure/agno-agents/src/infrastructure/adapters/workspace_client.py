from __future__ import annotations

import logging
from typing import Any, Dict, List

import httpx
from aiobreaker import CircuitBreaker, CircuitBreakerError

from ...application.ports import WorkspacePort
from ...config import settings
from ...logging_utils import get_agent_logger
from ...monitoring import track_error
from ..resilience import create_circuit_breaker, create_retry_decorator

logger = get_agent_logger("WorkspaceClient")


class WorkspaceClient(WorkspacePort):
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.workspace_api_url,
            timeout=settings.http_timeout,
        )
        self._retry = create_retry_decorator()
        self._breaker: CircuitBreaker = create_circuit_breaker("workspace_api")

    async def ping(self) -> None:
        @self._retry
        async def _request() -> None:
            response = await self._client.get("/health")
            response.raise_for_status()

        try:
            await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("WorkspaceClient", exc.__class__.__name__)
            logger.error(
                "Workspace health probe failed",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def get_items(self) -> List[Dict[str, Any]]:
        @self._retry
        async def _request() -> List[Dict[str, Any]]:
            response = await self._client.get("/api/items")
            response.raise_for_status()
            payload = response.json()
            items = payload.get("data", payload)
            logger.info(
                "Fetched workspace items from Workspace API",
                extra={
                    "service": "agno-agents",
                    "agent": "WorkspaceClient",
                    "count": len(items),
                },
            )
            return items

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("WorkspaceClient", exc.__class__.__name__)
            logger.error(
                "Failed to fetch workspace items",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def create_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = {"title", "description", "category", "priority"}
        missing = required_fields.difference(item.keys())
        if missing:
            raise ValueError(f"Missing required workspace item fields: {', '.join(sorted(missing))}")

        @self._retry
        async def _request() -> Dict[str, Any]:
            response = await self._client.post("/api/items", json=item)
            response.raise_for_status()
            payload = response.json()
            result = payload.get("data", payload)
            logger.info(
                "Created workspace item via Workspace API",
                extra={
                    "service": "agno-agents",
                    "agent": "WorkspaceClient",
                    "item_title": result.get("title"),
                },
            )
            return result

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("WorkspaceClient", exc.__class__.__name__)
            logger.error(
                "Failed to create workspace item",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def close(self) -> None:
        await self._client.aclose()
