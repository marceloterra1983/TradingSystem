/**
 * K6 Load Test: Workspace API
 *
 * OPT-010: Load Testing Suite
 * Tests all optimizations OPT-001 through OPT-008
 *
 * Usage:
 *   k6 run tests/performance/workspace-api.k6.js
 *   k6 run --vus 100 --duration 60s tests/performance/workspace-api.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const compressionRatio = new Trend('opt001_compression_ratio');
const cacheHitRate = new Rate('opt004_cache_hit_rate');
const queryDuration = new Trend('opt005_query_duration');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Maintain 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
    'opt004_cache_hit_rate': ['rate>0.5'], // Cache hit rate should be above 50%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3200';

export default function () {
  // Test 1: GET /api/items (List all items)
  // Tests: OPT-001 (compression), OPT-004 (caching), OPT-005 (query cache)
  const getItemsResponse = http.get(`${BASE_URL}/api/items`, {
    headers: {
      'Accept-Encoding': 'gzip',
    },
  });

  check(getItemsResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response is compressed': (r) => r.headers['Content-Encoding'] === 'gzip',
  });

  // Track compression ratio (OPT-001)
  const compressionRatioHeader = getItemsResponse.headers['X-Compression-Ratio'];
  if (compressionRatioHeader) {
    const ratio = parseFloat(compressionRatioHeader.replace('%', ''));
    compressionRatio.add(ratio);
  }

  // Track cache hit rate (OPT-004)
  const cacheStatus = getItemsResponse.headers['X-Cache-Status'];
  cacheHitRate.add(cacheStatus === 'HIT' ? 1 : 0);

  // Track query duration (OPT-005)
  queryDuration.add(getItemsResponse.timings.duration);

  // Track errors
  errorRate.add(getItemsResponse.status >= 400 ? 1 : 0);

  sleep(1);

  // Test 2: POST /api/items (Create item)
  // Tests: OPT-001 (compression), cache invalidation
  const createPayload = JSON.stringify({
    title: `Test Item ${Date.now()}`,
    description: 'Load test item',
    category: 'documentacao',
    priority: 'medium',
    tags: ['test', 'k6'],
  });

  const createResponse = http.post(`${BASE_URL}/api/items`, createPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    },
  });

  check(createResponse, {
    'create status is 201': (r) => r.status === 201,
    'create response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(createResponse.status >= 400 ? 1 : 0);

  sleep(2);

  // Test 3: GET /health (Health check)
  // Tests: OPT-001 (compression)
  const healthResponse = http.get(`${BASE_URL}/health`);

  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Load Test Complete');
  console.log('='.repeat(60));
}
