import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { generateComposeDictionary, generateStackComposeFiles } from '../generators/compose.js';

const registry = {
  version: '1.0.0',
  lastUpdated: '2025-11-05',
  ranges: { alpha: '3000-3010', beta: '4000-4010' },
  services: [
    { name: 'svc-a', stack: 'alpha', port: 3001, protocol: 'http', owner: 'Team A', description: 'Alpha service', container: true },
    { name: 'svc-b', stack: 'beta', port: 4001, protocol: 'http', owner: 'Team B', description: 'Beta service', container: false },
  ],
};

test('generateComposeDictionary writes dictionary with escaped values', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ports-compose-dict-'));
  const file = path.join(dir, 'dict.yml');
  const now = new Date('2025-01-01T00:00:00Z');
  await generateComposeDictionary(registry, { targetPath: file, now });
  const content = await readFile(file, 'utf8');
  assert(content.includes('svc-a:'));
  assert(content.includes('env: SVC_A_PORT'));
  assert(content.includes('stack: alpha'));
  await rm(dir, { recursive: true, force: true });
});

test('generateStackComposeFiles produces per-stack files using template', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ports-compose-stack-'));
  const template = path.join(dir, 'template.yml');
  const outputDir = path.join(dir, 'out');
  await writeFile(
    template,
    '# template\nstack: {{STACK_NAME}}\n{{SERVICES}}\n',
  );
  const now = new Date('2025-01-01T00:00:00Z');
  await generateStackComposeFiles(registry, { templatePath: template, outputDir, now });
  const alphaFile = path.join(outputDir, 'docker-compose.alpha.ports.yml');
  const betaFile = path.join(outputDir, 'docker-compose.beta.ports.yml');
  const alphaContent = await readFile(alphaFile, 'utf8');
  assert(alphaContent.includes('stack: alpha'));
  assert(alphaContent.includes('svc-a'));
  const betaContent = await readFile(betaFile, 'utf8');
  assert(betaContent.includes('stack: beta'));
  assert(betaContent.includes('svc-b'));
  await rm(dir, { recursive: true, force: true });
});
