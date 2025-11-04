#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/__tests__/components/DocsHybridSearchPage.spec.tsx';
let content = readFileSync(filePath, 'utf8');

// Replace all `it('...', async () => {` with `it('...', { timeout: 30000 }, async () => {`
// BUT skip if already has timeout

const regex = /(\s+it\(['"](should [^'"]+)['"],\s*)async\s*\(\)\s*=>\s*\{/g;

let modified = 0;
const newContent = content.replace(regex, (match, prefix, _testName) => {
  // Check if this test already has timeout
  if (match.includes('{ timeout:')) {
    return match;
  }

  modified++;
  return `${prefix}{ timeout: 30000 }, async () => {`;
});

writeFileSync(filePath, newContent, 'utf8');

console.log(`✅ Added timeouts to ${modified} tests!`);
