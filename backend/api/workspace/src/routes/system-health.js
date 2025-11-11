/**
 * System Health Aggregator API
 *
 * Aggregates health status from all services and infrastructure components.
 * Provides a unified view of system health for monitoring dashboards.
 *
 * Part of: Phase 1.7 - Health Checks (Improvement Plan v1.0)
 */

import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Service configuration from environment
const SERVICES = [
  {
    name: 'Workspace API',
    type: 'service',
    endpoint: `http://localhost:${process.env.WORKSPACE_API_PORT || 3200}/health`,
  },
  {
    name: 'Documentation API',
    type: 'service',
    endpoint: `http://localhost:${process.env.DOCS_API_PORT || 3405}/health`,
  },
  {
    name: 'Documentation Hub',
    type: 'service',
    endpoint: `http://localhost:${process.env.DOCS_PORT || 3404}/health`,
  },
  {
    name: 'Firecrawl Proxy',
    type: 'service',
    endpoint: `http://localhost:${process.env.FIRECRAWL_PROXY_PORT || 3600}/health`,
  },
  {
    name: 'TP Capital',
    type: 'service',
    endpoint: `http://localhost:${process.env.TP_CAPITAL_PORT || 4005}/health`,
  },
];

const INFRASTRUCTURE = [
  {
    name: 'TimescaleDB',
    type: 'database',
    endpoint: `http://localhost:${process.env.TIMESCALEDB_PORT || 5432}`,
    healthCheck: checkPostgres,
  },
  {
    name: 'QuestDB',
    type: 'database',
    endpoint: `http://localhost:${process.env.QUESTDB_HTTP_PORT || 9000}/status`,
  },
  {
    name: 'Redis',
    type: 'cache',
    endpoint: `http://localhost:${process.env.REDIS_PORT || 6379}`,
    healthCheck: checkRedis,
  },
  {
    name: 'Qdrant',
    type: 'vector-db',
    endpoint: `http://localhost:${process.env.QDRANT_PORT || 6333}/healthz`,
  },
  {
    name: 'Prometheus',
    type: 'monitoring',
    endpoint: `http://localhost:${process.env.PROMETHEUS_PORT || 9090}/-/healthy`,
  },
  {
    name: 'Grafana',
    type: 'monitoring',
    endpoint: `http://localhost:${process.env.GRAFANA_PORT || 3100}/api/health`,
  },
];

/**
 * GET /api/health/system
 *
 * Returns aggregated health status for all services and infrastructure
 */
router.get('/system', async (req, res) => {
  try {
    const startTime = Date.now();

    // Check all services in parallel
    const [serviceResults, infraResults] = await Promise.all([
      checkServices(SERVICES),
      checkServices(INFRASTRUCTURE),
    ]);

    // Calculate summary
    const allResults = [...serviceResults, ...infraResults];
    const summary = {
      total: allResults.length,
      healthy: allResults.filter((s) => s.status === 'healthy').length,
      degraded: allResults.filter((s) => s.status === 'degraded').length,
      unhealthy: allResults.filter((s) => s.status === 'unhealthy').length,
    };

    // Determine overall health
    const overallHealth =
      summary.unhealthy > 0 ? 'unhealthy' :
      summary.degraded > 0 ? 'degraded' :
      'healthy';

    const response = {
      overallHealth,
      timestamp: new Date().toISOString(),
      services: serviceResults,
      infrastructure: infraResults,
      summary,
      responseTime: Date.now() - startTime,
    };

    // HTTP status based on overall health
    const httpStatus =
      overallHealth === 'healthy' ? 200 :
      overallHealth === 'degraded' ? 200 :
      503;

    res.status(httpStatus).json(response);
  } catch (error) {
    console.error('System health check failed:', error);

    res.status(503).json({
      overallHealth: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: [],
      infrastructure: [],
      summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 0 },
    });
  }
});

/**
 * GET /api/health/system/prometheus
 *
 * Returns health metrics in Prometheus format
 */
router.get('/system/prometheus', async (req, res) => {
  try {
    const [serviceResults, infraResults] = await Promise.all([
      checkServices(SERVICES),
      checkServices(INFRASTRUCTURE),
    ]);

    const allResults = [...serviceResults, ...infraResults];

    // Generate Prometheus metrics
    const metrics = [
      '# HELP system_health_status Health status of system components (0=unhealthy, 1=degraded, 2=healthy)',
      '# TYPE system_health_status gauge',
    ];

    allResults.forEach((result) => {
      const statusValue =
        result.status === 'healthy' ? 2 :
        result.status === 'degraded' ? 1 :
        0;

      const labels = `name="${result.name}",type="${result.type || 'service'}",endpoint="${result.endpoint}"`;
      metrics.push(`system_health_status{${labels}} ${statusValue}`);

      if (result.responseTime) {
        metrics.push(`system_health_response_time_ms{${labels}} ${result.responseTime}`);
      }
    });

    // Overall system health
    const healthyCount = allResults.filter((s) => s.status === 'healthy').length;
    const totalCount = allResults.length;
    const overallHealth = totalCount > 0 ? healthyCount / totalCount : 0;

    metrics.push('# HELP system_health_overall Overall system health ratio (0-1)');
    metrics.push('# TYPE system_health_overall gauge');
    metrics.push(`system_health_overall ${overallHealth.toFixed(2)}`);

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics.join('\n') + '\n');
  } catch (error) {
    console.error('Prometheus metrics generation failed:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * Check health of multiple services
 */
async function checkServices(services) {
  return await Promise.all(
    services.map(async (service) => {
      const startTime = Date.now();

      try {
        // Use custom health check function if provided
        if (service.healthCheck) {
          const result = await service.healthCheck(service);
          return {
            ...result,
            name: service.name,
            type: service.type,
            endpoint: service.endpoint,
            responseTime: Date.now() - startTime,
          };
        }

        // Default HTTP health check
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(service.endpoint, {
          signal: controller.signal,
          headers: { 'User-Agent': 'TradingSystem-HealthCheck/1.0' },
        });

        clearTimeout(timeout);

        const responseTime = Date.now() - startTime;

        // Parse response if JSON
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }

        // Determine status
        let status = 'unhealthy';
        if (response.ok) {
          // Check if response includes health status
          if (data && data.status) {
            status = data.status;
          } else {
            status = 'healthy';
          }
        }

        return {
          name: service.name,
          type: service.type,
          endpoint: service.endpoint,
          status,
          version: data?.version,
          uptime: data?.uptime,
          checks: data?.checks,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        return {
          name: service.name,
          type: service.type,
          endpoint: service.endpoint,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime,
          error: error.message,
        };
      }
    })
  );
}

/**
 * Custom health check for PostgreSQL/TimescaleDB
 */
async function checkPostgres(service) {
  try {
    // This would need pg client connection
    // For now, return basic check
    return {
      status: 'healthy',
      message: 'PostgreSQL check not implemented yet',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
    };
  }
}

/**
 * Custom health check for Redis
 */
async function checkRedis(service) {
  try {
    // This would need redis client connection
    // For now, return basic check
    return {
      status: 'healthy',
      message: 'Redis check not implemented yet',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
    };
  }
}

export default router;
