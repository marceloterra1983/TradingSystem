const {cpSync, mkdirSync, rmSync, existsSync} = require('fs');
const path = require('path');

function syncSpecAssets() {
  try {
    console.log('📦  Syncing specification assets into Docusaurus static directory');
    
    const docsRoot = path.resolve(__dirname, '..');
    const repoRoot = path.resolve(docsRoot, '..', '..');

    const sourceSpecDir = path.resolve(repoRoot, 'docs/spec');
    const sourceStatusFile = path.resolve(repoRoot, 'docs/public/status.json');
    const targetSpecDir = path.resolve(docsRoot, 'static/spec');

    console.log(`   Source specs : ${sourceSpecDir}`);
    console.log(`   Target static: ${targetSpecDir}`);

    // Validate source directory exists
    if (!existsSync(sourceSpecDir)) {
      console.warn(`⚠️  Source spec directory not found: ${sourceSpecDir}`);
      console.warn('   Skipping sync - this is OK if specs are not yet generated');
      return;
    }

    // Clean and recreate target directory
    try {
      rmSync(targetSpecDir, {recursive: true, force: true});
    } catch (error) {
      console.warn(`⚠️  Could not remove target directory: ${error.message}`);
    }

    try {
      mkdirSync(targetSpecDir, {recursive: true});
    } catch (error) {
      console.error(`❌ Failed to create target directory: ${error.message}`);
      throw error;
    }

    // Copy spec directory
    try {
      cpSync(sourceSpecDir, targetSpecDir, {recursive: true});
      console.log(`   ✓ Copied specs from ${sourceSpecDir}`);
    } catch (error) {
      console.error(`❌ Failed to copy spec directory: ${error.message}`);
      throw error;
    }

    // Copy status file if it exists
    if (existsSync(sourceStatusFile)) {
      try {
        cpSync(sourceStatusFile, path.resolve(targetSpecDir, 'status.json'));
        console.log(`   ✓ Copied status file`);
      } catch (error) {
        console.warn(`⚠️  Could not copy status file: ${error.message}`);
      }
    }

    console.log('✅  Specification bundle ready at docs/docusaurus/static/spec');
  } catch (error) {
    console.error('❌ FATAL: Specification sync failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

console.log('🚀 Starting specification sync...');
syncSpecAssets();
console.log('✨ Specification sync completed successfully');

