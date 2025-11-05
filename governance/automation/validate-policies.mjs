#!/usr/bin/env node

/**
 * validate-policies.mjs
 * 
 * Script de validação de políticas e padrões de governança
 * Parte do sistema de governança de segredos (POL-0002 / STD-010)
 * 
 * FUNCIONALIDADES:
 * - Valida front-matter YAML de políticas e padrões
 * - Verifica campos obrigatórios (owner, lastReviewed, reviewCycleDays, status)
 * - Detecta políticas expiradas (lastReviewed + reviewCycleDays < hoje)
 * - Falha em CI se políticas críticas estiverem expiradas
 * 
 * USAGE:
 *   node governance/automation/validate-policies.mjs
 *   npm run governance:check (inclui este script)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const GOVERNANCE_DIR = path.join(PROJECT_ROOT, 'governance');

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
 * Parsear front-matter YAML de arquivo Markdown
 */
function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extrair front-matter entre --- ... ---
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }
  
  try {
    return yaml.load(frontmatterMatch[1]);
  } catch (error) {
    throw new Error(`Erro ao parsear YAML em ${filePath}: ${error.message}`);
  }
}

/**
 * Validar campos obrigatórios de uma política
 */
function validatePolicyFrontmatter(filePath, frontmatter) {
  const errors = [];
  const warnings = [];
  
  // Campos obrigatórios
  const requiredFields = ['title', 'id', 'owner', 'lastReviewed', 'reviewCycleDays', 'status'];
  
  requiredFields.forEach(field => {
    if (!frontmatter[field]) {
      errors.push(`Campo obrigatório ausente: ${field}`);
    }
  });
  
  // Validar owner não é placeholder
  if (frontmatter.owner === 'TBD' || frontmatter.owner === '') {
    errors.push('Owner não pode ser "TBD" ou vazio');
  }
  
  // Validar status é válido
  const validStatuses = ['active', 'draft', 'deprecated', 'archived'];
  if (frontmatter.status && !validStatuses.includes(frontmatter.status)) {
    warnings.push(`Status inválido: ${frontmatter.status}. Esperado: ${validStatuses.join(', ')}`);
  }
  
  // Validar formato de data (YYYY-MM-DD)
  if (frontmatter.lastReviewed) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(frontmatter.lastReviewed)) {
      errors.push(`lastReviewed em formato inválido: ${frontmatter.lastReviewed}. Esperado: YYYY-MM-DD`);
    }
  }
  
  // Validar reviewCycleDays é número
  if (frontmatter.reviewCycleDays && typeof frontmatter.reviewCycleDays !== 'number') {
    errors.push(`reviewCycleDays deve ser número: ${frontmatter.reviewCycleDays}`);
  }
  
  return { errors, warnings };
}

/**
 * Verificar se política está expirada
 */
