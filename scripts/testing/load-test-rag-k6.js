/**
 * K6 Load Test - RAG Services
 * Tests circuit breaker behavior under load with 50 concurrent users
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const circuitBreakerOpenRate = new Rate('circuit_breaker_open_rate');
const queryDuration = new Trend('query_duration');
const searchErrors = new Counter('search_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm-up: Ramp to 10 users
    { duration: '2m', target: 50 },   // Load: Ramp to 50 users
    { duration: '3m', target: 50 },   // Sustained: Hold 50 users
    { duration: '1m', target: 0 },    // Cool-down: Ramp down
  ],
  thresholds: {
    // 95% of requests should complete within 500ms
    'http_req_duration': ['p(95)<500'],
    
    // Less than 10% of requests should fail
    'http_req_failed': ['rate<0.1'],
    
    // Circuit breaker should open less than 5% of the time
    'circuit_breaker_open_rate': ['rate<0.05'],
    
    // Query duration P95 should be under 1 second
    'query_duration': ['p(95)<1000'],
  },
};

// Base URLs
const KONG_URL = 'http://localhost:8000';
const DIRECT_URL = 'http://localhost:8202';

// Test queries (mix of simple and complex)
const TEST_QUERIES = [
  'How does circuit breaker work?',
  'What is Qdrant?',
  'RAG architecture',
  'Kong API Gateway',
  'fault tolerance',
  'Docker deployment',
  'authentication',
  'rate limiting',
];

export default function () {
  // Randomly select a query
  const query = TEST_QUERIES[Math.floor(Math.random() * TEST_QUERIES.length)];
  
  group('RAG Search via Kong', () => {
    const url = `${KONG_URL}/api/v1/rag/search?query=${encodeURIComponent(query)}&max_results=5`;
    
    const start = Date.now();
    const res = http.get(url, {
      headers: {
        'Accept': 'application/json',
      },
      tags: { endpoint: 'kong-proxy' },
    });
    const duration = Date.now() - start;
    
    // Check response
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': () => duration < 500,
      'has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.results && body.results.length > 0;
        } catch {
          return false;
        }
      },
    });
    
    // Record metrics
    queryDuration.add(duration);
    
    if (res.status === 503) {
      circuitBreakerOpenRate.add(1);
      searchErrors.add(1);
    } else {
      circuitBreakerOpenRate.add(0);
    }
    
    if (!success) {
      searchErrors.add(1);
    }
  });
  
  // Small delay between requests
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Setup function (runs once at start)
export function setup() {
  console.log('Starting K6 Load Test for RAG Services');
  console.log('Configuration:');
  console.log('  - Target: 50 concurrent users');
  console.log('  - Duration: 7 minutes total');
  console.log('  - Thresholds: P95 < 500ms, < 10% errors');
  console.log('');
  
  // Verify services are up
  const healthCheck = http.get(`${DIRECT_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error('Services are not healthy! Aborting test.');
  }
  
  console.log('✅ Services are healthy, starting load test...');
  console.log('');
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('');
  console.log('Load test complete!');
  console.log('Check results above for performance metrics.');
  console.log('');
}

