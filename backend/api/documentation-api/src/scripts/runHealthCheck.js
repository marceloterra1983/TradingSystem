import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import DocsHealthChecker from '../services/docsHealthChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');

export async function runHealthCheck() {
  try {
    const specsDir = path.join(projectRoot, 'docs/spec');
    const checker = new DocsHealthChecker(specsDir);

    const results = await checker.checkHealth();

    const statusPath = path.join(projectRoot, 'docs/public/status.json');
    await fs.writeFile(statusPath, JSON.stringify(results, null, 2));

    console.log('Health check completed:', results.status);
    if (results.issues && results.issues.length > 0) {
      console.log('Issues found:');
      results.issues.forEach((issue) => console.log('-', issue));
    }
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck();
}

export default runHealthCheck;
