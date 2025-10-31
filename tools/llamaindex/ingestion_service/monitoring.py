"""
Monitoring configuration for the LlamaIndex services.
Implements metrics collection and OpenTelemetry tracing.
"""

import time
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
INGEST_TIME = Histogram(
    'document_ingestion_seconds',
    'Time spent processing documents',
    ['document_type']
)

DOCUMENTS_INGESTED = Counter(
    'documents_ingested_total',
    'Total number of documents ingested',
    ['document_type', 'status']
)

EMBEDDING_TIME = Histogram(
    'embedding_generation_seconds',
    'Time spent generating embeddings',
    ['model']
)

STORAGE_OPERATIONS = Counter(
    'storage_operations_total',
    'Total number of vector storage operations',
    ['operation_type', 'status']
)

def init_metrics(app, port=9090):
    """Initialize metrics server and FastAPI instrumentation."""
    start_http_server(port)
    FastAPIInstrumentor.instrument_app(app)

def track_time(metric, labels=None):
    """Decorator to track time spent in a function."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            label_kwargs = dict(labels or {})
            if not label_kwargs:
                label_names = getattr(metric, "_labelnames", ())
                if label_names:
                    label_kwargs = {name: "default" for name in label_names}
            try:
                result = await func(*args, **kwargs)
                if label_kwargs:
                    metric.labels(**label_kwargs).observe(time.time() - start_time)
                else:
                    metric.observe(time.time() - start_time)
                return result
            except Exception as e:
                if label_kwargs:
                    metric.labels(**label_kwargs).observe(time.time() - start_time)
                else:
                    metric.observe(time.time() - start_time)
                raise e
        return wrapper
    return decorator

def increment_counter(counter, labels):
    """Helper to increment a counter with labels."""
    counter.labels(**labels).inc()

def record_storage_operation(operation_type, status="success"):
    """Record a storage operation metric."""
    STORAGE_OPERATIONS.labels(
        operation_type=operation_type,
        status=status
    ).inc()

def record_document_ingested(doc_type, status="success"):
    """Record a document ingestion metric."""
    DOCUMENTS_INGESTED.labels(
        document_type=doc_type,
        status=status
    ).inc()

def record_embedding_time(duration, model="ada-002"):
    """Record embedding generation time."""
    EMBEDDING_TIME.labels(model=model).observe(duration)
