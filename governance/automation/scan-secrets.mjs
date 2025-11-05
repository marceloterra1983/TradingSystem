#!/usr/bin/env node

/**
 * scan-secrets.mjs
 * 
 * Script de detecção de segredos no repositório
 * Parte do sistema de governança de segredos (POL-0002 / STD-010)
 * 
 * FUNCIONALIDADES:
 * - Executa TruffleHog para detectar segredos
 * - Detecta padrões comuns (API keys, tokens, senhas)
 * - Gera evidências de auditoria em JSON
 * - Falha em CI se segredos verificados forem encontrados
 * 
 * USAGE:
 *   node governance/automation/scan-secrets.mjs
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
 * Verificar se TruffleHog está disponível
 */
function checkTruffleHogAvailability() {
  try {
    execSync('which docker', { stdio: 'ignore' });
    return { available: true, method: 'docker' };
  } catch {
    try {
      execSync('which trufflehog', { stdio: 'ignore' });
      return { available: true, method: 'binary' };
    } catch {
      return { available: false, method: null };
    }
  }
}

/**
 * Executar TruffleHog via Docker
 */
function runTruffleHogDocker() {
  logSection('Executando TruffleHog via Docker');
  
  const scanResultsFile = path.join(AUDITS_DIR, 'trufflehog-scan.json');
  
  // Criar diretório se não existir
  if (!fs.existsSync(AUDITS_DIR)) {
    fs.mkdirSync(AUDITS_DIR, { recursive: true });
  }
  
  log('Comando: docker run trufflesecurity/trufflehog:latest filesystem /src', 'blue');
  log('Isso pode levar alguns minutos dependendo do tamanho do repositório...', 'yellow');
  
  try {
    const output = execSync(
      `docker run --rm -v ${PROJECT_ROOT}:/src trufflesecurity/trufflehog:latest filesystem /src --json --no-update`,
      { 
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
      }
    );
    
    // TruffleHog retorna NDJSON (newline-delimited JSON)
    const findings = output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(f => f !== null);
    
    // Salvar resultados
    fs.writeFileSync(scanResultsFile, JSON.stringify(findings, null, 2), 'utf-8');
    
    return { success: true, findings, resultsFile: scanResultsFile };
    
  } catch (error) {
    // TruffleHog pode retornar exit code 1 se encontrar secrets
    // Precisamos parsear a saída mesmo assim
    const output = error.stdout || '';
    
    if (!output) {
      throw new Error(`Erro ao executar TruffleHog: ${error.message}`);
    }
    
    const findings = output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(f => f !== null);
    
    fs.writeFileSync(scanResultsFile, JSON.stringify(findings, null, 2), 'utf-8');
    
    return { success: true, findings, resultsFile: scanResultsFile };
  }
}

/**
 * Scan básico de padrões (fallback se TruffleHog não disponível)
 */
