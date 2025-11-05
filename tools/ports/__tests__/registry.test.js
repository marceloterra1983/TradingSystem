import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { readRegistry, writeRegistry, groupByStack } from '../lib/registry.js';

const tmpDir = async () => mkdtemp(path.join(os.tmpdir(), 'ports-registry-'));

test('readRegistry parses valid YAML', async () => {
  const dir = await tmpDir();
  const file = path.join(dir, 'registry.yaml');
  await writeFile(file, 'version: "1.0.0"\nlastUpdated: "2025-01-01"\nranges: { demo: "3000-3010" }\nservices: []\n');
  const registry = await readRegistry(file);
  assert.equal(registry.version, '1.0.0');
  await rm(dir, { recursive: true, force: true });
});

test('readRegistry throws for invalid YAML', async () => {
  const dir = await tmpDir();
  const file = path.join(dir, 'registry.yaml');
  await writeFile(file, 'version: "1.0.0"\nservices: [ invalid');
  await assert.rejects(readRegistry(file), /Failed to parse registry YAML/);
  await rm(dir, { recursive: true, force: true });
});

test('readRegistry throws for missing file', async () => {
  const dir = await tmpDir();
  const file = path.join(dir, 'missing.yaml');
  await assert.rejects(readRegistry(file), /no such file or directory/);
  await rm(dir, { recursive: true, force: true });
});

test('writeRegistry serializes yaml and readRegistry rehydrates', async () => {
  const dir = await tmpDir();
  const file = path.join(dir, 'registry.yaml');
  const payload = {
    version: '1.0.0',
    lastUpdated: '2025-11-05',
    ranges: { demo: '3000-3010' },
    services: [{ name: 'demo', stack: 'demo', port: 3001, protocol: 'http', owner: 'Demo', description: 'Demo svc', container: false }],
  };
  await writeRegistry(file, payload);
  const raw = await readFile(file, 'utf8');
  assert.ok(raw.includes('services:'));
  const registry = await readRegistry(file);
  assert.equal(registry.services[0].name, 'demo');
  await rm(dir, { recursive: true, force: true });
});

test('groupByStack groups based on stack name', () => {
  const services = [
    { name: 'a', stack: 'alpha' },
    { name: 'b', stack: 'alpha' },
    { name: 'c', stack: 'beta' },
  ];
  const grouped = groupByStack(services);
  assert.equal(grouped.get('alpha').length, 2);
  assert.equal(grouped.get('beta').length, 1);
});
