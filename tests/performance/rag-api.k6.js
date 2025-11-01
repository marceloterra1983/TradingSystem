/**
 * K6 Load Test: RAG API
 *
 * OPT-010: Load Testing Suite for RAG System
 * Tests OPT-007 (semantic caching) and OPT-008 (streaming)
 *
 * Usage:
 *   k6 run tests/performance/rag-api.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const semanticCacheHitRate = new Rate('opt007_semantic_cache_hit_rate');
const semanticCacheSimilarity = new Trend('opt007_semantic_cache_similarity');
const streamingFirstChunkTime = new Trend('opt008_streaming_first_chunk_time');
const queryLatency = new Trend('rag_query_latency');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 10 },    // Ramp up to 10 users
    { duration: '2m', target: 20 },    // Maintain 20 users
    { duration: '1m', target: 10 },    // Ramp down
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% of requests < 5s
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    'opt007_semantic_cache_hit_rate': ['rate>0.3'], // 30% cache hit rate
    'rag_query_latency': ['p(95)<1000'], // 95% of queries < 1s (with cache)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8202';

// Sample queries (mix of similar and different queries for semantic cache testing)
const queries = [
  'What is the architecture of the TradingSystem?',
  'Explain the TradingSystem architecture',  // Similar to query 1 (should hit semantic cache)
  'How does the workspace API work?',
  'What is the workspace API?',  // Similar to query 3
  'How to configure TimescaleDB?',
  'TimescaleDB configuration guide',  // Similar to query 5
  'What are the available optimization techniques?',
  'RAG system implementation details',
  'How to use the documentation API?',
  'Explain semantic caching',
];

export default function () {
  // Select random query
  const query = queries[Math.floor(Math.random() * queries.length)];

  // Test 1: RAG Query (non-streaming)
  const queryPayload = JSON.stringify({ query });

  const start = Date.now();
  const queryResponse = http.post(`${BASE_URL}/query`, queryPayload, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  });
  const duration = Date.now() - start;

  check(queryResponse, {
    'status is 200': (r) => r.status === 200,
    'has answer': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.answer && body.answer.length > 0;
      } catch {
        return false;
      }
    },
  });

  // Track semantic cache metrics (OPT-007)
  try {
    const body = JSON.parse(queryResponse.body);
    if (body.cached) {
      semanticCacheHitRate.add(1);
      if (body.similarity) {
        semanticCacheSimilarity.add(body.similarity);
      }
    } else {
      semanticCacheHitRate.add(0);
    }
  } catch (e) {
    // Ignore parse errors
  }

  // Track query latency
  queryLatency.add(duration);

  // Track errors
  errorRate.add(queryResponse.status >= 400 ? 1 : 0);

  sleep(3);

  // Test 2: Streaming Query (OPT-008)
  // Note: K6 doesn't natively support SSE, so we measure time to first response
  const streamStart = Date.now();
  const streamResponse = http.get(`${BASE_URL}/query/stream?q=${encodeURIComponent(query)}`, {
    timeout: '10s',
  });
  const firstChunkTime = Date.now() - streamStart;

  check(streamResponse, {
    'streaming status is 200': (r) => r.status === 200,
    'streaming content type is SSE': (r) =>
      r.headers['Content-Type']?.includes('text/event-stream'),
  });

  // Track streaming metrics (OPT-008)
  streamingFirstChunkTime.add(firstChunkTime);

  sleep(5);
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('RAG Load Test Complete');
  console.log('='.repeat(60));
}
