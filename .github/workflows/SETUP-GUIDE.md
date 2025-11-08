# 🚀 Setup: Relatório de Erros Automático em PRs

**Objetivo:** Configurar para que o script `collect-workflow-errors.sh` execute automaticamente no final de todo PR.

---

## ✅ Já Está Configurado!

O workflow **`pr-error-report.yml`** já foi criado e está ativo.

**Ele executa automaticamente:**
- ✅ Sempre que um PR é aberto
- ✅ Sempre que um PR é atualizado (novo commit)
- ✅ Após workflows de PR completarem

---

## 🎯 O Que Acontece Automaticamente

### **1. PR Aberto/Atualizado**
```
PR Criado → pr-error-report.yml executa
           ↓
    Gera ERROR-REPORT-*.md
           ↓
    Upload como Artifact
           ↓
    Posta Comentário no PR
           ↓
    Define Status Check (✅/❌)
```

### **2. Workflow de PR Completa**
```
Workflow Completa → pr-error-report.yml executa
                  ↓
           Gera Relatório Atualizado
                  ↓
           Atualiza Comentário no PR
```

---

## 📋 Como Funciona (Passo a Passo)

### **Exemplo: Você Abre um PR**

1. **Você cria o PR:**
   ```bash
   git checkout -b feature/new-feature
   git push -u origin feature/new-feature
   # Criar PR no GitHub
   ```

2. **Workflows executam:**
   - Code Quality
   - Automated Tests
   - Bundle Size Check
   - etc.

3. **`pr-error-report.yml` executa automaticamente:**
   ```bash
   # Internamente executa:
   bash scripts/github/collect-workflow-errors.sh 15
   ```

4. **Relatório é gerado:**
   - `workflow-errors/ERROR-REPORT-20250108-143052.md`

5. **Comentário aparece no PR:**
   ```markdown
   ## 🔍 Relatório de Erros do PR

   **PR:** #42
   **Branch:** `feature/new-feature`

   ## 📊 Resumo Executivo
   | Workflow | Status |
   |----------|--------|
   | Tests | ❌ Failed |

   📦 [Download Relatório Completo](link)
   ```

6. **Artifact disponível:**
   - GitHub Actions → PR Error Report → Artifacts → Download

7. **Status check definido:**
   - ✅ Verde se nenhum erro
   - ❌ Vermelho se houver erros

---

## 🔍 Como Ver o Relatório

### **Opção 1: Comentário no PR (Automático)**

1. Abrir o PR no GitHub
2. Scroll até comentários
3. Ver comentário automático do bot
4. Clicar no link de download

### **Opção 2: Artifacts (GitHub Actions)**

1. GitHub → Actions tab
2. Selecionar "PR Error Report"
3. Clicar na execução mais recente
4. Scroll até "Artifacts"
5. Download `pr-error-report-{PR_NUMBER}.zip`
6. Extrair e abrir `.md`

### **Opção 3: Localmente**

```bash
# Gerar localmente (mesmo relatório)
bash scripts/github/collect-workflow-errors.sh

# Ver
cat workflow-errors/LATEST.md
```

---

## 🎛️ Customização (Opcional)

### **Mudar Quantidade de Falhas Analisadas**

Editar `.github/workflows/pr-error-report.yml`:

```yaml
# Linha ~52
bash scripts/github/collect-workflow-errors.sh 15  # ← Mudar para 20, 30, etc
```

### **Desativar Comentários em PRs**

Editar `.github/workflows/pr-error-report.yml`:

```yaml
- name: Comment on PR with Report Summary
  if: false  # ← Adicionar esta linha para desativar
```

### **Mudar Retenção de Artifacts**

```yaml
retention-days: 30  # ← Mudar para 7, 60, 90, etc
```

---

## 📊 Exemplo de Comentário no PR

Quando o workflow executa, este comentário aparece automaticamente:

```markdown
## 🔍 Relatório de Erros do PR

**PR:** #42
**Branch:** `feature/optimize-bundle`
**Commit:** `abc1234`

## 📊 Resumo Executivo

| Workflow | Branch | Data | Status |
|----------|--------|------|--------|
| Code Quality | feature/optimize-bundle | 2025-01-08T14:30:00Z | ❌ Failed |
| Bundle Size Check | feature/optimize-bundle | 2025-01-08T14:25:00Z | ❌ Failed |

---

### 📊 Estatísticas

- **Total de Workflows com Falha:** 2
- **Workflows Analisados:** 15 últimos

### 📦 Download do Relatório Completo

O relatório completo está disponível nos **Artifacts** desta execução:
- [📄 Download Error Report](https://github.com/marceloterra/TradingSystem/actions/runs/123456)

### 🔧 Comandos Úteis

```bash
# Gerar relatório localmente
bash scripts/github/collect-workflow-errors.sh

# Ver último relatório
cat workflow-errors/LATEST.md

# Monitorar workflows
bash scripts/github/monitor-workflows.sh 30
```

---
🤖 *Gerado automaticamente por [PR Error Report](link)*
```

---

## ✅ Status Check no PR

O workflow também define um **status check** que aparece no PR:

### **✅ Sucesso (Sem Erros)**
```
✅ Error Report — Nenhuma falha detectada
```

### **❌ Falha (Com Erros)**
```
❌ Error Report — Workflows com falhas detectados - Ver relatório
```

**Onde aparece:**
- Na lista de checks do PR
- Ao lado do botão "Merge"
- Bloqueia merge se configurado como required

---

## 🔐 Branch Protection (Opcional)

Para **bloquear merge** se houver erros:

1. GitHub → Settings → Branches
2. Add branch protection rule para `main`
3. Ativar: "Require status checks to pass"
4. Selecionar: "Error Report"

**Resultado:**
- ❌ Não é possível fazer merge se houver erros
- ✅ Força correção antes do merge

---

## 🎯 Workflows Criados

| Workflow | Executa em | Propósito |
|----------|-----------|-----------|
| `pr-error-report.yml` | **PRs** | Relatório automático em PRs |
| `always-generate-error-report.yml` | **Sempre + Daily** | Monitoramento contínuo |
| `error-report-generator.yml` | **Apenas falhas** | Relatório só quando falha |

**Qual usar?**
- ✅ **`pr-error-report.yml`** - Para PRs (RECOMENDADO)
- ✅ **`always-generate-error-report.yml`** - Para monitoramento diário
- ❌ **`error-report-generator.yml`** - Redundante (pode desativar)

---

## 🧪 Testar a Configuração

### **1. Criar PR de Teste**

```bash
# Criar branch
git checkout -b test/error-report

# Fazer alteração simples
echo "# Test" >> test.md
git add test.md
git commit -m "test: validate error report workflow"
git push -u origin test/error-report

# Criar PR no GitHub
```

### **2. Verificar Execução**

1. GitHub → Actions → "PR Error Report"
2. Ver execução em andamento
3. Aguardar completar (~2-3 minutos)

### **3. Verificar Resultado**

1. Ir para o PR criado
2. Ver comentário automático
3. Verificar status check
4. Download artifact (se quiser)

---

## 🆘 Troubleshooting

### **Comentário não aparece no PR**

**Possíveis causas:**
1. Workflow ainda executando
2. Permissões do `GITHUB_TOKEN`
3. Erro no workflow

**Solução:**
```bash
# Ver logs do workflow
gh run list --workflow="pr-error-report.yml"
gh run view <run-id> --log
```

### **Artifact não disponível**

**Possíveis causas:**
1. Workflow falhou antes do upload
2. Nenhuma falha detectada (normal)

**Solução:**
```bash
# Verificar logs
gh run view <run-id> --log

# Gerar localmente
bash scripts/github/collect-workflow-errors.sh
```

### **Status check não aparece**

**Possíveis causas:**
1. Workflow não completou
2. Erro no step de status check

**Solução:**
Ver logs do step "Set PR Status Check"

---

## 📚 Documentação Completa

- **Configuração Detalhada**: `.github/workflows/ERROR-REPORT-CONFIG.md`
- **Scripts**: `scripts/github/README.md`
- **Quick Guide**: `scripts/github/QUICK-GUIDE.md`

---

## ✨ Resumo

**O que você tem agora:**

✅ Relatório automático gerado em todo PR
✅ Comentário automático com resumo de erros
✅ Status check (✅/❌) no PR
✅ Artifact disponível para download (30 dias)
✅ Execução local com mesmo script

**Não precisa fazer nada!** Tudo funciona automaticamente. 🎉

---

**Criado em:** 2025-01-08
**Última atualização:** 2025-01-08
