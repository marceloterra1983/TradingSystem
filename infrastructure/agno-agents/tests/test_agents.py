import pytest

from src.application.dto import OrchestrationRequest
from src.domain.entities import MarketSignal
from src.interfaces.agents.market_analysis import analyze_market, market_analysis_agent
from src.interfaces.agents.risk_management import (
    risk_management_agent,
    validate_signal,
)
from src.interfaces.agents.signal_orchestrator import (
    orchestrate_analysis,
    signal_orchestrator_agent,
)
from src.monitoring import AGENT_DECISIONS_TOTAL


@pytest.mark.asyncio
async def test_market_analysis_agent(mock_market_data, mock_openai_client):
    symbols = [entry["symbol"] for entry in mock_market_data]
    signals = await analyze_market(symbols, include_tp=True, include_b3=True)
    assert len(signals) == len(symbols)
    for signal in signals:
        assert isinstance(signal, MarketSignal)


@pytest.mark.asyncio
async def test_risk_management_agent(mock_signals, mock_openai_client):
    signal = MarketSignal(**mock_signals[0])
    assessment = await validate_signal(signal)
    assert assessment.signal_id.startswith(signal.symbol)
    assert assessment.reasons


@pytest.mark.asyncio
async def test_signal_orchestrator(mock_signals, mock_openai_client):
    request = OrchestrationRequest(
        action="ORCHESTRATE",
        data={"symbols": [item["symbol"] for item in mock_signals]},
    )
    response = await orchestrate_analysis(request)
    assert response.agents_involved
    assert "signals" in response.result


@pytest.mark.asyncio
async def test_agent_error_handling(monkeypatch):
    async def fail(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(market_analysis_agent, "arun", fail)
    with pytest.raises(RuntimeError):
        await analyze_market(["PETR4"], include_tp=True, include_b3=True)


def test_agent_metrics_tracking():
    metric = AGENT_DECISIONS_TOTAL.labels(agent_name="TestAgent", decision_type="TEST")
    before = metric._value.get()
    metric.inc()
    after = metric._value.get()
    assert after == pytest.approx(before + 1)
