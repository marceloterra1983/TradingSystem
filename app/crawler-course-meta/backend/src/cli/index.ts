#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { jobSchema } from '../core/schema.js';
import { saveJob, listJobs } from '../core/jobStore.js';
import { runJob } from '../core/jobRunner.js';
import { ensureDir, writeText } from '../utils/fileSystem.js';
import env from '../config/env.js';

const program = new Command();
program.name('crawler-course-meta').description('CLI para orquestrar jobs de metadados de cursos');

const loadJobFile = (filePath: string) => {
  const full = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(full)) {
    throw new Error(`Job file ${filePath} not found`);
  }
  const raw = fs.readFileSync(full, 'utf-8');
  const payload = filePath.endsWith('.json') ? JSON.parse(raw) : YAML.parse(raw);
  return jobSchema.parse(payload);
};

program
  .command('init')
  .description('Cria um job-file.yml de exemplo')
  .option('-o, --output <path>', 'Destino do arquivo', './jobs/job-hotmart.yml')
  .action((opts) => {
    const template = `id: job-hotmart-2025-11-08
platform: hotmart
start_urls:
  - https://hotmart.com/course/meu-curso
auth:
  method: form
  owner_login: true
  credentials_env:
    username: OWNER_USERNAME
    password: OWNER_PASSWORD
  session_store:
    enabled: true
    path: ./sessions/hotmart.session.enc
    encrypt_with_env: SESSION_KEY
selectors:
  course:
    title: css:h1.course-title
output:
  format: [json, md]
  directory: ./outputs/hotmart
`;
    const dest = path.resolve(process.cwd(), opts.output);
    ensureDir(path.dirname(dest));
    writeText(dest, template);
    console.log(`Arquivo criado em ${dest}`);
  });

program
  .command('run <jobFile>')
  .description('Executa um job real')
  .action(async (jobFile: string) => {
    const job = loadJobFile(jobFile);
    saveJob(job);
    const runId = await runJob(job.id);
    console.log(`Run finalizado: ${runId}`);
    console.log(`Artefatos: ${path.join(env.outputRoot, job.id, runId)}`);
  });

program
  .command('dry-run <jobFile>')
  .description('Executa navegação sem gravar artefatos')
  .action(async (jobFile: string) => {
    const job = loadJobFile(jobFile);
    saveJob(job);
    const runId = await runJob(job.id, { dryRun: true });
    console.log(`Dry-run concluído: ${runId}`);
  });

program
  .command('list')
  .description('Lista jobs carregados')
  .action(() => {
    console.table(listJobs());
  });

program.parseAsync(process.argv);