function runBasicPatternScan() {
  logSection('Executando scan básico de padrões (fallback)');
  
  log('⚠️  TruffleHog não disponível. Usando regex patterns básicos.', 'yellow');
  
  const patterns = [
    // Generic secrets
    { name: 'Generic Secret', regex: /(?:secret|password|passwd|pwd|token|api[_-]?key)[\s]*[=:]\s*['"]([^'"]{8,})['"]/ },
    // AWS
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|aws_secret_key)[\s]*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/ },
    // GitHub
    { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'GitHub OAuth', regex: /gho_[a-zA-Z0-9]{36}/ },
    // OpenAI
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
    // Telegram
    { name: 'Telegram Bot Token', regex: /[0-9]{8,10}:[A-Za-z0-9_-]{35}/ },
    // Generic high-entropy
    { name: 'High Entropy String', regex: /['"]((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)['"]/},
  ];
  
  const findings = [];
  
  try {
    // Usar git grep para performance
    patterns.forEach(({ name, regex }) => {
      try {
        const output = execSync(
          `git grep -P "${regex.source}" || true`,
          { cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        );
        
        if (output.trim()) {
          const lines = output.trim().split('\n');
          lines.forEach(line => {
            const [filePath, ...rest] = line.split(':');
            findings.push({
              DetectorName: name,
              SourceMetadata: { Data: { Filesystem: { file: filePath } } },
              Raw: rest.join(':').substring(0, 100),  // Truncar
              Verified: false,  // Scan básico não verifica
            });
          });
        }
      } catch (error) {
        // Ignorar erros de grep (padrão não encontrado)
      }
    });
    
    return { success: true, findings };
    
  } catch (error) {
    log(`⚠️  Erro no scan básico: ${error.message}`, 'yellow');
    return { success: false, findings: [] };
  }
}

/**
 * Analisar resultados do scan
 */
function analyzeFindings(findings) {
  logSection('Analisando resultados do scan');
  
  if (findings.length === 0) {
    log('✅ Nenhum segredo detectado!', 'green');
    return {
      totalFindings: 0,
      verifiedFindings: 0,
      unverifiedFindings: 0,
      byDetector: {},
      criticalFiles: [],
    };
  }
  
  const verifiedFindings = findings.filter(f => f.Verified === true);
  const unverifiedFindings = findings.filter(f => f.Verified !== true);
  
  // Agrupar por detector
  const byDetector = {};
  findings.forEach(f => {
    const detector = f.DetectorName || 'Unknown';
    byDetector[detector] = (byDetector[detector] || 0) + 1;
  });
  
  // Arquivos críticos (com secrets verificados)
  const criticalFiles = new Set();
  verifiedFindings.forEach(f => {
    const file = f.SourceMetadata?.Data?.Filesystem?.file || 
                 f.SourceMetadata?.Data?.Git?.file || 
                 'Unknown';
    criticalFiles.add(file);
  });
  
  log(`Total de findings: ${findings.length}`, 'blue');
  log(`  ✅ Verificados (alta confiança): ${verifiedFindings.length}`, verifiedFindings.length > 0 ? 'red' : 'green');
  log(`  ⚠️  Não verificados (possível falso positivo): ${unverifiedFindings.length}`, 'yellow');
  
  if (Object.keys(byDetector).length > 0) {
    log('\nDetectores acionados:', 'blue');
    Object.entries(byDetector)
      .sort((a, b) => b[1] - a[1])
      .forEach(([detector, count]) => {
        log(`  - ${detector}: ${count}`, 'blue');
      });
  }
  
  if (criticalFiles.size > 0) {
    log('\n❌ ARQUIVOS COM SECRETS VERIFICADOS:', 'red');
    Array.from(criticalFiles).forEach(file => {
      log(`  - ${file}`, 'red');
    });
  }
  
  return {
    totalFindings: findings.length,
    verifiedFindings: verifiedFindings.length,
    unverifiedFindings: unverifiedFindings.length,
    byDetector,
    criticalFiles: Array.from(criticalFiles),
  };
}

/**
 * Gerar evidência de auditoria
 */
function generateAuditEvidence(analysis, resultsFile) {
  logSection('Gerando evidência de auditoria');
  
  const now = new Date();
  const dateKey = now.toISOString().substring(0, 10);  // YYYY-MM-DD
  const auditFile = path.join(AUDITS_DIR, `secrets-scan-${dateKey}.json`);
  
  // Criar diretório se não existir
  if (!fs.existsSync(AUDITS_DIR)) {
    fs.mkdirSync(AUDITS_DIR, { recursive: true });
  }
  
  const evidence = {
    timestamp: now.toISOString(),
    type: 'secrets_scan',
    tool: 'trufflehog',
    results: {
      totalFindings: analysis.totalFindings,
      verifiedFindings: analysis.verifiedFindings,
      unverifiedFindings: analysis.unverifiedFindings,
      byDetector: analysis.byDetector,
      criticalFiles: analysis.criticalFiles,
    },
    scanResultsFile: resultsFile || null,
    policy: 'POL-0002',
    standard: 'STD-010',
    passed: analysis.verifiedFindings === 0,
  };
  
  fs.writeFileSync(auditFile, JSON.stringify(evidence, null, 2), 'utf-8');
  log(`✅ Evidência salva: ${auditFile}`, 'green');
  
  return evidence;
}

/**
 * Main
 */
async function main() {
  log('\n🔍 TradingSystem - Scan de Segredos no Repositório', 'magenta');
  log('Política: POL-0002 | Padrão: STD-010', 'blue');
  
  const truffleHog = checkTruffleHogAvailability();
  
  let scanResults;
  
  if (truffleHog.available) {
    log(`\n✅ TruffleHog disponível via: ${truffleHog.method}`, 'green');
    scanResults = runTruffleHogDocker();
  } else {
    log('\n⚠️  TruffleHog não disponível', 'yellow');
    log('Para melhor detecção, instale Docker:', 'yellow');
    log('  https://docs.docker.com/get-docker/', 'yellow');
    scanResults = runBasicPatternScan();
  }
  
  if (!scanResults.success) {
    log('❌ Falha ao executar scan de segredos', 'red');
    process.exit(1);
  }
  
  const analysis = analyzeFindings(scanResults.findings);
  const evidence = generateAuditEvidence(analysis, scanResults.resultsFile);
  
  logSection('RESULTADO FINAL');
  
  if (evidence.passed) {
    log('✅ SUCESSO: Nenhum segredo verificado detectado', 'green');
    
    if (analysis.unverifiedFindings > 0) {
      log(`\nℹ️  ${analysis.unverifiedFindings} finding(s) não verificado(s) encontrado(s)`, 'yellow');
      log('Isso pode incluir falsos positivos. Revisar manualmente:', 'yellow');
      if (scanResults.resultsFile) {
        log(`  ${scanResults.resultsFile}`, 'yellow');
      }
    }
    
    process.exit(0);
  } else {
    log('❌ FALHA: Segredos verificados detectados no repositório', 'red');
    log(`\n${analysis.verifiedFindings} segredo(s) com alta confiança encontrado(s)`, 'red');
    
    if (analysis.criticalFiles.length > 0) {
      log('\nArquivos críticos:', 'red');
      analysis.criticalFiles.forEach(file => log(`  - ${file}`, 'red'));
    }
    
    log('\n⚠️  AÇÃO IMEDIATA REQUERIDA:', 'yellow');
    log('  1. REVOGAR todos os segredos expostos', 'yellow');
    log('  2. Remover do Git: git rm --cached <file>', 'yellow');
    log('  3. Seguir SOP de emergência: governance/controls/secrets-rotation-sop.md', 'yellow');
    log('  4. Registrar incidente: governance/evidence/audits/incident-YYYY-MM-DD.json', 'yellow');
    
    if (scanResults.resultsFile) {
      log(`\nDetalhes completos em: ${scanResults.resultsFile}`, 'blue');
    }
    
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ ERRO FATAL: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

