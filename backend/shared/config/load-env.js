/**
 * Centralized Environment Loader
 * Loads .env from project root for all backend services
 * 
 * Usage:
 *   import '../../../shared/config/load-env.js';
 *   // or
 *   require('../../../shared/config/load-env.js');
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const moduleRequire = createRequire(__filename);

async function resolveDotenv() {
  try {
    const module = await import('dotenv');
    return module.default;
  } catch (primaryError) {
    try {
      const servicePackageJson = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(servicePackageJson)) {
        const serviceRequire = createRequire(servicePackageJson);
        return serviceRequire('dotenv');
      }
    } catch (_serviceError) {
      // Ignore and fall through to final attempt
    }

    try {
      return moduleRequire('dotenv');
    } catch {
      throw primaryError;
    }
  }
}

const dotenv = await resolveDotenv();

// Calculate path to project root (from backend/shared/config/ to root)
const projectRoot = path.resolve(__dirname, '../../../');
const envFiles = [
  path.join(projectRoot, 'config', 'container-images.env'),
  path.join(projectRoot, 'config', '.env.defaults'),
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.local'),
];

export function loadEnvironment() {
  envFiles.forEach((file, index) => {
    if (!fs.existsSync(file)) {
      return;
    }

    const override = index >= 2; // allow .env and .env.local to override previous values
    const result = dotenv.config({ path: file, override });

    if (result.error) {
      console.warn(`⚠️  Warning: Could not load environment file: ${file}`);
    }
  });
}

loadEnvironment();

export default loadEnvironment;
