"""
Monitoring module for the query service.
Implements metrics collection and tracing.
"""

import time
import contextlib
from functools import wraps
from prometheus_client import Counter, Histogram, start_http_server
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Initialize tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Configure span processor
span_processor = BatchSpanProcessor(ConsoleSpanExporter())
trace.get_tracer_provider().add_span_processor(span_processor)

# Define metrics
QUERY_TIME = Histogram(
    'query_processing_seconds',
    'Time spent processing queries',
    ['query_type']
)

QUERIES_TOTAL = Counter(
    'queries_total',
    'Total number of queries processed',
    ['query_type', 'status']
)

CACHE_OPERATIONS = Counter(
    'cache_operations_total',
    'Total number of cache operations',
    ['operation', 'status']
)

RATE_LIMITS = Counter(
    'rate_limits_total',
    'Total number of rate limit events',
    ['status']
)

def init_metrics(app, port=9091):
    """Initialize metrics server and FastAPI instrumentation."""
    start_http_server(port)
    FastAPIInstrumentor.instrument_app(app)

@contextlib.contextmanager
def track_query_metrics(query_type="semantic"):
    """Context manager to track query processing time and status."""
    start_time = time.time()
    try:
        yield
        QUERIES_TOTAL.labels(
            query_type=query_type,
            status="success"
        ).inc()
        QUERY_TIME.labels(
            query_type=query_type
        ).observe(time.time() - start_time)
    except Exception as e:
        QUERIES_TOTAL.labels(
            query_type=query_type,
            status="error"
        ).inc()
        raise e

def track_cache_operation(operation: str, status: str = "success"):
    """Record a cache operation metric."""
    CACHE_OPERATIONS.labels(
        operation=operation,
        status=status
    ).inc()

def track_rate_limit(status: str = "allowed"):
    """Record a rate limit metric."""
    RATE_LIMITS.labels(status=status).inc()

def trace_request(name: str):
    """Decorator to add tracing to requests."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            with tracer.start_as_current_span(name) as span:
                try:
                    result = await func(*args, **kwargs)
                    span.set_attribute("status", "success")
                    return result
                except Exception as e:
                    span.set_attribute("status", "error")
                    span.set_attribute("error.message", str(e))
                    raise
        return wrapper
    return decorator