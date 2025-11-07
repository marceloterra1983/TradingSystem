#!/usr/bin/env node
import { loadEnvironment } from './config/environment.js';
import { runExtractionPipeline } from './pipeline/extraction-pipeline.js';
import { createPersistenceLayer } from './persistence/neon-persistence.js';
import pino from 'pino';

async function main() {
  const env = loadEnvironment();
  const logger = pino({
    level: env.logLevel,
    transport:
      env.runtimeEnvironment === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
  });

  const persistence = await createPersistenceLayer(env, logger);
  const { outputDir } = await runExtractionPipeline({ env, logger, persistence });
  logger.info({ outputDir }, '[course-crawler] Pipeline finished');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
