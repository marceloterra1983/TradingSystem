from datetime import datetime, timezone
from decimal import Decimal

import pytest
from prometheus_client import generate_latest

from src.domain.entities import AgentDecision, MarketSignal, RiskAssessment
from src.domain.value_objects import Confidence, Price, Symbol
from src.monitoring import DEPENDENCY_STATUS, set_dependency_status


def test_market_signal_creation():
    now = datetime.now(timezone.utc)
    signal = MarketSignal(
        symbol="PETR4",
        signal_type="BUY",
        confidence=0.8,
        price=37.5,
        timestamp=now,
        source="TEST",
        metadata={"indicator": "RSI"},
    )
    assert signal.symbol == "PETR4"
    assert signal.metadata["indicator"] == "RSI"


def test_risk_assessment_creation():
    now = datetime.now(timezone.utc)
    assessment = RiskAssessment(
        signal_id="PETR4-1",
        risk_level="LOW",
        approved=True,
        daily_loss_check=True,
        position_size_check=True,
        trading_hours_check=True,
        reasons=["All checks passed"],
        timestamp=now,
    )
    assert assessment.approved is True
    assert "All checks passed" in assessment.reasons


def test_symbol_value_object():
    symbol = Symbol(ticker="petr4", exchange="b3")
    assert str(symbol) == "PETR4:B3"


def test_price_value_object():
    price_a = Price(value=Decimal("10.0"))
    price_b = Price(value=Decimal("5.0"))
    result = price_a + price_b
    assert result.value == Decimal("15.0")
    with pytest.raises(ValueError):
        _ = price_a - Price(value=Decimal("20.0"))


def test_confidence_value_object():
    confidence = Confidence(score=0.75)
    assert confidence.level == "HIGH"
    assert confidence.percentage == pytest.approx(75.0)


def test_invalid_values():
    with pytest.raises(ValueError):
        Symbol(ticker="", exchange="B3")
    with pytest.raises(ValueError):
        Price(value=Decimal("-1"))
    with pytest.raises(ValueError):
        Confidence(score=1.5)


def test_dependency_status_metrics():
    set_dependency_status("workspace_api", True)
    gauge_value = DEPENDENCY_STATUS.labels(dependency="workspace_api")._value._value
    assert gauge_value == 1

    set_dependency_status("workspace_api", False)
    gauge_value = DEPENDENCY_STATUS.labels(dependency="workspace_api")._value._value
    assert gauge_value == 0

    metrics_output = generate_latest()
    assert b'dependency_status{dependency="workspace_api"}' in metrics_output
