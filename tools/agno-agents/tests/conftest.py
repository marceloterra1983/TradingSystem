import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import pytest
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("AGNO_ENABLE_METRICS", "true")
os.environ.setdefault("AGNO_ENABLE_TRACING", "false")
os.environ.setdefault("AGNO_ENABLE_LLM", "true")
os.environ.setdefault("AGNO_ENABLE_B3_WEBSOCKET", "false")
os.environ.setdefault("AGNO_RATE_LIMIT_REQUESTS", "100")
os.environ.setdefault("AGNO_RATE_LIMIT_PERIOD", "60")

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from src.main import app  # noqa: E402  (import after monkeypatch definitions)
from src.interfaces.agents import market_analysis_agent, risk_management_agent, signal_orchestrator_agent  # noqa: E402


@pytest.fixture
def test_client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def mock_openai_client(monkeypatch: pytest.MonkeyPatch):
    async def fake_arun(payload: Any):
        if isinstance(payload, str):
            try:
                import json

                data = json.loads(payload)
            except Exception:
                data = {}
        else:
            data = payload
        return {"mock": True, "input": data}

    monkeypatch.setattr(market_analysis_agent, "arun", fake_arun)
    monkeypatch.setattr(risk_management_agent, "arun", fake_arun)
    monkeypatch.setattr(signal_orchestrator_agent, "arun", fake_arun)


@pytest.fixture
def mock_market_data() -> List[Dict[str, Any]]:
    return [
        {"symbol": "PETR4", "price": 37.5, "volume": 100000},
        {"symbol": "VALE3", "price": 62.3, "volume": 85000},
    ]


@pytest.fixture
def mock_signals() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    return [
        {
            "symbol": "PETR4",
            "signal_type": "BUY",
            "confidence": 0.8,
            "price": 37.5,
            "timestamp": now.isoformat(),
            "source": "TEST",
            "metadata": {},
        },
        {
            "symbol": "VALE3",
            "signal_type": "SELL",
            "confidence": 0.4,
            "price": 62.3,
            "timestamp": now.isoformat(),
            "source": "TEST",
            "metadata": {},
        },
    ]


@pytest.fixture
def mock_risk_assessment() -> Dict[str, Any]:
    return {
        "signal_id": "PETR4-123",
        "risk_level": "LOW",
        "approved": True,
        "daily_loss_check": True,
        "position_size_check": True,
        "trading_hours_check": True,
        "reasons": ["All checks passed"],
        "timestamp": datetime.now(timezone.utc),
    }
