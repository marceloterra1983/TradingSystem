import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const repoRoot = path.resolve(process.cwd(), '../../..');
const rootEnvPath = path.join(repoRoot, '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPort: Number(process.env.API_PORT ?? 8080),
  prometheusPort: Number(process.env.PROMETHEUS_PORT ?? 9234),
  outputRoot: process.env.CCM_OUTPUT_ROOT || path.join(repoRoot, 'outputs', 'crawler-course-meta'),
  sessionKey: process.env.SESSION_ENCRYPTION_KEY ?? 'change-me',
};

export default env;
