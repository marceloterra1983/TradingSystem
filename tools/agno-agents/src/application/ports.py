from abc import ABC, abstractmethod
from typing import Any, Dict, List


class MarketDataPort(ABC):
    @abstractmethod
    async def get_b3_data(self, symbol: str) -> Dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_tp_capital_signals(self) -> List[Dict[str, Any]]:
        raise NotImplementedError


class WorkspacePort(ABC):
    @abstractmethod
    async def get_items(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def create_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class RiskEnginePort(ABC):
    @abstractmethod
    async def check_daily_limits(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def check_position_size(self, symbol: str, size: float) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def check_trading_hours(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def trigger_kill_switch(self) -> None:
        raise NotImplementedError
