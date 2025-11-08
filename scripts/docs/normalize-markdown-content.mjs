#!/usr/bin/env node

/**
 * Normalize Markdown / MDX content for docs workflows:
 *  - Converts stray setext headings into ATX form
 *  - Rewrites emphasis-as-heading (**Heading**) to proper heading syntax
 *  - Inserts a default language (`text`) for code fences without language
 *  - Replaces legacy inlined `lastReviewed` blocks that mimic frontmatter
 *
 * Usage:
 *   node scripts/docs/normalize-markdown-content.mjs
 */

import { glob } from 'glob';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const DOCS_DIR = path.join(ROOT, 'docs');

const GLOBS = [
  'docs/**/*.{md,mdx}',
  'governance/**/*.{md,mdx}',
  'context/**/*.{md,mdx}',
  'troubleshooting/**/*.{md,mdx}',
];

const CODE_FENCE_REGEX = /(^|\n)```(\s*\n)/g;
const SETEXT_HEADING_REGEX = /(^|\n)([^\n]+)\n-{3,}\n/g;
const INLINE_LAST_REVIEWED_REGEX = /(^|\n)lastReviewed:\s*"([^"]+)"\s*\n---+\s*(?=\n|$)/g;

async function normalizeFile(filePath) {
  const original = await readFile(filePath, 'utf8');
  const normalized = normalizeContent(original);

  if (normalized !== original) {
    await writeFile(filePath, normalized, 'utf8');
    return true;
  }
  return false;
}

function normalizeContent(rawContent) {
  // Standardize newlines first.
  let content = rawContent.replace(/\r\n/g, '\n');

  const frontmatterMatch = content.match(/^---[\s\S]*?---\s*/);
  let frontmatter = '';
  let body = content;
  if (frontmatterMatch) {
    frontmatter = frontmatterMatch[0];
    body = content.slice(frontmatter.length);
  }

  // Remove repeated "lastReviewed" blocks that mimic frontmatter.
  body = body.replace(
    INLINE_LAST_REVIEWED_REGEX,
    (_, prefix, value) => `${prefix}<!-- lastReviewed: ${value} -->\n`
  );

  // Convert setext headings (--- underline) to ATX `##` headings.
  body = body.replace(SETEXT_HEADING_REGEX, (match, prefix, headingText) => {
    const trimmed = headingText.trim();
    if (!trimmed) {
      return match;
    }
    return `${prefix}## ${trimmed}\n\n`;
  });

  // Ensure code fences always have a language declared.
  body = body.replace(CODE_FENCE_REGEX, (match, prefix, suffix) => `${prefix}\`\`\`text${suffix}`);

  const normalizedLines = normalizeStructure(body.split('\n'));
  const cleanedBody = normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();

  return `${frontmatter || ''}${cleanedBody}\n`;
}

function normalizeStructure(lines) {
  const headingRegistry = new Map();
  const result = [];

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trimEnd();

    if (/^#{1,6}\s+/.test(line)) {
      const [, hashes, rawText] = line.match(/^(#{1,6})\s+(.*)$/) || [];
      let level = hashes.length;
      let text = (rawText || '').trim();

      if (!text) {
        continue;
      }

      const endsWithColon = /[:：]\s*$/.test(text);
      const endsWithTerminalPunctuation = /[.!?。？！]\s*$/.test(text);
      const wordCount = text.split(/\s+/).length;

      if (endsWithColon) {
        // Restore to emphasis instead of heading to avoid lint duplication rules.
        line = `**${text}**`;
      } else if (endsWithTerminalPunctuation && wordCount > 10) {
        // Treat long sentences as paragraphs instead of headings.
        line = text;
      } else {
        text = text.replace(/[.:：。！？]\s*$/, '');
        // Demote duplicate headings at the same level to avoid MD024.
        level = demoteUntilUnique(headingRegistry, level, text);
        registerHeading(headingRegistry, level, text);
        line = `${'#'.repeat(level)} ${text}`;
      }
    }

    result.push(line);
  }

  return ensureSpacing(result);
}

function demoteUntilUnique(registry, level, text) {
  let currentLevel = level;
  while (currentLevel <= 6) {
    const levelRegistry = registry.get(currentLevel);
    if (!levelRegistry || !levelRegistry.has(text)) {
      return currentLevel;
    }
    currentLevel += 1;
  }
  return Math.min(level + 1, 6);
}

function registerHeading(registry, level, text) {
  if (!registry.has(level)) {
    registry.set(level, new Set());
  }
  registry.get(level).add(text);
}

function ensureSpacing(lines) {
  const output = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const prev = output.length > 0 ? output[output.length - 1] : '';
    const next = i + 1 < lines.length ? lines[i + 1].trim() : '';

    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const isListItem = /^(-|\*|\d+\.)\s+/.test(trimmed);
    const isCodeFence = /^```/.test(trimmed);
    const isComment = /^<!--/.test(trimmed);

    if ((isHeading || isListItem || isCodeFence || isComment) && prev && prev.trim() !== '') {
      output.push('');
    }

    output.push(line);

    if (
      isHeading &&
      next &&
      next !== '' &&
      !/^```/.test(next) &&
      !/^(-|\*|\d+\.)\s+/.test(next)
    ) {
      output.push('');
    }

    if (isCodeFence && next && next !== '') {
      output.push('');
    }
  }

  // Collapse multiple consecutive blank lines.
  return output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''));
}

async function main() {
  const files = (
    await Promise.all(
      GLOBS.map((pattern) => glob(pattern, { cwd: ROOT, absolute: true, nodir: true }))
    )
  ).flat();
  let changed = 0;

  await Promise.all(
    files.map(async (file) => {
      const updated = await normalizeFile(file);
      if (updated) {
        changed += 1;
      }
    })
  );

  console.log(`Normalized ${changed} file(s).`);
}

main().catch((error) => {
  console.error('[normalize-markdown-content] Failed:', error);
  process.exit(1);
});
