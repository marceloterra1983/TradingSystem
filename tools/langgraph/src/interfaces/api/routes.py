"""
FastAPI Routes - LangGraph Service
HTTP endpoints for workflow execution
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field

from ...config import settings
from ...domain.models import (
    TradingWorkflowInput,
    DocsWorkflowInput,
    WorkflowRun,
    WorkflowType,
    WorkflowStatus
)
from ..workflows.trading_workflow import create_trading_workflow
from ..workflows.docs_workflow import create_docs_workflow
from ...infrastructure.persistence.questdb_logger import questdb_logger
from ...monitoring.metrics import (
    track_workflow_execution,
    track_workflow_duration,
    track_workflow_error,
    increment_active_workflows,
    decrement_active_workflows
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

# Global workflow instances (will be initialized in main.py)
trading_workflow = None
docs_workflow = None


class WorkflowExecutionResponse(BaseModel):
    """Response for workflow execution"""
    run_id: UUID
    thread_id: str
    status: str
    message: str


class WorkflowStatusResponse(BaseModel):
    """Response for workflow status check"""
    run_id: UUID
    status: str
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


@router.post("/trading/execute", response_model=WorkflowExecutionResponse)
async def execute_trading_workflow(
    payload: TradingWorkflowInput,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Execute trading workflow
    
    **Flow:** Market Analysis → Risk Validation → Execution
    
    **Modes:**
    - `paper`: Simulated execution (default)
    - `live`: Real execution (requires approval)
    """
    if not settings.enable_trading_workflows:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trading workflows are disabled"
        )
    
    try:
        run_id = uuid4()
        thread_id = f"trading-{payload.symbol}-{run_id}"
        start_time = time.time()
        
        # Increment active workflows
        increment_active_workflows("trading")
        
        # Log workflow start
        await questdb_logger.log_workflow_start(
            run_id=run_id,
            thread_id=thread_id,
            workflow_type=WorkflowType.TRADING,
            workflow_name="trading_execute",
            tags={
                "symbol": payload.symbol,
                "mode": payload.mode,
                "signal_id": payload.signal_id
            }
        )
        
        # Execute workflow
        initial_state = {
            "symbol": payload.symbol,
            "signal_id": payload.signal_id or "",
            "mode": payload.mode,
            "market_analysis": {},
            "risk_validation": {},
            "execution_result": {},
            "error": "",
            "current_step": "started"
        }
        
        config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": "trading"
            }
        }
        
        # Run workflow asynchronously
        result = await trading_workflow.ainvoke(initial_state, config)
        
        # Determine status
        final_status = "completed" if not result.get("error") else "failed"
        
        # Calculate duration
        duration_seconds = time.time() - start_time
        duration_ms = duration_seconds * 1000
        
        # Track metrics
        track_workflow_execution("trading", "trading_execute", final_status)
        track_workflow_duration("trading", "trading_execute", duration_seconds)
        
        if final_status == "failed":
            error_type = result.get("error", "unknown")[:50]
            track_workflow_error("trading", "trading_execute", error_type)
        
        # Log workflow end
        await questdb_logger.log_workflow_end(
            run_id=run_id,
            thread_id=thread_id,
            workflow_type=WorkflowType.TRADING,
            workflow_name="trading_execute",
            status=final_status,
            duration_ms=duration_ms,
            tags={"symbol": payload.symbol}
        )
        
        logger.info(f"Trading workflow completed: {run_id} - {final_status} ({duration_ms:.0f}ms)")
        
        return WorkflowExecutionResponse(
            run_id=run_id,
            thread_id=thread_id,
            status=final_status,
            message=f"Trading workflow {final_status}"
        )
        
    except Exception as e:
        logger.error(f"Trading workflow execution failed: {e}")
        track_workflow_error("trading", "trading_execute", e.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        # Decrement active workflows
        decrement_active_workflows("trading")


@router.post("/docs/review", response_model=WorkflowExecutionResponse)
async def execute_docs_review_workflow(
    payload: DocsWorkflowInput,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Execute documentation review workflow
    
    **Flow:** Fetch Document → Review → Save Results
    
    **Input:** Provide one of: `doc_id`, `url`, or `markdown`
    """
    if not settings.enable_docs_workflows:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Docs workflows are disabled"
        )
    
    try:
        run_id = uuid4()
        thread_id = f"docs-review-{run_id}"
        start_time = time.time()
        
        # Increment active workflows
        increment_active_workflows("docs")
        
        # Execute workflow
        initial_state = {
            "doc_id": payload.doc_id or "",
            "url": payload.url or "",
            "markdown": payload.markdown or "",
            "operation": "review",
            "document_content": {},
            "review_results": {},
            "enrichment_data": {},
            "error": "",
            "current_step": "started"
        }
        
        config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": "docs"
            }
        }
        
        result = await docs_workflow.ainvoke(initial_state, config)
        
        final_status = "completed" if not result.get("error") else "failed"
        
        # Calculate duration and track metrics
        duration_seconds = time.time() - start_time
        track_workflow_execution("docs", "docs_review", final_status)
        track_workflow_duration("docs", "docs_review", duration_seconds)
        
        if final_status == "failed":
            error_type = result.get("error", "unknown")[:50]
            track_workflow_error("docs", "docs_review", error_type)
        
        logger.info(f"Docs review workflow completed: {run_id} - {final_status} ({duration_seconds*1000:.0f}ms)")
        
        return WorkflowExecutionResponse(
            run_id=run_id,
            thread_id=thread_id,
            status=final_status,
            message=f"Docs review workflow {final_status}"
        )
        
    except Exception as e:
        logger.error(f"Docs review workflow execution failed: {e}")
        track_workflow_error("docs", "docs_review", e.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        # Decrement active workflows
        decrement_active_workflows("docs")


@router.post("/docs/enrich", response_model=WorkflowExecutionResponse)
async def execute_docs_enrich_workflow(
    payload: DocsWorkflowInput,
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key")
):
    """
    Execute documentation enrichment workflow
    
    **Flow:** Fetch Document → Enrich (Firecrawl) → Save Results
    
    **Input:** Provide one of: `doc_id`, `url`, or `markdown`
    """
    if not settings.enable_docs_workflows:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Docs workflows are disabled"
        )
    
    try:
        run_id = uuid4()
        thread_id = f"docs-enrich-{run_id}"
        start_time = time.time()
        
        # Increment active workflows
        increment_active_workflows("docs")
        
        # Execute workflow
        initial_state = {
            "doc_id": payload.doc_id or "",
            "url": payload.url or "",
            "markdown": payload.markdown or "",
            "operation": "enrich",
            "document_content": {},
            "review_results": {},
            "enrichment_data": {},
            "error": "",
            "current_step": "started"
        }
        
        config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": "docs"
            }
        }
        
        result = await docs_workflow.ainvoke(initial_state, config)
        
        final_status = "completed" if not result.get("error") else "failed"
        
        # Calculate duration and track metrics
        duration_seconds = time.time() - start_time
        track_workflow_execution("docs", "docs_enrich", final_status)
        track_workflow_duration("docs", "docs_enrich", duration_seconds)
        
        if final_status == "failed":
            error_type = result.get("error", "unknown")[:50]
            track_workflow_error("docs", "docs_enrich", error_type)
        
        logger.info(f"Docs enrich workflow completed: {run_id} - {final_status} ({duration_seconds*1000:.0f}ms)")
        
        return WorkflowExecutionResponse(
            run_id=run_id,
            thread_id=thread_id,
            status=final_status,
            message=f"Docs enrichment workflow {final_status}"
        )
        
    except Exception as e:
        logger.error(f"Docs enrich workflow execution failed: {e}")
        track_workflow_error("docs", "docs_enrich", e.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        # Decrement active workflows
        decrement_active_workflows("docs")


@router.get("/trading/{run_id}/status", response_model=WorkflowStatusResponse)
async def get_trading_workflow_status(run_id: UUID):
    """Get status of trading workflow execution"""
    # TODO: Implement run tracking in PostgreSQL
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Status tracking not yet implemented"
    )


@router.get("/docs/{run_id}/status", response_model=WorkflowStatusResponse)
async def get_docs_workflow_status(run_id: UUID):
    """Get status of docs workflow execution"""
    # TODO: Implement run tracking in PostgreSQL
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Status tracking not yet implemented"
    )

