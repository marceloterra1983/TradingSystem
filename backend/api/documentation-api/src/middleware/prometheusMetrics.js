/**
 * Prometheus Metrics Middleware
 * Exports circuit breaker and RAG service metrics
 */

const client = require('prom-client');

// Create registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc)
client.collectDefaultMetrics({ register });

// ============================================================================
// Circuit Breaker Metrics
// ============================================================================

// Circuit breaker state (0 = closed, 1 = open, 2 = half-open)
const circuitBreakerStateGauge = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['breaker_name', 'service'],
  registers: [register],
});

// Circuit breaker failures
const circuitBreakerFailuresCounter = new client.Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['breaker_name', 'service'],
  registers: [register],
});

// Circuit breaker successes
const circuitBreakerSuccessesCounter = new client.Counter({
  name: 'circuit_breaker_successes_total',
  help: 'Total number of successful circuit breaker calls',
  labelNames: ['breaker_name', 'service'],
  registers: [register],
});

// ============================================================================
// RAG Query Metrics
// ============================================================================

// RAG query duration histogram
const ragQueryDuration = new client.Histogram({
  name: 'rag_query_duration_seconds',
  help: 'RAG query duration in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// RAG query counter
const ragQueryCounter = new client.Counter({
  name: 'rag_query_total',
  help: 'Total number of RAG queries',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});

// RAG cache hits
const ragCacheHitsCounter = new client.Counter({
  name: 'rag_cache_hits_total',
  help: 'Total number of RAG cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update circuit breaker state metrics from circuit breaker instance
 * @param {string} name - Breaker name
 * @param {object} breaker - Circuit breaker instance (opossum)
 */
function updateCircuitBreakerMetrics(name, breaker) {
  const service = 'rag-service';
  
  // Map breaker state to numeric value
  const stateMap = {
    'CLOSED': 0,
    'OPEN': 1,
    'HALF_OPEN': 2,
  };
  
  const state = breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED');
  const stateValue = stateMap[state] || 0;
  
  // Update gauge
  circuitBreakerStateGauge.set({ breaker_name: name, service }, stateValue);
  
  // Update counters from breaker stats
  const stats = breaker.stats;
  if (stats) {
    circuitBreakerFailuresCounter.inc({ breaker_name: name, service }, stats.failures || 0);
    circuitBreakerSuccessesCounter.inc({ breaker_name: name, service }, stats.successes || 0);
  }
}

/**
 * Track RAG query metrics
 * @param {string} endpoint - Endpoint name
 * @param {number} duration - Query duration in seconds
 * @param {string} status - success|failure
 */
function trackRagQuery(endpoint, duration, status = 'success') {
  ragQueryDuration.observe({ endpoint, status }, duration);
  ragQueryCounter.inc({ endpoint, status });
}

/**
 * Track cache hit
 * @param {string} cacheType - redis|memory|qdrant
 */
function trackCacheHit(cacheType) {
  ragCacheHitsCounter.inc({ cache_type: cacheType });
}

/**
 * Middleware to expose /metrics endpoint
 */
function metricsMiddleware(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

/**
 * Middleware to track HTTP request metrics
 */
function httpMetricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const endpoint = req.path;
    const status = res.statusCode < 400 ? 'success' : 'failure';
    
    if (endpoint.startsWith('/api/v1/rag')) {
      trackRagQuery(endpoint, duration, status);
    }
  });
  
  next();
}

module.exports = {
  register,
  metricsMiddleware,
  httpMetricsMiddleware,
  updateCircuitBreakerMetrics,
  trackRagQuery,
  trackCacheHit,
  
  // Export individual metrics for external use
  metrics: {
    circuitBreakerState: circuitBreakerStateGauge,
    circuitBreakerFailures: circuitBreakerFailuresCounter,
    circuitBreakerSuccesses: circuitBreakerSuccessesCounter,
    ragQueryDuration,
    ragQueryCounter,
    ragCacheHits: ragCacheHitsCounter,
  },
};

