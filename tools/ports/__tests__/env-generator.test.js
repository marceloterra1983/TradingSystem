import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { generateEnv } from '../generators/env.js';

const registry = {
  version: '1.0.0',
  lastUpdated: '2025-11-05',
  ranges: { demo: '3000-3010' },
  services: [
    {
      name: 'demo-container',
      stack: 'demo',
      port: 3001,
      protocol: 'http',
      owner: 'Demo',
      description: 'Container service',
      container: true,
    },
    {
      name: 'demo-local',
      stack: 'demo',
      port: 3002,
      protocol: 'http',
      owner: 'Demo',
      description: 'Local service',
      container: false,
    },
  ],
};

test('generateEnv writes header, timestamp and host mapping', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ports-env-'));
  const file = path.join(dir, '.env.generated');
  const now = new Date('2025-01-01T00:00:00Z');
  await generateEnv(registry, { targetPath: file, now });
  const content = await readFile(file, 'utf8');
  assert(content.includes('Auto-generated from config/ports/registry.yaml'));
  assert(content.includes('Generated: 2025-01-01T00:00:00.000Z'));
  assert(content.includes('DEMO_CONTAINER_HOST=demo-container'));
  assert(content.includes('DEMO_LOCAL_HOST=localhost'));
  assert(content.includes('DEMO_CONTAINER_URL=http://demo-container:3001'));
  assert(content.includes('DEMO_LOCAL_URL=http://localhost:3002'));
  await rm(dir, { recursive: true, force: true });
});
