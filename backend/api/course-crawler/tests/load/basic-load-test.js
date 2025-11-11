import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be less than 10%
    errors: ['rate<0.1'],              // Custom error rate < 10%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3601';

// Get authentication token
function getAuthToken() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: 'admin',
      password: 'changeme',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token returned': (r) => r.json('token') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  return loginRes.json('token');
}

export function setup() {
  // This runs once before all iterations
  const token = getAuthToken();
  return { token };
}

export default function (data) {
  const { token } = data;

  // Test 1: Health check
  {
    const res = http.get(`${BASE_URL}/health`);
    const success = check(res, {
      'health check status 200': (r) => r.status === 200,
      'health check has status': (r) => r.json('status') === 'healthy',
    });
    errorRate.add(!success);
  }

  sleep(1);

  // Test 2: Metrics endpoint
  {
    const res = http.get(`${BASE_URL}/metrics`);
    const success = check(res, {
      'metrics status 200': (r) => r.status === 200,
      'metrics has content': (r) => r.body.length > 0,
    });
    errorRate.add(!success);
  }

  sleep(1);

  // Test 3: Protected endpoint (courses list)
  if (token) {
    const res = http.get(`${BASE_URL}/api/v1/courses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const success = check(res, {
      'courses endpoint status 200 or 404': (r) =>
        r.status === 200 || r.status === 404, // 404 is ok if no courses exist
    });
    errorRate.add(!success);
  }

  sleep(1);
}

export function teardown(data) {
  // This runs once after all iterations
  console.log('Load test completed');
}
