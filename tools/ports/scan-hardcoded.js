#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'node:path';
import process from 'node:process';
import { glob } from 'glob';
import { readRegistry } from './lib/registry.js';

const FILE_GLOB = '**/*.{js,ts,tsx,jsx,mjs,cjs}';
const IGNORE = [
  '**/node_modules/**',
  '.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/__tests__/**',
  'docs/**',
  'reports/**',
  'logs/**',
  'out/**',
  'outputs/**',
];

const LINE_IGNORE_MARKERS = ['PORT_GOVERNANCE_ALLOW', 'port-governance:ignore'];
const HOST_PATTERNS = [/localhost:(\d{4,5})/g, /127\.0\.0\.1:(\d{4,5})/g];
const COMMENT_PREFIXES = ['#', '//', '*', '/*'];
const WATCHED_ROOTS = ['apps/telegram-gateway', 'backend'];

async function scan() {
  const registry = await readRegistry();
  const allowedPorts = new Set(registry.services.map((svc) => String(svc.port)));

  const files = await glob(FILE_GLOB, { ignore: IGNORE, nodir: true });
  const violations = [];

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    if (!WATCHED_ROOTS.some((root) => normalized.startsWith(root))) {
      continue;
    }

    const absolute = path.resolve(file);
    const content = await fs.readFile(absolute, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (LINE_IGNORE_MARKERS.some((marker) => line.includes(marker))) {
        return;
      }

      const trimmed = line.trimStart();
      if (COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
        return;
      }

      if (/\b(process\.env|__ENV|import\.meta\.env)\b/.test(line)) {
        return;
      }

      for (const pattern of HOST_PATTERNS) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          const [, port] = match;
          if (!allowedPorts.has(port)) continue;
          violations.push({
            file,
            line: index + 1,
            port,
            context: line.trim(),
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error('❌ Hardcoded localhost bindings detected:');
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} → ${violation.context}`);
    }
    console.error('\nUse environment variables from .env.shared instead of literal localhost URLs.');
    process.exit(1);
  }

  console.log('✅ No hardcoded localhost URLs found');
}

scan().catch((error) => {
  console.error('❌ Failed to run hardcoded port scan');
  console.error(error);
  process.exit(1);
});
