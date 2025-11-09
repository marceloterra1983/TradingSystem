---
title: "Plano de Implementação - Governança TradingSystem"
date: 2025-11-08
status: active
tags: [governance, implementation, step-by-step, automation]
domain: governance
type: implementation
summary: "Guia passo-a-passo detalhado para implementação das melhorias de governança com scripts, comandos e exemplos práticos"
last_review: 2025-11-08
owner: Governance
---

# 🛠️ Plano de Implementação - Governança TradingSystem

**Versão:** 1.0
**Data:** 2025-11-08
**Responsável:** Governance Team
**Duração Total:** 12 semanas (3 fases)

---

## 📋 Índice

1. [Preparação do Ambiente](#preparação-do-ambiente)
2. [Fase 1: Fundação (Semanas 1-4)](#fase-1-fundação-semanas-1-4)
3. [Fase 2: Otimização (Semanas 5-8)](#fase-2-otimização-semanas-5-8)
4. [Fase 3: Refinamento (Semanas 9-12)](#fase-3-refinamento-semanas-9-12)
5. [Scripts de Automação](#scripts-de-automação)
6. [Testes e Validação](#testes-e-validação)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Preparação do Ambiente

### Pré-requisitos

```bash
# Verificar versões necessárias
node --version  # v18.0.0+
npm --version   # v9.0.0+
git --version   # v2.30.0+

# Instalar dependências globais
npm install -g prettier eslint yaml-validator

# Clonar repositório (se necessário)
cd /home/marce/Projetos/TradingSystem
git checkout -b governance-improvements-2025-11
```

### Estrutura de Diretórios a Criar

```bash
# Criar estrutura necessária
mkdir -p governance/adr
mkdir -p governance/automation
mkdir -p governance/dashboard
mkdir -p governance/policies/versions
mkdir -p governance/archive
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

echo "✅ Estrutura criada"
```

### Dependências NPM

```bash
# Adicionar ao package.json (raiz)
npm install --save-dev \
  ajv \
  yaml \
  date-fns \
  glob \
  chalk \
  ora \
  enquirer

# Criar package.json em governance/automation se não existir
cat > governance/automation/package.json << 'EOF'
{
  "name": "@tradingsystem/governance-automation",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "validate-policies": "node validate-policies.mjs",
    "scan-secrets": "bash scan-secrets.sh",
    "check-all": "npm run validate-policies && npm run scan-secrets"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "yaml": "^2.3.4",
    "date-fns": "^2.30.0",
    "glob": "^10.3.10",
    "chalk": "^5.3.0",
    "ora": "^7.0.1"
  }
}
EOF

cd governance/automation && npm install
cd ../..
```

---

## 📅 Fase 1: Fundação (Semanas 1-4)

### ✅ Semana 1: ADR Framework + Validação Básica

#### Dia 1 (Segunda) - ADR Template

**Tarefa 1.1: Criar Template ADR**

```bash
# Criar template ADR baseado em MADR
cat > governance/adr/template.md << 'EOF'
---
id: ADR-XXXX
title: "Título da Decisão"
status: proposed  # proposed | accepted | deprecated | superseded
date: YYYY-MM-DD
deciders: ["Name1", "Name2"]
tags: [architecture, domain]
supersedes: null  # ADR-XXXX ou null
superseded-by: null  # ADR-XXXX ou null
---

# ADR-XXXX: Título da Decisão

## Status

**Status:** proposed
**Date:** YYYY-MM-DD
**Deciders:** Name1, Name2

## Context and Problem Statement

[Descreva o contexto técnico e o problema que requer uma decisão arquitetural]

**Context:**
- Contexto 1
- Contexto 2

**Problem:**
O que precisa ser decidido?

## Decision Drivers

- Driver 1 (ex: Performance requirement < 500ms)
- Driver 2 (ex: Cost constraint < R$ 1000/month)
- Driver 3 (ex: Team expertise in technology X)

## Considered Options

1. **Option A** - [Nome da opção]
2. **Option B** - [Nome da opção]
3. **Option C** - [Nome da opção]

## Decision Outcome

**Chosen option:** "Option B - [Nome]"

**Justification:**
Explique por que esta opção foi escolhida em relação às outras.

**Positive Consequences:**
- ✅ Consequência positiva 1
- ✅ Consequência positiva 2
- ✅ Consequência positiva 3

**Negative Consequences:**
- ⚠️ Consequência negativa 1
- ⚠️ Consequência negativa 2

**Risks:**
- 🚨 Risco 1 (Mitigação: ...)
- 🚨 Risco 2 (Mitigação: ...)

## Pros and Cons of the Options

### Option A - [Nome]

**Pros:**
- ✅ Pro 1
- ✅ Pro 2

**Cons:**
- ❌ Contra 1
- ❌ Contra 2

**Estimated Effort:** X person-weeks
**Cost:** R$ X

---

### Option B - [Nome] (CHOSEN)

**Pros:**
- ✅ Pro 1
- ✅ Pro 2
- ✅ Pro 3

**Cons:**
- ❌ Contra 1

**Estimated Effort:** Y person-weeks
**Cost:** R$ Y

---

### Option C - [Nome]

**Pros:**
- ✅ Pro 1

**Cons:**
- ❌ Contra 1
- ❌ Contra 2

**Estimated Effort:** Z person-weeks
**Cost:** R$ Z

## Implementation Plan

1. **Phase 1:** Step 1 (Week 1)
2. **Phase 2:** Step 2 (Week 2-3)
3. **Phase 3:** Step 3 (Week 4)

**Total Effort:** X person-weeks
**Timeline:** X weeks

## Validation and Success Criteria

**Validation:**
- [ ] Criterion 1 met
- [ ] Criterion 2 met
- [ ] Performance benchmark passed

**Success Criteria:**
- Metric 1 > Target
- Metric 2 < Target
- User satisfaction > 90%

## Links

- [POL-XXXX] Related Policy
- [STD-XXXX] Related Standard
- [Issue #123] GitHub Issue
- [RFC #456] Original RFC
- [Slack Discussion](https://workspace.slack.com/...)

## Notes

Additional notes, context, or future considerations.

---

**Changelog:**
- `YYYY-MM-DD` - v1.0 - Initial decision (Status: proposed)
- `YYYY-MM-DD` - v1.1 - Approved (Status: accepted)
EOF

echo "✅ ADR template criado"
```

**Tarefa 1.2: Criar Script de Geração de ADR**

```bash
# Script auxiliar para criar novo ADR
cat > governance/automation/new-adr.mjs << 'EOF'
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import enquirer from 'enquirer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adrDir = path.join(__dirname, '../adr');
const templatePath = path.join(adrDir, 'template.md');

// Get next ADR number
function getNextAdrNumber() {
  const files = fs.readdirSync(adrDir).filter(f => f.match(/^\d{4}-/));
  if (files.length === 0) return 1;

  const numbers = files.map(f => parseInt(f.split('-')[0]));
  return Math.max(...numbers) + 1;
}

// Main
async function main() {
  const nextNum = getNextAdrNumber();
  const adrId = String(nextNum).padStart(4, '0');

  console.log(`\n🏗️  Criando ADR-${adrId}\n`);

  const answers = await enquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Título da decisão:',
      validate: (input) => input.length > 5 || 'Título muito curto'
    },
    {
      type: 'input',
      name: 'deciders',
      message: 'Responsáveis pela decisão (separados por vírgula):',
      initial: 'Governance Team'
    },
    {
      type: 'multiselect',
      name: 'tags',
      message: 'Tags (selecione):',
      choices: [
        'architecture',
        'database',
        'frontend',
        'backend',
        'infrastructure',
        'security',
        'performance',
        'scalability'
      ]
    }
  ]);

  // Load template
  let content = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(/ADR-XXXX/g, `ADR-${adrId}`);
  content = content.replace(/Título da Decisão/g, answers.title);
  content = content.replace(/YYYY-MM-DD/g, today);
  content = content.replace(/\["Name1", "Name2"\]/, JSON.stringify(answers.deciders.split(',').map(s => s.trim())));
  content = content.replace(/\[architecture, domain\]/, JSON.stringify(answers.tags));

  // Generate filename
  const slug = answers.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${adrId}-${slug}.md`;
  const filepath = path.join(adrDir, filename);

  // Write file
  fs.writeFileSync(filepath, content, 'utf-8');

  console.log(`\n✅ ADR criado: governance/adr/${filename}`);
  console.log(`\nPróximos passos:`);
  console.log(`1. Edite o arquivo e preencha as seções`);
  console.log(`2. Abra PR quando finalizar`);
  console.log(`3. Atualize status para 'accepted' após aprovação\n`);
}

main().catch(console.error);
EOF

chmod +x governance/automation/new-adr.mjs
echo "✅ Script de criação de ADR pronto"
```

**Tarefa 1.3: Migrar Primeira Decisão (Exemplo: Docusaurus v3)**

```bash
# Criar primeiro ADR
node governance/automation/new-adr.mjs

# Responder perguntas interativas:
# Título: Adoção do Docusaurus v3 para Documentation Hub
# Responsáveis: DocsOps Team
# Tags: architecture, documentation, frontend

# Editar o arquivo criado e preencher conteúdo
# (Baseado em: governance/evidence/reports/reviews/DOCUSAURUS-REVIEW-FINAL-REPORT.md)
```

#### Dia 2 (Terça) - Validação de Políticas

**Tarefa 2.1: Criar Script de Validação**

```javascript
// governance/automation/validate-policies.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { addDays, isBefore, parseISO } from 'date-fns';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const governanceRoot = path.join(__dirname, '..');

// Validation rules
const REQUIRED_FIELDS = {
  policy: ['id', 'title', 'owner', 'lastReviewed', 'reviewCycleDays', 'status', 'policyId'],
  standard: ['id', 'title', 'owner', 'lastReviewed', 'reviewCycleDays', 'status', 'standardId', 'relatedPolicies'],
  sop: ['id', 'title', 'owner', 'lastReviewed', 'reviewCycleDays', 'status', 'sopId', 'relatedPolicies']
};

const VALID_STATUSES = ['active', 'draft', 'deprecated', 'superseded'];
const INVALID_OWNERS = ['TBD', '', null, undefined];

class PolicyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.filesValidated = 0;
  }

  extractFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      return parse(match[1]);
    } catch (err) {
      return null;
    }
  }

  validateFile(filePath, type) {
    this.filesValidated++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = this.extractFrontmatter(content);
    const fileName = path.basename(filePath);

    if (!frontmatter) {
      this.errors.push({
        file: fileName,
        type: 'MISSING_FRONTMATTER',
        message: 'Frontmatter YAML não encontrado ou inválido'
      });
      return false;
    }

    // Check required fields
    const requiredFields = REQUIRED_FIELDS[type] || REQUIRED_FIELDS.policy;
    const missingFields = requiredFields.filter(field => !frontmatter[field]);

    if (missingFields.length > 0) {
      this.errors.push({
        file: fileName,
        type: 'MISSING_FIELDS',
        message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`
      });
    }

    // Validate owner
    if (INVALID_OWNERS.includes(frontmatter.owner)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_OWNER',
        message: `Owner inválido: "${frontmatter.owner}". Deve ser um time válido.`
      });
    }

    // Validate status
    if (frontmatter.status && !VALID_STATUSES.includes(frontmatter.status)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_STATUS',
        message: `Status inválido: "${frontmatter.status}". Valores válidos: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Check expiration
    if (frontmatter.lastReviewed && frontmatter.reviewCycleDays) {
      try {
        const lastReviewed = parseISO(frontmatter.lastReviewed);
        const reviewCycleDays = parseInt(frontmatter.reviewCycleDays);
        const expirationDate = addDays(lastReviewed, reviewCycleDays);
        const today = new Date();

        if (isBefore(expirationDate, today)) {
          const daysExpired = Math.floor((today - expirationDate) / (1000 * 60 * 60 * 24));
          this.errors.push({
            file: fileName,
            type: 'POLICY_EXPIRED',
            message: `Política expirada há ${daysExpired} dias. Última revisão: ${frontmatter.lastReviewed}`,
            severity: 'CRITICAL'
          });
        } else {
          const daysRemaining = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));
          if (daysRemaining <= 14) {
            this.warnings.push({
              file: fileName,
              type: 'EXPIRING_SOON',
              message: `Política expira em ${daysRemaining} dias. Agende revisão.`
            });
          }
        }
      } catch (err) {
        this.errors.push({
          file: fileName,
          type: 'INVALID_DATE',
          message: `Data de revisão inválida: ${frontmatter.lastReviewed}`
        });
      }
    }

    // Validate ID format
    if (frontmatter.policyId && !frontmatter.policyId.match(/^POL-\d{4}$/)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_POLICY_ID',
        message: `Policy ID inválido: "${frontmatter.policyId}". Formato correto: POL-XXXX`
      });
    }

    if (frontmatter.standardId && !frontmatter.standardId.match(/^STD-\d{3}$/)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_STANDARD_ID',
        message: `Standard ID inválido: "${frontmatter.standardId}". Formato correto: STD-XXX`
      });
    }

    if (frontmatter.sopId && !frontmatter.sopId.match(/^SOP-[A-Z]{3}-\d{3}$/)) {
      this.errors.push({
        file: fileName,
        type: 'INVALID_SOP_ID',
        message: `SOP ID inválido: "${frontmatter.sopId}". Formato correto: SOP-XXX-XXX`
      });
    }

    return this.errors.length === 0;
  }

  async validateAll() {
    const spinner = ora('Validando políticas, standards e SOPs...').start();

    try {
      // Find all policy files
      const policyFiles = await glob('policies/**/*.md', { cwd: governanceRoot, absolute: true });
      const standardFiles = await glob('standards/**/*.md', { cwd: governanceRoot, absolute: true });
      const sopFiles = await glob('controls/**/*sop.md', { cwd: governanceRoot, absolute: true });

      // Validate each category
      for (const file of policyFiles) {
        this.validateFile(file, 'policy');
      }

      for (const file of standardFiles) {
        this.validateFile(file, 'standard');
      }

      for (const file of sopFiles) {
        this.validateFile(file, 'sop');
      }

      spinner.stop();

      // Report results
      console.log('\n' + chalk.bold('📊 Resultados da Validação\n'));
      console.log(chalk.gray(`Arquivos validados: ${this.filesValidated}`));
      console.log(chalk.red(`Erros: ${this.errors.length}`));
      console.log(chalk.yellow(`Avisos: ${this.warnings.length}\n`));

      if (this.errors.length > 0) {
        console.log(chalk.red.bold('❌ ERROS ENCONTRADOS:\n'));
        this.errors.forEach((error, idx) => {
          console.log(chalk.red(`${idx + 1}. ${error.file}`));
          console.log(chalk.red(`   ${error.type}: ${error.message}`));
          if (error.severity === 'CRITICAL') {
            console.log(chalk.bgRed.white(' CRÍTICO '));
          }
          console.log('');
        });
      }

      if (this.warnings.length > 0) {
        console.log(chalk.yellow.bold('⚠️  AVISOS:\n'));
        this.warnings.forEach((warning, idx) => {
          console.log(chalk.yellow(`${idx + 1}. ${warning.file}`));
          console.log(chalk.yellow(`   ${warning.type}: ${warning.message}\n`));
        });
      }

      if (this.errors.length === 0 && this.warnings.length === 0) {
        console.log(chalk.green.bold('✅ Todas as validações passaram!\n'));
        return true;
      }

      return false;
    } catch (err) {
      spinner.fail('Erro durante validação');
      console.error(chalk.red(err.message));
      throw err;
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      filesValidated: this.filesValidated,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        criticalErrors: this.errors.filter(e => e.severity === 'CRITICAL').length,
        passed: this.errors.length === 0
      }
    };

    const reportPath = path.join(governanceRoot, 'evidence/audits', `policy-validation-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(chalk.gray(`📄 Relatório salvo em: ${path.relative(process.cwd(), reportPath)}\n`));

    return report;
  }
}

// Main execution
async function main() {
  const validator = new PolicyValidator();
  const passed = await validator.validateAll();
  await validator.generateReport();

  // Exit with error code if validation failed
  process.exit(passed ? 0 : 1);
}

main().catch(console.error);
```

Salvar como `governance/automation/validate-policies.mjs`

**Tarefa 2.2: Testar Validação**

```bash
# Executar validação
node governance/automation/validate-policies.mjs

# Deve mostrar status atual das políticas
# Corrigir erros encontrados antes de prosseguir
```

#### Dia 3 (Quarta) - CI/CD Workflow

**Tarefa 3.1: Criar GitHub Workflow**

```yaml
# .github/workflows/governance-validation.yml
name: Governance Validation

on:
  pull_request:
    paths:
      - 'governance/**'
      - '.env.example'
  push:
    branches:
      - main
      - develop
  schedule:
    # Run daily at 9 AM UTC (6 AM BRT)
    - cron: '0 9 * * *'

jobs:
  validate-policies:
    name: Validate Policies & Standards
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        working-directory: governance/automation
        run: npm ci

      - name: Validate Policies
        run: node governance/automation/validate-policies.mjs

      - name: Validate Registry Schema
        run: node governance/automation/validate-registry.mjs

      - name: Upload validation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: governance-validation-report
          path: governance/evidence/audits/policy-validation-*.json
          retention-days: 90

  scan-secrets:
    name: Scan for Exposed Secrets
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for TruffleHog

      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --only-verified

      - name: Upload scan results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: secrets-scan-report
          path: trufflehog-output.json
          retention-days: 90

  validate-env-templates:
    name: Validate Environment Templates
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Validate .env.example
        run: bash scripts/env/validate-env.sh

      - name: Check for hardcoded secrets
        run: |
          # Check for common secret patterns
          if grep -r -E '(password|secret|key|token).*=.*[a-zA-Z0-9]{20,}' .env.example; then
            echo "❌ Possible hardcoded secrets found in .env.example"
            exit 1
          fi
          echo "✅ No hardcoded secrets detected"

  notify-expiring-policies:
    name: Notify Expiring Policies
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Check for expiring policies
        run: node governance/automation/notify-policy-owners.mjs

      - name: Create issue for expired policies
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('governance/evidence/audits/policy-validation-latest.json', 'utf-8'));

            const expiredPolicies = report.errors.filter(e => e.type === 'POLICY_EXPIRED');

            if (expiredPolicies.length > 0) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `🚨 ${expiredPolicies.length} Política(s) Expirada(s) - Ação Necessária`,
                body: `## Políticas Expiradas\n\n${expiredPolicies.map(p => `- **${p.file}**: ${p.message}`).join('\n')}\n\n**Ação Requerida:** Revisar e atualizar campo \`lastReviewed\` após revisão.`,
                labels: ['governance', 'governance:expired', 'priority:high']
              });
            }
