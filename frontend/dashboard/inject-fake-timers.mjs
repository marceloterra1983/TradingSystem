#!/usr/bin/env node
/**
 * Script to inject fake timers into tests that use userEvent.type()
 *
 * Pattern to inject:
 * 1. Add vi.useFakeTimers() at start of test
 * 2. Wrap test body in try...finally
 * 3. Add timer advancement after userEvent.type()
 * 4. Call vi.useRealTimers() in finally block
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/__tests__/components/DocsHybridSearchPage.spec.tsx';

console.log('📖 Reading test file...');
const content = readFileSync(FILE, 'utf8');

console.log('💾 Creating backup...');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
writeFileSync(`${FILE}.backup-${timestamp}`, content, 'utf8');

console.log('🔍 Analyzing tests...');
const lines = content.split('\n');
const newLines = [];
let modified = 0;
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  // Check if this is a test declaration that needs fake timers
  const testMatch = line.match(/^(\s+)it\('(.+?)', \{ timeout: 30000 \}, async \(\) => \{$/);

  if (testMatch) {
    const indent = testMatch[1];
    const testName = testMatch[2];

    // Look ahead to see if this test uses userEvent.type() and doesn't already have fake timers
    let hasUserEventType = false;
    let hasFakeTimers = false;
    let j = i + 1;
    let bracketCount = 1;

    while (j < lines.length && bracketCount > 0) {
      const nextLine = lines[j];

      if (nextLine.includes('userEvent.type(')) {
        hasUserEventType = true;
      }
      if (nextLine.includes('vi.useFakeTimers()')) {
        hasFakeTimers = true;
        break;
      }

      // Track brackets to know when test ends
      bracketCount += (nextLine.match(/\{/g) || []).length;
      bracketCount -= (nextLine.match(/\}/g) || []).length;

      if (bracketCount === 0) break;
      j++;
    }

    // If test uses userEvent.type() and doesn't have fake timers, inject them
    if (hasUserEventType && !hasFakeTimers) {
      console.log(`  ✓ Injecting fake timers: "${testName}"`);
      modified++;

      // Add test declaration
      newLines.push(line);
      i++;

      // Add fake timer setup
      newLines.push(`${indent}  vi.useFakeTimers();`);
      newLines.push(`${indent}  try {`);

      // Process test body until we hit the closing bracket
      bracketCount = 1;
      let foundUserEventType = false;

      while (i < lines.length && bracketCount > 0) {
        const bodyLine = lines[i];

        // Add extra indent for try block
        if (bodyLine.trim()) {
          newLines.push(`${indent}  ${bodyLine.trimStart()}`);
        } else {
          newLines.push(bodyLine);
        }

        // After userEvent.type(), add timer advancement
        if (bodyLine.includes('userEvent.type(') && !foundUserEventType) {
          foundUserEventType = true;
          newLines.push('');
          newLines.push(`${indent}    // Advance timers past debounce delay`);
          newLines.push(`${indent}    await vi.advanceTimersByTimeAsync(400);`);
          newLines.push(`${indent}    await vi.runAllTimersAsync();`);
        }

        // Track brackets
        bracketCount += (bodyLine.match(/\{/g) || []).length;
        bracketCount -= (bodyLine.match(/\}/g) || []).length;

        i++;

        // If we hit the closing bracket of the test, insert finally block
        if (bracketCount === 0) {
          // Remove last closing bracket from newLines
          newLines.pop();

          // Add finally block
          newLines.push(`${indent}  } finally {`);
          newLines.push(`${indent}    vi.useRealTimers();`);
          newLines.push(`${indent}  }`);
          newLines.push(`${indent}});`);
          break;
        }
      }

      continue;
    }
  }

  newLines.push(line);
  i++;
}

console.log(`\n✅ Modified ${modified} tests`);
console.log('💾 Writing updated file...');
writeFileSync(FILE, newLines.join('\n'), 'utf8');

console.log('\n📊 Summary:');
console.log(`  • Tests modified: ${modified}`);
console.log(`  • Backup created: ${FILE}.backup-${timestamp}`);
console.log(`  • File updated: ${FILE}`);

console.log('\n🧪 Next: Run tests to verify');
console.log('   npm test -- DocsHybridSearchPage.spec.tsx --run\n');
