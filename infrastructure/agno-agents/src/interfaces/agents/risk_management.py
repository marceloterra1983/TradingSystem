from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from aiobreaker import CircuitBreakerError

from ...config import settings
from ...domain.entities import MarketSignal, RiskAssessment
from ...logging_utils import get_agent_logger
from ...monitoring import track_agent_execution, track_decision, track_error
from ...infrastructure.adapters import RiskEngineClient
from .utils import invoke_agent_tool, register_async_tool

logger = get_agent_logger("RiskManagementAgent")

LLM_ENABLED = settings.agno_enable_llm and bool(settings.openai_api_key)

if LLM_ENABLED:
    risk_management_agent = Agent(
        name="RiskManagementAgent",
        model=OpenAIChat(id=settings.agno_model_name),
        instructions=(
            "You are a risk management agent responsible for validating trading signals "
            "against risk limits. Check daily loss limits, position sizes, trading hours, "
            "and overall portfolio risk. Approve or reject signals with clear justification. "
            "Safety is your top priority."
        ),
        markdown=True,
    )
else:
    risk_management_agent = Agent(
        name="RiskManagementAgent",
        instructions="You validate trading signals using deterministic fallback rules.",
        markdown=True,
    )

risk_engine_client: Optional[RiskEngineClient] = None

DEFAULT_POSITION_SIZE = 1.0


def _resolve_position_size(signal: MarketSignal, default: float = DEFAULT_POSITION_SIZE) -> float:
    if signal.size is not None:
        try:
            return float(signal.size)
        except (TypeError, ValueError):
            logger.debug("Invalid explicit size on signal", extra={"symbol": signal.symbol})

    metadata = signal.metadata if isinstance(signal.metadata, dict) else {}
    for key in ("size", "quantity", "qty", "position_size", "positionSize", "units"):
        if key in metadata:
            value = metadata[key]
            try:
                return float(value)
            except (TypeError, ValueError):
                logger.debug(
                    "Invalid metadata size value",
                    extra={"symbol": signal.symbol, "key": key, "value": value},
                )

    return default


async def initialize_client() -> None:
    global risk_engine_client
    if risk_engine_client is None:
        risk_engine_client = RiskEngineClient()
        logger.info("Initialized risk engine client")


async def shutdown_client() -> None:
    global risk_engine_client
    risk_engine_client = None


async def check_daily_loss_limit() -> bool:
    if not risk_engine_client:
        logger.warning("Risk engine client not initialized; defaulting to pass")
        return True
    try:
        return await risk_engine_client.check_daily_limits()
    except CircuitBreakerError as exc:
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error("Risk engine circuit breaker open", extra={"check": "daily_limits"})
        return True
    except Exception as exc:  # noqa: BLE001
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error(
            "Daily limit check failed",
            extra={"error": exc.__class__.__name__},
        )
        return False


async def check_position_size(symbol: str, size: float) -> bool:
    if not risk_engine_client:
        logger.warning("Risk engine client not initialized; defaulting to pass")
        return True
    try:
        return await risk_engine_client.check_position_size(symbol, size)
    except CircuitBreakerError as exc:
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error(
            "Risk engine circuit breaker open",
            extra={"check": "position_size", "symbol": symbol},
        )
        return False
    except Exception as exc:  # noqa: BLE001
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error(
            "Position size check failed",
            extra={"symbol": symbol, "error": exc.__class__.__name__},
        )
        return False


async def check_trading_hours() -> bool:
    if not risk_engine_client:
        logger.warning("Risk engine client not initialized; defaulting to pass")
        return True
    try:
        return await risk_engine_client.check_trading_hours()
    except CircuitBreakerError as exc:
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error("Risk engine circuit breaker open", extra={"check": "trading_hours"})
        return False
    except Exception as exc:  # noqa: BLE001
        track_error("RiskManagementAgent", exc.__class__.__name__)
        logger.error(
            "Trading hours check failed",
            extra={"error": exc.__class__.__name__},
        )
        return False


async def _validate_signal_tool(signal: MarketSignal) -> Dict[str, Any]:
    payload = {
        "symbol": signal.symbol,
        "signal_type": signal.signal_type,
        "confidence": signal.confidence,
        "price": signal.price,
        "timestamp": signal.timestamp.isoformat(),
    }

    response: Dict[str, Any] = {}
    if LLM_ENABLED:
        with track_agent_execution("RiskManagementAgent"):
            try:
                run_result = await risk_management_agent.arun(
                    json.dumps({"task": "validate_signal", "payload": payload})
                )
            except Exception as exc:
                track_error("RiskManagementAgent", exc.__class__.__name__)
                logger.exception(
                    "Risk evaluation failed",
                    extra={"symbol": signal.symbol, "decision": "ERROR"},
                )
                raise

        response = getattr(run_result, "output", run_result)

    default_reason = f"Default risk validation for {signal.symbol}"
    approved = signal.confidence >= 0.5
    risk_level = "LOW" if approved else "HIGH"
    reasons = [default_reason]

    if isinstance(response, dict):
        approved = bool(response.get("approved", approved))
        risk_level = response.get("risk_level", risk_level)
        response_reasons = response.get("reasons", [])
        if isinstance(response_reasons, list) and response_reasons:
            reasons = [str(reason) for reason in response_reasons]

    size_value = _resolve_position_size(signal)

    checks = {
        "daily_loss_check": await check_daily_loss_limit(),
        "position_size_check": await check_position_size(signal.symbol, size_value),
        "trading_hours_check": await check_trading_hours(),
    }

    return {
        "approved": approved and all(checks.values()),
        "risk_level": risk_level,
        "reasons": reasons,
        "checks": checks,
    }


register_async_tool(
    risk_management_agent,
    name="validate_signal",
    description="Validate a market signal against risk policies.",
    func=_validate_signal_tool,
)


async def validate_signal(signal: MarketSignal) -> RiskAssessment:
    result: Dict[str, Any] = await invoke_agent_tool(
        risk_management_agent,
        "validate_signal",
        signal=signal,
    )

    approved = bool(result.get("approved", False))
    risk_level = result.get("risk_level", "LOW")
    reasons = result.get("reasons", [])
    checks = result.get("checks", {})

    decision = "APPROVE" if approved else "REJECT"
    track_decision("RiskManagementAgent", decision)
    logger.info(
        "Risk assessment complete",
        extra={
            "decision": decision,
            "symbol": signal.symbol,
            "risk_level": risk_level,
        },
    )

    assessment = RiskAssessment(
        signal_id=f"{signal.symbol}-{signal.timestamp.isoformat()}",
        risk_level=risk_level,
        approved=approved,
        daily_loss_check=bool(checks.get("daily_loss_check", True)),
        position_size_check=bool(checks.get("position_size_check", True)),
        trading_hours_check=bool(checks.get("trading_hours_check", True)),
        reasons=reasons if isinstance(reasons, list) else [str(reasons)],
        timestamp=datetime.now(timezone.utc),
    )

    if not assessment.approved:
        track_error("RiskManagementAgent", "SignalRejected")
        logger.warning(
            "Signal rejected by risk management",
            extra={
                "decision": "REJECT",
                "symbol": signal.symbol,
                "risk_level": assessment.risk_level,
            },
        )

    return assessment
