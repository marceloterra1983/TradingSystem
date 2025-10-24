from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from ..application.dto import (
    AnalyzeMarketRequest,
    AnalyzeMarketResponse,
    OrchestrationRequest,
    OrchestrationResponse,
)
from ..logging_utils import get_agent_logger
from ..monitoring import track_error
from .agents.market_analysis import analyze_market, b3_client, tp_capital_client
from .agents.risk_management import risk_engine_client
from .agents.signal_orchestrator import orchestrate_analysis

logger = get_agent_logger("Routes")

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.post("/analyze", response_model=AnalyzeMarketResponse)
async def analyze_agents_endpoint(request: AnalyzeMarketRequest) -> AnalyzeMarketResponse:
    start = time.perf_counter()
    try:
        signals = await analyze_market(
            request.symbols,
            request.include_tp_capital,
            request.include_b3,
        )
    except Exception as exc:  # noqa: BLE001
        track_error("Routes", exc.__class__.__name__)
        logger.exception("Analyze endpoint failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze market data",
        ) from exc

    duration = time.perf_counter() - start
    response = AnalyzeMarketResponse(
        signals=signals,
        analysis_time=duration,
        timestamp=datetime.now(timezone.utc),
    )
    logger.info(
        "Analyze endpoint completed",
        extra={"symbols": request.symbols, "analysis_time": duration},
    )
    return response


@router.post("/signals", response_model=OrchestrationResponse)
async def orchestrate_agents_endpoint(
    request: OrchestrationRequest,
) -> OrchestrationResponse:
    try:
        response = await orchestrate_analysis(request)
    except Exception as exc:  # noqa: BLE001
        track_error("Routes", exc.__class__.__name__)
        logger.exception("Signal orchestration failed", extra={"action": request.action})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to orchestrate agent workflow",
        ) from exc

    logger.info(
        "Signal orchestration completed",
        extra={
            "action": request.action,
            "agents": response.agents_involved,
            "total_time": response.total_time,
        },
    )
    return response


@router.get("/status")
async def agents_status() -> dict[str, str]:
    return {
        "market_analysis": "ready" if b3_client is not None else "initializing",
        "risk_management": "ready" if risk_engine_client is not None else "initializing",
        "tp_capital": "ready" if tp_capital_client is not None else "initializing",
    }