```

Salvar e commit.

**Tarefa 3.2: Testar Workflow**

```bash
# Criar branch de teste
git checkout -b test-governance-ci

# Fazer mudança em uma policy (simular)
# Commitar e abrir PR
git add governance/
git commit -m "test: validar workflow de governança"
git push origin test-governance-ci

# Verificar no GitHub Actions se workflow executou
# Validar relatórios gerados
```

#### Dia 4 (Quinta) - RACI Matrix

**Tarefa 4.1: Criar RACI Matrix**

```markdown
# governance/strategy/RACI-MATRIX.md
---
title: "RACI Matrix - Governança TradingSystem"
date: 2025-11-08
status: active
tags: [governance, raci, responsibilities]
domain: governance
type: strategy
summary: "Matriz RACI definindo responsabilidades de governança"
last_review: 2025-11-08
owner: Governance
---

# RACI Matrix - Governança TradingSystem

**Legenda:**
- **R** = Responsible (Executa a tarefa)
- **A** = Accountable (Aprova/responsável final)
- **C** = Consulted (Consultado para input)
- **I** = Informed (Informado sobre progresso)

## Políticas (Policies)

| Atividade | Policy Owner | Security Eng | Developers | DevOps | CI/CD | Auditor |
|-----------|-------------|--------------|------------|--------|-------|---------|
| **Criar nova policy** | **A** | C | I | I | - | C |
| **Revisar policy (ciclo)** | **R,A** | C | I | I | - | C |
| **Aprovar mudanças** | **A** | C | - | - | - | C |
| **Versionar policy** | **R** | I | I | I | - | I |
| **Deprecar policy** | **A** | C | I | I | - | C |

