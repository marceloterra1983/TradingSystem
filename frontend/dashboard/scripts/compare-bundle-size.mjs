#!/usr/bin/env node

/**
 * Compare bundle analysis reports and output a diff summary.
 *
 * Usage:
 *   node scripts/compare-bundle-size.mjs \
 *     --current-report dist/bundle-report.json \
 *     --baseline-report ../../base/frontend/dashboard/dist/bundle-report.json \
 *     --output dist/bundle-diff.json \
 *     --threshold 5
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const options = args.reduce((acc, current, index) => {
  if (current.startsWith('--')) {
    const key = current.replace(/^--/, '');
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      acc[key] = true;
    } else {
      acc[key] = next;
    }
  }
  return acc;
}, {});

const requiredOptions = ['current-report', 'baseline-report', 'output'];
const missing = requiredOptions.filter((option) => !(option in options));

if (missing.length > 0) {
  console.error(`Missing required options: ${missing.join(', ')}`);
  process.exit(1);
}

const threshold = options.threshold ? Number(options.threshold) : 5;

const readReport = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read bundle report at ${filePath}:`, error.message);
    process.exit(1);
  }
};

const normalizeChunks = (report) => {
  const chunkEntries = Object.entries(report.chunks ?? {});
  return chunkEntries.map(([name, data]) => ({
    name,
    gzipSize: data.gzipSize ?? 0,
    size: data.size ?? 0,
  }));
};

const baselineReport = readReport(path.resolve(options['baseline-report']));
const currentReport = readReport(path.resolve(options['current-report']));

const baselineChunks = normalizeChunks(baselineReport);
const currentChunks = normalizeChunks(currentReport);

const baselineChunkMap = new Map(baselineChunks.map((chunk) => [chunk.name, chunk]));

const chunkDiffs = currentChunks.map((chunk) => {
  const baselineChunk = baselineChunkMap.get(chunk.name) ?? { gzipSize: 0, size: 0 };
  const absoluteDiff = chunk.gzipSize - baselineChunk.gzipSize;
  const percentDiff =
    baselineChunk.gzipSize === 0
      ? (chunk.gzipSize > 0 ? 100 : 0)
      : (absoluteDiff / baselineChunk.gzipSize) * 100;

  return {
    name: chunk.name,
    current: chunk.gzipSize,
    baseline: baselineChunk.gzipSize,
    diff: absoluteDiff,
    diffPercent: percentDiff,
  };
});

const totalCurrent = currentReport.totalSize ?? 0;
const totalBaseline = baselineReport.totalSize ?? 0;
const totalDiff = totalCurrent - totalBaseline;
const totalDiffPercent =
  totalBaseline === 0 ? (totalCurrent > 0 ? 100 : 0) : (totalDiff / totalBaseline) * 100;

const summary = {
  total: {
    current: totalCurrent,
    baseline: totalBaseline,
    diff: totalDiff,
    diffPercent: totalDiffPercent,
  },
  threshold,
  chunks: chunkDiffs.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent)),
};

fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
fs.writeFileSync(path.resolve(options.output), JSON.stringify(summary, null, 2), 'utf8');

const prettyNumber = (value) => `${value.toFixed(2)} KB`;
const prettyPercent = (value) => `${value.toFixed(2)}%`;

console.log('📦 Bundle Size Comparison');
console.log('───────────────────────────');
console.log(`Baseline (gzipped): ${prettyNumber(totalBaseline)}`);
console.log(`Current  (gzipped): ${prettyNumber(totalCurrent)}`);
console.log(`Δ (absolute): ${prettyNumber(totalDiff)}`);
console.log(`Δ (percent): ${prettyPercent(totalDiffPercent)}`);
console.log(`Threshold: ±${threshold}%`);
console.log('');

const offenders = summary.chunks.filter((chunk) => Math.abs(chunk.diffPercent) > threshold);

if (offenders.length > 0) {
  console.log('⚠️  Chunks acima do limite:');
  offenders.forEach((chunk) => {
    console.log(
      ` - ${chunk.name}: ${prettyNumber(chunk.current)} (baseline ${prettyNumber(
        chunk.baseline,
      )}, Δ ${prettyPercent(chunk.diffPercent)})`,
    );
  });
} else {
  console.log('✅ Nenhum chunk ultrapassou o limite configurado.');
}

if (Math.abs(totalDiffPercent) > threshold) {
  console.error(
    `Bundle total excedeu o limite de ${threshold}% (Δ ${prettyPercent(totalDiffPercent)}).`,
  );
  process.exit(2);
}

