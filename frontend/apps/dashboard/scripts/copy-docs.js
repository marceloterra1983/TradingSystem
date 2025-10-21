import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate from frontend/apps/dashboard/scripts to project root
const projectRoot = join(__dirname, '../../../..');
const docsSource = join(projectRoot, 'docs/context/shared/product/prd');
const docsTarget = join(__dirname, '../public/docs/context/shared/product/prd');

console.log('📋 Copying PRD files...');
console.log(`   From: ${docsSource}`);
console.log(`   To: ${docsTarget}`);

try {
  // Create target directory
  mkdirSync(docsTarget, { recursive: true });

  // Copy files
  cpSync(docsSource, docsTarget, { recursive: true });

  console.log('✅ PRD files copied successfully!');
} catch (error) {
  console.error('❌ Error copying PRD files:', error.message);
  process.exit(1);
}
