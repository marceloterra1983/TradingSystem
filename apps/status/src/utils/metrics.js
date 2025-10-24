/**
 * Prometheus Metrics for Service Launcher
 * Exposes observability metrics for monitoring and alerting
 */

const promClient = require('prom-client');

// Create registry
const register = new promClient.Registry();

// Add default metrics (process CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'service_launcher_',
  labels: { service: 'service-launcher-api' },
});

// Custom metrics

/**
 * Health check duration histogram
 * Tracks how long health checks take
 */
const healthCheckDuration = new promClient.Histogram({
  name: 'service_launcher_health_check_duration_seconds',
  help: 'Duration of health check requests in seconds',
  labelNames: ['service_id', 'status'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Health check counter
 * Counts total health checks performed
 */
const healthCheckTotal = new promClient.Counter({
  name: 'service_launcher_health_check_total',
  help: 'Total number of health checks performed',
  labelNames: ['service_id', 'status'],
  registers: [register],
});

/**
 * Service status gauge
 * Current status of monitored services (1=ok, 0.5=degraded, 0=down)
 */
const serviceStatusGauge = new promClient.Gauge({
  name: 'service_launcher_service_status',
  help: 'Current status of monitored service (1=ok, 0.5=degraded, 0=down)',
  labelNames: ['service_id', 'service_name'],
  registers: [register],
});

/**
 * Circuit breaker state gauge
 * State of circuit breaker for each service (1=open, 0=closed)
 */
const circuitBreakerStateGauge = new promClient.Gauge({
  name: 'service_launcher_circuit_breaker_state',
  help: 'Circuit breaker state (1=open, 0=closed)',
  labelNames: ['service_id'],
  registers: [register],
});

/**
 * Circuit breaker failure counter
 * Number of failures tracked by circuit breaker
 */
const circuitBreakerFailures = new promClient.Gauge({
  name: 'service_launcher_circuit_breaker_failures',
  help: 'Number of consecutive failures for service',
  labelNames: ['service_id'],
  registers: [register],
});

/**
 * Service launch counter
 * Counts service launches via POST /launch
 */
const serviceLaunchTotal = new promClient.Counter({
  name: 'service_launcher_launch_total',
  help: 'Total number of service launch attempts',
  labelNames: ['service_name', 'method', 'status'],
  registers: [register],
});

/**
 * Overall status gauge
 * Aggregated status of all services (1=ok, 0.5=degraded, 0=down)
 */
const overallStatusGauge = new promClient.Gauge({
  name: 'service_launcher_overall_status',
  help: 'Overall system status (1=ok, 0.5=degraded, 0=down)',
  registers: [register],
});

/**
 * Comprehensive health check duration
 */
const healthCheckFullDuration = new promClient.Histogram({
  name: 'service_launcher_health_check_full_duration_seconds',
  help: 'Duration of comprehensive health check execution',
  labelNames: ['cache_hit', 'success'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Comprehensive health check counter
 */
const healthCheckFullTotal = new promClient.Counter({
  name: 'service_launcher_health_check_full_total',
  help: 'Total number of comprehensive health check requests',
  labelNames: ['cache_hit', 'success'],
  registers: [register],
});

/**
 * Cache hit rate gauge for comprehensive health checks
 */
const healthCheckFullCacheHitRate = new promClient.Gauge({
  name: 'service_launcher_health_check_full_cache_hit_rate',
  help: 'Cache hit rate for comprehensive health checks (0-1)',
  registers: [register],
});

let cacheHitCount = 0;
let cacheMissCount = 0;

/**
 * Record health check metrics
 */
function recordHealthCheck(serviceId, status, durationSeconds) {
  healthCheckDuration.labels(serviceId, status).observe(durationSeconds);
  healthCheckTotal.labels(serviceId, status).inc();
}

/**
 * Update service status gauge
 */
function updateServiceStatus(serviceId, serviceName, status) {
  const value = status === 'ok' ? 1 : status === 'degraded' ? 0.5 : 0;
  serviceStatusGauge.labels(serviceId, serviceName).set(value);
}

/**
 * Update circuit breaker metrics
 */
function updateCircuitBreakerMetrics(serviceId, state) {
  circuitBreakerStateGauge.labels(serviceId).set(state.state === 'open' ? 1 : 0);
  circuitBreakerFailures.labels(serviceId).set(state.failures);
}

/**
 * Record service launch
 */
function recordServiceLaunch(serviceName, method, success) {
  const status = success ? 'success' : 'failure';
  serviceLaunchTotal.labels(serviceName, method, status).inc();
}

/**
 * Update overall status gauge
 */
function updateOverallStatus(status) {
  const value = status === 'ok' ? 1 : status === 'degraded' ? 0.5 : 0;
  overallStatusGauge.set(value);
}

/**
 * Record comprehensive health check metrics
 */
function recordHealthCheckFull(cacheHit, durationSeconds, success) {
  const cacheLabel = cacheHit ? 'true' : 'false';
  const successLabel = success ? 'true' : 'false';

  healthCheckFullDuration.labels(cacheLabel, successLabel).observe(durationSeconds);
  healthCheckFullTotal.labels(cacheLabel, successLabel).inc();

  if (cacheHit) {
    cacheHitCount += 1;
  } else {
    cacheMissCount += 1;
  }

  const total = cacheHitCount + cacheMissCount;
  const hitRate = total === 0 ? 0 : cacheHitCount / total;
  healthCheckFullCacheHitRate.set(hitRate);
}

/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
  return register.metrics();
}

/**
 * Get content type for metrics
 */
function getContentType() {
  return register.contentType;
}

module.exports = {
  register,
  healthCheckDuration,
  healthCheckTotal,
  serviceStatusGauge,
  circuitBreakerStateGauge,
  circuitBreakerFailures,
  serviceLaunchTotal,
  overallStatusGauge,
  healthCheckFullDuration,
  healthCheckFullTotal,
  healthCheckFullCacheHitRate,
  recordHealthCheck,
  updateServiceStatus,
  updateCircuitBreakerMetrics,
  recordServiceLaunch,
  updateOverallStatus,
  recordHealthCheckFull,
  getMetrics,
  getContentType,
};












