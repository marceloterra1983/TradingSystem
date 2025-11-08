# 📊 Configuração de Relatórios de Erro Automáticos

Este documento explica como os relatórios de erro são gerados automaticamente no final de PRs e workflows.

---

## 🎯 Workflows Disponíveis

### 1. **PR Error Report** (`pr-error-report.yml`)

**Quando Executa:**
- ✅ Sempre que um PR é aberto, atualizado ou reaberto
- ✅ Após workflows de PR completarem (sucesso ou falha)

**O Que Faz:**
1. Gera relatório de erros (últimas 15 falhas)
2. Upload como artifact (30 dias retenção)
3. **Posta comentário no PR** com resumo
4. Define status check (success/failure)

**Output:**
- 📄 Artifact: `pr-error-report-{PR_NUMBER}`
- 💬 Comentário automático no PR
- ✅/❌ Status check no PR

---

### 2. **Always Generate Error Report** (`always-generate-error-report.yml`)

**Quando Executa:**
- ✅ Após QUALQUER workflow completar
- ✅ Diariamente às 9h UTC (schedule)
- ✅ Manualmente (workflow_dispatch)

**O Que Faz:**
1. Gera relatório de erros (últimas 20 falhas)
2. Upload como artifact (90 dias retenção)
3. **Cria issue** se > 5 falhas detectadas
4. Adiciona summary no workflow

**Output:**
- 📄 Artifact: `daily-error-report-{RUN_NUMBER}`
- 🐛 Issue criada se > 5 falhas
- 📊 Summary visível no workflow

---

### 3. **Error Report Generator** (`error-report-generator.yml`)

**Quando Executa:**
- ✅ Apenas quando workflows **FALHARAM**
- ✅ Manualmente (workflow_dispatch)

**O Que Faz:**
1. Gera relatório apenas de falhas
2. Upload como artifact (90 dias)
3. Comenta em PR (se aplicável)
4. Cria issue se > 5 falhas

**Output:**
- 📄 Artifact: `workflow-error-report-{RUN_NUMBER}`
- 💬 Comentário em PR (se aplicável)
- 🐛 Issue automática (se > 5 falhas)

---

## 📋 Comparação

| Feature | PR Error Report | Always Generate | Error Report Generator |
|---------|----------------|-----------------|------------------------|
| **Trigger** | PRs + PR workflows | Sempre + Daily | Apenas falhas |
| **Análise** | 15 últimas falhas | 20 últimas falhas | 10 últimas falhas |
| **PR Comment** | ✅ Sim | ❌ Não | ✅ Sim (se PR) |
| **Status Check** | ✅ Sim | ❌ Não | ❌ Não |
| **Issue Auto** | ❌ Não | ✅ Sim (> 5) | ✅ Sim (> 5) |
| **Retenção** | 30 dias | 90 dias | 90 dias |
| **Schedule** | ❌ Não | ✅ Diário 9h UTC | ❌ Não |

---

## 🚀 Configuração Recomendada

### **Cenário 1: Apenas PRs**

✅ **Use:** `pr-error-report.yml`

**Vantagens:**
- Feedback direto no PR
- Status check visível
- Não polui artifacts

**Configuração:**
```bash
# Ativar apenas este workflow
# Desativar: always-generate-error-report.yml, error-report-generator.yml
```

---

### **Cenário 2: Monitoramento Contínuo**

✅ **Use:** `always-generate-error-report.yml` + `pr-error-report.yml`

**Vantagens:**
- Relatório diário
- Issues automáticas
- Cobertura completa

**Configuração:**
```bash
# Manter ambos workflows ativos
# error-report-generator.yml pode ser desativado (redundante)
```

---

### **Cenário 3: Apenas Falhas**

✅ **Use:** `error-report-generator.yml`

**Vantagens:**
- Executa apenas quando necessário
- Economia de recursos
- Foco em problemas

**Configuração:**
```bash
# Ativar apenas error-report-generator.yml
# Desativar: pr-error-report.yml, always-generate-error-report.yml
```

---

## 🎯 Nossa Recomendação

**Melhor combinação para o TradingSystem:**

```
✅ pr-error-report.yml         (feedback em PRs)
✅ always-generate-error-report.yml  (monitoramento diário)
❌ error-report-generator.yml  (desativar - redundante)
```

**Motivo:**
- PRs têm feedback imediato
- Monitoramento diário detecta problemas
- Não há redundância

---

## 🔧 Customização

### **Mudar Número de Falhas Analisadas**

**pr-error-report.yml:**
```yaml
# Linha ~52
bash scripts/github/collect-workflow-errors.sh 15  # ← Mudar aqui
```

