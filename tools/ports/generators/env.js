import fs from 'fs/promises';
import { DEFAULTS, toEnvKey } from '../lib/registry.js';

const PROTOCOL_TO_SCHEME = {
  http: 'http',
  https: 'https',
  postgres: 'postgres',
  redis: 'redis',
  rabbitmq: 'amqp',
  grpc: 'grpc',
  tcp: 'tcp',
  udp: 'udp',
};

function resolveHost(service) {
  if (service.container) {
    return service.name;
  }
  return 'localhost';
}

export async function generateEnv(registry, { targetPath = DEFAULTS.envPath, now = new Date() } = {}) {
  const lines = [
    '# Auto-generated from config/ports/registry.yaml',
    '# DO NOT EDIT MANUALLY - Run: npm run ports:sync',
    `# Generated: ${now.toISOString()}`,
    '',
  ];

  for (const service of registry.services) {
    const envKey = toEnvKey(service.name);
    const host = resolveHost(service);
    const scheme = PROTOCOL_TO_SCHEME[service.protocol] ?? 'tcp';
    const url = `${scheme}://${host}:${service.port}`;

    lines.push(`# ${service.description}`);
    lines.push(`${envKey}_PORT=${service.port}`);
    lines.push(`${envKey}_HOST=${host}`);
    lines.push(`${envKey}_URL=${url}`);
    lines.push('');
  }

  await fs.writeFile(targetPath, lines.join('\n'), 'utf8');
}
