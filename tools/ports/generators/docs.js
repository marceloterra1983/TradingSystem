import fs from 'fs/promises';
import { DEFAULTS } from '../lib/registry.js';

function capitalize(text) {
  return text
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRange(ranges, stack) {
  const value = ranges[stack];
  return value ? value : 'n/a';
}

export async function generateDocs(registry, { targetPath = DEFAULTS.docsPath, now = new Date() } = {}) {
  const lines = [
    '---',
    'id: tools/ports-services/overview',
    'title: Port Registry & Services Matrix',
    'description: Fonte única de verdade para portas, protocolos e owners do TradingSystem.',
    'tags:',
    '  - tools',
    '  - networking',
    '  - governance',
    "slug: /tools/ports-services/overview",
    '---',
    '',
    '> **⚠️ Arquivo gerado automaticamente. Não editar manualmente.**',
    `> Última geração: ${now.toISOString()}`,
    '',
    '## Port Ranges',
    '',
    '| Stack | Range |',
    '|-------|-------|',
  ];

  const stackKeys = Object.keys(registry.ranges).sort();
  for (const stack of stackKeys) {
    lines.push(`| ${capitalize(stack)} | ${registry.ranges[stack]} |`);
  }

  lines.push('', '## Services by Stack', '');

  const servicesByStack = registry.services.reduce((acc, svc) => {
    if (!acc[svc.stack]) {
      acc[svc.stack] = [];
    }
    acc[svc.stack].push(svc);
    return acc;
  }, {});

  for (const stack of stackKeys) {
    const services = (servicesByStack[stack] ?? []).sort((a, b) => a.port - b.port);
    if (services.length === 0) continue;

    lines.push(`### ${capitalize(stack)} (${formatRange(registry.ranges, stack)})`, '');
    lines.push('| Service | Port | Protocol | Owner | Status | Description |');
    lines.push('|---------|------|----------|-------|--------|-------------|');

    for (const svc of services) {
      const status = svc.deprecated ? '⚠️ Deprecated' : '✅ Active';
      lines.push(
        `| ${svc.name} | ${svc.port} | ${svc.protocol} | ${svc.owner} | ${status} | ${svc.description} |`
      );
    }

    lines.push('');
  }

  await fs.writeFile(targetPath, lines.join('\n'), 'utf8');
}