**always-generate-error-report.yml:**
```yaml
# Linha ~47
bash scripts/github/collect-workflow-errors.sh 20  # ← Mudar aqui
```

---

### **Mudar Threshold de Issues**

**always-generate-error-report.yml:**
```yaml
# Linha ~61
if: steps.generate_report.outputs.error_count > 5  # ← Mudar aqui
```

---

### **Mudar Schedule**

**always-generate-error-report.yml:**
```yaml
schedule:
  - cron: '0 9 * * *'  # ← Mudar horário (formato UTC)

# Exemplos:
# '0 0 * * *'   - Meia-noite diariamente
# '0 */6 * * *' - A cada 6 horas
# '0 9 * * 1'   - Segundas às 9h
```

---

### **Mudar Retenção de Artifacts**

**pr-error-report.yml:**
```yaml
retention-days: 30  # ← Mudar aqui (1-90 dias)
```

**always-generate-error-report.yml:**
```yaml
retention-days: 90  # ← Mudar aqui (1-90 dias)
```

---

## 📦 Download de Relatórios

### **Via GitHub UI**

1. Ir para **Actions**
2. Selecionar workflow (PR Error Report, Always Generate, etc)
3. Clicar em uma execução
4. Scroll até **Artifacts**
5. Download do arquivo `.zip`

### **Via GitHub CLI**

```bash
# Listar artifacts
gh run list --workflow="pr-error-report.yml"

# Download
bash scripts/github/check-workflows.sh download <run-id>
```

---

## 🔍 Ver Relatórios em PRs

Quando um PR é aberto/atualizado:

1. Workflow `pr-error-report.yml` executa
2. **Comentário automático** é adicionado ao PR:

```markdown
## 🔍 Relatório de Erros do PR

**PR:** #42
**Branch:** `feature/optimize`

## 📊 Resumo Executivo
| Workflow | Branch | Status |
|----------|--------|--------|
| Tests | feature/optimize | ❌ |

### 📦 Download do Relatório Completo
[📄 Download Error Report](link)
```

3. **Status check** aparece no PR (✅ ou ❌)

---

## 🐛 Issues Automáticas

Se houver **> 5 falhas** detectadas:

1. Issue é criada automaticamente
2. Labels adicionadas: `ci/cd`, `bug`, `high-priority`
3. Conteúdo da issue:
   - Resumo de erros
   - Link para artifact
   - Comandos de diagnóstico

**Exemplo:**
```markdown
🚨 Alert: 8 workflow failures detected

**Total Failures:** 8
**Threshold:** 5

## 📊 Resumo Executivo
[tabela de erros]

### 🛠️ Quick Actions
```bash
bash scripts/github/collect-workflow-errors.sh
```
```

---

## 🎯 Ativação/Desativação

### **Ativar Workflow**

Apenas manter o arquivo `.yml` em `.github/workflows/`

### **Desativar Workflow**

**Opção 1: Renomear (Recomendado)**
```bash
mv .github/workflows/pr-error-report.yml .github/workflows/pr-error-report.yml.disabled
```

**Opção 2: Deletar**
```bash
rm .github/workflows/pr-error-report.yml
```

**Opção 3: Adicionar condição**
```yaml
jobs:
  generate-error-report:
    if: false  # ← Desabilita permanentemente
```

---

## 📊 Monitoramento

### **Ver Execuções**

```bash
# Listar execuções de PR Error Report
gh run list --workflow="pr-error-report.yml"

# Listar execuções de Always Generate
gh run list --workflow="always-generate-error-report.yml"

# Ver logs de uma execução
gh run view <run-id> --log
```

### **Verificar Artifacts**

```bash
# Listar artifacts de um workflow
gh api repos/:owner/:repo/actions/runs/<run-id>/artifacts

# Download
gh run download <run-id>
```

---

## 🆘 Troubleshooting

### **Workflow não está executando**

1. Verificar se arquivo `.yml` está em `.github/workflows/`
2. Verificar sintaxe YAML: https://www.yamllint.com/
3. Verificar logs do workflow no GitHub Actions

### **Comentário não aparece no PR**

1. Verificar se `GITHUB_TOKEN` tem permissões
2. Verificar se workflow completou com sucesso
3. Ver logs do step "Comment on PR"

### **Issue não é criada**

1. Verificar threshold: `error_count > 5`
2. Verificar se há pelo menos 6 falhas
3. Ver logs do step "Create Issue"

---

## 📚 Documentação Relacionada

- **Scripts**: `scripts/github/README.md`
- **Quick Guide**: `scripts/github/QUICK-GUIDE.md`
- **Workflows Overview**: `.github/workflows/README.md`

---

**Última atualização:** 2025-01-08
**Mantido por:** DevOps Team
