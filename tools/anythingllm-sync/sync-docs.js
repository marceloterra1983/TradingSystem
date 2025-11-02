/**
 * AnythingLLM Auto-Sync Script
 * 
 * Monitora mudanças em docs/content/ e sincroniza automaticamente
 * com o AnythingLLM via API
 */

import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuração
const ANYTHINGLLM_URL = process.env.ANYTHINGLLM_URL || 'http://localhost:3001';
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;
const WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE_SLUG || 'tradingsystem-docs';
const WATCH_DIR = path.resolve(__dirname, '../../docs/content');

// Filtros
const INCLUDE_EXTENSIONS = ['.md', '.mdx', '.txt'];
const EXCLUDE_PATTERNS = ['node_modules', '.git', 'dist', 'build', '.DS_Store'];

/**
 * Validate file size (max 64KB for embedding models)
 * Context window típico: ~8k tokens = ~32KB text
 * Limite conservador: 64KB
 */
const MAX_FILE_SIZE = 64 * 1024; // 64KB

async function validateFile(filePath) {
  const stats = await fs.stat(filePath);
  
  if (stats.size > MAX_FILE_SIZE) {
    console.log(`   ⏭️  Skipping (too large: ${(stats.size / 1024).toFixed(1)}KB): ${path.basename(filePath)}`);
    return null; // null = skipped
  }
  
  return true;
}

/**
 * Upload arquivo para AnythingLLM usando API upload-link
 * @returns {boolean|null} true = success, false = error, null = skipped
 */
async function uploadFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(WATCH_DIR, filePath);
    
    // Validate file size first
    const validationResult = await validateFile(filePath);
    if (validationResult === null) return null; // Skipped
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Generate a valid URL for the document (required by AnythingLLM)
    const docUrl = `http://localhost/docs/${relativePath.replace(/\\/g, '/')}`;
    
    console.log(`📤 Uploading: ${relativePath}`);
    
    // Use upload-link endpoint instead of direct file upload
    const response = await fetch(
      `${ANYTHINGLLM_URL}/api/v1/workspace/${WORKSPACE_SLUG}/upload-link`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANYTHINGLLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: docUrl,
          title: fileName,
          textContent: fileContent,
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Success: ${fileName}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`   ❌ Failed (${response.status}): ${error.substring(0, 150)}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Verificar se arquivo deve ser processado
 */
function shouldProcess(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!INCLUDE_EXTENSIONS.includes(ext)) return false;
  
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.includes(pattern)) return false;
  }
  
  return true;
}

/**
 * Obter todos os arquivos recursivamente
 */
async function getAllFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_PATTERNS.some(p => entry.name.includes(p))) {
          files.push(...await getAllFiles(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Sincronização inicial (bulk upload)
 */
async function initialSync() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Starting Initial Sync');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📂 Directory: ${WATCH_DIR}`);
  console.log(`🎯 Workspace: ${WORKSPACE_SLUG}`);
  console.log('');
  
  const files = await getAllFiles(WATCH_DIR);
  const filtered = files.filter(shouldProcess);
  
  console.log(`📊 Found ${filtered.length} files to upload`);
  console.log('');
  
  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < filtered.length; i++) {
    const file = filtered[i];
    const success = await uploadFile(file);
    
    if (success === null) {
      skipped++; // File was skipped (too large, etc)
    } else if (success) {
      uploaded++;
    } else {
      failed++;
    }
    
    // Progress
    if ((i + 1) % 10 === 0) {
      console.log(`   📊 Progress: ${i + 1}/${filtered.length} (✅ ${uploaded} | ❌ ${failed} | ⏭️  ${skipped})`);
    }
    
    // Delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Initial Sync Complete`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭️  Skipped: ${skipped} (too large)`);
  console.log(`   📊 Total: ${filtered.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * Iniciar file watcher
 */
function startWatcher() {
  console.log('👀 Starting File Watcher...');
  console.log('   Watching for changes in:', WATCH_DIR);
  console.log('   Press Ctrl+C to stop');
  console.log('');
  
  const watcher = chokidar.watch(WATCH_DIR, {
    ignored: (filePath) => !shouldProcess(filePath),
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });
  
  watcher
    .on('add', (filePath) => {
      console.log(`[${new Date().toLocaleTimeString()}] 📄 New file: ${path.basename(filePath)}`);
      uploadFile(filePath);
    })
    .on('change', (filePath) => {
      console.log(`[${new Date().toLocaleTimeString()}] 📝 Changed: ${path.basename(filePath)}`);
      uploadFile(filePath);
    })
    .on('unlink', (filePath) => {
      console.log(`[${new Date().toLocaleTimeString()}] 🗑️  Deleted: ${path.basename(filePath)}`);
      // AnythingLLM não tem API de delete de documentos individual
      // Usuário precisa fazer manual na UI
    })
    .on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });
  
  console.log('✅ File Watcher Active!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

/**
 * Main
 */
async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 AnythingLLM Auto-Sync Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Validar configuração
  if (!ANYTHINGLLM_API_KEY) {
    console.error('');
    console.error('❌ ERROR: ANYTHINGLLM_API_KEY not set!');
    console.error('');
    console.error('To get your API key:');
    console.error('  1. Open AnythingLLM: http://localhost:3001');
    console.error('  2. Go to Settings → API Keys');
    console.error('  3. Generate new key');
    console.error('  4. Add to .env: ANYTHINGLLM_API_KEY=your-key');
    console.error('');
    process.exit(1);
  }
  
  // Verificar se diretório existe
  try {
    await fs.access(WATCH_DIR);
  } catch {
    console.error(`❌ Directory not found: ${WATCH_DIR}`);
    process.exit(1);
  }
  
  // Sync inicial
  await initialSync();
  
  // Iniciar watcher
  startWatcher();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👋 Shutting down gracefully...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
});

main();

