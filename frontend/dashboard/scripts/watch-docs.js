import chokidar from 'chokidar';
import { cpSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate from frontend/dashboard/scripts to project root
const projectRoot = join(__dirname, '../../..');
const docsSource = join(projectRoot, 'docs/context/shared/product/prd');
const docsTarget = join(__dirname, '../public/docs/context/shared/product/prd');

console.log('👀 Watching for PRD file changes...');
console.log(`   Source: ${docsSource}`);
console.log(`   Target: ${docsTarget}`);
console.log('');

// Create target directory if it doesn't exist
mkdirSync(docsTarget, { recursive: true });

// Initial copy
console.log('📋 Initial copy of PRD files...');
try {
  cpSync(docsSource, docsTarget, { 
    recursive: true,
    force: true,
    errorOnExist: false
  });
  console.log('✅ Initial copy complete!');
} catch (error) {
  // WSL2 workaround: If cpSync fails with EPERM, try rsync
  if (error.code === 'EPERM') {
    console.log('⚠️  WSL2 detected - using rsync...');
    try {
      execSync(`rsync -av --delete "${docsSource}/" "${docsTarget}/"`, { stdio: 'inherit' });
      console.log('✅ Initial copy complete (rsync)!');
    } catch (rsyncError) {
      console.warn('⚠️  Copy failed, but continuing with file watcher...');
      console.warn('   Files will sync on change events.');
    }
  } else {
    throw error;
  }
}
console.log('');

// Watch for changes
const watcher = chokidar.watch(docsSource, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

watcher
  .on('add', path => {
    const relativePath = relative(docsSource, path);
    console.log(`➕ File added: ${relativePath}`);
    copyFile(path, join(docsTarget, relativePath));
  })
  .on('change', path => {
    const relativePath = relative(docsSource, path);
    console.log(`📝 File changed: ${relativePath}`);
    copyFile(path, join(docsTarget, relativePath));
  })
  .on('unlink', path => {
    const relativePath = relative(docsSource, path);
    console.log(`🗑️  File removed: ${relativePath}`);
    // Could delete the file in target, but safer to just log it
  })
  .on('error', error => {
    console.error('❌ Watcher error:', error);
  });

function copyFile(source, target) {
  try {
    const targetDir = dirname(target);
    mkdirSync(targetDir, { recursive: true });
    cpSync(source, target);
    console.log(`   ✅ Synced to public folder`);
  } catch (error) {
    console.error(`   ❌ Error copying: ${error.message}`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping file watcher...');
  watcher.close();
  process.exit(0);
});
