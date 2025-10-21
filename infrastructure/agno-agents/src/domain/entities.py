from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class MarketSignal(BaseModel):
    symbol: str
    signal_type: str
    confidence: float
    price: float
    timestamp: datetime
    source: str
    size: float | None = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RiskAssessment(BaseModel):
    signal_id: str
    risk_level: str
    approved: bool
    daily_loss_check: bool
    position_size_check: bool
    trading_hours_check: bool
    reasons: List[str] = Field(default_factory=list)
    timestamp: datetime


class AgentDecision(BaseModel):
    agent_name: str
    decision_type: str
    input_data: Dict[str, object]
    output_data: Dict[str, object]
    processing_time: float
    timestamp: datetime
