import logging
import time
from contextlib import contextmanager
from typing import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram
from prometheus_client import generate_latest

from .config import settings

logger = logging.getLogger("agno-agents.monitoring")

AGENT_DECISIONS_TOTAL = Counter(
    "agent_decisions_total",
    "Total agent decisions",
    ["agent_name", "decision_type"],
)
AGENT_PROCESSING_TIME = Histogram(
    "agent_processing_seconds",
    "Agent processing time",
    ["agent_name"],
)
AGENT_ERRORS_TOTAL = Counter(
    "agent_errors_total",
    "Total agent errors",
    ["agent_name", "error_type"],
)
API_REQUESTS_TOTAL = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)
API_REQUEST_DURATION = Histogram(
    "api_request_duration_seconds",
    "API request duration",
    ["method", "endpoint"],
)
DEPENDENCY_STATUS = Gauge(
    "dependency_status",
    "Dependency health status (1=healthy, 0=unhealthy)",
    ["dependency"],
)

_metrics_initialized = False

resource = Resource(attributes={"service.name": "agno-agents"})
provider = TracerProvider(resource=resource)
if settings.enable_tracing:
    provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
else:
    logger.info("OpenTelemetry console exporter disabled; AGNO_ENABLE_TRACING=false")
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("agno-agents")


def init_metrics(app: FastAPI) -> None:
    global _metrics_initialized

    if _metrics_initialized or not settings.enable_metrics:
        if not settings.enable_metrics and not _metrics_initialized:
            logger.info("Metrics disabled for Agno Agents service")
            _metrics_initialized = True
        return

    logger.info("Initializing metrics middleware and /metrics endpoint")

    @app.middleware("http")
    async def metrics_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        if request.url.path == "/metrics":
            return response
        duration = time.perf_counter() - start_time
        endpoint = request.url.path
        method = request.method
        status_code = response.status_code

        API_REQUESTS_TOTAL.labels(method=method, endpoint=endpoint, status=status_code).inc()
        API_REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
        return response

    @app.get("/metrics")
    async def metrics_endpoint() -> PlainTextResponse:
        return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    FastAPIInstrumentor.instrument_app(app)
    _metrics_initialized = True


@contextmanager
def track_agent_execution(agent_name: str):
    start_time = time.perf_counter()
    with tracer.start_as_current_span(f"{agent_name}.execution"):
        try:
            yield
        except Exception as exc:
            error_type = exc.__class__.__name__
            AGENT_ERRORS_TOTAL.labels(agent_name=agent_name, error_type=error_type).inc()
            logger.exception("Error during agent execution for %s", agent_name)
            raise
        else:
            duration = time.perf_counter() - start_time
            AGENT_PROCESSING_TIME.labels(agent_name=agent_name).observe(duration)


def track_decision(agent_name: str, decision_type: str) -> None:
    AGENT_DECISIONS_TOTAL.labels(agent_name=agent_name, decision_type=decision_type).inc()


def track_error(agent_name: str, error_type: str) -> None:
    AGENT_ERRORS_TOTAL.labels(agent_name=agent_name, error_type=error_type).inc()


def set_dependency_status(dependency: str, healthy: bool) -> None:
    value = 1 if healthy else 0
    DEPENDENCY_STATUS.labels(dependency=dependency).set(value)
    logger.info(
        "Dependency status updated",
        extra={
            "dependency": dependency,
            "status": "healthy" if healthy else "unhealthy",
            "metric_value": value,
        },
    )
