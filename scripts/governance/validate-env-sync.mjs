#!/usr/bin/env node
// Validates that .env.example and .env have same keys (not values)
// Usage: node scripts/governance/validate-env-sync.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const envPath = path.join(projectRoot, '.env');
const defaultsPath = path.join(projectRoot, 'config', '.env.defaults');

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();

  content.split('\n').forEach(line => {
    line = line.trim();
    // Skip comments and empty lines
    if (line.startsWith('#') || !line || !line.includes('=')) return;

    const key = line.split('=')[0].trim();
    keys.add(key);
  });

  return keys;
}

console.log('🔍 Validating .env ↔ config/.env.defaults sync...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ FAIL: .env not found at', envPath);
  process.exit(1);
}

if (!fs.existsSync(defaultsPath)) {
  console.error('❌ FAIL: config/.env.defaults not found');
  process.exit(1);
}

const envKeys = parseEnvKeys(envPath);
const defaultsKeys = parseEnvKeys(defaultsPath);

console.log(`📊 Statistics:`);
console.log(`   .env keys: ${envKeys.size}`);
console.log(`   config/.env.defaults keys: ${defaultsKeys.size}`);
console.log('');

// Check for secrets that should NOT be in .env.defaults
const secretPatterns = [
  /TOKEN$/,
  /KEY$/,
  /PASSWORD$/,
  /SECRET$/,
  /_PASS$/,
  /API_KEY$/,
  /JWT$/,
  /SESSION$/
];

const secretsInDefaults = [...defaultsKeys].filter(key =>
  secretPatterns.some(pattern => pattern.test(key))
);

if (secretsInDefaults.length > 0) {
  console.warn('⚠️  WARNING: Potential secrets found in config/.env.defaults:');
  secretsInDefaults.slice(0, 10).forEach(key => {
    const value = fs.readFileSync(defaultsPath, 'utf8')
      .split('\n')
      .find(line => line.startsWith(`${key}=`));

    if (value && !value.includes('change_me') && !value.includes('devlocal')) {
      console.warn(`   - ${key} (value looks real, not placeholder)`);
    }
  });
  console.log('');
}

// Check for keys in .env missing from defaults
const missingInDefaults = [...envKeys].filter(key => !defaultsKeys.has(key));
if (missingInDefaults.length > 0) {
  console.error('❌ FAIL: Keys in .env missing from config/.env.defaults:');
  missingInDefaults.slice(0, 20).forEach(key => console.error(`   - ${key}`));
  if (missingInDefaults.length > 20) {
    console.error(`   ... and ${missingInDefaults.length - 20} more`);
  }
  console.log('');
  console.log('💡 TIP: Add missing keys to config/.env.defaults with placeholder values');
  process.exit(1);
}

// Check for extra keys in defaults
const extraInDefaults = [...defaultsKeys].filter(key => !envKeys.has(key));
if (extraInDefaults.length > 0) {
  console.warn('⚠️  WARNING: Keys in config/.env.defaults not in .env:');
  extraInDefaults.slice(0, 20).forEach(key => console.warn(`   - ${key}`));
  if (extraInDefaults.length > 20) {
    console.warn(`   ... and ${extraInDefaults.length - 20} more`);
  }
  console.log('');
  console.log('💡 TIP: These keys may need to be added to your .env');
}

console.log('✅ VALIDATION PASSED');
console.log(`   Both files are in sync (${envKeys.size} keys)`);
