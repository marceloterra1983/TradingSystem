#!/usr/bin/env node
/**
 * Bundle Size Monitor
 *
 * Checks bundle sizes against defined budgets and fails CI if exceeded.
 * Run after `npm run build` to validate bundle sizes.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs [--strict] [--json]
 *
 * Options:
 *   --strict  Exit with error on warnings (default: exit on errors only)
 *   --json    Output results as JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist/assets');
const BUDGETS_FILE = path.join(__dirname, 'bundle-size-budgets.json');

// Parse command line args
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const jsonOutput = args.includes('--json');

// ANSI colors (disabled for JSON output)
const colors = jsonOutput ? {
  reset: '', red: '', yellow: '', green: '', blue: '', gray: ''
} : {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * Parse size string (e.g., "150kb") to bytes
 */
function parseSize(sizeStr) {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|b)$/i);
  if (!match) throw new Error(`Invalid size format: ${sizeStr}`);

  const [, num, unit] = match;
  const value = parseFloat(num);

  switch (unit.toLowerCase()) {
    case 'b': return value;
    case 'kb': return value * 1024;
    case 'mb': return value * 1024 * 1024;
    default: throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Get gzipped size of file
 */
function getGzipSize(filePath) {
  const gzipPath = `${filePath}.gz`;
  if (fs.existsSync(gzipPath)) {
    return fs.statSync(gzipPath).size;
  }
  // Fallback to uncompressed size
  return fs.statSync(filePath).size;
}

/**
 * Scan dist directory for chunks
 */
function scanChunks() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Dist directory not found: ${DIST_DIR}. Did you run \`npm run build\` first?`);
  }

  const files = fs.readdirSync(DIST_DIR);
  const chunks = {};

  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    const filePath = path.join(DIST_DIR, file);
    const size = getGzipSize(filePath);

    // Extract chunk name from filename (e.g., "agents-catalog-CLyaiI5S.js" -> "agents-catalog")
    const chunkName = file.replace(/-[a-zA-Z0-9_]+\.js$/, '');

    if (!chunks[chunkName]) {
      chunks[chunkName] = { size: 0, files: [] };
    }

    chunks[chunkName].size += size;
    chunks[chunkName].files.push(file);
  }

  return chunks;
}

/**
 * Check chunk against budget
 */
function checkChunk(chunkName, actualSize, budget) {
  const limitBytes = parseSize(budget.limit);
  const warningBytes = parseSize(budget.warning);

  const status = actualSize > limitBytes ? 'error' :
                 actualSize > warningBytes ? 'warning' :
                 'ok';

  const percentage = (actualSize / limitBytes * 100).toFixed(1);

  return {
    chunkName,
    actualSize,
    limit: limitBytes,
    warning: warningBytes,
    status,
    percentage: parseFloat(percentage),
    description: budget.description || '',
    optimization: budget.optimization || null
  };
}

/**
 * Main function
 */
async function main() {
  // Load budgets
  const budgets = JSON.parse(fs.readFileSync(BUDGETS_FILE, 'utf-8'));

  // Scan chunks
  const chunks = scanChunks();

  // Check each chunk against budget
  const results = [];
  let hasErrors = false;
  let hasWarnings = false;

  for (const [chunkName, budget] of Object.entries(budgets.budgets.chunks)) {
    const chunkData = chunks[chunkName];

    if (!chunkData) {
      // Chunk not found - might be optimized away or renamed
      if (!jsonOutput) {
        console.log(`${colors.gray}⊘  ${chunkName}: not found (optimized away or renamed)${colors.reset}`);
      }
      continue;
    }

    const result = checkChunk(chunkName, chunkData.size, budget);
    results.push(result);

    if (result.status === 'error') {
      hasErrors = true;
      if (!jsonOutput) {
        console.log(`${colors.red}✖  ${chunkName}: ${formatSize(result.actualSize)} / ${formatSize(result.limit)} (${result.percentage}%)${colors.reset}`);
        if (result.optimization) {
          console.log(`   ${colors.yellow}→ Optimization: ${result.optimization}${colors.reset}`);
        }
      }
    } else if (result.status === 'warning') {
      hasWarnings = true;
      if (!jsonOutput) {
        console.log(`${colors.yellow}⚠  ${chunkName}: ${formatSize(result.actualSize)} / ${formatSize(result.limit)} (${result.percentage}%)${colors.reset}`);
      }
    } else {
      if (!jsonOutput) {
        console.log(`${colors.green}✓  ${chunkName}: ${formatSize(result.actualSize)} / ${formatSize(result.limit)} (${result.percentage}%)${colors.reset}`);
      }
    }
  }

  // Calculate total bundle size
  const totalSize = Object.values(chunks).reduce((sum, chunk) => sum + chunk.size, 0);
  const totalLimit = parseSize(budgets.budgets.total.limit);
  const totalPercentage = (totalSize / totalLimit * 100).toFixed(1);

  if (!jsonOutput) {
    console.log('\n' + '='.repeat(60));
    console.log(`Total bundle size: ${colors.blue}${formatSize(totalSize)}${colors.reset} / ${formatSize(totalLimit)} (${totalPercentage}%)`);
    console.log('='.repeat(60));
  }

  // JSON output
  if (jsonOutput) {
    console.log(JSON.stringify({
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
      total: {
        size: totalSize,
        limit: totalLimit,
        percentage: parseFloat(totalPercentage)
      },
      chunks: results
    }, null, 2));
  }

  // Exit codes
  if (hasErrors) {
    if (!jsonOutput) {
      console.error(`\n${colors.red}✖ Bundle size check failed: one or more chunks exceed their limits${colors.reset}`);
    }
    process.exit(1);
  }

  if (strict && hasWarnings) {
    if (!jsonOutput) {
      console.error(`\n${colors.yellow}⚠ Bundle size check failed (strict mode): one or more chunks exceed warning thresholds${colors.reset}`);
    }
    process.exit(1);
  }

  if (!jsonOutput) {
    console.log(`\n${colors.green}✓ Bundle size check passed${colors.reset}`);
  }

  process.exit(0);
}

// Run
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
