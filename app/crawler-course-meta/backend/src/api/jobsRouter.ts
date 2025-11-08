import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { jobSchema } from '../core/schema.js';
import { getJob, listJobs, listRunsByJob, saveJob } from '../core/jobStore.js';
import { runJob } from '../core/jobRunner.js';
import env from '../config/env.js';
import logger from '../observability/logger.js';
import { listArtifacts } from '../utils/fileSystem.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ jobs: listJobs() });
});

router.post('/', (req, res) => {
  const parseResult = jobSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const job = parseResult.data;
  saveJob(job);
  logger.info({ jobId: job.id }, 'Job created');
  return res.status(201).json({ job });
});

router.get('/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const runs = listRunsByJob(job.id);
  return res.json({ job, runs });
});

router.post('/:id/run', async (req, res) => {
  try {
    const runId = await runJob(req.params.id);
    return res.status(202).json({ runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/:id/dry-run', async (req, res) => {
  try {
    const runId = await runJob(req.params.id, { dryRun: true });
    return res.status(202).json({ runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.get('/:id/artifacts', (req, res) => {
  const jobId = req.params.id;
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const baseDir = path.join(env.outputRoot, jobId);
  const artifacts = listArtifacts(baseDir);
  return res.json({ artifacts });
});

router.get('/:id/report', (req, res) => {
  const jobId = req.params.id;
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const baseDir = path.join(env.outputRoot, jobId);
  if (!fs.existsSync(baseDir)) {
    return res.status(404).json({ error: 'No runs available' });
  }
  const runs = fs.readdirSync(baseDir).sort();
  if (!runs.length) {
    return res.status(404).json({ error: 'No run reports found' });
  }
  const lastRunDir = path.join(baseDir, runs[runs.length - 1]);
  const reportFile = path.join(lastRunDir, 'report.json');
  if (!fs.existsSync(reportFile)) {
    return res.status(404).json({ error: 'report.json not found' });
  }
  const payload = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
  return res.json(payload);
});

export default router;
