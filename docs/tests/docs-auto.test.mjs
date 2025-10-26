import test from 'node:test';
import assert from 'node:assert';
import {mkdtemp, readFile, rm, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  runDocsAuto,
  parseServicePortMap,
  generatePortsTable,
  extractTailwindTokens,
  generateTokensTable,
} from '../../scripts/docusaurus/docs-auto.mjs';

const silentLogger = {
  start() {},
  step() {},
  endStep() {},
  complete() {},
  error() {},
};

async function setupTempRepo() {
  const root = await mkdtemp(join(tmpdir(), 'docs-auto-'));
  await mkdir(join(root, 'docs', 'content', 'reference'), {recursive: true});
  return root;
}

test('docs-auto scaffolds placeholder content idempotently', async (t) => {
  const repoRoot = await setupTempRepo();

  t.after(async () => {
    await rm(repoRoot, {recursive: true, force: true});
  });

  await runDocsAuto({repoRoot, logger: silentLogger});
  const placeholderPath = join(
    repoRoot,
    'docs',
    'content',
    'reference',
    'ports.mdx',
  );

  const first = await readFile(placeholderPath, 'utf8');
  assert.match(first, /Ports Matrix/);

  await runDocsAuto({repoRoot, logger: silentLogger});
  const second = await readFile(placeholderPath, 'utf8');
  assert.strictEqual(second, first, 'second run should not modify placeholder content');
});

test('parseServicePortMap extracts service data correctly', async (t) => {
  const repoRoot = await setupTempRepo();
  const sourcePath = join(repoRoot, 'docs', 'context', 'ops');
  await mkdir(sourcePath, {recursive: true});

  const markdown = [
    '# Port Map',
    '',
    '## Serviços de Aplicação',
    '',
    '| Serviço | Container | URL/Porta | Descrição |',
    '|---------|-----------|-----------|-----------|',
    '| Dashboard | dashboard-dev | http://localhost:3103 | UI principal |',
    '| Workspace API | workspace-api | http://localhost:3100 | API principal |',
    '',
    '## Dados e Monitoramento',
    '',
    '| Serviço | Container | URL/Porta | Descrição |',
    '|---------|-----------|-----------|-----------|',
    '| TimescaleDB | data-timescaledb | 5433 | Banco de dados |',
    '| Grafana | mon-grafana | http://localhost:3000 | Painel |',
  ].join('\n');

  const filePath = join(sourcePath, 'service-port-map.md');
  await writeFile(filePath, markdown, 'utf8');

  t.after(async () => {
    await rm(repoRoot, {recursive: true, force: true});
  });

  const services = await parseServicePortMap(filePath, markdown);
  assert.strictEqual(services.applicationServices.length, 2);
  assert.strictEqual(services.dataServices.length, 2);
  assert.deepStrictEqual(services.applicationServices[0], {
    service: 'Dashboard',
    container: 'dashboard-dev',
    endpoint: 'http://localhost:3103',
    description: 'UI principal',
  });
});

test('generatePortsTable creates valid markdown', () => {
  const services = [
    {
      service: 'Dashboard',
      container: 'dashboard-dev',
      endpoint: 'http://localhost:3103',
      description: 'UI principal',
    },
    {
      service: 'Workspace API',
      container: 'workspace-api',
      endpoint: 'https://localhost:3100',
      description: 'API principal',
    },
  ];

  const markdown = generatePortsTable(services);
  assert.match(markdown, /\| Service \| Container \| Port \| URL \| Description \|/);
  assert.match(markdown, /\|---------\|-----------\|------\|-----\|-------------\|/);
  assert.match(markdown, /\| Dashboard \| dashboard-dev \| 3103 \| http:\/\/localhost:3103 \| UI principal \|/);
});

test('generatePortsTable handles multi-port endpoints', () => {
  const services = [
    {
      service: 'Multi Port Endpoint',
      container: 'multi-service',
      endpoint: '3100 / 3101',
      description: 'Multiple exposures',
    },
  ];

  const markdown = generatePortsTable(services);
  const row = markdown.split('\n').find((line) => line.includes('Multi Port Endpoint'));
  assert(row, 'Expected generated row for multi-port endpoint');
  // Multi-port endpoints default to the first parsed port and omit the URL to highlight manual follow-up.
  assert.match(row, /\| Multi Port Endpoint \| multi-service \| 3100 \| N\/A \| Multiple exposures \|/);
});

