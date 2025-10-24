"""
QuestDB Event Logger
High-performance logging for workflow events and metrics
"""
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

import httpx

from ...config import settings
from ...domain.models import NodeEvent, WorkflowType

logger = logging.getLogger(__name__)


class QuestDBLogger:
    """
    QuestDB-based event logger for high-frequency telemetry
    Uses HTTP API for ingestion
    """
    
    def __init__(self):
        self.base_url = settings.questdb_url
        self.client: Optional[httpx.AsyncClient] = None
        self.enabled = settings.enable_metrics
    
    async def setup(self):
        """Initialize HTTP client"""
        if not self.enabled:
            logger.info("QuestDB logging disabled")
            return
        
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(5.0),
            limits=httpx.Limits(max_connections=20)
        )
        logger.info("QuestDB logger initialized")
    
    async def teardown(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
            logger.info("QuestDB logger closed")
    
    async def log_event(self, event: NodeEvent):
        """Log workflow node event"""
        if not self.enabled or not self.client:
            return
        
        try:
            # Convert to QuestDB ILP (InfluxDB Line Protocol)
            line = self._event_to_ilp(event)
            
            await self.client.post(
                f"{self.base_url}/exec",
                params={"query": f"INSERT INTO langgraph_events VALUES({line})"}
            )
            
        except Exception as e:
            logger.error(f"Failed to log event to QuestDB: {e}")
    
    def _event_to_ilp(self, event: NodeEvent) -> str:
        """Convert event to InfluxDB Line Protocol format"""
        # Escape strings and format data
        timestamp = event.timestamp.isoformat()
        input_str = json.dumps(event.input_data) if event.input_data else ""
        output_str = json.dumps(event.output_data) if event.output_data else ""
        error_str = event.error_message or ""
        tags_str = json.dumps(event.tags)
        
        # Build ILP line
        return (
            f"'{timestamp}', "
            f"'{event.event_id}', "
            f"'{event.run_id}', "
            f"'{event.thread_id}', "
            f"'{event.workflow_type.value}', "
            f"'{event.workflow_name}', "
            f"'{event.node_name}', "
            f"'{event.event_type.value}', "
            f"'{event.status}', "
            f"{event.duration_ms or 0}, "
            f"'{input_str}', "
            f"'{output_str}', "
            f"'{error_str}', "
            f"'{event.trace_id or ''}', "
            f"'{event.span_id or ''}', "
            f"'{event.parent_span_id or ''}', "
            f"'{tags_str}', "
            f"'{settings.langgraph_env}', "
            f"'langgraph-{settings.langgraph_port}'"
        )
    
    async def log_workflow_start(
        self,
        run_id: UUID,
        thread_id: str,
        workflow_type: WorkflowType,
        workflow_name: str,
        tags: Dict[str, Any]
    ):
        """Log workflow start event"""
        event = NodeEvent(
            run_id=run_id,
            thread_id=thread_id,
            workflow_type=workflow_type,
            workflow_name=workflow_name,
            node_name="__start__",
            event_type="node_enter",
            status="started",
            tags=tags
        )
        await self.log_event(event)
    
    async def log_workflow_end(
        self,
        run_id: UUID,
        thread_id: str,
        workflow_type: WorkflowType,
        workflow_name: str,
        status: str,
        duration_ms: float,
        tags: Dict[str, Any]
    ):
        """Log workflow completion event"""
        event = NodeEvent(
            run_id=run_id,
            thread_id=thread_id,
            workflow_type=workflow_type,
            workflow_name=workflow_name,
            node_name="__end__",
            event_type="node_exit",
            status=status,
            duration_ms=duration_ms,
            tags=tags
        )
        await self.log_event(event)


# Global instance
questdb_logger = QuestDBLogger()

