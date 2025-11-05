#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');
const governanceDir = path.join(repoRoot, 'governance');
const registryPath = path.join(governanceDir, 'registry/registry.json');
const docsContentDir = path.join(repoRoot, 'docs/content');
const dashboardDocsPreviewDir = path.join(
  repoRoot,
  'frontend/dashboard/public/governance/docs',
);

function toPreviewFileName(artifactId) {
  return artifactId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function readRegistry() {
  const raw = await fs.readFile(registryPath, 'utf-8');
  return JSON.parse(raw);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readSourceContent(relPath) {
  const absolutePath = path.join(governanceDir, relPath);
  return fs.readFile(absolutePath, 'utf-8');
}

function buildFrontmatter(artifact, publish) {
  const payload = {
    title: artifact.title,
    description: artifact.description,
    slug: publish.slug,
    tags: artifact.tags || ['governance'],
    owner: artifact.owner,
    lastReviewed: artifact.lastReviewed,
  };

  if (publish.sidebarLabel) {
    payload.sidebar_label = publish.sidebarLabel;
  }
  if (typeof publish.sidebarPosition !== 'undefined') {
    payload.sidebar_position = publish.sidebarPosition;
  }

  return `---\n${YAML.stringify(payload).trim()}\n---\n\n`;
}

async function writeDoc(artifact, publish) {
  const targetPath = path.join(docsContentDir, publish.docsPath);
  await ensureDir(path.dirname(targetPath));

  const frontmatter = buildFrontmatter(artifact, publish);
  const source = await readSourceContent(artifact.path);
  const generatedNotice =
    '<!-- AUTO-GENERATED from governance source. Do not edit in docs/content. -->\n\n';
  await fs.writeFile(
    targetPath,
    `${frontmatter}${generatedNotice}${source.trim()}\n`,
    'utf-8',
  );

  // Mirror raw markdown for dashboard preview pop-ups
  await ensureDir(dashboardDocsPreviewDir);
  const previewFileName = `${toPreviewFileName(artifact.id)}.md`;
  await fs.writeFile(
    path.join(dashboardDocsPreviewDir, previewFileName),
    source,
    'utf-8',
  );
}

async function main() {
  const registry = await readRegistry();
  const artifacts = registry.artifacts || [];
  const publishable = artifacts.filter(
    (artifact) => artifact.publish && artifact.publish.docsPath,
  );

  await Promise.all(publishable.map((artifact) => writeDoc(artifact, artifact.publish)));

  // eslint-disable-next-line no-console
  console.log(
    `[governance:sync] Published ${publishable.length} governance artifacts to docs.`,
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[governance:sync] Failed to publish artifacts:', error);
  process.exitCode = 1;
});
