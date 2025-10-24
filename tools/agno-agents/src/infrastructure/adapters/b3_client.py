from __future__ import annotations

from typing import Any, Dict, List

import httpx
from aiobreaker import CircuitBreaker, CircuitBreakerError

from ...config import settings
from ...logging_utils import get_agent_logger
from ...monitoring import track_error
from ..resilience import create_circuit_breaker, create_retry_decorator

logger = get_agent_logger("B3Client")


class B3Client:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.b3_api_url,
            timeout=settings.http_timeout,
        )
        self._retry = create_retry_decorator()
        self._breaker: CircuitBreaker = create_circuit_breaker("b3_api")

    async def ping(self) -> None:
        @self._retry
        async def _request() -> None:
            response = await self._client.get("/health")
            response.raise_for_status()

        try:
            await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("B3Client", exc.__class__.__name__)
            logger.error(
                "B3 health probe failed",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def get_b3_data(self, symbol: str) -> Dict[str, Any]:
        @self._retry
        async def _request() -> Dict[str, Any]:
            response = await self._client.get("/overview")
            response.raise_for_status()
            payload = response.json()
            data = payload.get("data", payload)
            snapshots = self._filter_snapshots(data.get("snapshots", []), symbol)
            result = {
                "symbol": symbol,
                "snapshots": snapshots,
                "indicators": data.get("indicators"),
                "gamma_levels": data.get("gammaLevels"),
                "dxy": data.get("dxy"),
            }
            logger.info(
                "Fetched B3 overview data",
                extra={"symbol": symbol},
            )
            return result

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("B3Client", exc.__class__.__name__)
            logger.error(
                "Failed to fetch B3 overview data",
                extra={"symbol": symbol, "error": exc.__class__.__name__},
            )
            raise

    async def get_adjustments(self, symbol: str, limit: int = 120) -> List[Dict[str, Any]]:
        @self._retry
        async def _request() -> List[Dict[str, Any]]:
            response = await self._client.get(
                "/adjustments", params={"instrument": symbol, "limit": limit}
            )
            response.raise_for_status()
            payload = response.json()
            adjustments = payload.get("data", payload)
            logger.info(
                "Fetched B3 adjustments",
                extra={"symbol": symbol, "count": len(adjustments)},
            )
            return adjustments

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("B3Client", exc.__class__.__name__)
            logger.error(
                "Failed to fetch B3 adjustments",
                extra={"symbol": symbol, "error": exc.__class__.__name__},
            )
            raise

    async def get_gamma_levels(self) -> List[Dict[str, Any]]:
        @self._retry
        async def _request() -> List[Dict[str, Any]]:
            response = await self._client.get("/gamma-levels")
            response.raise_for_status()
            payload = response.json()
            levels = payload.get("data", payload)
            logger.info("Fetched B3 gamma levels", extra={"count": len(levels)})
            return levels

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("B3Client", exc.__class__.__name__)
            logger.error(
                "Failed to fetch gamma levels",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def get_indicators_daily(self, limit: int = 180) -> List[Dict[str, Any]]:
        @self._retry
        async def _request() -> List[Dict[str, Any]]:
            response = await self._client.get("/indicators/daily", params={"limit": limit})
            response.raise_for_status()
            payload = response.json()
            indicators = payload.get("data", payload)
            logger.info(
                "Fetched B3 daily indicators",
                extra={"count": len(indicators)},
            )
            return indicators

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("B3Client", exc.__class__.__name__)
            logger.error(
                "Failed to fetch daily indicators",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def close(self) -> None:
        await self._client.aclose()

    @staticmethod
    def _filter_snapshots(snapshots: List[Dict[str, Any]], symbol: str) -> List[Dict[str, Any]]:
        if not symbol:
            return snapshots
        return [snapshot for snapshot in snapshots if snapshot.get("symbol") == symbol]
