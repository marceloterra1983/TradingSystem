#!/usr/bin/env node
import process from 'node:process';
import { readRegistry } from './lib/registry.js';
import { validateRegistry } from './lib/schema.js';

const MODE = (() => {
  const arg = process.argv.find((value) => value.startsWith('--mode='));
  if (!arg) return 'full';
  return arg.split('=')[1] ?? 'full';
})();

const MODE_FILTERS = {
  duplicates: (message) => message.toLowerCase().includes('duplicate'),
  ranges: (message) => message.toLowerCase().includes('range'),
  full: () => true,
};

function formatList(label, items) {
  if (!items.length) return;
  console.log(`\n${label}:`);
  for (const item of items) {
    console.log(`  - ${item}`);
  }
}

async function main() {
  const registry = await readRegistry();
  const result = validateRegistry(registry);

  const filter = MODE_FILTERS[MODE] ?? MODE_FILTERS.full;
  const filteredErrors = result.errors.filter(filter);

  if (filteredErrors.length > 0) {
    formatList('❌ Validation errors', filteredErrors);
    process.exit(1);
  }

  if (result.errors.length > 0 && MODE !== 'full') {
    // For subset modes we still surface other errors so the dev notices them.
    formatList('⚠️ Other validation errors detected (run npm run ports:validate)', result.errors);
  }

  if (result.warnings.length > 0) {
    formatList('⚠️ Warnings', result.warnings);
  }

  console.log(
    `✅ Port registry valid (${result.stats.services} services across ${Object.keys(result.stats.stacks).length} stacks)`
  );
}

main().catch((error) => {
  console.error('❌ ports:validate failed');
  console.error(error);
  process.exit(1);
});
