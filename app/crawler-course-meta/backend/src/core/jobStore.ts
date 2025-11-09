import fs from 'node:fs';
import path from 'node:path';
import env from '../config/env.js';
import { ensureDir, writeJson } from '../utils/fileSystem.js';
import { JobDefinition, JobRun } from './types.js';

const jobs = new Map<string, JobDefinition>();
const runs = new Map<string, JobRun>();
const jobsDir = path.join(env.outputRoot, 'jobs');
const jobsFile = path.join(jobsDir, 'jobs.json');

const loadPersistedJobs = () => {
  if (!fs.existsSync(jobsFile)) return;
  try {
    const raw = fs.readFileSync(jobsFile, 'utf-8');
    const parsed = JSON.parse(raw) as JobDefinition[];
    parsed.forEach((job) => {
      if (job?.id) {
        jobs.set(job.id, job);
      }
    });
  } catch (error) {
    console.error('Failed to load persisted jobs', error);
  }
};

const persistJobs = () => {
  ensureDir(jobsDir);
  writeJson(jobsFile, Array.from(jobs.values()));
};

loadPersistedJobs();

export const saveJob = (job: JobDefinition) => {
  jobs.set(job.id, job);
  persistJobs();
  return job;
};

export const updateJob = (id: string, job: JobDefinition) => {
  if (!jobs.has(id)) {
    throw new Error('Job not found');
  }
  jobs.set(id, job);
  persistJobs();
  return job;
};

export const listJobs = () => Array.from(jobs.values());

export const getJob = (id: string) => jobs.get(id);

export const createRun = (run: JobRun) => {
  runs.set(run.runId, run);
  return run;
};

export const updateRun = (runId: string, patch: Partial<JobRun>) => {
  const current = runs.get(runId);
  if (!current) throw new Error('Run not found');
  const updated = { ...current, ...patch };
  runs.set(runId, updated);
  return updated;
};

export const getRun = (runId: string) => runs.get(runId);

export const listRunsByJob = (jobId: string) => {
  return Array.from(runs.values()).filter((r) => r.jobId === jobId);
};

export const deleteJob = (id: string) => {
  const exists = jobs.delete(id);
  if (!exists) return false;
  Array.from(runs.entries()).forEach(([runId, run]) => {
    if (run.jobId === id) {
      runs.delete(runId);
    }
  });
  persistJobs();
  return true;
};