## Standards (Padrões Técnicos)

| Atividade | Standard Owner | Developers | DevOps | QA | CI/CD |
|-----------|---------------|------------|--------|-----|-------|
| **Criar standard** | **A** | C | C | C | - |
| **Implementar testes** | **R** | C | C | **R** | A |
| **Validar compliance** | C | I | I | **R** | A |
| **Atualizar standard** | **A** | C | C | C | - |

## SOPs (Procedimentos Operacionais)

| Atividade | SOP Owner | DevOps | SRE | Developers | Incident Manager |
|-----------|-----------|--------|-----|------------|------------------|
| **Criar SOP** | **A** | **R** | C | I | I |
| **Executar SOP** | I | **R** | **R** | C | I |
| **Atualizar após incidente** | **A** | **R** | C | I | **R** |
| **Treinar equipe** | C | **R** | **R** | I | C |
| **Testar em drill** | C | **R** | **R** | I | I |

## Automação e Validação

| Atividade | DocsOps | DevOps | CI/CD | Developers | Policy Owner |
|-----------|---------|--------|-------|------------|-------------|
| **Criar scripts de validação** | **R** | C | I | - | I |
| **Configurar workflows CI/CD** | C | **R** | **A** | I | I |
| **Manter automação** | **R** | C | I | - | I |
| **Validar em PRs** | I | I | **A** | I | I |
| **Bloquear builds (violations)** | I | I | **A** | I | C |

