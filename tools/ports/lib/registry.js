import fs from 'fs/promises';
import path from 'node:path';
import yaml from 'yaml';

const PROJECT_ROOT = path.resolve(process.cwd());
const DEFAULT_REGISTRY_PATH = path.join(PROJECT_ROOT, 'config/ports/registry.yaml');

function resolvePath(filePath = DEFAULT_REGISTRY_PATH) {
  return path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
}

export async function readRegistry(filePath = DEFAULT_REGISTRY_PATH) {
  const resolved = resolvePath(filePath);
  const raw = await fs.readFile(resolved, 'utf8');
  try {
    return yaml.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse registry YAML (${resolved}): ${error.message}`);
  }
}

export async function writeRegistry(filePath, registry) {
  const resolved = resolvePath(filePath);
  const serialized = yaml.stringify(registry, { indent: 2, lineWidth: 120 });
  await fs.writeFile(resolved, serialized, 'utf8');
}

export function groupByStack(services = []) {
  return services.reduce((acc, svc) => {
    if (!acc.has(svc.stack)) {
      acc.set(svc.stack, []);
    }
    acc.get(svc.stack).push(svc);
    return acc;
  }, new Map());
}

export function toEnvKey(serviceName) {
  return serviceName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

export const DEFAULTS = {
  registryPath: DEFAULT_REGISTRY_PATH,
  envPath: path.join(PROJECT_ROOT, '.env.shared'),
  docsPath: path.join(PROJECT_ROOT, 'docs/content/tools/ports-services.mdx'),
  indexPath: path.join(PROJECT_ROOT, 'config/ports/index.json'),
  portsComposePath: path.join(PROJECT_ROOT, 'tools/compose/docker-compose.ports.generated.yml'),
  composeTemplatePath: path.join(PROJECT_ROOT, 'tools/ports/templates/docker-compose.template.yml'),
  generatedComposeDir: path.join(PROJECT_ROOT, 'tools/compose/generated'),
  healthScriptPath: path.join(PROJECT_ROOT, 'scripts/maintenance/ports-health.sh'),
};