test('extractTailwindTokens parses config correctly', async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'tailwind-config-'));
  const configDir = join(tempDir, 'frontend', 'dashboard');
  await mkdir(configDir, {recursive: true});

  const configContent = [
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    '        primary: {',
    "          DEFAULT: '#06b6d4',",
    "          dark: '#0e7490',",
    "          light: '#cffafe',",
    "          50: '#ecfeff',",
    "          100: '#cffafe',",
    "          200: '#a5f3fc',",
    "          300: '#67e8f9',",
    "          400: '#22d3ee',",
    "          500: '#06b6d4',",
    "          600: '#0891b2',",
    "          700: '#0e7490',",
    "          800: '#155e75',",
    "          900: '#164e63',",
    '        },',
    '      },',
    '    },',
    '  },',
    '};',
  ].join('\n');

  const configPath = join(configDir, 'tailwind.config.js');
  await writeFile(configPath, configContent, 'utf8');

  t.after(async () => {
    await rm(tempDir, {recursive: true, force: true});
  });

  const tokens = await extractTailwindTokens(configPath);
  assert.strictEqual(tokens.length, 13);
  assert.deepStrictEqual(tokens.find((token) => token.name === 'primary.DEFAULT'), {
    category: 'color',
    name: 'primary.DEFAULT',
    value: '#06b6d4',
    description: 'Primary brand color',
  });
  assert(tokens.every((token) => token.category === 'color'), 'all tokens should be color category');
});

test('extractTailwindTokens falls back to static parsing when import fails', async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'tailwind-fallback-'));
  const configDir = join(tempDir, 'frontend', 'dashboard');
  await mkdir(configDir, {recursive: true});

  const configContent = [
    "throw new Error('intentional import failure');",
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    "        accent: '#ff0000',",
    '        neutral: {',
    "          100: '#f5f5f5'",
    '        }',
    '      }',
    '    }',
    '  }',
    '};',
  ].join('\n');

  const configPath = join(configDir, 'tailwind.config.js');
  await writeFile(configPath, configContent, 'utf8');

  t.after(async () => {
    await rm(tempDir, {recursive: true, force: true});
  });

  const tokens = await extractTailwindTokens(configPath);
  assert(tokens.some((token) => token.name === 'accent'), 'Fallback should capture top-level color token');
  assert(tokens.some((token) => token.name === 'neutral.100'), 'Fallback should flatten nested color tokens');
});