## Evidências e Auditorias

| Atividade | DocsOps | Security Eng | DevOps | Auditor | Compliance |
|-----------|---------|--------------|--------|---------|------------|
| **Gerar evidências** | **R** | I | **R** | I | I |
| **Armazenar evidências** | **R** | I | C | I | I |
| **Auditar compliance** | C | C | C | **R,A** | **R** |
| **Responder auditorias** | C | **R** | C | C | **A** |
| **Remediar findings** | C | **R** | **R** | I | **A** |

## Métricas e Dashboards

| Atividade | DocsOps | DevOps | Governance Lead | Executives |
|-----------|---------|--------|-----------------|------------|
| **Gerar métricas** | **R** | C | I | I |
| **Manter dashboards** | **R** | **R** | I | I |
| **Revisar KPIs** | C | C | **R,A** | I |
| **Reportar status** | **R** | I | **A** | I |
| **Aprovar targets** | I | I | C | **A** |

## Gestão de Exceções

| Atividade | Policy Owner | Security Eng | CISO | Requestor |
|-----------|-------------|--------------|------|-----------|
| **Solicitar exceção** | I | I | I | **R** |
| **Avaliar risco** | C | **R** | I | I |
| **Aprovar exceção** | **A** | C | C | I |
| **Documentar exceção** | **R** | C | I | I |
| **Revisar exceções (quarterly)** | **A** | **R** | **R** | I |

