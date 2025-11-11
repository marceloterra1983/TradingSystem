import fs from 'fs/promises';
import path from 'node:path';
import { DEFAULTS, toEnvKey } from '../lib/registry.js';

function escapeQuotes(value = '') {
  return value.replace(/"/g, '\\"');
}

export async function generateComposeDictionary(
  registry,
  { targetPath = DEFAULTS.portsComposePath, now = new Date() } = {},
) {
  const lines = [
    '# Auto-generated port dictionary for Compose overrides',
    '# Do not edit manually. Run: npm run ports:sync',
    `# Generated: ${now.toISOString()}`,
    '',
    'x-tradingsystem-ports:',
  ];

  for (const service of registry.services) {
    const envKey = toEnvKey(service.name);
    lines.push(`  ${service.name}:`);
    lines.push(`    env: ${envKey}_PORT`);
    lines.push(`    port: ${service.port}`);
    lines.push(`    protocol: ${service.protocol}`);
    lines.push(`    stack: ${service.stack}`);
    lines.push(`    owner: "${escapeQuotes(service.owner)}"`);
    lines.push(`    description: "${escapeQuotes(service.description)}"`);
    if (service.exposure) {
      lines.push(`    exposure: ${service.exposure}`);
    }
    if (service.gatewayPath) {
      lines.push(`    gatewayPath: ${service.gatewayPath}`);
    }
  }

  lines.push('');
  await fs.writeFile(targetPath, lines.join('\n'), 'utf8');
}

export async function generateStackComposeFiles(
  registry,
  {
    templatePath = DEFAULTS.composeTemplatePath,
    outputDir = DEFAULTS.generatedComposeDir,
    now = new Date(),
  } = {},
) {
  const template = await fs.readFile(templatePath, 'utf8');
  await fs.mkdir(outputDir, { recursive: true });

  const servicesByStack = registry.services.reduce((acc, svc) => {
    acc[svc.stack] ??= [];
    acc[svc.stack].push(svc);
    return acc;
  }, {});

  await Promise.all(
    Object.entries(servicesByStack).map(async ([stack, stackServices]) => {
      const servicesBlock = stackServices
        .map((svc) => {
          const envKey = `${toEnvKey(svc.name)}_PORT`;
          return [
            `  ${svc.name}:`,
            `    env: ${envKey}`,
            `    port: ${svc.port}`,
            `    protocol: ${svc.protocol}`,
            `    owner: "${escapeQuotes(svc.owner)}"`,
            `    description: "${escapeQuotes(svc.description)}"`,
            ...(svc.exposure ? [`    exposure: ${svc.exposure}`] : []),
            ...(svc.gatewayPath ? [`    gatewayPath: ${svc.gatewayPath}`] : []),
          ].join('\n');
        })
        .join('\n');

      const rendered = template
        .replace(/{{STACK_NAME}}/g, stack)
        .replace(/{{TIMESTAMP}}/g, now.toISOString())
        .replace('{{SERVICES}}', servicesBlock);

      const target = path.join(outputDir, `docker-compose.${stack}.ports.yml`);
      await fs.writeFile(target, rendered, 'utf8');
    }),
  );
}
