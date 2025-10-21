"""
LangGraph Service - Main Entry Point
Multi-agent workflow orchestration with PostgreSQL checkpoints and QuestDB telemetry

Architecture:
- Trading Workflows: Market → Risk → Execution
- Docs Workflows: Fetch → Review/Enrich → Save
- State Persistence: PostgreSQL/TimescaleDB
- Event Logging: QuestDB
- Agent Integration: HTTP → Agno Agents
"""
import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

# LangSmith tracing (optional)
try:
    from langsmith import Client as LangSmithClient
except ImportError:
    LangSmithClient = None

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.config import settings

# Initialize LangSmith tracing environment variables before importing workflows
# This ensures @traceable decorators have access to tracing configuration
if settings.langsmith_tracing_enabled and settings.langsmith_api_key:
    try:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langsmith_endpoint
        print(f"✅ LangSmith tracing environment configured (project: {settings.langsmith_project})")
    except Exception as e:
        print(f"⚠️ LangSmith tracing environment setup failed: {e}")
        print("Service will continue without tracing")
else:
    print("ℹ️ LangSmith tracing disabled (set LANGSMITH_TRACING=true and LANGSMITH_API_KEY to enable)")
from src.interfaces.api import routes
from src.interfaces.workflows.trading_workflow import create_trading_workflow
from src.interfaces.workflows.docs_workflow import create_docs_workflow
from src.infrastructure.persistence.questdb_logger import questdb_logger
from src.infrastructure.adapters.agno_client import agno_client
from src.infrastructure.adapters.docs_client import docs_client
from src.infrastructure.adapters.firecrawl_client import firecrawl_client
from src.monitoring.metrics import set_service_info, set_dependency_health

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.langgraph_log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    
    logger.info("🚀 Starting LangGraph Service...")
    
    try:
        # Initialize QuestDB logger
        await questdb_logger.setup()
        logger.info("✅ QuestDB event logger initialized")
        
        # Initialize HTTP clients
        await agno_client.setup()
        await docs_client.setup()
        await firecrawl_client.setup()
        logger.info("✅ HTTP clients initialized")

        # LangSmith tracing environment already configured at startup
        if settings.langsmith_tracing_enabled and settings.langsmith_api_key:
            logger.info(f"✅ LangSmith tracing active (project: {settings.langsmith_project})")
        
        # Create workflow instances (without checkpointer for now - MVP)
        routes.trading_workflow = create_trading_workflow()
        routes.docs_workflow = create_docs_workflow()
        logger.info("✅ Workflows compiled")
        
        # Initialize metrics
        set_service_info(version="2.0.0", environment=settings.langgraph_env)
        logger.info("✅ Metrics initialized")
        
        logger.info("✅ LangGraph Service ready")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    finally:
        # Cleanup
        logger.info("🛑 Shutting down LangGraph Service...")
        
        await firecrawl_client.teardown()
        await docs_client.teardown()
        await agno_client.teardown()
        await questdb_logger.teardown()
        
        logger.info("✅ Shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title="LangGraph Service",
    description="Multi-agent workflow orchestration with state persistence",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(routes.router)

# Prometheus metrics endpoint
if settings.enable_metrics:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


@app.get("/")
async def root():
    """Root endpoint - service info"""
    return {
        "service": "LangGraph",
        "version": "2.0.0",
        "status": "running",
        "features": {
            "trading_workflows": settings.enable_trading_workflows,
            "docs_workflows": settings.enable_docs_workflows,
            "webhooks": settings.enable_webhooks,
            "metrics": settings.enable_metrics,
            "tracing": settings.langsmith_tracing_enabled
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check critical dependencies
        agno_healthy = await agno_client.health_check()
        docs_healthy = await docs_client.health_check()
        firecrawl_healthy = await firecrawl_client.health_check()
        
        # Update dependency metrics
        set_dependency_health("agno_agents", agno_healthy)
        set_dependency_health("docs_api", docs_healthy)
        set_dependency_health("firecrawl", firecrawl_healthy)
        set_dependency_health("postgres", True)  # Simplified for MVP
        set_dependency_health("questdb", True)   # Simplified for MVP
        
        # Determine overall status
        critical_healthy = agno_healthy
        overall_status = "healthy" if critical_healthy else "degraded"
        
        return JSONResponse(
            status_code=200,
            content={
                "status": overall_status,
                "service": "langgraph",
                "version": "2.0.0",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "dependencies": {
                    "agno_agents": "healthy" if agno_healthy else "unhealthy",
                    "docs_api": "healthy" if docs_healthy else "unhealthy",
                    "firecrawl": "healthy" if firecrawl_healthy else "unhealthy",
                    "postgres": "healthy",
                    "questdb": "healthy"
                }
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "langgraph",
                "error": str(e)
            }
        )


if __name__ == "__main__":
    port = settings.langgraph_port
    reload = settings.langgraph_env == "development"
    
    logger.info(f"🌐 Starting server on port {port} (env: {settings.langgraph_env})")
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level=settings.langgraph_log_level.lower()
    )



