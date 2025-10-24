"""
Domain Models - LangGraph Service
Value objects and entities for workflow execution
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class WorkflowType(str, Enum):
    """Workflow type enum"""
    TRADING = "trading"
    DOCS = "docs"
    GENERIC = "generic"


class WorkflowStatus(str, Enum):
    """Workflow execution status"""
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NodeEventType(str, Enum):
    """Node event types for telemetry"""
    NODE_ENTER = "node_enter"
    NODE_EXIT = "node_exit"
    ERROR = "error"
    DECISION = "decision"
    AGENT_CALL = "agent_call"


class TradingWorkflowInput(BaseModel):
    """Input for trading workflow execution"""
    symbol: str = Field(..., description="Trading symbol (e.g., WINZ25)")
    signal_id: Optional[str] = Field(None, description="Source signal ID (e.g., tg:123)")
    mode: str = Field("paper", description="Execution mode: paper|live")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocsWorkflowInput(BaseModel):
    """Input for documentation workflow execution"""
    doc_id: Optional[str] = Field(None, description="Document ID from DocsAPI")
    url: Optional[str] = Field(None, description="URL to review/enrich")
    markdown: Optional[str] = Field(None, description="Raw markdown content")
    operation: str = Field(..., description="Operation: review|enrich")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowRun(BaseModel):
    """Workflow execution tracking"""
    run_id: UUID = Field(default_factory=uuid4)
    workflow_type: WorkflowType
    workflow_name: str
    thread_id: str
    status: WorkflowStatus = WorkflowStatus.RUNNING
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    tags: Dict[str, Any] = Field(default_factory=dict)
    idempotency_key: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NodeEvent(BaseModel):
    """Telemetry event for node execution"""
    event_id: UUID = Field(default_factory=uuid4)
    run_id: UUID
    thread_id: str
    workflow_type: WorkflowType
    workflow_name: str
    node_name: str
    event_type: NodeEventType
    status: str
    duration_ms: Optional[float] = None
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    parent_span_id: Optional[str] = None
    tags: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TradingSignal(BaseModel):
    """Trading signal output"""
    symbol: str
    action: str  # BUY | SELL | HOLD
    confidence: float = Field(..., ge=0.0, le=1.0)
    size: Optional[int] = None
    price: Optional[float] = None
    reason: Optional[str] = None
    risk_approved: bool = False
    execution_status: Optional[str] = None


class DocsReviewResult(BaseModel):
    """Documentation review output"""
    doc_id: Optional[str] = None
    url: Optional[str] = None
    issues_found: int = 0
    suggestions: list[str] = Field(default_factory=list)
    enrichment_data: Optional[Dict[str, Any]] = None
    updated_content: Optional[str] = None
    status: str = "completed"

