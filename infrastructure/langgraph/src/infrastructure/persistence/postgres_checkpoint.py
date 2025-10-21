"""
PostgreSQL Checkpoint Saver
Implements LangGraph checkpoint persistence
"""
import json
import logging
from typing import Any, Dict, Optional, Iterator, Tuple
from uuid import uuid4

import asyncpg

from ...config import settings

logger = logging.getLogger(__name__)


class PostgresCheckpointSaver:
    """
    PostgreSQL-based checkpoint saver for LangGraph
    Stores workflow state in PostgreSQL/TimescaleDB
    """
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool: Optional[asyncpg.Pool] = None
    
    async def setup(self):
        """Initialize connection pool"""
        self.pool = await asyncpg.create_pool(
            self.connection_string,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        logger.info("PostgreSQL checkpoint saver initialized")
    
    async def teardown(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("PostgreSQL checkpoint saver closed")
    
    async def aput(
        self,
        config: Dict[str, Any],
        checkpoint: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save checkpoint"""
        thread_id = config.get("configurable", {}).get("thread_id", str(uuid4()))
        checkpoint_ns = config.get("configurable", {}).get("checkpoint_ns", "")
        checkpoint_id = checkpoint.get("id", str(uuid4()))
        parent_checkpoint_id = checkpoint.get("parent_id")
        workflow_type = metadata.get("workflow_type", "generic")
        
        checkpoint_data = json.dumps(checkpoint)
        metadata_data = json.dumps(metadata)
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO langgraph_checkpoints 
                (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, 
                 type, checkpoint, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id)
                DO UPDATE SET checkpoint = $6, metadata = $7, updated_at = NOW()
                """,
                thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id,
                workflow_type, checkpoint_data, metadata_data
            )
        
        logger.debug(f"Checkpoint saved: {thread_id}/{checkpoint_id}")
        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id
            }
        }
    
    async def aget(
        self,
        config: Dict[str, Any]
    ) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
        """Retrieve checkpoint"""
        thread_id = config.get("configurable", {}).get("thread_id")
        checkpoint_ns = config.get("configurable", {}).get("checkpoint_ns", "")
        checkpoint_id = config.get("configurable", {}).get("checkpoint_id")
        
        if not thread_id:
            return None
        
        query = """
            SELECT checkpoint, metadata 
            FROM langgraph_checkpoints
            WHERE thread_id = $1 AND checkpoint_ns = $2
        """
        params = [thread_id, checkpoint_ns]
        
        if checkpoint_id:
            query += " AND checkpoint_id = $3"
            params.append(checkpoint_id)
        else:
            query += " ORDER BY created_at DESC LIMIT 1"
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, *params)
        
        if not row:
            return None
        
        checkpoint = json.loads(row["checkpoint"])
        metadata = json.loads(row["metadata"])
        
        return checkpoint, metadata
    
    async def alist(
        self,
        config: Dict[str, Any],
        limit: int = 10
    ) -> list:
        """List checkpoints for a thread"""
        thread_id = config.get("configurable", {}).get("thread_id")
        checkpoint_ns = config.get("configurable", {}).get("checkpoint_ns", "")
        
        if not thread_id:
            return []
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT checkpoint, metadata 
                FROM langgraph_checkpoints
                WHERE thread_id = $1 AND checkpoint_ns = $2
                ORDER BY created_at DESC
                LIMIT $3
                """,
                thread_id, checkpoint_ns, limit
            )
        
        return [
            (json.loads(row["checkpoint"]), json.loads(row["metadata"]))
            for row in rows
        ]

