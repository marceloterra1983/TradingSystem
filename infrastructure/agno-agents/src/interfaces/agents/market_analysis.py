from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from aiobreaker import CircuitBreakerError

from ...config import settings
from ...domain.entities import MarketSignal
from ...logging_utils import get_agent_logger
from ...monitoring import track_agent_execution, track_decision, track_error
from ...infrastructure.adapters import B3Client, TPCapitalClient, WorkspaceClient
from .utils import invoke_agent_tool, register_async_tool

logger = get_agent_logger("MarketAnalysisAgent")

DEFAULT_POSITION_SIZE = 1.0
SIZE_KEYS = ("size", "quantity", "qty", "position_size", "positionSize", "units")
LLM_ENABLED = settings.agno_enable_llm and bool(settings.openai_api_key)


def _extract_size_value(payload: Dict[str, Any]) -> float:
    """Extract a numeric position size from a payload or its metadata."""

    def _to_float(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    for key in SIZE_KEYS:
        if key in payload:
            numeric = _to_float(payload.get(key))
            if numeric is not None:
                return numeric

    metadata = payload.get("metadata")
    if isinstance(metadata, dict):
        for key in SIZE_KEYS:
            if key in metadata:
                numeric = _to_float(metadata.get(key))
                if numeric is not None:
                    return numeric

    return DEFAULT_POSITION_SIZE


if LLM_ENABLED:
    market_analysis_agent = Agent(
        name="MarketAnalysisAgent",
        model=OpenAIChat(id=settings.agno_model_name),
        instructions=(
            "You are a market analysis agent specialized in analyzing B3 market data "
            "and TP Capital signals. Your role is to identify trading opportunities by "
            "analyzing price movements, volume patterns, and signal correlations. "
            "Provide clear BUY/SELL/HOLD recommendations with confidence scores."
        ),
        markdown=True,
    )
else:
    market_analysis_agent = Agent(
        name="MarketAnalysisAgent",
        instructions=(
            "You generate heuristic BUY/SELL/HOLD signals using deterministic fallbacks."
        ),
        markdown=True,
    )

b3_client: Optional[B3Client] = None
tp_capital_client: Optional[TPCapitalClient] = None
workspace_client: Optional[WorkspaceClient] = None


async def initialize_clients() -> None:
    """Initialize HTTP clients used by the market analysis agent."""
    global b3_client, tp_capital_client, workspace_client

    if b3_client is None:
        b3_client = B3Client()
        logger.info("Initialized B3 client for market analysis")
    if tp_capital_client is None:
        tp_capital_client = TPCapitalClient()
        logger.info("Initialized TP Capital client for market analysis")
    if workspace_client is None:
        workspace_client = WorkspaceClient()
        logger.info("Initialized Workspace client for market analysis")


async def shutdown_clients() -> None:
    """Close HTTP clients created for market analysis."""
    global b3_client, tp_capital_client, workspace_client

    if b3_client is not None:
        await b3_client.close()
        b3_client = None
    if tp_capital_client is not None:
        await tp_capital_client.close()
        tp_capital_client = None
    if workspace_client is not None:
        await workspace_client.close()
        workspace_client = None


async def analyze_b3_data(symbol: str) -> Dict[str, Any]:
    if not b3_client:
        logger.warning(
            "B3 client not initialized; returning empty market data",
            extra={"symbol": symbol},
        )
        return {}

    try:
        data = await b3_client.get_b3_data(symbol)
        logger.info(
            "Fetched B3 market data",
            extra={"symbol": symbol},
        )
        return data
    except CircuitBreakerError as exc:
        track_error("MarketAnalysisAgent", exc.__class__.__name__)
        logger.error(
            "B3 circuit breaker open; skipping request",
            extra={"symbol": symbol},
        )
        return {}
    except Exception as exc:  # noqa: BLE001
        track_error("MarketAnalysisAgent", exc.__class__.__name__)
        logger.error(
            "Failed to fetch B3 data",
            extra={"symbol": symbol, "error": exc.__class__.__name__},
        )
        return {}


async def analyze_tp_signals() -> List[Dict[str, Any]]:
    if not tp_capital_client:
        logger.warning("TP Capital client not initialized; returning empty signals")
        return []

    try:
        signals = await tp_capital_client.get_tp_capital_signals()
        logger.info(
            "Fetched TP Capital signals",
            extra={"count": len(signals)},
        )
        return signals
    except CircuitBreakerError as exc:
        track_error("MarketAnalysisAgent", exc.__class__.__name__)
        logger.error(
            "TP Capital circuit breaker open; skipping request",
            extra={"error": exc.__class__.__name__},
        )
        return []
    except Exception as exc:  # noqa: BLE001
        track_error("MarketAnalysisAgent", exc.__class__.__name__)
        logger.error(
            "Failed to fetch TP Capital signals",
            extra={"error": exc.__class__.__name__},
        )
        return []


def calculate_confidence(data: dict[str, Any]) -> float:
    return float(data.get("confidence", 0.5))


async def _gather_b3_data(symbols: List[str]) -> Dict[str, Any]:
    results: Dict[str, Any] = {}
    for symbol in symbols:
        results[symbol] = await analyze_b3_data(symbol)
    return results


async def _analyze_market_tool(
    symbols: List[str],
    include_tp_capital: bool = True,
    include_b3: bool = True,
) -> List[Dict[str, Any]]:
    market_data: Dict[str, Any] = {}
    tp_signals: List[Dict[str, Any]] = []
    tasks: List[asyncio.Task[Any]] = []

    if include_b3:
        tasks.append(asyncio.create_task(_gather_b3_data(symbols)))
    if include_tp_capital:
        tasks.append(asyncio.create_task(analyze_tp_signals()))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        index = 0
        if include_b3:
            b3_result = results[index]
            index += 1
            if isinstance(b3_result, Exception):
                track_error("MarketAnalysisAgent", b3_result.__class__.__name__)
                logger.error(
                    "Error gathering B3 data",
                    extra={"error": b3_result.__class__.__name__},
                )
            else:
                market_data = b3_result
        if include_tp_capital:
            tp_result = results[index]
            if isinstance(tp_result, Exception):
                track_error("MarketAnalysisAgent", tp_result.__class__.__name__)
                logger.error(
                    "Error gathering TP Capital signals",
                    extra={"error": tp_result.__class__.__name__},
                )
            else:
                tp_signals = tp_result

    payload = {
        "symbols": symbols,
        "include_tp_capital": include_tp_capital,
        "include_b3": include_b3,
        "market_data": market_data,
        "tp_capital_signals": tp_signals,
    }
    response: Any = {"signals": []}
    if LLM_ENABLED:
        with track_agent_execution("MarketAnalysisAgent"):
            try:
                run_result = await market_analysis_agent.arun(
                    json.dumps({"task": "analyze_market", "payload": payload})
                )
            except Exception as exc:
                track_error("MarketAnalysisAgent", exc.__class__.__name__)
                logger.exception(
                    "Error while invoking market analysis model",
                    extra={"symbols": symbols},
                )
                raise

        response = getattr(run_result, "output", run_result)
    else:
        logger.debug(
            "LLM disabled; skipping market analysis agent invocation",
            extra={"symbols": symbols},
        )

    parsed: List[Dict[str, Any]] = []
    if isinstance(response, dict) and "signals" in response:
        parsed = response["signals"]  # type: ignore[assignment]
    elif isinstance(response, list):
        parsed = response  # type: ignore[assignment]

    if not parsed:
        logger.info(
            "Model returned no signals; applying fallback logic",
            extra={"symbols": symbols},
        )
        if tp_signals:
            parsed = []
            for signal in tp_signals:
                size_value = _extract_size_value(signal)
                metadata = dict(signal)
                metadata.setdefault("size", size_value)
                parsed.append(
                    {
                        "symbol": signal.get("symbol") or signal.get("asset", "UNKNOWN"),
                        "signal_type": signal.get("signal_type", "HOLD"),
                        "confidence": float(signal.get("confidence", 0.5)),
                        "price": float(signal.get("price", 0.0)),
                        "timestamp": signal.get("timestamp"),
                        "source": signal.get("source", "TP_CAPITAL"),
                        "size": size_value,
                        "metadata": metadata,
                    }
                )
        else:
            parsed = [
                {
                    "symbol": symbol,
                    "signal_type": "HOLD",
                    "confidence": 0.5,
                    "price": 0.0,
                    "source": "AGNO",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "size": DEFAULT_POSITION_SIZE,
                    "metadata": {
                        **(market_data.get(symbol, {}) if isinstance(market_data.get(symbol, {}), dict) else {}),
                        "size": DEFAULT_POSITION_SIZE,
                    },
                }
                for symbol in symbols
            ]

    return parsed


register_async_tool(
    market_analysis_agent,
    name="analyze_market",
    description="Analyze market data and generate trading signals.",
    func=_analyze_market_tool,
)


async def analyze_market(
    symbols: List[str],
    include_tp: bool,
    include_b3: bool,
) -> List[MarketSignal]:
    raw_signals: List[Dict[str, Any]] = await invoke_agent_tool(
        market_analysis_agent,
        "analyze_market",
        symbols=symbols,
        include_tp_capital=include_tp,
        include_b3=include_b3,
    )
    now = datetime.now(timezone.utc)
    signals: List[MarketSignal] = []

    for item in raw_signals:
        timestamp_value = item.get("timestamp", now)
        if isinstance(timestamp_value, str):
            try:
                timestamp_value = datetime.fromisoformat(timestamp_value)
            except ValueError:
                timestamp_value = now
        decision_type = item.get("signal_type", "UNKNOWN")
        track_decision("MarketAnalysisAgent", decision_type)
        size_value = item.get("size")
        if size_value is None:
            size_value = _extract_size_value(item)
        try:
            size_value = float(size_value)
        except (TypeError, ValueError):
            size_value = DEFAULT_POSITION_SIZE

        metadata = item.get("metadata")
        if not isinstance(metadata, dict):
            metadata = {}
        metadata.setdefault("size", size_value)
        logger.info(
            "Generated market signal",
            extra={
                "decision": decision_type,
                "symbol": item.get("symbol", "UNKNOWN"),
                "confidence": item.get("confidence", 0.0),
            },
        )
        signals.append(
            MarketSignal(
                symbol=item.get("symbol", "UNKNOWN"),
                signal_type=item.get("signal_type", "HOLD"),
                confidence=float(item.get("confidence", 0.5)),
                price=float(item.get("price", 0.0)),
                timestamp=timestamp_value,
                source=item.get("source", "AGNO"),
                size=size_value,
                metadata=metadata,
            )
        )

    return signals
