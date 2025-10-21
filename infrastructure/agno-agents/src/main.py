import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Optional

import httpx
from aiobreaker import CircuitBreakerError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .infrastructure.adapters import B3WebSocketConsumer
from .interfaces.agents import market_analysis as market_analysis_module
from .interfaces.agents import risk_management as risk_management_module
from .interfaces.agents.market_analysis import (
    initialize_clients as initialize_market_clients,
    shutdown_clients as shutdown_market_clients,
)
from .interfaces.agents.risk_management import (
    initialize_client as initialize_risk_client,
    shutdown_client as shutdown_risk_client,
)
from .interfaces.routes import router as agents_router
from .logging_utils import configure_structured_logging
from .monitoring import init_metrics, set_dependency_status

configure_structured_logging(settings.agno_log_level)

logger = logging.LoggerAdapter(logging.getLogger("agno-agents"), {"service": "agno-agents"})

b3_consumer: Optional[B3WebSocketConsumer] = None
_cached_health_snapshot: Dict[str, Any] = {
    "status": "unknown",
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "dependencies": {},
    "agents": {
        "market_analysis": "initializing",
        "risk_management": "initializing",
        "signal_orchestrator": "initializing",
    },
}


async def handle_b3_message(message: Dict[str, Any]) -> None:
    logger.debug(
        "Received B3 WebSocket message",
        extra={"symbol": message.get("symbol"), "price": message.get("price")},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global b3_consumer

    logger.info("Initializing Agno Agents dependencies")
    await initialize_market_clients()
    await initialize_risk_client()
    if settings.enable_b3_websocket:
        b3_consumer = B3WebSocketConsumer(callback=handle_b3_message)
        await b3_consumer.start()

    try:
        yield
    finally:
        logger.info("Shutting down Agno Agents dependencies")
        if settings.enable_b3_websocket and b3_consumer:
            await b3_consumer.stop()
            b3_consumer = None
        await shutdown_market_clients()
        await shutdown_risk_client()


app = FastAPI(
    title="Agno Agents Service",
    description="Multi-agent trading system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_metrics(app)
app.include_router(agents_router)


@app.get("/", response_class=JSONResponse)
async def root() -> Dict[str, Any]:
    return {
        "service": "agno-agents",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health", response_class=JSONResponse)
async def health(detailed: bool = False) -> Dict[str, Any]:
    global _cached_health_snapshot
    timeout_seconds = getattr(settings, "health_check_timeout", 5)

    async def _check_dependency(
        name: str,
        client: Any,
        action: Callable[[Any], Awaitable[Any]],
    ) -> Dict[str, Any]:
        if client is None:
            logger.warning(
                "Dependency client not initialized",
                extra={"dependency": name},
            )
            set_dependency_status(name, False)
            return {"status": "unavailable", "latency_ms": None, "healthy": False}

        start_time = time.perf_counter()
        try:
            await asyncio.wait_for(action(client), timeout=timeout_seconds)
        except (asyncio.TimeoutError, httpx.HTTPError, CircuitBreakerError) as exc:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                "Dependency health check failed",
                extra={"dependency": name, "error": exc.__class__.__name__},
            )
            set_dependency_status(name, False)
            return {"status": "error", "latency_ms": latency_ms, "healthy": False}
        except Exception as exc:  # noqa: BLE001
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                "Unexpected dependency failure",
                extra={"dependency": name},
            )
            set_dependency_status(name, False)
            return {"status": "error", "latency_ms": latency_ms, "healthy": False}

        latency_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(
            "Dependency health check succeeded",
            extra={"dependency": name, "latency_ms": latency_ms},
        )
        set_dependency_status(name, True)
        return {"status": "ok", "latency_ms": latency_ms, "healthy": True}

    if detailed:
        current_workspace_client = getattr(market_analysis_module, "workspace_client", None)
        current_tp_capital_client = getattr(market_analysis_module, "tp_capital_client", None)
        current_b3_client = getattr(market_analysis_module, "b3_client", None)
        current_risk_engine_client = getattr(risk_management_module, "risk_engine_client", None)

        dependency_specs = [
            ("workspace_api", current_workspace_client, lambda client: client.ping()),
            (
                "tp_capital_api",
                current_tp_capital_client,
                lambda client: client.ping(),
            ),
            ("b3_api", current_b3_client, lambda client: client.ping()),
        ]

        dependency_results = await asyncio.gather(
            *[
                _check_dependency(name, client, action)
                for name, client, action in dependency_specs
            ]
        )
        dependencies = {
            name: result
            for (name, _, _), result in zip(dependency_specs, dependency_results, strict=False)
        }

        healthy_dependencies = [info for info in dependencies.values() if info["healthy"]]
        unhealthy_dependencies = [info for info in dependencies.values() if not info["healthy"]]

        if not unhealthy_dependencies:
            overall_status = "healthy"
        elif not healthy_dependencies:
            overall_status = "unhealthy"
        else:
            overall_status = "degraded"

        timestamp = datetime.now(timezone.utc).isoformat()
        response: Dict[str, Any] = {
            "status": overall_status,
            "service": "agno-agents",
            "timestamp": timestamp,
        }

        response["dependencies"] = {
            name: {
                "status": info["status"],
                "latency_ms": info["latency_ms"],
            }
            for name, info in dependencies.items()
        }
        agents_snapshot = {
            "market_analysis": "ready"
            if all(
                client is not None
                for client in (current_workspace_client, current_tp_capital_client, current_b3_client)
            )
            else "initializing",
            "risk_management": "ready" if current_risk_engine_client is not None else "initializing",
            "signal_orchestrator": "ready",
        }
        response["agents"] = {
            **agents_snapshot,
        }

        _cached_health_snapshot = {
            "status": response["status"],
            "timestamp": response["timestamp"],
            "dependencies": response["dependencies"],
            "agents": agents_snapshot,
        }

        return response

    cached_timestamp = _cached_health_snapshot.get("timestamp") or datetime.now(timezone.utc).isoformat()
    return {
        "status": _cached_health_snapshot.get("status", "unknown"),
        "service": "agno-agents",
        "timestamp": cached_timestamp,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("AGNO_PORT", settings.agno_port))
    logger.info("Starting Agno Agents service on port %s", port)
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=False)
