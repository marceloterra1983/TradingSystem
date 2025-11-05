#!/usr/bin/env node
import { readRegistry } from './lib/registry.js';
import { validateRegistry } from './lib/schema.js';

function printStackSummary(stacks) {
  console.log('\nStacks:');
  for (const [stack, count] of Object.entries(stacks)) {
    console.log(`  - ${stack}: ${count} service(s)`);
  }
}

function printRanges(ranges) {
  console.log('\nPort Ranges:');
  for (const [stack, range] of Object.entries(ranges)) {
    console.log(`  - ${stack}: ${range}`);
  }
}

async function main() {
  const registry = await readRegistry();
  const { stats } = validateRegistry(registry);

  console.log('📊 Port Governance Report');
  console.log('─────────────────────────');
  console.log(`Version: ${registry.version}`);
  console.log(`Last Updated: ${registry.lastUpdated}`);
  console.log(`Services: ${stats.services}`);

  printStackSummary(stats.stacks);
  printRanges(registry.ranges);
}

main().catch((error) => {
  console.error('❌ Unable to generate report');
  console.error(error);
  process.exit(1);
});
