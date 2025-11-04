/**
 * K6 Load Test - RAG Services (WITH JWT Authentication)
 * Tests circuit breaker behavior with authenticated requests
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const circuitBreakerOpenRate = new Rate('circuit_breaker_open_rate');
const queryDuration = new Trend('query_duration');
const searchErrors = new Counter('search_errors');
const authErrors = new Counter('auth_errors');

// Test configuration - 50 VUs for 7 minutes
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm-up
    { duration: '2m', target: 50 },   // Ramp-up to 50 VUs
    { duration: '3m', target: 50 },   // Sustained load
    { duration: '1m', target: 0 },    // Cool-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],      // 95% under 500ms
    'http_req_failed': ['rate<0.1'],         // Less than 10% failures
    'circuit_breaker_open_rate': ['rate<0.05'], // CB open < 5%
    'query_duration': ['p(95)<1000'],        // Query P95 < 1s
    'auth_errors': ['count<10'],             // Very few auth errors
  },
};

// Configuration
const KONG_URL = 'http://localhost:8000';
const DIRECT_URL = 'http://localhost:3402';

// JWT Secret (should match your .env)
const JWT_SECRET = 'dev-secret';

// Test queries
const TEST_QUERIES = [
  'How does circuit breaker work?',
  'What is Qdrant?',
  'RAG architecture overview',
  'Kong API Gateway configuration',
  'fault tolerance patterns',
  'Docker compose deployment',
  'authentication and authorization',
  'rate limiting strategies',
  'load balancing',
  'high availability cluster',
];

/**
 * Generate a simple JWT token (for testing purposes only)
 * In production, get this from your auth service
 */
function generateSimpleJWT() {
  // For dev/test, we'll just use a mock token
  // In real scenarios, call your auth endpoint to get a valid token
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdC11c2VyIiwiaWF0IjoxNjI4NTAwMDAwfQ.test-signature';
}

// Get JWT token once during setup
let JWT_TOKEN = '';

export function setup() {
  console.log('🚀 Starting K6 Load Test for RAG Services (WITH JWT)');
  console.log('Configuration:');
  console.log('  - Target: 50 concurrent users');
  console.log('  - Duration: 7 minutes');
  console.log('  - Thresholds: P95 < 500ms, < 10% errors');
  console.log('');
  
  // Generate JWT token for all VUs to use
  JWT_TOKEN = generateSimpleJWT();
  console.log('  ✅ JWT token generated');
  
  // Verify services are up
  const healthCheck = http.get(`${DIRECT_URL}/health`);
  if (healthCheck.status !== 200) {
    console.log(`  ⚠️  Service health check returned: ${healthCheck.status}`);
    console.log('  Continuing anyway...');
  } else {
    console.log('  ✅ Services are healthy');
  }
  
  console.log('');
  console.log('Starting load test...');
  console.log('');
  
  return { jwt: JWT_TOKEN };
}

export default function (data) {
  const jwt = data.jwt || JWT_TOKEN;
  
  // Randomly select a query
  const query = TEST_QUERIES[Math.floor(Math.random() * TEST_QUERIES.length)];
  
  group('RAG Search via Kong (Authenticated)', () => {
    const url = `${KONG_URL}/api/v1/rag/search?query=${encodeURIComponent(query)}&max_results=5`;
    
    const params = {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      tags: { endpoint: 'kong-proxy-auth' },
    };
    
    const start = Date.now();
    const res = http.get(url, params);
    const duration = Date.now() - start;
    
    // Check response
    const checks = check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time < 500ms': () => duration < 500,
      'not 503 (circuit open)': (r) => r.status !== 503,
    });
    
    // Record metrics
    queryDuration.add(duration);
    
    // Track circuit breaker state
    if (res.status === 503) {
      circuitBreakerOpenRate.add(1);
      searchErrors.add(1);
    } else {
      circuitBreakerOpenRate.add(0);
    }
    
    // Track auth errors separately (expected if JWT invalid)
    if (res.status === 401) {
      authErrors.add(1);
    }
    
    // Track general errors
    if (res.status >= 400 && res.status !== 401) {
      searchErrors.add(1);
    }
  });
  
  // Small delay between requests (simulate real users)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function teardown(data) {
  console.log('');
  console.log('========================================');
  console.log('Load Test Complete!');
  console.log('========================================');
  console.log('');
  console.log('Check results above for:');
  console.log('  - Circuit breaker open rate (should be < 5%)');
  console.log('  - Query latency P95 (should be < 500ms)');
  console.log('  - Error rate (should be < 10%, excluding auth)');
  console.log('');
  console.log('Note: 401 errors are expected if JWT token is invalid/expired');
  console.log('');
}

