from __future__ import annotations

import logging
from typing import Any, Dict, List

import httpx
from aiobreaker import CircuitBreaker, CircuitBreakerError

from ...config import settings
from ...logging_utils import get_agent_logger
from ...monitoring import track_error
from ..resilience import create_circuit_breaker, create_retry_decorator

DEFAULT_SIGNAL_SIZE = 1.0
SIZE_KEYS = ("size", "quantity", "qty", "position_size", "positionSize", "units")

logger = get_agent_logger("TPCapitalClient")


class TPCapitalClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.tp_capital_api_url,
            timeout=settings.http_timeout,
        )
        self._retry = create_retry_decorator()
        self._breaker: CircuitBreaker = create_circuit_breaker("tp_capital_api")

    async def ping(self) -> None:
        @self._retry
        async def _request() -> None:
            response = await self._client.get("/health")
            response.raise_for_status()

        try:
            await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("TPCapitalClient", exc.__class__.__name__)
            logger.error(
                "TP Capital health probe failed",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def get_tp_capital_signals(self, limit: int = 50) -> List[Dict[str, Any]]:
        @self._retry
        async def _request() -> List[Dict[str, Any]]:
            response = await self._client.get("/signals", params={"limit": limit})
            response.raise_for_status()
            payload = response.json()
            raw_signals: List[Dict[str, Any]] = payload.get("data", payload)
            transformed = [self._transform_signal(signal) for signal in raw_signals]
            logger.info(
                "Fetched TP Capital signals",
                extra={"count": len(transformed)},
            )
            return transformed

        try:
            return await self._breaker.call_async(_request)
        except (httpx.HTTPError, CircuitBreakerError) as exc:
            track_error("TPCapitalClient", exc.__class__.__name__)
            logger.error(
                "Failed to fetch TP Capital signals",
                extra={"error": exc.__class__.__name__},
            )
            raise

    async def close(self) -> None:
        await self._client.aclose()

    def _transform_signal(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        size_value = self._extract_size(signal)
        symbol = signal.get("symbol") or signal.get("asset") or "UNKNOWN"
        signal_type = signal.get("signal_type") or signal.get("direction") or "HOLD"
        price = signal.get("price") or signal.get("entry") or 0.0
        confidence = signal.get("confidence") or signal.get("score") or 0.5
        timestamp = signal.get("timestamp") or signal.get("createdAt")

        metadata = {key: value for key, value in signal.items() if key not in {"symbol", "asset"}}
        metadata.setdefault("size", size_value)

        return {
            "symbol": symbol,
            "signal_type": signal_type,
            "price": float(price) if isinstance(price, (int, float, str)) else 0.0,
            "confidence": float(confidence) if isinstance(confidence, (int, float, str)) else 0.5,
            "timestamp": timestamp,
            "source": "TP_CAPITAL",
            "size": size_value,
            "metadata": metadata,
        }

    @staticmethod
    def _extract_size(signal: Dict[str, Any]) -> float:
        for key in SIZE_KEYS:
            if key in signal:
                try:
                    return float(signal[key])
                except (TypeError, ValueError):
                    continue
        return DEFAULT_SIGNAL_SIZE
