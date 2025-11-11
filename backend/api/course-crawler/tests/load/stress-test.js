import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Stress test configuration - find breaking point
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 for 5 minutes
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 for 5 minutes
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 for 5 minutes
    { duration: '10m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% under 1s
    http_req_failed: ['rate<0.2'],     // Allow up to 20% errors under stress
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3601';

export default function () {
  // High-frequency health checks to stress the system
  const res = http.get(`${BASE_URL}/health`);

  const success = check(res, {
    'status 200': (r) => r.status === 200,
  });

  errorRate.add(!success);

  sleep(0.1); // 10 requests per second per VU
}
