"""
Trading Workflow - LangGraph Implementation
Deterministic state machine: Market Analysis → Risk Validation → Execution
"""
import logging
import os
from typing import Any, Dict, TypedDict
from uuid import uuid4

from langgraph.graph import StateGraph, END

# LangSmith tracing (optional)
try:
    from langsmith import traceable
except ImportError:
    # Graceful fallback if langsmith not installed
    def traceable(*dargs, **dkwargs):
        def _decorator(func):
            return func
        return _decorator

from ...domain.models import TradingSignal, WorkflowType
from ...infrastructure.adapters.agno_client import agno_client

logger = logging.getLogger(__name__)


class TradingState(TypedDict):
    """Trading workflow state"""
    symbol: str
    signal_id: str
    mode: str  # paper | live
    market_analysis: Dict[str, Any]
    risk_validation: Dict[str, Any]
    execution_result: Dict[str, Any]
    error: str
    current_step: str


@traceable(name="trading.analyze_market", run_type="llm")
async def analyze_market_node(state: TradingState) -> TradingState:
    """
    Node 1: Market Analysis
    Calls Agno MarketAnalysisAgent
    """
    logger.info(f"[TRADING] Analyzing market for {state['symbol']}")
    
    try:
        result = await agno_client.analyze_market([state["symbol"]])
        
        state["market_analysis"] = result
        state["current_step"] = "market_analysis_complete"
        
        logger.info(f"[TRADING] Market analysis complete: {result.get('signals', [])}")
        
    except Exception as e:
        logger.error(f"[TRADING] Market analysis failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


@traceable(name="trading.validate_risk", run_type="chain")
async def validate_risk_node(state: TradingState) -> TradingState:
    """
    Node 2: Risk Validation
    Calls Agno RiskManagementAgent
    """
    logger.info(f"[TRADING] Validating risk for {state['symbol']}")
    
    if state.get("error"):
        return state
    
    try:
        # Extract signal from market analysis
        signals = state["market_analysis"].get("signals", [])
        if not signals:
            state["error"] = "No signals generated"
            state["current_step"] = "failed"
            return state
        
        signal = signals[0]  # Take first signal
        
        # Validate with Agno Risk Agent
        result = await agno_client.validate_risk(signal)
        
        state["risk_validation"] = result
        state["current_step"] = "risk_validation_complete"
        
        logger.info(f"[TRADING] Risk validation: {result.get('approved', False)}")
        
    except Exception as e:
        logger.error(f"[TRADING] Risk validation failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


@traceable(name="trading.execute_trade", run_type="tool")
async def execute_trade_node(state: TradingState) -> TradingState:
    """
    Node 3: Trade Execution
    Executes signal via Agno (mock in paper mode)
    """
    logger.info(f"[TRADING] Executing trade for {state['symbol']} (mode: {state['mode']})")
    
    if state.get("error"):
        return state
    
    try:
        # Check risk approval
        if not state["risk_validation"].get("approved", False):
            state["error"] = "Risk validation failed"
            state["current_step"] = "rejected"
            return state
        
        # Execute via Agno
        signal = state["market_analysis"]["signals"][0]
        result = await agno_client.execute_signal(signal, mode=state["mode"])
        
        state["execution_result"] = result
        state["current_step"] = "execution_complete"
        
        logger.info(f"[TRADING] Execution complete: {result.get('status')}")
        
    except Exception as e:
        logger.error(f"[TRADING] Execution failed: {e}")
        state["error"] = str(e)
        state["current_step"] = "failed"
    
    return state


def should_proceed_to_risk(state: TradingState) -> str:
    """Decision: proceed to risk validation or fail?"""
    if state.get("error"):
        return "end"
    if not state.get("market_analysis"):
        return "end"
    return "validate_risk"


def should_proceed_to_execution(state: TradingState) -> str:
    """Decision: proceed to execution or fail?"""
    if state.get("error"):
        return "end"
    if not state.get("risk_validation", {}).get("approved"):
        return "end"
    return "execute_trade"


def create_trading_workflow(checkpointer=None):
    """
    Create trading workflow graph

    Flow:
    START → Analyze Market → Validate Risk → Execute Trade → END
    """
    workflow = StateGraph(TradingState)

    # Add nodes
    workflow.add_node("analyze_market", analyze_market_node)
    workflow.add_node("validate_risk", validate_risk_node)
    workflow.add_node("execute_trade", execute_trade_node)

    # Define edges
    workflow.set_entry_point("analyze_market")

    workflow.add_conditional_edges(
        "analyze_market",
        should_proceed_to_risk,
        {
            "validate_risk": "validate_risk",
            "end": END
        }
    )

    workflow.add_conditional_edges(
        "validate_risk",
        should_proceed_to_execution,
        {
            "execute_trade": "execute_trade",
            "end": END
        }
    )

    workflow.add_edge("execute_trade", END)

    # Compile (checkpointer support for future)
    return workflow.compile()


# Module-level export for LangGraph CLI
# Only create graph when LANGGRAPH_CLI_EXPORT environment variable is set
# FastAPI server uses create_trading_workflow() function directly
if os.getenv("LANGGRAPH_CLI_EXPORT") == "1":
    trading_graph = create_trading_workflow()