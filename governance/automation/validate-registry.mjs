#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');
const governanceDir = path.join(repoRoot, 'governance');
const registryPath = path.join(governanceDir, 'registry/registry.json');
const schemaPath = path.join(
  governanceDir,
  'registry/schemas/registry.schema.json',
);

const REQUIRED_FIELDS = [
  'id',
  'title',
  'description',
  'category',
  'type',
  'owner',
  'reviewCycleDays',
  'lastReviewed',
  'tags',
  'path',
  'publish',
];
const VALID_OWNERS = new Set([
  'DocsOps',
  'ProductOps',
  'ArchitectureGuild',
  'FrontendGuild',
  'BackendGuild',
  'ToolingGuild',
  'DataOps',
  'SecurityOps',
  'PromptOps',
  'MCPGuild',
  'SupportOps',
  'ReleaseOps',
  'Platform Architecture',
]);
const MS_IN_DAY = 24 * 60 * 60 * 1000;

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function validateSchema(registry, schema) {
  if (typeof registry.version !== 'number') {
    throw new Error('registry.version must be a number');
  }
  if (!Array.isArray(registry.artifacts)) {
    throw new Error('registry.artifacts must be an array');
  }
  if (!schema) {
    throw new Error('registry schema missing');
  }
}

function computeFreshness(artifact) {
  const lastReviewed = new Date(artifact.lastReviewed);
  if (Number.isNaN(lastReviewed.getTime())) {
    return { status: 'invalid-date', daysOverdue: Infinity };
  }
  const reviewCycle = Number(artifact.reviewCycleDays || 90);
  const dueDate = new Date(lastReviewed.getTime() + reviewCycle * MS_IN_DAY);
  const diff = Math.round((Date.now() - dueDate.getTime()) / MS_IN_DAY);
  return diff > 0
    ? { status: 'overdue', daysOverdue: diff }
    : { status: 'ok', daysOverdue: 0 };
}

function validatePublishConfig(artifact) {
  const publish = artifact.publish;
  if (publish === null) return [];
  const errors = [];
  const requiredFields = ['docsPath', 'slug', 'sidebar'];
  for (const field of requiredFields) {
    if (!publish[field]) {
      errors.push(`publish.${field} missing for ${artifact.id}`);
    }
  }
  return errors;
}

function validateArtifact(artifact) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (typeof artifact[field] === 'undefined') {
      errors.push(`${artifact.id}: missing ${field}`);
    }
  }
  if (artifact.tags && !Array.isArray(artifact.tags)) {
    errors.push(`${artifact.id}: tags must be an array`);
  }
  if (!VALID_OWNERS.has(artifact.owner)) {
    errors.push(`${artifact.id}: owner "${artifact.owner}" not in allow list`);
  }
  if (artifact.reviewCycleDays <= 0) {
    errors.push(`${artifact.id}: reviewCycleDays must be > 0`);
  }

  return errors.concat(validatePublishConfig(artifact));
}

async function main() {
  const [registry, schema] = await Promise.all([
    readJson(registryPath),
    readJson(schemaPath),
  ]);
  validateSchema(registry, schema);

  const errors = [];
  const warnings = [];

  for (const artifact of registry.artifacts) {
    errors.push(...validateArtifact(artifact));
    const absolutePath = path.join(governanceDir, artifact.path);
    try {
      await fs.access(absolutePath);
    } catch {
      errors.push(`${artifact.id}: source file missing (${artifact.path})`);
    }

    const freshness = computeFreshness(artifact);
    if (freshness.status === 'overdue') {
      errors.push(
        `${artifact.id}: overdue by ${freshness.daysOverdue} days (lastReviewed ${artifact.lastReviewed})`,
      );
    } else if (freshness.status === 'invalid-date') {
      errors.push(`${artifact.id}: invalid lastReviewed date`);
    } else {
      const reviewCycle = Number(artifact.reviewCycleDays || 90);
      const dueDate = new Date(
        new Date(artifact.lastReviewed).getTime() + reviewCycle * MS_IN_DAY,
      );
      const daysUntilDue = Math.round(
        (dueDate.getTime() - Date.now()) / MS_IN_DAY,
      );
      if (daysUntilDue <= 15) {
        warnings.push(
          `${artifact.id}: due in ${daysUntilDue} days (${dueDate
            .toISOString()
            .slice(0, 10)})`,
        );
      }
    }
  }

  if (errors.length) {
     
    console.error('[governance:validate] Validation failed:');
    for (const err of errors) {
       
      console.error(`  - ${err}`);
    }
    if (warnings.length) {
       
      console.warn('[governance:validate] Warnings:');
      warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }
    process.exitCode = 1;
    return;
  }

   
  console.log(
    `[governance:validate] Registry OK (${registry.artifacts.length} artifacts).`,
  );
  if (warnings.length) {
     
    console.warn('[governance:validate] Warnings:');
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
}

main().catch((error) => {
   
  console.error('[governance:validate] Unexpected error:', error);
  process.exitCode = 1;
});
