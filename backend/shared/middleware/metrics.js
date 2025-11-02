/**
 * Shared Prometheus Metrics Middleware
 *
 * OPT-009: Performance Monitoring
 * - Comprehensive metrics collection for all optimizations
 * - Track OPT-001 through OPT-008 performance improvements
 * - Grafana dashboard integration
 */

import promClient from 'prom-client';

// Create registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register, prefix: 'tradingsystem_' });

// ============================================================================
// HTTP Metrics
// ============================================================================

// HTTP request counter
export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status', 'service'],
  registers: [register]
});

// HTTP request duration
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

// HTTP request size
export const httpRequestSize = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// HTTP response size
export const httpResponseSize = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// ============================================================================
// OPT-001: Compression Metrics
// ============================================================================

export const compressionRatio = new promClient.Histogram({
  name: 'opt001_compression_ratio_percent',
  help: 'Response compression ratio percentage (OPT-001)',
  labelNames: ['route', 'service'],
  buckets: [10, 20, 30, 40, 50, 60, 70, 80, 90],
  registers: [register]
});

export const compressionSavings = new promClient.Histogram({
  name: 'opt001_compression_savings_bytes',
  help: 'Bytes saved by compression (OPT-001)',
  labelNames: ['route', 'service'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register]
});

// ============================================================================
// OPT-004: Cache Metrics
// ============================================================================

export const cacheHits = new promClient.Counter({
  name: 'opt004_cache_hits_total',
  help: 'Total cache hits (OPT-004)',
  labelNames: ['cache_type', 'service'],
  registers: [register]
});

export const cacheMisses = new promClient.Counter({
  name: 'opt004_cache_misses_total',
  help: 'Total cache misses (OPT-004)',
  labelNames: ['cache_type', 'service'],
  registers: [register]
});

export const cacheLatency = new promClient.Histogram({
  name: 'opt004_cache_latency_seconds',
  help: 'Cache operation latency (OPT-004)',
  labelNames: ['operation', 'cache_type', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// ============================================================================
// OPT-005: Database Query Metrics
// ============================================================================

export const dbQueryDuration = new promClient.Histogram({
  name: 'opt005_db_query_duration_seconds',
  help: 'Database query duration (OPT-005)',
  labelNames: ['operation', 'table', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
  registers: [register]
});

export const dbQueryCacheHits = new promClient.Counter({
  name: 'opt005_db_query_cache_hits_total',
  help: 'Database query cache hits (OPT-005)',
  labelNames: ['table', 'service'],
  registers: [register]
});

// ============================================================================
// OPT-007: Semantic Cache Metrics
// ============================================================================

export const semanticCacheHits = new promClient.Counter({
  name: 'opt007_semantic_cache_hits_total',
  help: 'Semantic cache hits (OPT-007)',
  labelNames: ['service'],
  registers: [register]
});

export const semanticCacheSimilarity = new promClient.Histogram({
  name: 'opt007_semantic_cache_similarity',
  help: 'Semantic cache similarity scores (OPT-007)',
  labelNames: ['service'],
  buckets: [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.97, 0.99, 1.0],
  registers: [register]
});

// ============================================================================
// OPT-008: Streaming Metrics
// ============================================================================

export const streamingResponseTime = new promClient.Histogram({
  name: 'opt008_streaming_response_time_seconds',
  help: 'Streaming response time to first chunk (OPT-008)',
  labelNames: ['service'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1],
  registers: [register]
});

export const streamingChunksTotal = new promClient.Counter({
  name: 'opt008_streaming_chunks_total',
  help: 'Total streaming chunks sent (OPT-008)',
  labelNames: ['service'],
  registers: [register]
});

// ============================================================================
// Business Metrics
// ============================================================================

export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Active client connections',
  labelNames: ['service'],
  registers: [register]
});

export const errorRate = new promClient.Counter({
  name: 'errors_total',
  help: 'Total errors',
  labelNames: ['type', 'service'],
  registers: [register]
});

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create Prometheus metrics middleware
 *
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Service name for labels
 * @param {boolean} options.collectDefault - Collect default metrics (default: true)
 * @returns {Function} Express middleware
 */
export function createMetricsMiddleware(options = {}) {
  const { serviceName = 'api', collectDefault = true } = options;

  return (req, res, next) => {
    const start = Date.now();

    // Track request size
    const requestSize = parseInt(req.headers['content-length'] || '0');
    httpRequestSize.observe(
      { method: req.method, route: req.route?.path || req.path, service: serviceName },
      requestSize
    );

    // Increment active connections
    activeConnections.inc({ service: serviceName });

    // Track response
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;

      // HTTP metrics
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status: res.statusCode,
        service: serviceName
      });

      httpRequestDuration.observe(
        { method: req.method, route, status: res.statusCode, service: serviceName },
        duration
      );

      const responseSize = parseInt(res.getHeader('content-length') || '0');
      httpResponseSize.observe(
        { method: req.method, route, service: serviceName },
        responseSize
      );

      // Track compression metrics (OPT-001)
      const compressionRatioValue = parseFloat(
        res.getHeader('x-compression-ratio')?.replace('%', '') || '0'
      );
      const originalSize = parseInt(res.getHeader('x-original-size') || '0');

      if (compressionRatioValue > 0) {
        compressionRatio.observe(
          { route, service: serviceName },
          compressionRatioValue
        );

        const savings = originalSize - responseSize;
        compressionSavings.observe({ route, service: serviceName }, savings);
      }

      // Track cache metrics (OPT-004)
      const cacheStatus = res.getHeader('x-cache-status');
      if (cacheStatus === 'HIT') {
        cacheHits.inc({ cache_type: 'api', service: serviceName });
      } else if (cacheStatus === 'MISS') {
        cacheMisses.inc({ cache_type: 'api', service: serviceName });
      }

      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });

    next();
  };
}

/**
 * Create /metrics endpoint handler
 *
 * @returns {Function} Express route handler
 */
export function createMetricsHandler() {
  return async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
}

// Export registry for custom metrics
export { register };

export default {
  createMetricsMiddleware,
  createMetricsHandler,
  register,
  // Metrics
  httpRequestsTotal,
  httpRequestDuration,
  cacheHits,
  cacheMisses,
  dbQueryDuration,
  compressionRatio,
  semanticCacheHits,
  streamingResponseTime,
  errorRate
};
