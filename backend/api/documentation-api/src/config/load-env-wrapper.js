import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedLoaderPath = path.resolve(
  __dirname,
  '../../../../shared/config/load-env.js'
);

async function loadSharedEnvironment() {
  try {
    if (fs.existsSync(sharedLoaderPath)) {
      await import(pathToFileURL(sharedLoaderPath).href);
      return true;
    }
  } catch (error) {
    console.warn(
      '⚠️  Failed to load shared environment loader. Falling back to local .env files.',
      error
    );
  }
  return false;
}

function loadLocalEnvironment() {
  const projectRoot = path.resolve(__dirname, '../../..');
  const envFiles = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
  ];

  envFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      const result = dotenv.config({ path: file, override: true });
      if (result.error) {
        console.warn(`⚠️  Warning: Could not load environment file: ${file}`);
      }
    }
  });
}

const sharedLoaded = await loadSharedEnvironment();
if (!sharedLoaded) {
  loadLocalEnvironment();
}