## Treinamento e Onboarding

| Atividade | DocsOps | Team Leads | HR | New Hires |
|-----------|---------|------------|-----|-----------|
| **Criar material de treinamento** | **R,A** | C | I | - |
| **Conduzir onboarding** | C | **R** | I | I |
| **Avaliar conhecimento** | C | **R** | I | I |
| **Atualizar conteúdo** | **R,A** | C | I | - |

## Incidentes de Governança

| Atividade | Incident Manager | Policy Owner | Security Eng | DevOps | Compliance |
|-----------|-----------------|-------------|--------------|--------|------------|
| **Detectar violação** | I | I | I | **R** | I |
| **Reportar incidente** | **R** | I | I | I | I |
| **Investigar root cause** | **R** | C | **R** | C | I |
| **Remediar imediato** | **A** | C | **R** | **R** | I |
| **Atualizar policies** | I | **A** | C | I | C |
| **Criar post-mortem** | **R,A** | C | C | C | C |

---

## Responsáveis por Domínio

| Domínio | Owner | Backup | Review Cycle |
|---------|-------|--------|--------------|
| **Policies** | Governance Lead | CISO | 90 dias |
| **Standards** | Technical Lead | Senior Engineers | 90 dias |
| **SOPs** | DevOps Lead | SRE Lead | 180 dias |
| **ADRs** | Architecture Guild | Tech Leads | Indefinido |
| **Automation** | DocsOps Lead | DevOps Lead | 60 dias |
| **Evidence** | Compliance Officer | DocsOps | 120 dias |