function checkPolicyExpiration(frontmatter) {
  if (!frontmatter.lastReviewed || !frontmatter.reviewCycleDays) {
    return { expired: false, daysUntilReview: null, nextReviewDate: null };
  }
  
  const lastReviewed = new Date(frontmatter.lastReviewed);
  const reviewCycleDays = frontmatter.reviewCycleDays;
  const nextReviewDate = new Date(lastReviewed.getTime() + reviewCycleDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  
  const daysUntilReview = Math.floor((nextReviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysUntilReview < 0;
  
  return {
    expired,
    daysUntilReview,
    nextReviewDate: nextReviewDate.toISOString().substring(0, 10),
    lastReviewedDate: frontmatter.lastReviewed,
  };
}

/**
 * Escanear diretório de políticas/padrões
 */
function scanPoliciesDirectory(dirPath, type = 'policy') {
  logSection(`Escaneando ${type}s em: ${path.relative(PROJECT_ROOT, dirPath)}`);
  
  if (!fs.existsSync(dirPath)) {
    log(`⚠️  Diretório não existe: ${dirPath}`, 'yellow');
    return [];
  }
  
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(dirPath, f));
  
  log(`Encontrados ${files.length} arquivo(s) Markdown`, 'blue');
  
  const results = [];
  
  files.forEach(filePath => {
    const fileName = path.basename(filePath);
    log(`\n📄 ${fileName}`, 'blue');
    
    try {
      const frontmatter = parseFrontmatter(filePath);
      
      if (!frontmatter) {
        log('  ⚠️  Sem front-matter YAML', 'yellow');
        results.push({
          filePath,
          fileName,
          passed: false,
          errors: ['Front-matter YAML ausente'],
          warnings: [],
        });
        return;
      }
      
      // Validar campos obrigatórios
      const { errors, warnings } = validatePolicyFrontmatter(filePath, frontmatter);
      
      // Verificar expiração
      const expiration = checkPolicyExpiration(frontmatter);
      
      // Log de informações
      if (frontmatter.id) log(`  ID: ${frontmatter.id}`, 'blue');
      if (frontmatter.owner) log(`  Owner: ${frontmatter.owner}`, 'blue');
      if (frontmatter.status) log(`  Status: ${frontmatter.status}`, 'blue');
      
      if (expiration.nextReviewDate) {
        if (expiration.expired) {
          log(`  ⚠️  Expirada! Próxima revisão era: ${expiration.nextReviewDate} (${Math.abs(expiration.daysUntilReview)} dias atrás)`, 'red');
          errors.push(`Política expirada: última revisão em ${expiration.lastReviewedDate}, ciclo de ${frontmatter.reviewCycleDays} dias`);
        } else if (expiration.daysUntilReview <= 7) {
          log(`  ⚠️  Próxima revisão em ${expiration.daysUntilReview} dias: ${expiration.nextReviewDate}`, 'yellow');
          warnings.push(`Revisão próxima: ${expiration.daysUntilReview} dias`);
        } else {
          log(`  ✅ Próxima revisão: ${expiration.nextReviewDate} (${expiration.daysUntilReview} dias)`, 'green');
        }
      }
      
      // Log de erros e warnings
      if (errors.length > 0) {
        log('  ❌ Erros:', 'red');
        errors.forEach(err => log(`     - ${err}`, 'red'));
      }
      
      if (warnings.length > 0) {
        log('  ⚠️  Avisos:', 'yellow');
        warnings.forEach(warn => log(`     - ${warn}`, 'yellow'));
      }
      
      if (errors.length === 0) {
        log('  ✅ Validação passou', 'green');
      }
      
      results.push({
        filePath,
        fileName,
        frontmatter,
        passed: errors.length === 0,
        errors,
        warnings,
        expiration,
      });
      
    } catch (error) {
      log(`  ❌ Erro ao processar: ${error.message}`, 'red');
      results.push({
        filePath,
        fileName,
        passed: false,
        errors: [error.message],
        warnings: [],
      });
    }
  });
  
  return results;
}

/**
 * Main
 */
async function main() {
  log('\n📋 TradingSystem - Validação de Políticas e Padrões de Governança', 'magenta');
  
  const policiesDir = path.join(GOVERNANCE_DIR, 'policies');
  const standardsDir = path.join(GOVERNANCE_DIR, 'standards');
  const controlsDir = path.join(GOVERNANCE_DIR, 'controls');
  
  const policiesResults = scanPoliciesDirectory(policiesDir, 'política');
  const standardsResults = scanPoliciesDirectory(standardsDir, 'padrão');
  const controlsResults = scanPoliciesDirectory(controlsDir, 'controle/SOP');
  
  const allResults = [...policiesResults, ...standardsResults, ...controlsResults];
  
  logSection('RESUMO GERAL');
  
  const totalFiles = allResults.length;
  const passedFiles = allResults.filter(r => r.passed).length;
  const failedFiles = totalFiles - passedFiles;
  const expiredPolicies = allResults.filter(r => r.expiration && r.expiration.expired);
  const upcomingReviews = allResults.filter(r => 
    r.expiration && 
    !r.expiration.expired && 
    r.expiration.daysUntilReview !== null &&
    r.expiration.daysUntilReview <= 7
  );
  
  log(`\nTotal de documentos: ${totalFiles}`, 'blue');
  log(`  ✅ Validados: ${passedFiles}`, 'green');
  log(`  ❌ Com erros: ${failedFiles}`, failedFiles > 0 ? 'red' : 'blue');
  log(`  ⏰ Expirados: ${expiredPolicies.length}`, expiredPolicies.length > 0 ? 'red' : 'blue');
  log(`  ⚠️  Revisão próxima (≤7 dias): ${upcomingReviews.length}`, upcomingReviews.length > 0 ? 'yellow' : 'blue');
  
  if (expiredPolicies.length > 0) {
    log('\n⚠️  POLÍTICAS EXPIRADAS:', 'red');
    expiredPolicies.forEach(r => {
      log(`  - ${r.fileName} (ID: ${r.frontmatter?.id || 'N/A'})`, 'red');
      log(`    Última revisão: ${r.expiration.lastReviewedDate}`, 'red');
      log(`    Próxima revisão era: ${r.expiration.nextReviewDate}`, 'red');
    });
  }
  
  if (upcomingReviews.length > 0) {
    log('\n⚠️  REVISÕES PRÓXIMAS:', 'yellow');
    upcomingReviews.forEach(r => {
      log(`  - ${r.fileName} (ID: ${r.frontmatter?.id || 'N/A'})`, 'yellow');
      log(`    Próxima revisão: ${r.expiration.nextReviewDate} (${r.expiration.daysUntilReview} dias)`, 'yellow');
      log(`    Owner: ${r.frontmatter?.owner || 'N/A'}`, 'yellow');
    });
  }
  
  if (failedFiles > 0) {
    log('\n❌ DOCUMENTOS COM ERROS:', 'red');
    allResults.filter(r => !r.passed).forEach(r => {
      log(`\n  ${r.fileName}:`, 'red');
      r.errors.forEach(err => log(`    - ${err}`, 'red'));
    });
  }
  
  logSection('RESULTADO FINAL');
  
  // Falhar se houver erros OU políticas críticas expiradas
  const criticalExpired = expiredPolicies.filter(r => 
    r.frontmatter?.status === 'active' && 
    (r.frontmatter?.id === 'POL-0002' || r.frontmatter?.id?.startsWith('POL-'))
  );
  
  if (failedFiles > 0 || criticalExpired.length > 0) {
    log('❌ FALHA: Validação não passou', 'red');
    
    if (failedFiles > 0) {
      log(`  - ${failedFiles} documento(s) com erros de validação`, 'red');
    }
    
    if (criticalExpired.length > 0) {
      log(`  - ${criticalExpired.length} política(s) crítica(s) expirada(s)`, 'red');
    }
    
    log('\nAção requerida:', 'yellow');
    log('  1. Corrigir erros de front-matter nos documentos', 'yellow');
    log('  2. Revisar políticas expiradas e atualizar lastReviewed', 'yellow');
    log('  3. Re-executar: npm run governance:check', 'yellow');
    
    process.exit(1);
  } else {
    log('✅ SUCESSO: Todas as validações passaram', 'green');
    
    if (upcomingReviews.length > 0) {
      log(`\nℹ️  ${upcomingReviews.length} documento(s) precisam de revisão em breve`, 'yellow');
    }
    
    process.exit(0);
  }
}

main().catch(error => {
  log(`\n❌ ERRO FATAL: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});

