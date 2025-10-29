#!/usr/bin/env node

/**
 * Documentation File Watcher
 * Monitors docs/content/ for changes and triggers re-ingestion automatically
 */

import { watch } from 'fs';
import { join, relative } from 'path';
import fetch from 'node-fetch';

// Configuration
const DOCS_DIR = process.env.DOCS_DIR || join(process.cwd(), '../../docs/content');
const API_BASE = process.env.DOCS_API_URL || 'http://localhost:3401';
const DEBOUNCE_MS = parseInt(process.env.WATCH_DEBOUNCE_MS || '5000', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

// State
let debounceTimer = null;
let pendingChanges = new Set();

console.log('📚 Documentation File Watcher');
console.log(`   Watching: ${DOCS_DIR}`);
console.log(`   API: ${API_BASE}`);
console.log(`   Debounce: ${DEBOUNCE_MS}ms`);
console.log(`   Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
console.log('');

/**
 * Trigger re-ingestion for both FlexSearch and Qdrant
 */
async function triggerReingestion() {
  console.log(`\n🔄 Triggering re-ingestion (${pendingChanges.size} changes detected)...`);

  if (DRY_RUN) {
    console.log('   [DRY RUN] Skipping actual API calls');
    console.log('   Changed files:', Array.from(pendingChanges).join(', '));
    pendingChanges.clear();
    return;
  }

  try {
    // 1. Re-index FlexSearch
    console.log('   📇 Re-indexing FlexSearch...');
    const flexResp = await fetch(`${API_BASE}/api/v1/docs/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (flexResp.ok) {
      const flexData = await flexResp.json();
      console.log(`   ✅ FlexSearch: ${flexData.indexed?.files || 0} files indexed`);
    } else {
      console.error(`   ❌ FlexSearch failed: ${flexResp.status}`);
    }

    // 2. Re-ingest Qdrant
    console.log('   🔍 Re-ingesting Qdrant...');
    const qdrantResp = await fetch(`${API_BASE}/api/v1/rag/status/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (qdrantResp.ok) {
      const qdrantData = await qdrantResp.json();
      const docsProcessed = qdrantData.ingestion?.documents_processed || 0;
      console.log(`   ✅ Qdrant: ${docsProcessed} documents processed`);
    } else {
      console.error(`   ❌ Qdrant failed: ${qdrantResp.status}`);
    }

    console.log(`\n✨ Re-ingestion completed successfully`);
  } catch (error) {
    console.error(`\n❌ Re-ingestion failed:`, error.message);
  } finally {
    pendingChanges.clear();
  }
}

/**
 * Debounced re-ingestion trigger
 */
function scheduleReingestion(filename) {
  pendingChanges.add(filename);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    triggerReingestion();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

/**
 * Watch for file changes
 */
try {
  const watcher = watch(
    DOCS_DIR,
    { recursive: true },
    (eventType, filename) => {
      if (!filename) return;

      // Only watch .md and .mdx files
      if (!/\.(md|mdx)$/i.test(filename)) return;

      const relativePath = relative(DOCS_DIR, filename);

      if (eventType === 'rename' || eventType === 'change') {
        console.log(`📝 ${eventType === 'rename' ? 'Modified' : 'Changed'}: ${relativePath}`);
        scheduleReingestion(relativePath);
      }
    }
  );

  console.log('👀 Watching for changes... (Press Ctrl+C to stop)\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    watcher.close();
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Failed to start watcher:', error.message);
  process.exit(1);
}