---

## Fluxo de Aprovação

### Nova Policy

```
Requestor → Policy Owner → Security Eng (review) → Governance Lead (approval)
```

### Novo Standard

```
Technical Lead → Senior Engineers (review) → Architecture Guild (approval)
```

### Novo SOP

```
DevOps → SRE Lead (review) → Incident Manager (validation) → DevOps Lead (approval)
```

### Exceção de Policy

```
Requestor → Policy Owner (evaluation) → Security Eng (risk assessment) → CISO (approval)
```

---

**Aprovado por:**
- [ ] Governance Lead
- [ ] CISO
- [ ] DevOps Lead
- [ ] DocsOps Lead

**Data de Aprovação:** _______________
```

#### Dia 5 (Sexta) - Templates

**Tarefa 5.1: Criar Templates Restantes**

```bash
# Template de Policy
cat > governance/registry/templates/policy.template.md << 'EOF'
---
title: "Título da Política"
id: POL-XXXX
owner: TeamName
lastReviewed: YYYY-MM-DD
reviewCycleDays: 90
status: draft  # draft | active | deprecated
policyId: POL-XXXX
appliesTo:
  - ServiceName1
  - ServiceName2
related:
  - STD-XXX
tags:
  - domain
  - compliance
---

# POL-XXXX: Título da Política

