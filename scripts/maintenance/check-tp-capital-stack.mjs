#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');
const envPath = path.join(repoRoot, '.env');
const governanceEvidenceDir = path.join(
  repoRoot,
  'governance/evidence/audits',
);

function parseEnv(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return acc;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function readFileSafe(filePath) {
  return fs.readFile(filePath, 'utf-8').catch(() => '');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function record(results, entry) {
  results.push(entry);
  return entry.status === 'fail';
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch (error) {
    return null;
  }
}

async function validateEnv(results) {
  const content = await readFileSafe(envPath);
  if (!content) {
    record(results, {
      name: '.env presente',
      status: 'fail',
      detail: 'Arquivo .env não encontrado na raiz do repositório.',
    });
    return {};
  }

  const env = parseEnv(content);
  const required = [
    { key: 'TELEGRAM_DB_PASSWORD', label: 'Senha PgBouncer' },
    {
      key: 'TELEGRAM_GATEWAY_URL',
      label: 'URL Gateway',
      expected: /^http:\/\/telegram-gateway-api:4010\/?$/i,
    },
    {
      key: 'VITE_TP_CAPITAL_PROXY_TARGET',
      label: 'Proxy TP-Capital',
      expected: /^http:\/\/tp-capital-api:4005\/?$/i,
    },
  ];

  for (const item of required) {
    const value = env[item.key];
    if (!value) {
      record(results, {
        name: `${item.label} (${item.key})`,
        status: 'fail',
        detail: 'Valor ausente ou vazio no .env',
      });
      continue;
    }
    if (item.expected && !item.expected.test(value)) {
      record(results, {
        name: `${item.label} (${item.key})`,
        status: 'fail',
        detail: `Valor "${value}" inválido. Esperado formato ${item.expected}`,
      });
      continue;
    }
    record(results, {
      name: `${item.label} (${item.key})`,
      status: 'pass',
      detail: 'Valor presente e válido.',
    });
  }

  const apiUrl = env.VITE_TP_CAPITAL_API_URL;
  if (apiUrl && !/^#/.test(apiUrl)) {
    record(results, {
      name: 'Remoção de VITE_TP_CAPITAL_API_URL',
      status: 'fail',
      detail: `Variável deve estar vazia ou comentada, valor atual: ${apiUrl}`,
    });
  } else {
    record(results, {
      name: 'Remoção de VITE_TP_CAPITAL_API_URL',
      status: 'pass',
      detail: 'Variável ausente ou comentada (proxy é responsável pelo roteamento).',
    });
  }

  return env;
}

function extractServiceNetworks(content, serviceName) {
  const lines = content.split('\n');
  const idx = lines.findIndex((line) =>
    line.trimStart().startsWith(`${serviceName}:`),
  );
  if (idx === -1) {
    return null;
  }

  const baseIndent = lines[idx].match(/^\s*/)[0].length;
  const networks = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const indent = line.match(/^\s*/)[0].length;
    if (line.trim() && indent <= baseIndent) {
      break;
    }
    if (line.trimStart().startsWith('networks:')) {
      const networksIndent = indent;
      for (let j = i + 1; j < lines.length; j += 1) {
        const netLine = lines[j];
        const netIndent = netLine.match(/^\s*/)[0].length;
        if (netLine.trim() && netIndent <= networksIndent) {
          break;
        }
        const trimmed = netLine.trim();
        if (trimmed.startsWith('-')) {
          const value = trimmed
            .replace(/^-+\s*/, '')
            .split(/\s+#/)[0]
            .trim();
          if (value) {
            networks.push(value);
          }
        }
      }
      break;
    }
  }
  return networks;
}

function expectNetworks({
  compose,
  serviceNames,
  results,
  expectedIncludes = [],
  forbiddenIncludes = [],
  label,
}) {
  let networks = null;
  let matchedName = null;
  for (const name of serviceNames) {
    const extracted = extractServiceNetworks(compose, name);
    if (extracted && extracted.length) {
      networks = extracted;
      matchedName = name;
      break;
    }
  }

  if (!networks) {
    record(results, {
      name: label,
      status: 'fail',
      detail: `Não foi possível localizar o serviço ${serviceNames.join(
        '/',
      )} no compose.`,
    });
    return;
  }

  const missing = expectedIncludes.filter((net) => !networks.includes(net));
  if (missing.length) {
    record(results, {
      name: label,
      status: 'fail',
      detail: `Serviço ${matchedName} sem redes obrigatórias: ${missing.join(
        ', ',
      )} (atuais: ${networks.join(', ') || 'nenhuma'}).`,
    });
    return;
  }

  const forbidden = forbiddenIncludes.filter((net) => networks.includes(net));
  if (forbidden.length) {
    record(results, {
      name: label,
      status: 'fail',
      detail: `Serviço ${matchedName} não pode conectar às redes: ${forbidden.join(
        ', ',
      )}.`,
    });
    return;
  }

  record(results, {
    name: label,
    status: 'pass',
    detail: `Redes detectadas: ${networks.join(', ')}.`,
  });
}

async function validateCompose(results) {
  const tpCompose = await readFileSafe(
    path.join(repoRoot, 'tools/compose/docker-compose.4-1-tp-capital-stack.yml'),
  );
  const dashCompose = await readFileSafe(
    path.join(repoRoot, 'tools/compose/docker-compose.dashboard.yml'),
  );
  const telegramCompose = await readFileSafe(
    path.join(repoRoot, 'tools/compose/docker-compose.4-2-telegram-stack.yml'),
  );

  expectNetworks({
    compose: telegramCompose,
    serviceNames: ['telegram-gateway-api'],
    expectedIncludes: ['telegram_backend', 'tradingsystem_backend'],
    results,
    label: 'Gateway com duas redes',
  });

  expectNetworks({
    compose: dashCompose,
    serviceNames: ['dashboard-ui', 'dashboard'],
    expectedIncludes: ['tradingsystem_frontend', 'tradingsystem_backend'],
    forbiddenIncludes: ['telegram_backend'],
    results,
    label: 'Dashboard isolado em redes corretas',
  });

  expectNetworks({
    compose: telegramCompose,
    serviceNames: ['telegram-pgbouncer'],
    expectedIncludes: ['telegram_backend'],
    forbiddenIncludes: ['tradingsystem_backend'],
    results,
    label: 'PgBouncer isolado na rede correta',
  });
}

function validateNetworks(results) {
  const output = runCommand('docker network ls --format "{{.Name}}"');
  if (!output) {
    record(results, {
      name: 'docker network ls',
      status: 'warn',
      detail: 'Não foi possível listar redes Docker (Docker parado?). Pular validação.',
    });
    return;
  }
  const networks = new Set(output.split('\n').map((line) => line.trim()));
  const required = [
    'telegram_backend',
    'tp_capital_backend',
    'tradingsystem_backend',
    'tradingsystem_frontend',
  ];
  for (const net of required) {
    if (!networks.has(net)) {
      record(results, {
        name: `Rede ${net}`,
        status: 'fail',
        detail: `Rede ${net} não encontrada. Execute docker compose correspondente.`,
      });
    } else {
      record(results, {
        name: `Rede ${net}`,
        status: 'pass',
        detail: 'Rede encontrada no host Docker.',
      });
    }
  }
}

async function writeEvidence(payload) {
  await ensureDir(governanceEvidenceDir);
  const stamp = new Date().toISOString().slice(0, 10);
  const filePath = path.join(
    governanceEvidenceDir,
    `tp-capital-network-${stamp}.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return filePath;
}

async function main() {
  const results = [];

  await validateEnv(results);
  await validateCompose(results);
  validateNetworks(results);

  const failed = results.some((item) => item.status === 'fail');
  const payload = {
    timestamp: new Date().toISOString(),
    stack: 'tp-capital',
    status: failed ? 'fail' : 'pass',
    checks: results,
  };

  const evidencePath = await writeEvidence(payload);

  // eslint-disable-next-line no-console
  console.log(
    `[tp-capital-check] ${failed ? 'FAIL' : 'PASS'} - evidência em ${path.relative(
      repoRoot,
      evidencePath,
    )}`,
  );

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[tp-capital-check] Erro inesperado:', error);
  process.exitCode = 1;
});
