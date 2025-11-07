import type { Express, Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../config/environment.js';
import { enqueueRun, getRun, listRuns, cancelRun } from '../services/run-service.js';
import { getCourse } from '../services/course-service.js';
import { workerState } from '../jobs/worker.js';

const artifactQuerySchema = z.object({
  path: z.string().min(1),
});

async function listArtifacts(outputsDir: string) {
  const entries = await fs.readdir(outputsDir, { withFileTypes: true });
  const files: Array<{ path: string; type: 'directory' | 'file' }> = [];
  for (const entry of entries) {
    const relative = entry.name;
    const fullPath = path.join(outputsDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listArtifacts(fullPath);
      nested.forEach((item) =>
        files.push({
          path: path.join(relative, item.path),
          type: item.type,
        }),
      );
    } else {
      files.push({
        path: relative,
        type: 'file',
      });
    }
  }
  return files;
}

function ensureInside(base: string, target: string) {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error('Invalid artifact path');
  }
}

export function registerRunRoutes(app: Express) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const runs = await listRuns();
      res.json(runs);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const run = await getRun(req.params.id);
      if (!run) {
        res.status(404).json({ message: 'Run not found' });
        return;
      }
      res.json(run);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/artifacts', async (req, res, next) => {
    try {
      const run = await getRun(req.params.id);
      if (!run || !run.outputsDir) {
        res.status(404).json({ message: 'Artifacts not available' });
        return;
      }
      ensureInside(env.COURSE_CRAWLER_OUTPUT_BASE, run.outputsDir);
      const files = await listArtifacts(run.outputsDir);
      res.json(files);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/artifacts/raw', async (req, res, next) => {
    try {
      const run = await getRun(req.params.id);
      if (!run || !run.outputsDir) {
        res.status(404).json({ message: 'Artifacts not available' });
        return;
      }
      const { path: relativePath } = artifactQuerySchema.parse(req.query);
      const targetPath = path.join(run.outputsDir, relativePath);
      ensureInside(env.COURSE_CRAWLER_OUTPUT_BASE, targetPath);
      const content = await fs.readFile(targetPath, 'utf-8');
      res.type('text/plain').send(content);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const runId = req.params.id;
      const run = await getRun(runId);

      if (!run) {
        res.status(404).json({ message: 'Run not found' });
        return;
      }

      if (run.status !== 'queued' && run.status !== 'running') {
        res.status(400).json({
          message: `Cannot cancel run with status '${run.status}'`
        });
        return;
      }

      // Kill the process if it's currently running
      const activeRun = workerState.activeRuns.get(runId);
      if (activeRun && activeRun.pid) {
        try {
          process.kill(activeRun.pid, 'SIGTERM');
          console.log(`[API] Sent SIGTERM to process ${activeRun.pid} for run ${runId}`);
        } catch (error) {
          console.error(`[API] Failed to kill process ${activeRun.pid}:`, error);
        }
      }

      const cancelled = await cancelRun(runId);
      if (!cancelled) {
        res.status(400).json({ message: 'Run could not be cancelled' });
        return;
      }

      res.json(cancelled);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/courses/:id/runs',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const course = await getCourse(req.params.id);
        if (!course) {
          res.status(404).json({ message: 'Course not found' });
          return;
        }
        const run = await enqueueRun(req.params.id);
        res.status(202).json(run);
      } catch (error) {
        next(error);
      }
    },
  );

  app.use('/runs', router);
}