## Propósito

[Descreva o objetivo desta política]

## Escopo

Esta política aplica-se a:
- Sistema/Serviço 1
- Sistema/Serviço 2
- ...

## Diretrizes Obrigatórias

### 1. [Diretriz Principal 1]

**Requirement:** [Descrição clara e objetiva]

**Rationale:** [Por que esta diretriz é necessária]

**Examples:**
```
✅ CORRETO: Exemplo de conformidade
❌ INCORRETO: Exemplo de violação
```

### 2. [Diretriz Principal 2]

...

## Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| **Policy Owner** | Manter e revisar política |
| **Developers** | Implementar e seguir diretrizes |
| **DevOps** | Automatizar validação |

## Validação e Compliance

**Validation Method:**
- [ ] Validação automatizada (script/CI/CD)
- [ ] Code review manual
- [ ] Auditoria periódica

**Compliance Criteria:**
- Critério 1
- Critério 2

## Exceções

**Exception Process:**
1. Solicitar via GitHub issue (label: `governance:exception`)
2. Justificar necessidade de negócio
3. Aguardar aprovação de [Owner/CISO]

**Approved Exceptions:**
- Nenhuma até o momento

## Standards Relacionados

- [STD-XXX] - Nome do Standard

## Histórico de Revisões

| Data | Versão | Mudanças | Aprovador |
|------|--------|----------|-----------|
| YYYY-MM-DD | 1.0 | Criação inicial | Name |

---

**Próxima Revisão:** YYYY-MM-DD
EOF

# Template de Standard
cat > governance/registry/templates/standard.template.md << 'EOF'
---
title: "Título do Standard"
id: STD-XXX
owner: TeamName
lastReviewed: YYYY-MM-DD
reviewCycleDays: 90
status: active
standardId: STD-XXX
relatedPolicies:
  - POL-XXXX
tags:
  - technical-standard
  - testing
---

# STD-XXX: Título do Standard

## Overview

[Descrição breve do standard e sua relação com policies]

## Requisitos Técnicos

### REQ-1: [Nome do Requisito]

**Description:** [Descrição detalhada]

**Implementation:**
```javascript
// Exemplo de código conforme
...
```

**Validation:**
```bash
# Como testar conformidade
npm run test:std-xxx
```

**Success Criteria:**
- [ ] Critério 1
- [ ] Critério 2

---

### REQ-2: [Nome do Requisito]

...

## Testes Automatizados

### Test Suite

```bash
# Executar todos os testes deste standard
npm run test:standard:std-xxx
```

### Coverage Target

- Line coverage: >80%
- Branch coverage: >75%
- Function coverage: >90%

## Ferramentas e Bibliotecas

| Tool | Purpose | Version |
|------|---------|---------|
| Tool1 | Description | vX.Y.Z |
| Tool2 | Description | vX.Y.Z |

## Implementation Checklist

- [ ] Requisito 1 implementado
- [ ] Requisito 2 implementado
- [ ] Testes automatizados criados
- [ ] CI/CD configurado
- [ ] Documentação atualizada

## References

- [POL-XXXX] Related Policy
- [External Standard] (if applicable)

---

**Review Status:** ✅ Compliant | ⚠️ Partially Compliant | ❌ Non-Compliant
EOF

# Template de SOP
cat > governance/registry/templates/sop.template.md << 'EOF'
---
title: "Título do SOP"
id: SOP-XXX-XXX
owner: TeamName
lastReviewed: YYYY-MM-DD
reviewCycleDays: 180
status: active
sopId: SOP-XXX-XXX
relatedPolicies:
  - POL-XXXX
relatedStandards:
  - STD-XXX
tags:
  - sop
  - runbook
  - operational
---

# SOP-XXX-XXX: Título do SOP

## Purpose

[Descrever para que serve este procedimento]

## Scope

**When to use:**
- Situação 1
- Situação 2

**Prerequisites:**
- Pré-requisito 1
- Pré-requisito 2

## Procedure

### Phase 1: Preparação

**Duration:** ~X minutes

