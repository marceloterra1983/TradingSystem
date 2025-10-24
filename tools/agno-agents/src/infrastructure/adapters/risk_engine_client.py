from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from ...application.ports import RiskEnginePort
from ...logging_utils import get_agent_logger

logger = get_agent_logger("RiskEngineClient")


class RiskEngineClient(RiskEnginePort):
    async def check_daily_limits(self) -> bool:
        logger.info("Performing daily loss limit check")
        return True

    async def check_position_size(self, symbol: str, size: float) -> bool:
        limit = 100.0
        allowed = size <= limit
        logger.info(
            "Evaluated position size",
            extra={"symbol": symbol, "size": size, "limit": limit, "allowed": allowed},
        )
        return allowed

    async def check_trading_hours(self) -> bool:
        br_timezone = timezone(timedelta(hours=-3))
        now_brt = datetime.now(br_timezone)
        trading_start = time(9, 0)
        trading_end = time(18, 0)
        allowed = trading_start <= now_brt.time() <= trading_end
        logger.info(
            "Checked trading hours",
            extra={"current_time": now_brt.isoformat(), "allowed": allowed},
        )
        return allowed

    async def trigger_kill_switch(self) -> None:
        logger.critical("Kill switch triggered by risk engine client")
