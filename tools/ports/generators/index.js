import fs from 'fs/promises';
import { DEFAULTS } from '../lib/registry.js';

export async function generateIndex(registry, { targetPath = DEFAULTS.indexPath, now = new Date() } = {}) {
  const payload = {
    version: registry.version,
    lastUpdated: registry.lastUpdated,
    generatedAt: now.toISOString(),
    ranges: registry.ranges,
    services: [...registry.services].sort((a, b) => a.port - b.port),
  };

  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