1. **Step 1:** [Ação específica]
   ```bash
   # Comando exato
   command here
   ```

   **Expected Output:**
   ```
   Output esperado
   ```

   **If fails:** Ir para [Troubleshooting](#troubleshooting)

2. **Step 2:** [Próxima ação]
   ...

### Phase 2: Execução

...

### Phase 3: Validação

1. **Verify:** [O que verificar]
   ```bash
   # Comando de verificação
   ```

   **Success Criteria:**
   - [ ] Critério 1 atendido
   - [ ] Critério 2 atendido

## Rollback Procedure

Se algo der errado durante execução:

### Emergency Rollback

```bash
# Comando de rollback imediato
bash scripts/rollback-xxx.sh
```

### Full Rollback

1. Step 1
2. Step 2
...

## Troubleshooting

### Issue 1: [Descrição do problema]

**Symptoms:**
- Sintoma 1
- Sintoma 2

**Resolution:**
```bash
# Solução
```

### Issue 2: [Outro problema comum]

...

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Execution Time | <X min | Duration from start to validation |
| Success Rate | >95% | Successful executions / Total |
| Rollback Rate | <5% | Rollbacks needed / Total |

## Evidence and Logging

**Required Evidence:**
- [ ] Execution log
- [ ] Validation output
- [ ] Incident ticket (if applicable)

**Storage:**
```bash
governance/evidence/sops/SOP-XXX-XXX-YYYY-MM-DD.log
```

## Training

**Required Training:**
- [ ] Read this SOP
- [ ] Shadow execution (1x)
- [ ] Supervised execution (1x)
- [ ] Independent execution (validated)

## Related Documents

- [POL-XXXX] Related Policy
- [STD-XXX] Related Standard
- [Other SOP] Related Procedure

---

**Last Tested:** YYYY-MM-DD
**Test Result:** ✅ Success | ❌ Failed | ⚠️ Partial
**Next Test Due:** YYYY-MM-DD
EOF

echo "✅ Templates criados"
```

**Tarefa 5.2: Documentar Processo de Uso**

```markdown
# governance/controls/template-usage-guide.md
---
title: "Guia de Uso de Templates de Governança"
date: 2025-11-08
status: active
tags: [governance, templates, howto]
---

# Guia de Uso de Templates de Governança

## Templates Disponíveis

| Template | Uso | Localização |
|----------|-----|-------------|
| **policy.template.md** | Nova política (POL-XXXX) | `governance/registry/templates/` |
| **standard.template.md** | Novo standard (STD-XXX) | `governance/registry/templates/` |
| **sop.template.md** | Novo SOP (SOP-XXX-XXX) | `governance/registry/templates/` |
| **adr.template.md** | Nova decisão arquitetural | `governance/adr/` |

## Como Criar Nova Policy

```bash
# 1. Copiar template
cp governance/registry/templates/policy.template.md \
   governance/policies/my-new-policy.md

# 2. Editar e preencher
# - Atribuir próximo ID disponível (checar registry.json)
# - Preencher todos os campos obrigatórios
# - Escrever diretrizes claras

# 3. Adicionar ao registry.json
# Adicionar entrada ao array "artifacts"

# 4. Validar
node governance/automation/validate-policies.mjs

# 5. Abrir PR
git add governance/
git commit -m "feat(governance): add POL-XXXX - Nome da Policy"
git push origin feature/pol-xxxx
```

## Como Criar Novo Standard

Similar ao processo de policy, usar `standard.template.md`

## Como Criar Novo SOP

Similar ao processo de policy, usar `sop.template.md`

## Como Criar Novo ADR

```bash
# Usar script auxiliar (interativo)
node governance/automation/new-adr.mjs

# Ou manualmente
cp governance/adr/template.md governance/adr/0006-my-decision.md
# Editar e preencher
```

---

**Ver também:**
- [RACI Matrix](governance/strategy/RACI-MATRIX.md)
- [Governance README](governance/README.md)
```

### 🎉 Fim da Semana 1

**Checklist de Entregáveis:**
- [✅] ADR template criado e primeiro ADR migrado
- [✅] Script de validação de políticas funcionando
- [✅] CI/CD workflow configurado e testado
- [✅] RACI Matrix documentada
- [✅] Templates completos (policy, standard, sop, adr)

**Próximos Passos:** Semana 2 - Dashboard de Métricas

---

## 📊 Semanas 2-4: Dashboard de Métricas

[Continuar com implementação detalhada das semanas 2-4...]

---

Quer que eu continue detalhando as próximas semanas? Ou prefere que eu crie scripts auxiliares adicionais primeiro?
