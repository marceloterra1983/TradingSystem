#!/usr/bin/env node
/**
 * Cache checker for agents directory generation
 * Skips generation if source files haven't changed since last build
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = path.join(__dirname, '../.agents-cache.json');
const SOURCE_DIR = path.join(__dirname, '../../../.claude/commands');
const OUTPUT_FILE = path.join(__dirname, '../src/data/aiAgentsDirectory.ts');

/**
 * Calculate hash of directory contents
 */
function getDirectoryHash(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  const fileContents = files
    .filter(f => f.isFile() && f.name.endsWith('.md'))
    .map(f => {
      const filePath = path.join(dir, f.name);
      const stats = fs.statSync(filePath);
      // Use mtime + size for faster hashing
      return `${f.name}:${stats.mtime.getTime()}:${stats.size}`;
    })
    .join('|');

  return crypto
    .createHash('md5')
    .update(fileContents)
    .digest('hex');
}

/**
 * Read cache file
 */
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Failed to read cache file:', error.message);
  }
  return null;
}

/**
 * Write cache file
 */
function writeCache(hash) {
  try {
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        hash,
        timestamp: new Date().toISOString(),
      }, null, 2)
    );
  } catch (error) {
    console.warn('⚠️  Failed to write cache file:', error.message);
  }
}

/**
 * Main execution
 */
function main() {
  // Calculate current hash
  const currentHash = getDirectoryHash(SOURCE_DIR);

  if (!currentHash) {
    console.log('⚠️  Source directory not found, regeneration needed');
    process.exit(1);
  }

  // Check if output exists
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.log('⚠️  Output file not found, generation needed');
    writeCache(currentHash);
    process.exit(1);
  }

  // Read cache
  const cache = readCache();

  if (!cache) {
    console.log('⚠️  No cache found, generation needed');
    writeCache(currentHash);
    process.exit(1);
  }

  // Compare hashes
  if (cache.hash === currentHash) {
    console.log('✅ Agents directory cache valid, skipping generation');
    process.exit(0);
  } else {
    console.log('⚠️  Source files changed, regeneration needed');
    writeCache(currentHash);
    process.exit(1);
  }
}

main();
