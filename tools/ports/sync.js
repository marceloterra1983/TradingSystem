#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'node:path';
import process from 'node:process';
import { readRegistry, DEFAULTS } from './lib/registry.js';
import { validateRegistry } from './lib/schema.js';
import { generateEnv } from './generators/env.js';
import { generateDocs } from './generators/docs.js';
import { generateHealthScript } from './generators/health.js';
import { generateComposeDictionary, generateStackComposeFiles } from './generators/compose.js';
import { generateIndex } from './generators/index.js';

async function ensureDirs() {
  const dirs = [
    path.dirname(DEFAULTS.envPath),
    path.dirname(DEFAULTS.docsPath),
    path.dirname(DEFAULTS.indexPath),
    path.dirname(DEFAULTS.portsComposePath),
    path.dirname(DEFAULTS.healthScriptPath),
  ];

  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function main() {
  await ensureDirs();

  const registry = await readRegistry();
  const result = validateRegistry(registry);

  if (!result.valid) {
    console.error('❌ Registry validation failed:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Registry warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  const now = new Date();

  await Promise.all([
    generateEnv(registry, { now }),
    generateDocs(registry, { now }),
    generateHealthScript(registry),
    generateComposeDictionary(registry, { now }),
    generateStackComposeFiles(registry, { now }),
    generateIndex(registry, { now }),
  ]);

  console.log('✅ Port artifacts regenerated:');
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.envPath)}`);
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.docsPath)}`);
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.healthScriptPath)}`);
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.portsComposePath)}`);
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.generatedComposeDir)}`);
  console.log(`  • ${path.relative(process.cwd(), DEFAULTS.indexPath)}`);
}

main().catch((error) => {
  console.error('❌ Failed to sync port artifacts');
  console.error(error);
  process.exit(1);
});
