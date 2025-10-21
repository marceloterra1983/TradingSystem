
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import { questdbClient } from '../src/questdbClient.js';
import { logger } from '../src/logger.js';
import { config, validateConfig } from '../src/config.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const samplePath = path.resolve(__dirname, '../samples/sample-signals.json');

async function seed() {
  validateConfig(logger);
  const raw = await readFile(samplePath, 'utf-8');
  const signals = JSON.parse(raw);
  logger.info({ count: signals.length }, 'Seeding sample TP Capital signals');

  for (const signal of signals) {
    try {
      await questdbClient.writeSignal(signal);
      logger.info({ asset: signal.asset, ts: signal.timestamp }, 'Seeded signal');
    } catch (error) {
      logger.error({ err: error, asset: signal.asset }, 'Failed to seed signal');
    }
  }

  logger.info('Seed complete');
  process.exit(0);
}

seed().catch((error) => {
  logger.error({ err: error }, 'Seed failed');
  process.exit(1);
});
