#!/usr/bin/env node
/**
 * Bundle Size Analyzer
 * 
 * Analyzes the production build output and generates a report
 * with bundle sizes, warnings, and recommendations.
 * 
 * Usage: node scripts/analyze-bundle.js [--json] [--ci]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Budget thresholds (gzipped sizes in KB)
// TODO: Gradually reduce these as bundle is optimized
const BUDGETS = {
  'index': 12,                 // Main entry point
  'react-vendor': 42,          // React core
  'markdown-vendor': 5,        // Markdown (lazy loaded)
  'ui-radix': 24,              // Radix UI compound components
  'icons-vendor': 8,           // Lucide icons
  'utils-vendor': 20,          // Utilities
  'dnd-vendor': 18,            // DnD Kit
  'state-vendor': 5,           // Zustand + React Query
  'vendor': 200,               // Remaining vendor chunk
  'aiAgentsDirectory-CH8l': 180, // Lazy chunk - target to refactor (phase D follow-up)
  'AgentsCommandsCatalogView': 150, // Catalog lazy chunk
  'commands-db': 90,           // Commands data chunk
  'charts-vendor': 80,         // Charting libraries
  'total': 940,                // Total bundle size (Phase D target: <900KB)
};

const WARNINGS = {
  'vendor': 'Large vendor chunk detectado! Avalie dividir dependências ou mover uso para carregamento dinâmico.',
  'aiAgentsDirectory-CH8l':
    'Chunk dos agentes Claude ainda muito grande. Planeje particionar dados ou usar streaming sob demanda.',
  'AgentsCommandsCatalogView':
    'Chunk do catálogo de comandos com peso elevado. Avalie dividir componentes ou usar busca paginada.',
  'commands-db': 'Banco de comandos carregado como JSON pesado. Investigue geração incremental ou API dedicada.',
  'total': 'Bundle total acima da meta. Revise chunks acima do orçamento e considere lazy loading adicional.',
};

function analyzeBuildOutput() {
  const distPath = path.join(__dirname, '../dist');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(assetsPath)) {
    console.error('❌ Build output not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = fs.readdirSync(assetsPath);
  const chunks = {};
  let totalSize = 0;

  files.forEach(file => {
    if (!file.endsWith('.js')) return;

    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = stats.size / 1024;

    // Estimate gzip size (typically 25-35% of original)
    const gzipSizeKB = sizeKB * 0.30;

    // Extract chunk name from filename (e.g., "react-vendor-xxx.js" -> "react-vendor")
    const chunkName = file.split('-').slice(0, -1).join('-') || 'unknown';

    if (!chunks[chunkName]) {
      chunks[chunkName] = { files: [], size: 0, gzipSize: 0 };
    }

    chunks[chunkName].files.push(file);
    chunks[chunkName].size += sizeKB;
    chunks[chunkName].gzipSize += gzipSizeKB;
    totalSize += gzipSizeKB;
  });

  return { chunks, totalSize };
}

function generateReport(chunks, totalSize, format = 'text') {
  if (format === 'json') {
    return JSON.stringify({ chunks, totalSize, budgets: BUDGETS }, null, 2);
  }

  let report = '\n📊 Bundle Size Analysis\n';
  report += '═══════════════════════════════════════════\n\n';

  // Sort chunks by gzip size (largest first)
  const sortedChunks = Object.entries(chunks).sort(
    ([, a], [, b]) => b.gzipSize - a.gzipSize
  );

  sortedChunks.forEach(([name, data]) => {
    const budget = BUDGETS[name] || 100;
    const overBudget = data.gzipSize > budget;
    const percentage = ((data.gzipSize / totalSize) * 100).toFixed(1);
    const status = overBudget ? '⚠️ ' : '✅';

    report += `${status} ${name}\n`;
    report += `   Size: ${data.size.toFixed(2)} KB (${data.gzipSize.toFixed(2)} KB gzipped)\n`;
    report += `   Budget: ${budget} KB | ${percentage}% of total\n`;

    if (overBudget) {
      report += `   ⚠️  OVER BUDGET by ${(data.gzipSize - budget).toFixed(2)} KB\n`;
      if (WARNINGS[name]) {
        report += `   💡 ${WARNINGS[name]}\n`;
      }
    }

    report += '\n';
  });

  report += '───────────────────────────────────────────\n';
  report += `📦 Total: ${totalSize.toFixed(2)} KB (gzipped)\n`;
  report += `🎯 Budget: ${BUDGETS.total} KB\n`;

  if (totalSize > BUDGETS.total) {
    report += `⚠️  OVER BUDGET by ${(totalSize - BUDGETS.total).toFixed(2)} KB\n`;
  } else {
    const remaining = BUDGETS.total - totalSize;
    report += `✅ Under budget! ${remaining.toFixed(2)} KB remaining\n`;
  }

  report += '═══════════════════════════════════════════\n';

  return report;
}

function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--json') ? 'json' : 'text';
  const ci = args.includes('--ci');

  const { chunks, totalSize } = analyzeBuildOutput();
  const report = generateReport(chunks, totalSize, format);

  console.log(report);

  // Exit with error code if over budget (for CI)
  if (ci && totalSize > BUDGETS.total) {
    console.error('\n❌ Bundle size exceeds budget! Build failed.\n');
    process.exit(1);
  }

  // Save report to file
  const reportPath = path.join(__dirname, '../dist/bundle-report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

main();

