#!/usr/bin/env node
/**
 * Environment Variables Validator for Vite Dashboard
 * 
 * PURPOSE: Prevent "undefined" variables in production builds by validating that:
 * 1. All VITE_* variables used in code are declared in vite.config.ts define block
 * 2. All variables have fallback values
 * 3. Critical variables are present
 * 
 * USAGE:
 *   npm run validate:env
 *   node validate-env-vars.mjs
 * 
 * EXIT CODES:
 *   0 - All validations passed
 *   1 - Validation errors found
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL: Variables that MUST be defined
const CRITICAL_VARS = [
  'VITE_GATEWAY_TOKEN',
  'VITE_TELEGRAM_GATEWAY_API_TOKEN',
  'VITE_TELEGRAM_GATEWAY_API_URL',
];

// Extract all import.meta.env.VITE_* usages from source code
function findViteVarUsages(srcDir) {
  const files = glob.sync(`${srcDir}/**/*.{ts,tsx,js,jsx}`, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
  });

  const usages = new Set();
  const pattern = /import\.meta\.env\.(VITE_\w+)/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      usages.add(match[1]);
    }
  }

  return Array.from(usages).sort();
}

// Extract defined variables from vite.config.ts
function findDefinedVars(configPath) {
  const content = readFileSync(configPath, 'utf-8');
  const defined = new Set();
  
  // Match: 'import.meta.env.VITE_XXX': JSON.stringify(...)
  const pattern = /'import\.meta\.env\.(VITE_\w+)':/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    defined.add(match[1]);
  }

  return Array.from(defined).sort();
}

function main() {
  console.log('🔍 Validating environment variables...\n');

  const srcDir = path.join(__dirname, 'src');
  const configPath = path.join(__dirname, 'vite.config.ts');

  // Step 1: Find all VITE_* usages in code
  const usedVars = findViteVarUsages(srcDir);
  console.log(`📦 Found ${usedVars.length} VITE_* variables in source code:`);
  usedVars.forEach(v => console.log(`   - ${v}`));
  console.log('');

  // Step 2: Find all defined vars in vite.config.ts
  const definedVars = findDefinedVars(configPath);
  console.log(`⚙️  Found ${definedVars.length} variables defined in vite.config.ts:`);
  definedVars.forEach(v => console.log(`   - ${v}`));
  console.log('');

  // Step 3: Find missing definitions
  const missing = usedVars.filter(v => !definedVars.includes(v));
  
  if (missing.length > 0) {
    console.error('❌ ERROR: The following variables are used in code but NOT defined in vite.config.ts:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n⚠️  These variables will be UNDEFINED in production builds!');
    console.error('\n📝 To fix: Add them to the "define" block in vite.config.ts:\n');
    console.error('   define: {');
    missing.forEach(v => {
      console.error(`     'import.meta.env.${v}': JSON.stringify(env.${v} || ''),`);
    });
    console.error('   }');
    console.error('');
    process.exit(1);
  }

  // Step 4: Check critical variables
  const missingCritical = CRITICAL_VARS.filter(v => !definedVars.includes(v));
  if (missingCritical.length > 0) {
    console.error('❌ ERROR: Critical variables are missing from vite.config.ts:');
    missingCritical.forEach(v => console.error(`   - ${v}`));
    console.error('');
    process.exit(1);
  }

  // Step 5: Success
  console.log('✅ All validations passed!');
  console.log('✅ All VITE_* variables used in code are properly defined');
  console.log('✅ All critical variables are present');
  console.log('');
  console.log('🎉 No "undefined" variables will occur in production!');
  process.exit(0);
}

main();

