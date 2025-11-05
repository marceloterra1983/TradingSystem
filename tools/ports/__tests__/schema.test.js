import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../lib/schema.js';

const baseRegistry = {
  version: '1.0.0',
  lastUpdated: '2025-11-05',
  ranges: {
    frontend: '3000-3099',
  },
  services: [
    {
      name: 'demo-service',
      stack: 'frontend',
      port: 3001,
      protocol: 'http',
      owner: 'Demo',
      description: 'Demo description long enough',
      container: false,
    },
  ],
};

test('validateRegistry accepts a valid registry', () => {
  const result = validateRegistry(baseRegistry);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateRegistry detects duplicate ports', () => {
  const registry = structuredClone(baseRegistry);
  registry.services = [
    registry.services[0],
    {
      ...registry.services[0],
      name: 'demo-service-2',
    },
  ];
  const result = validateRegistry(registry);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /multiple services/);
});

test('validateRegistry detects out-of-range ports', () => {
  const registry = structuredClone(baseRegistry);
  registry.services = [
    {
      ...registry.services[0],
      port: 4000,
      name: 'demo-service-2',
    },
  ];

  const result = validateRegistry(registry);
  assert.equal(result.valid, false);
  assert(result.errors.some((msg) => msg.includes('outside stack range')));
});

test('validateRegistry flags unsupported protocol', () => {
  const registry = structuredClone(baseRegistry);
  registry.services[0].protocol = 'smtp';
  const result = validateRegistry(registry);
  assert.equal(result.valid, false);
  assert(result.errors.some((msg) => msg.includes('unsupported protocol')));
});

test('validateRegistry detects unknown stack references', () => {
  const registry = structuredClone(baseRegistry);
  registry.services[0].stack = 'unknown';
  const result = validateRegistry(registry);
  assert.equal(result.valid, false);
  assert(result.errors.some((msg) => msg.includes('references unknown stack')));
});

test('validateRegistry errors when dependency missing', () => {
  const registry = structuredClone(baseRegistry);
  registry.services[0].depends_on = ['ghost-service'];
  const result = validateRegistry(registry);
  assert.equal(result.valid, false);
  assert(result.errors.some((msg) => msg.includes('depends on unknown service')));
});

test('validateRegistry warns when deprecated service lacks replacement', () => {
  const registry = structuredClone(baseRegistry);
  registry.services[0].deprecated = true;
  const result = validateRegistry(registry);
  assert.equal(result.valid, true);
  assert(result.warnings.some((msg) => msg.includes('Deprecated service')));
});
