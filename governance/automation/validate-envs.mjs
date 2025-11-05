#!/usr/bin/env node

/**
 * validate-envs.mjs
 * 
 * Script de validação de variáveis de ambiente e segredos
 * Parte do sistema de governança de segredos (POL-0002 / STD-010)
 * 
 * FUNCIONALIDADES:
 * - Detecta arquivos .env reais no repositório Git
 * - Compara chaves .env.example vs. process.env
 * - Gera evidências de auditoria em JSON
 * - Falha em CI se segredos plaintext forem encontrados
 * 
 * USAGE:
 *   node governance/automation/validate-envs.mjs
 *   npm run governance:check (inclui este script)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const AUDITS_DIR = path.join(PROJECT_ROOT, 'governance/evidence/audits');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

/**
 * 1. Verificar se arquivos .env reais estão no Git
 */
function checkForTrackedEnvFiles() {
  logSection('1. Verificando arquivos .env rastreados no Git');
  
  try {
    const gitFiles = execSync('git ls-files', { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf-8' 
    });
    
    const trackedEnvFiles = gitFiles
      .split('\n')
      .filter(file => {
        // Bloquear .env plaintext
        const isEnvFile = /\.env$/.test(file) || /\.env\.local$/.test(file);
        // Permitir .env.example e .env.*.example
        const isExample = /\.example$/.test(file);
        // Permitir .env.enc.yaml (criptografados)
        const isEncrypted = /\.enc\.(yaml|json)$/.test(file);
        // Permitir config/container-images.env (apenas imagens públicas)
        const isWhitelisted = file === 'config/container-images.env';
        
        return isEnvFile && !isExample && !isEncrypted && !isWhitelisted;
      });
    
    if (trackedEnvFiles.length > 0) {
      log('❌ ERRO: Arquivos .env plaintext detectados no Git:', 'red');
      trackedEnvFiles.forEach(file => log(`   - ${file}`, 'red'));
      log('\nAção requerida:', 'yellow');
      log('  1. Remover do Git: git rm --cached <file>', 'yellow');
      log('  2. Adicionar ao .gitignore', 'yellow');
      log('  3. Rotacionar TODOS os segredos expostos (SOP-SEC-001)', 'yellow');
      return { passed: false, files: trackedEnvFiles };
    }
    
    log('✅ Nenhum arquivo .env plaintext rastreado no Git', 'green');
    return { passed: true, files: [] };
    
  } catch (error) {
    if (error.message.includes('not a git repository')) {
      log('⚠️  Não é um repositório Git. Pulando verificação.', 'yellow');
      return { passed: true, files: [] };
    }
    throw error;
  }
}

/**
 * 2. Parsear arquivo .env.example
 */
function parseEnvExample() {
  logSection('2. Parseando template .env.example');
  
  // Procurar .env.example em vários locais
  const possiblePaths = [
    path.join(PROJECT_ROOT, '.env.example'),
    path.join(PROJECT_ROOT, 'governance/registry/templates/env.template.md'),
  ];
  
  let envExamplePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envExamplePath = p;
      break;
    }
  }
  
  if (!envExamplePath) {
    log('❌ ERRO: .env.example não encontrado!', 'red');
    log('Esperado em:', 'yellow');
    possiblePaths.forEach(p => log(`  - ${p}`, 'yellow'));
    return { passed: false, keys: [] };
  }
  
  log(`Lendo: ${envExamplePath}`, 'blue');
  
  let content = fs.readFileSync(envExamplePath, 'utf-8');
  
  // Se for markdown, extrair bloco de código
  if (envExamplePath.endsWith('.md')) {
    const codeBlockMatch = content.match(/```bash\n([\s\S]+?)```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    }
  }
  
  const keys = content
    .split('\n')
    .filter(line => {
      // Ignorar comentários e linhas vazias
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
    })
    .map(line => line.split('=')[0].trim())
    .filter(key => key && !key.startsWith('${'));  // Ignorar variáveis interpoladas
  
  log(`✅ ${keys.length} chaves encontradas no template`, 'green');
  
  // Mostrar amostra
  log('Amostra (primeiras 10):', 'blue');
  keys.slice(0, 10).forEach(key => log(`  - ${key}`, 'blue'));
  if (keys.length > 10) {
    log(`  ... e mais ${keys.length - 10}`, 'blue');
  }
  
  return { passed: true, keys };
}