test('generateTokensTable creates valid markdown', () => {
  const tokens = [
    {category: 'color', name: 'primary.DEFAULT', value: '#06b6d4', description: 'Primary'},
    {category: 'color', name: 'primary.100', value: 'cffafe', description: 'Shade 100'},
  ];

  const markdown = generateTokensTable(tokens);
  assert.match(markdown, /\| Category \| Name \| Value \| Description \|/);
  assert.match(markdown, /\|----------\|------\|-------\|-------------\|/);
  assert.match(markdown, /\| color \| primary\.DEFAULT \| #06b6d4 \| Primary \|/);
  assert.match(markdown, /\| color \| primary\.100 \| #cffafe \| Shade 100 \|/);
});

test('runDocsAuto generates content for ports and tokens', async (t) => {
  const repoRoot = await setupTempRepo();
  t.after(async () => {
    await rm(repoRoot, {recursive: true, force: true});
  });

  const portsSourceDir = join(repoRoot, 'docs', 'context', 'ops');
  const tokensSourceDir = join(repoRoot, 'frontend', 'dashboard');
  const docsToolsDir = join(repoRoot, 'docs', 'content', 'tools', 'ports-services');
  const docsFrontendDir = join(repoRoot, 'docs', 'content', 'frontend', 'design-system');
  const mcpDir = join(repoRoot, 'docs', 'content', 'mcp');

  await mkdir(portsSourceDir, {recursive: true});
  await mkdir(tokensSourceDir, {recursive: true});
  await mkdir(docsToolsDir, {recursive: true});
  await mkdir(docsFrontendDir, {recursive: true});
  await mkdir(mcpDir, {recursive: true});

  const portsSourceContent = [
    '# Port Map',
    '',
    '## Serviços de Aplicação',
    '',
    '| Serviço | Container | URL/Porta | Descrição |',
    '|---------|-----------|-----------|-----------|',
    '| Dashboard | dashboard-dev | http://localhost:3103 | UI principal |',
    '',
    '## Dados e Monitoramento',
    '',
    '| Serviço | Container | URL/Porta | Descrição |',
    '|---------|-----------|-----------|-----------|',
    '| TimescaleDB | data-timescaledb | 5433 | Banco de dados |',
  ].join('\n');

  const portsDocContent = [
    '---',
    'title: Ports Doc',
    '---',
    '',
    '<!-- AUTO-GENERATED SECTIONS by docs:auto - DO NOT EDIT MANUALLY -->',
    '<!-- Last generated: TIMESTAMP_PLACEHOLDER -->',
    '<!-- Source: docs/context/ops/service-port-map.md -->',
    '',
    '## Application Services',
    '',
    '<!-- BEGIN AUTO-GENERATED: Application Services -->',
    '',
    '| stub |',
    '',
    '<!-- END AUTO-GENERATED: Application Services -->',
    '',
    '## Data & Monitoring Services',
    '',
    '<!-- BEGIN AUTO-GENERATED: Data & Monitoring Services -->',
    '',
    '| stub |',
    '',
    '<!-- END AUTO-GENERATED: Data & Monitoring Services -->',
  ].join('\n');

  const tokensDocContent = [
    '---',
    'title: Tokens Doc',
    '---',
    '',
    'Design tokens are extracted from `frontend/dashboard/tailwind.config.js`.',
    '',
    '<!-- AUTO-GENERATED by docs:auto - DO NOT EDIT MANUALLY -->',
    '<!-- Last generated: TIMESTAMP_PLACEHOLDER -->',
    '<!-- Source: frontend/dashboard/tailwind.config.js -->',
    '',
    '## Token Catalogue',
    '',
    '<!-- BEGIN AUTO-GENERATED: Token Catalogue -->',
    '',
    '| stub |',
    '',
    '<!-- END AUTO-GENERATED: Token Catalogue -->',
    '',
    '## Future Token Sources',
    '',
    'Placeholder.',
  ].join('\n');

  const mcpContent = [
    '---',
    'title: MCP Registry',
    '---',
    '',
    '## MCP Server Registry',
    '',
    '<!-- BEGIN AUTO-GENERATED: MCP Registry Automation Status -->',
    '',
    '**Automation Hooks**:',
    '- `scripts/docusaurus/mcp-registry-sync.ts` - Generate MCP registry from configuration files',
    '- `npm run docs:auto` - Regenerate MCP registry documentation',
    '- Source: `~/.claude.json`, `.claude/mcp-servers.json`',
    '- Target: `docs/content/mcp/registry.mdx` (generated section)',
    '',
    '**Current State**: Manual documentation (automation pending)',
    '',
    '**Future Enhancements**:',
    '- Auto-detect MCP servers from configuration',
    '',
    '*Note: This table is manually maintained until automation is available.*',
    '',
    '<!-- END AUTO-GENERATED: MCP Registry Automation Status -->',
    '',
    '### Configured Servers',
    '',
    '| Server | Status |',
    '|--------|--------|',
    '| fs-tradingsystem | ✅ |',
  ].join('\n');

  await writeFile(join(portsSourceDir, 'service-port-map.md'), portsSourceContent, 'utf8');
  await writeFile(join(tokensSourceDir, 'tailwind.config.js'), [
    'module.exports = {',
    '  theme: {',
    '    extend: {',
    '      colors: {',
    "        primary: { DEFAULT: '#06b6d4' }",
    '      }',
    '    }',
    '  }',
    '};',
  ].join('\n'), 'utf8');
  await writeFile(join(docsToolsDir, 'overview.mdx'), portsDocContent, 'utf8');
  await writeFile(join(docsFrontendDir, 'tokens.mdx'), tokensDocContent, 'utf8');
  await writeFile(join(mcpDir, 'registry.mdx'), mcpContent, 'utf8');

  await runDocsAuto({repoRoot, logger: silentLogger});

  const portsDoc = await readFile(join(docsToolsDir, 'overview.mdx'), 'utf8');
  assert.match(portsDoc, /\| Service \| Container \| Port \| URL \| Description \|/);
  assert.match(portsDoc, /Dashboard/);

  const tokensDoc = await readFile(join(docsFrontendDir, 'tokens.mdx'), 'utf8');
  assert.match(tokensDoc, /\| Category \| Name \| Value \| Description \|/);
  assert.match(tokensDoc, /primary\.DEFAULT/);

  const mcpDoc = await readFile(join(mcpDir, 'registry.mdx'), 'utf8');
  assert.match(
    mcpDoc,
    /Automation blocked \(MCP config files external to repository\)/,
    'MCP registry should include automation blocker notice',
  );
});

test('runDocsAuto handles missing source files gracefully', async (t) => {
  const repoRoot = await setupTempRepo();
  t.after(async () => {
    await rm(repoRoot, {recursive: true, force: true});
  });

  await runDocsAuto({repoRoot, logger: silentLogger});
});
