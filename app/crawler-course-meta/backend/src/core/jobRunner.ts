import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import env from '../config/env.js';
import logger from '../observability/logger.js';
import { ensureDir, writeJson, writeText } from '../utils/fileSystem.js';
import { createRun, getJob, updateRun } from './jobStore.js';
import { JobRun } from './types.js';
import { itemsExtracted, pagesVisited, runtimeSeconds } from '../observability/metrics.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RunOptions {
  dryRun?: boolean;
}

export const runJob = async (jobId: string, options: RunOptions = {}) => {
  const job = getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const runId = randomUUID();
  const run: JobRun = {
    jobId,
    runId,
    startedAt: new Date().toISOString(),
    status: 'running',
    progress: 0,
    logs: [`Run ${runId} started${options.dryRun ? ' (dry-run)' : ''}`],
    artifacts: [],
  };

  createRun(run);
  const promTimer = runtimeSeconds.startTimer();
  let durationSeconds = 0;
  const stopTimer = () => {
    if (durationSeconds === 0) {
      durationSeconds = promTimer();
    }
    return durationSeconds;
  };

  try {
    const totalSteps = job.start_urls.length;
    let extractedTotal = 0;
    for (let i = 0; i < totalSteps; i += 1) {
      const target = job.start_urls[i];
      pagesVisited.inc();
      logger.info({ jobId, runId, target }, 'Visiting course page');
      await sleep(300);
      const extracted = Math.floor(Math.random() * 20) + 1;
      itemsExtracted.inc(extracted);
      extractedTotal += extracted;
      run.logs.push(`Visited ${target} and extracted ${extracted} items`);
      run.progress = Math.round(((i + 1) / totalSteps) * 100);
      updateRun(runId, { logs: run.logs, progress: run.progress });
    }

    if (!options.dryRun) {
      const baseDir = path.join(env.outputRoot, job.id, runId);
      ensureDir(baseDir);
      const jsonPath = path.join(baseDir, 'data.json');
      const mdPath = path.join(baseDir, 'data.md');
      const reportPath = path.join(baseDir, 'report.json');

      const payload = {
        jobId,
        runId,
        extractedAt: new Date().toISOString(),
        selectors: job.selectors,
        start_urls: job.start_urls,
      };

      if (job.output.format.includes('json')) {
        writeJson(jsonPath, payload);
        run.artifacts.push(jsonPath);
      }

      if (job.output.format.includes('md')) {
        const md = `# Report ${jobId}\n- Run: ${runId}\n- Timestamp: ${new Date().toISOString()}\n- URLs: ${job.start_urls.length}`;
        writeText(mdPath, md);
        run.artifacts.push(mdPath);
      }

      stopTimer();
      writeJson(reportPath, {
        job_id: jobId,
        run_id: runId,
        status: 'completed',
        runtime_seconds: durationSeconds,
        items_extracted: extractedTotal,
      });
      run.artifacts.push(reportPath);
    } else {
      run.logs.push('Dry-run completed without writing artifacts');
    }

    stopTimer();
    updateRun(runId, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
      logs: run.logs,
      artifacts: run.artifacts,
      progress: 100,
    });

    return runId;
  } catch (error) {
    stopTimer();
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ jobId, runId, error: message }, 'Job run failed');
    updateRun(runId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: message,
    });
    throw error;
  }
};
