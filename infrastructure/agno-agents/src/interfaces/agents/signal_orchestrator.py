from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Dict, List

from agno.agent import Agent
from agno.models.openai import OpenAIChat

from ...application.dto import OrchestrationRequest, OrchestrationResponse
from ...config import settings
from ...domain.entities import MarketSignal, RiskAssessment
from ...monitoring import track_agent_execution, track_decision, track_error
from ...logging_utils import get_agent_logger
from .market_analysis import market_analysis_agent
from .risk_management import risk_management_agent
from .utils import invoke_agent_tool

logger = get_agent_logger("SignalOrchestratorAgent")

signal_orchestrator_agent = Agent(
    name="SignalOrchestratorAgent",
    model=OpenAIChat(id=settings.agno_model_name),
    instructions=(
        "You are a signal orchestrator agent that coordinates decisions between "
        "MarketAnalysisAgent and RiskManagementAgent. Your role is to manage the "
        "workflow: receive market analysis requests, coordinate signal generation, "
        "validate signals through risk management, and aggregate results. Ensure "
        "smooth communication between agents and handle errors gracefully."
    ),
    markdown=True,
)


async def orchestrate_analysis(
    request: OrchestrationRequest,
) -> OrchestrationResponse:
    start_time = time.perf_counter()
    agents_used: List[str] = []

    with track_agent_execution("SignalOrchestratorAgent"):
        try:
            await signal_orchestrator_agent.arun(request.model_dump(mode="json"))
        except Exception as exc:
            track_error("SignalOrchestratorAgent", exc.__class__.__name__)
            logger.exception(
                "Signal orchestration failed",
                extra={"decision": "ERROR", "action": request.action},
            )
            raise

    signals: List[MarketSignal] = []
    assessments: List[RiskAssessment] = []

    action = request.action.upper()
    data = request.data

    if action in {"ANALYZE", "ORCHESTRATE"}:
        agents_used.append("MarketAnalysisAgent")
        symbols = data.get("symbols", [])
        include_tp = data.get("include_tp_capital", True)
        include_b3 = data.get("include_b3", True)
        raw_signals: List[Dict[str, Any]] = await invoke_agent_tool(
            market_analysis_agent,
            "analyze_market",
            symbols=symbols,
            include_tp_capital=include_tp,
            include_b3=include_b3,
        )
        signals = [_coerce_market_signal(item) for item in raw_signals]

    if action in {"VALIDATE", "ORCHESTRATE"}:
        agents_used.append("RiskManagementAgent")
        targets = data.get("signals", signals)
        assessments = []
        for signal_data in targets:
            if isinstance(signal_data, MarketSignal):
                signal = signal_data
            else:
                signal = MarketSignal(**signal_data)
            assessment_result: Dict[str, Any] = await invoke_agent_tool(
                risk_management_agent,
                "validate_signal",
                signal=signal,
            )
            assessment = _coerce_risk_assessment(signal, assessment_result)
            assessments.append(assessment)

    result = {
        "signals": [signal.model_dump() for signal in signals],
        "assessments": [assessment.model_dump() for assessment in assessments],
    }

    track_decision("SignalOrchestratorAgent", action)
    logger.info(
        "Completed orchestration step",
        extra={"decision": action, "agents_involved": agents_used},
    )

    total_time = time.perf_counter() - start_time
    return OrchestrationResponse(
        result=result,
        agents_involved=agents_used,
        total_time=total_time,
    )


def _coerce_market_signal(item: Dict[str, Any]) -> MarketSignal:
    now_ts = time.time()
    timestamp_value = item.get("timestamp")
    if isinstance(timestamp_value, str):
        try:
            parsed = datetime.fromisoformat(timestamp_value)
        except ValueError:
            parsed = datetime.fromtimestamp(now_ts, tz=timezone.utc)
        timestamp_value = parsed
    elif not isinstance(timestamp_value, datetime):
        timestamp_value = datetime.fromtimestamp(now_ts, tz=timezone.utc)

    decision = item.get("signal_type", "HOLD")
    track_decision("MarketAnalysisAgent", decision)
    logger.info(
        "Orchestrator received market signal",
        extra={
            "decision": decision,
            "symbol": item.get("symbol", "UNKNOWN"),
            "confidence": item.get("confidence", 0.0),
        },
    )
    return MarketSignal(
        symbol=item.get("symbol", "UNKNOWN"),
        signal_type=decision,
        confidence=float(item.get("confidence", 0.5)),
        price=float(item.get("price", 0.0)),
        timestamp=timestamp_value,
        source=item.get("source", "AGNO"),
        metadata=item.get("metadata", {}),
    )


def _coerce_risk_assessment(
    signal: MarketSignal,
    result: Dict[str, Any],
) -> RiskAssessment:
    approved = bool(result.get("approved", False))
    decision = "APPROVE" if approved else "REJECT"
    track_decision("RiskManagementAgent", decision)
    logger.info(
        "Orchestrator processed risk assessment",
        extra={
            "decision": decision,
            "symbol": signal.symbol,
            "risk_level": result.get("risk_level", "LOW"),
        },
    )
    return RiskAssessment(
        signal_id=f"{signal.symbol}-{signal.timestamp.isoformat()}",
        risk_level=result.get("risk_level", "LOW"),
        approved=approved,
        daily_loss_check=bool(result.get("checks", {}).get("daily_loss_check", True)),
        position_size_check=bool(
            result.get("checks", {}).get("position_size_check", True)
        ),
        trading_hours_check=bool(
            result.get("checks", {}).get("trading_hours_check", True)
        ),
        reasons=result.get("reasons", []),
        timestamp=datetime.fromtimestamp(time.time(), tz=timezone.utc),
    )
