"""
Prometheus Metrics for LangGraph Service
Custom metrics for workflow execution monitoring
"""
from prometheus_client import Counter, Histogram, Gauge, Info

# Workflow execution metrics
workflow_executions_total = Counter(
    'langgraph_workflow_executions_total',
    'Total number of workflow executions',
    ['workflow_type', 'workflow_name', 'status']
)

workflow_duration_seconds = Histogram(
    'langgraph_workflow_duration_seconds',
    'Workflow execution duration in seconds',
    ['workflow_type', 'workflow_name'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0]
)

workflow_errors_total = Counter(
    'langgraph_workflow_errors_total',
    'Total number of workflow errors',
    ['workflow_type', 'workflow_name', 'error_type']
)

# Node execution metrics
node_executions_total = Counter(
    'langgraph_node_executions_total',
    'Total number of node executions',
    ['workflow_type', 'node_name', 'status']
)

node_duration_seconds = Histogram(
    'langgraph_node_duration_seconds',
    'Node execution duration in seconds',
    ['workflow_type', 'node_name'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

# Dependency health metrics
dependency_status = Gauge(
    'langgraph_dependency_status',
    'Dependency health status (1=healthy, 0=unhealthy)',
    ['dependency']
)

dependency_latency_seconds = Histogram(
    'langgraph_dependency_latency_seconds',
    'Dependency response latency in seconds',
    ['dependency'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
)

# Active workflows gauge
active_workflows = Gauge(
    'langgraph_active_workflows',
    'Number of currently executing workflows',
    ['workflow_type']
)

# Service info
service_info = Info(
    'langgraph_service',
    'LangGraph service information'
)

# Checkpoint metrics
checkpoints_saved_total = Counter(
    'langgraph_checkpoints_saved_total',
    'Total number of checkpoints saved',
    ['workflow_type']
)

checkpoints_loaded_total = Counter(
    'langgraph_checkpoints_loaded_total',
    'Total number of checkpoints loaded',
    ['workflow_type']
)

# QuestDB logging metrics
events_logged_total = Counter(
    'langgraph_events_logged_total',
    'Total number of events logged to QuestDB',
    ['event_type']
)

events_log_errors_total = Counter(
    'langgraph_events_log_errors_total',
    'Total number of QuestDB logging errors'
)


def set_service_info(version: str, environment: str):
    """Set service information"""
    service_info.info({
        'version': version,
        'environment': environment
    })


def track_workflow_execution(workflow_type: str, workflow_name: str, status: str):
    """Track workflow execution"""
    workflow_executions_total.labels(
        workflow_type=workflow_type,
        workflow_name=workflow_name,
        status=status
    ).inc()


def track_workflow_duration(workflow_type: str, workflow_name: str, duration: float):
    """Track workflow duration"""
    workflow_duration_seconds.labels(
        workflow_type=workflow_type,
        workflow_name=workflow_name
    ).observe(duration)


def track_workflow_error(workflow_type: str, workflow_name: str, error_type: str):
    """Track workflow error"""
    workflow_errors_total.labels(
        workflow_type=workflow_type,
        workflow_name=workflow_name,
        error_type=error_type
    ).inc()


def track_node_execution(workflow_type: str, node_name: str, status: str):
    """Track node execution"""
    node_executions_total.labels(
        workflow_type=workflow_type,
        node_name=node_name,
        status=status
    ).inc()


def track_node_duration(workflow_type: str, node_name: str, duration: float):
    """Track node duration"""
    node_duration_seconds.labels(
        workflow_type=workflow_type,
        node_name=node_name
    ).observe(duration)


def set_dependency_health(dependency: str, is_healthy: bool):
    """Set dependency health status"""
    dependency_status.labels(dependency=dependency).set(1 if is_healthy else 0)


def track_dependency_latency(dependency: str, latency: float):
    """Track dependency latency"""
    dependency_latency_seconds.labels(dependency=dependency).observe(latency)


def increment_active_workflows(workflow_type: str):
    """Increment active workflows"""
    active_workflows.labels(workflow_type=workflow_type).inc()


def decrement_active_workflows(workflow_type: str):
    """Decrement active workflows"""
    active_workflows.labels(workflow_type=workflow_type).dec()

