import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env do root do projeto
const projectRoot = path.resolve(__dirname, '../../..');
const envPath = path.join(projectRoot, '.env');

console.log(`[load-env] Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`[load-env] Warning: Could not load .env file: ${result.error.message}`);
} else {
  console.log('[load-env] .env loaded successfully');
}

export default result;
