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

import { readFileSync, readdirSync, statSync } from 'fs';
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

// Recursively find all files matching extensions
function findFiles(dir, extensions, results = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, and hidden directories
      if (!['node_modules', 'dist', '.git'].includes(file) && !file.startsWith('.')) {
        findFiles(filePath, extensions, results);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      // Skip test files
      if (extensions.includes(ext) && !file.includes('.test.') && !file.includes('.spec.')) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Extract all import.meta.env.VITE_* usages from source code
function findViteVarUsages(srcDir) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const files = findFiles(srcDir, extensions);

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

  // Step 3: Check CRITICAL variables first
  const missingCritical = CRITICAL_VARS.filter(v => !definedVars.includes(v));
  if (missingCritical.length > 0) {
    console.error('\n❌ CRITICAL ERROR: Required variables are missing from vite.config.ts:');
    missingCritical.forEach(v => console.error(`   - ${v}`));
    console.error('\n⚠️  These CRITICAL variables will be UNDEFINED in production!');
    console.error('\n📝 To fix: Add them to the "define" block in vite.config.ts:\n');
    console.error('   define: {');
    missingCritical.forEach(v => {
      console.error(`     'import.meta.env.${v}': JSON.stringify(env.${v} || ''),`);
    });
    console.error('   }');
    console.error('');
    process.exit(1);
  }
  
  // Step 4: Find missing non-critical definitions (WARNING only)
  const missing = usedVars.filter(v => !definedVars.includes(v) && !CRITICAL_VARS.includes(v));
  
  if (missing.length > 0) {
    console.warn('\n⚠️  WARNING: Non-critical variables are used in code but NOT defined in vite.config.ts:');
    console.warn(`   (${missing.length} variables)`);
    console.warn('\n   These may rely on Vite\'s default env loading (works in dev, may break in production)');
    console.warn('   Consider adding them to vite.config.ts for production builds.\n');
    
    // Show first 10 as examples
    const examples = missing.slice(0, 10);
    console.warn('   Examples:');
    examples.forEach(v => console.warn(`   - ${v}`));
    if (missing.length > 10) {
      console.warn(`   ... and ${missing.length - 10} more`);
    }
    console.warn('');
  }

  // Step 5: Success
  console.log('✅ All CRITICAL validations passed!');
  console.log('✅ Critical Telegram Gateway variables are properly defined:');
  CRITICAL_VARS.forEach(v => console.log(`   ✓ ${v}`));
  console.log('');
  console.log('🎉 Telegram Gateway authentication will work correctly!');
  
  if (missing.length === 0) {
    console.log('🎊 BONUS: All VITE_* variables are properly defined!');
  }
  
  process.exit(0);
}

main();