/**
 * 3. Comparar com variáveis de ambiente atuais
 */
function compareWithProcessEnv(exampleKeys) {
  logSection('3. Comparando com variáveis de ambiente do processo');
  
  // Filtrar variáveis relevantes (excluir npm_*, PATH, etc.)
  const envKeys = Object.keys(process.env).filter(key => {
    // Incluir apenas variáveis do TradingSystem
    const prefixes = [
      'APP_', 'DB__', 'QUESTDB__', 'LOWDB__',
      'ORDERMANAGER__', 'DATACAPTURE__',
      'WORKSPACE__', 'TPCAPITAL__', 'DOCUMENTATION__',
      'SERVICE_LAUNCHER__', 'VITE__',
      'TELEGRAM__', 'EVOLUTION_', 'FIRECRAWL__',
      'OLLAMA__', 'LLAMAINDEX__', 'QDRANT__',
      'PROMETHEUS__', 'GRAFANA__', 'SENTRY__',
      'COMPOSE_', 'DOCKER__', 'SOPS__', 'SECRETS__',
      'LOG__', 'DEBUG', 'MOCK__', 'TEST__'
    ];
    
    return prefixes.some(prefix => key.startsWith(prefix));
  });
  
  log(`Variáveis do TradingSystem no ambiente: ${envKeys.length}`, 'blue');
  
  // Chaves faltando no .env.example
  const missingInExample = envKeys.filter(k => !exampleKeys.includes(k));
  
  // Chaves documentadas mas não definidas (apenas warning, não erro)
  const undefinedKeys = exampleKeys.filter(k => !envKeys.includes(k));
  
  if (missingInExample.length > 0) {
    log('\n⚠️  ATENÇÃO: Chaves no ambiente mas não documentadas em .env.example:', 'yellow');
    missingInExample.forEach(key => log(`   - ${key}`, 'yellow'));
    log('\nAção requerida: Adicionar ao .env.example para manter sincronizado', 'yellow');
  } else {
    log('✅ Todas as chaves do ambiente estão documentadas', 'green');
  }
  
  if (undefinedKeys.length > 0) {
    log(`\nℹ️  ${undefinedKeys.length} chaves documentadas mas não definidas (OK para CI/dev)`, 'blue');
  }
  
  return {
    passed: missingInExample.length === 0,
    missingInExample,
    undefinedKeys,
  };
}

/**
 * 4. Verificar valores sensíveis em .env.example
 */
function checkForSecretsInExample() {
  logSection('4. Verificando valores reais em .env.example');
  
  const possiblePaths = [
    path.join(PROJECT_ROOT, '.env.example'),
    path.join(PROJECT_ROOT, 'governance/registry/templates/env.template.md'),
  ];
  
  let envExamplePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      envExamplePath = p;
      break;
    }
  }
  
  if (!envExamplePath) {
    return { passed: false, suspiciousLines: [] };
  }
  
  let content = fs.readFileSync(envExamplePath, 'utf-8');
  
  // Se for markdown, extrair bloco de código
  if (envExamplePath.endsWith('.md')) {
    const codeBlockMatch = content.match(/```bash\n([\s\S]+?)```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    }
  }
  
  const suspiciousPatterns = [
    // Senhas óbvias
    { pattern: /password=[\w\d]{8,}/i, description: 'Password com valor real' },
    // Tokens longos
    { pattern: /token=[A-Za-z0-9]{20,}/, description: 'Token longo suspeito' },
    // API keys típicas
    { pattern: /key=sk-[A-Za-z0-9]{32,}/, description: 'OpenAI-like API key' },
    { pattern: /key=[0-9]{10}:[A-Za-z0-9_-]{35}/, description: 'Telegram bot token' },
    // JWT secrets reais
    { pattern: /jwt_secret=[A-Za-z0-9+/]{32,}/, description: 'JWT secret suspeito' },
  ];
  
  const suspiciousLines = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('#')) return;
    
    suspiciousPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(line)) {
        suspiciousLines.push({
          lineNumber: index + 1,
          line: line.substring(0, 80),  // Truncar
          description,
        });
      }
    });
  });
  
  if (suspiciousLines.length > 0) {
    log('⚠️  Valores suspeitos detectados em .env.example:', 'yellow');
    suspiciousLines.forEach(({ lineNumber, line, description }) => {
      log(`   Linha ${lineNumber}: ${description}`, 'yellow');
      log(`   ${line}`, 'red');
    });
    log('\nAção requerida: Substituir por placeholders (ex: <YOUR_PASSWORD>)', 'yellow');
    return { passed: false, suspiciousLines };
  }
  
  log('✅ Nenhum valor suspeito em .env.example', 'green');
  return { passed: true, suspiciousLines: [] };
}

