import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env as apiEnv } from '../config/environment.js';
import {
  fetchNextQueuedRun,
  markRunFailure,
  markRunSuccess,
} from '../services/run-service.js';
import { getCourseWithSecret } from '../services/course-service.js';

const POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes

// Worker state for health checks
export const workerState = {
  isRunning: true,
  lastPollTime: Date.now(),
  activeRuns: new Map<string, { startTime: number; pid: number | undefined }>(),
};

async function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function processRun() {
  workerState.lastPollTime = Date.now();

  const run = await fetchNextQueuedRun();
  if (!run) {
    await delay(POLL_INTERVAL_MS);
    return;
  }

  console.log(`[Worker] Processing run ${run.id} for course ${run.courseId}`);

  const course = await getCourseWithSecret(run.courseId);
  if (!course) {
    console.error(`[Worker] Course ${run.courseId} not found for run ${run.id}`);
    await markRunFailure(run.id, new Error('Course not found'));
    return;
  }

  const runBaseDir = path.join(apiEnv.COURSE_CRAWLER_OUTPUT_BASE, run.id);
  await fs.mkdir(runBaseDir, { recursive: true });

  const childEnv = {
    ...process.env,
    COURSE_CRAWLER_BASE_URL: course.baseUrl,
    COURSE_CRAWLER_LOGIN_USERNAME: course.username,
    COURSE_CRAWLER_LOGIN_PASSWORD: course.password,
    COURSE_CRAWLER_OUTPUTS_DIR: runBaseDir,
    COURSE_CRAWLER_TARGET_URLS: course.targetUrls.join(','),
    COURSE_CRAWLER_SELECTORS_CONFIG:
      process.env.COURSE_CRAWLER_SELECTORS_CONFIG ??
      '/workspace/apps/course-crawler/config/platform-config.json',
  };

  await fs.access(apiEnv.COURSE_CRAWLER_CLI_PATH);

  console.log(`[Worker] Spawning CLI process for run ${run.id}`);
  const child = spawn('node', [apiEnv.COURSE_CRAWLER_CLI_PATH], {
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Track active run
  workerState.activeRuns.set(run.id, {
    startTime: Date.now(),
    pid: child.pid,
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (data) => {
    const chunk = data.toString();
    stdout += chunk;
    console.log(`[Worker][${run.id}][stdout]`, chunk.trim());
  });
  child.stderr?.on('data', (data) => {
    const chunk = data.toString();
    stderr += chunk;
    console.error(`[Worker][${run.id}][stderr]`, chunk.trim());
  });

  // Setup timeout
  const timeoutMs = process.env.COURSE_CRAWLER_TIMEOUT_MS
    ? parseInt(process.env.COURSE_CRAWLER_TIMEOUT_MS, 10)
    : DEFAULT_TIMEOUT_MS;

  const timeoutPromise = new Promise<number>((resolve) => {
    setTimeout(() => {
      console.warn(`[Worker] Run ${run.id} timed out after ${timeoutMs}ms, killing process`);
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          console.warn(`[Worker] Force killing run ${run.id} process`);
          child.kill('SIGKILL');
        }
      }, 5000);
      resolve(-1); // Timeout exit code
    }, timeoutMs);
  });

  const exitPromise = new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? -1);
    });
  });

  const exitCode = await Promise.race([exitPromise, timeoutPromise]);

  // Remove from active runs
  workerState.activeRuns.delete(run.id);

  if (exitCode === -1) {
    console.error(`[Worker] Run ${run.id} failed due to timeout`);
    await markRunFailure(
      run.id,
      new Error(
        `Execution timed out after ${timeoutMs}ms. Last output: ${(stderr || stdout).slice(-500)}`,
      ),
    );
    return;
  }

  if (exitCode !== 0) {
    console.error(`[Worker] Run ${run.id} failed with exit code ${exitCode}`);
    await markRunFailure(
      run.id,
      new Error(`Crawler exited with code ${exitCode}: ${stderr || stdout}`),
    );
    return;
  }

  console.log(`[Worker] Run ${run.id} completed successfully`);

  const artifacts = await fs.readdir(runBaseDir, { withFileTypes: true });
  let timestampedDirs = artifacts.filter(
    (entry) =>
      entry.isDirectory() &&
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(entry.name),
  );
  if (timestampedDirs.length === 0) {
    timestampedDirs = artifacts.filter((entry) => entry.isDirectory());
  }
  if (timestampedDirs.length === 0) {
    await markRunFailure(run.id, new Error('No output generated'));
    return;
  }

  timestampedDirs.sort((a, b) => (a.name < b.name ? 1 : -1));
  const latestDir = path.join(runBaseDir, timestampedDirs[0].name);
  const reportPath = path.join(latestDir, 'run-report.json');
  const reportExists = await fs
    .access(reportPath)
    .then(() => true)
    .catch(() => false);

  let metrics: Record<string, unknown> | undefined;
  if (reportExists) {
    const content = await fs.readFile(reportPath, 'utf-8');
    const json = JSON.parse(content) as Record<string, unknown>;
    if (json.metrics && typeof json.metrics === 'object') {
      metrics = json.metrics as Record<string, unknown>;
    }
  }

  await markRunSuccess(run.id, latestDir, metrics ?? {});
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Course Crawler worker started');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processRun();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Worker loop error', error);
      await delay(POLL_INTERVAL_MS);
    }
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Worker failed', error);
  process.exitCode = 1;
});
