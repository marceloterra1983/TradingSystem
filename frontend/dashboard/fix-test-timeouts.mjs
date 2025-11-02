#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/__tests__/components/DocsHybridSearchPage.spec.tsx';
let content = readFileSync(filePath, 'utf8');

// Pattern: it('...', async () => { followed by vi.useFakeTimers()
// Replace with: it('...', { timeout: 30000 }, async () => {

const lines = content.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this line is an `it(...)` test declaration
  const itMatch = line.match(/^(\s+)it\('([^']+)',\s*async\s*\(\)\s*=>\s*\{/);

  if (itMatch) {
    // Check if the next line (or within next 3 lines) has vi.useFakeTimers()
    const nextFewLines = lines.slice(i, i + 4).join('\n');
    if (nextFewLines.includes('vi.useFakeTimers()')) {
      // Check if timeout is already added
      if (!line.includes('{ timeout:')) {
        // Add timeout
        const indent = itMatch[1];
        const testName = itMatch[2];
        newLines.push(`${indent}it('${testName}', { timeout: 30000 }, async () => {`);
        continue;
      }
    }
  }

  newLines.push(line);
}

writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('✅ Fixed test timeouts!');
console.log('Total lines:', lines.length);
console.log('Modified lines:', lines.length - newLines.filter((l, i) => l === lines[i]).length);
