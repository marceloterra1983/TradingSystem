from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field

from ..domain.entities import MarketSignal, RiskAssessment


class AnalyzeMarketRequest(BaseModel):
    symbols: List[str]
    include_tp_capital: bool = True
    include_b3: bool = True


class AnalyzeMarketResponse(BaseModel):
    signals: List[MarketSignal] = Field(default_factory=list)
    analysis_time: float
    timestamp: datetime


class ValidateSignalRequest(BaseModel):
    signal: MarketSignal


class ValidateSignalResponse(BaseModel):
    assessment: RiskAssessment
    validation_time: float


class OrchestrationRequest(BaseModel):
    action: str
    data: Dict[str, object] = Field(default_factory=dict)


class OrchestrationResponse(BaseModel):
    result: Dict[str, object]
    agents_involved: List[str]
    total_time: float
