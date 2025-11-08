import { JobDefinition, JobRun } from './types.js';

const jobs = new Map<string, JobDefinition>();
const runs = new Map<string, JobRun>();

export const saveJob = (job: JobDefinition) => {
  jobs.set(job.id, job);
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