/**
 * 5. Gerar evidência de auditoria
 */
function generateAuditEvidence(results) {
  logSection('5. Gerando evidência de auditoria');
  
  const now = new Date();
  const monthKey = now.toISOString().substring(0, 7);  // YYYY-MM
  const auditFile = path.join(AUDITS_DIR, `secrets-audit-${monthKey}.json`);
  
  // Criar diretório se não existir
  if (!fs.existsSync(AUDITS_DIR)) {
    fs.mkdirSync(AUDITS_DIR, { recursive: true });
  }
  
  const evidence = {
    timestamp: now.toISOString(),
    type: 'secrets_env_validation',
    results: {
      trackedEnvFiles: {
        passed: results.trackedEnvFiles.passed,
        filesFound: results.trackedEnvFiles.files,
      },
      envExampleSync: {
        passed: results.envComparison.passed,
        missingInExample: results.envComparison.missingInExample,
        undefinedKeys: results.envComparison.undefinedKeys.length,
      },
      secretsInExample: {
        passed: results.secretsCheck.passed,
        suspiciousLines: results.secretsCheck.suspiciousLines.length,
      },
    },
    overallPassed: results.trackedEnvFiles.passed && 
                    results.envComparison.passed && 
                    results.secretsCheck.passed,
    policy: 'POL-0002',
    standard: 'STD-010',
  };
  
  fs.writeFileSync(auditFile, JSON.stringify(evidence, null, 2), 'utf-8');
  log(`✅ Evidência salva: ${auditFile}`, 'green');
  
  return evidence;
}

/**
 * Main
 */
async function main() {
  log('\n🔒 TradingSystem - Validação de Secrets & Environment Variables', 'magenta');
  log('Política: POL-0002 | Padrão: STD-010', 'blue');
  
  const results = {
    trackedEnvFiles: checkForTrackedEnvFiles(),
    envExample: parseEnvExample(),
  };
  
  if (!results.envExample.passed) {
    log('\n❌ FALHA: .env.example não encontrado ou inválido', 'red');
    process.exit(1);
  }
  
  results.envComparison = compareWithProcessEnv(results.envExample.keys);
  results.secretsCheck = checkForSecretsInExample();
  
  const evidence = generateAuditEvidence(results);
  
  logSection('RESULTADO FINAL');
  
  if (evidence.overallPassed) {
    log('✅ SUCESSO: Todas as verificações passaram', 'green');
    log('\nDetalhes:', 'blue');
    log(`  - Arquivos .env rastreados: ${results.trackedEnvFiles.files.length}`, 'blue');
    log(`  - Chaves não documentadas: ${results.envComparison.missingInExample.length}`, 'blue');
    log(`  - Valores suspeitos em .env.example: ${results.secretsCheck.suspiciousLines.length}`, 'blue');
    process.exit(0);
  } else {
    log('❌ FALHA: Problemas encontrados na validação de secrets', 'red');
    log('\nProblemas:', 'red');
    if (!results.trackedEnvFiles.passed) {
      log(`  - Arquivos .env rastreados no Git: ${results.trackedEnvFiles.files.length}`, 'red');
    }
    if (!results.envComparison.passed) {
      log(`  - Chaves não documentadas: ${results.envComparison.missingInExample.length}`, 'red');
    }
    if (!results.secretsCheck.passed) {
      log(`  - Valores suspeitos em .env.example: ${results.secretsCheck.suspiciousLines.length}`, 'red');
    }
    log('\nConsulte:', 'yellow');
    log('  - Política: governance/policies/secrets-env-policy.md', 'yellow');
    log('  - SOP: governance/controls/secrets-rotation-sop.md', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ ERRO FATAL: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

