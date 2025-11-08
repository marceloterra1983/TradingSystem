# 📊 Workflow Error Reports

Esta pasta contém relatórios de erros gerados automaticamente pelos workflows do GitHub Actions.

---

## 📁 Estrutura de Arquivos

### **Relatórios Individuais**

```
ERROR-REPORT-YYYYMMDD-HHMMSS.md
```

**Padrão de nome:**
- `ERROR-REPORT-20250108-143052.md` ← Data e hora da geração
- `ERROR-REPORT-20250108-150234.md`
- `ERROR-REPORT-20250109-091520.md`

**Conteúdo:**
- 📊 Resumo executivo (tabela de falhas)
- 🔍 Detalhes completos de cada erro
- 🔧 Comandos para reproduzir
- 💡 Soluções sugeridas

---

### **Relatórios Consolidados**

```
CONSOLIDATED-REPORT-YYYYMMDD-HHMMSS.md
```

**Padrão de nome:**
- `CONSOLIDATED-REPORT-20250108-180000.md`

**Conteúdo:**
- 📈 Estatísticas gerais
- 🔴 Workflows que mais falharam
- ⚠️ Erros mais comuns
- 📄 Todos os relatórios individuais consolidados

---

### **Links Simbólicos**

```
LATEST.md                  → Último relatório individual
CONSOLIDATED-LATEST.md     → Último relatório consolidado
```

**Uso:**
```bash
# Ver último relatório
cat workflow-errors/LATEST.md

# Ver consolidado
cat workflow-errors/CONSOLIDATED-LATEST.md
```

---

## 🔄 Como os Relatórios São Gerados

### **Automático (GitHub Actions)**

O workflow `always-generate-error-report.yml` executa:

**Triggers:**
- ✅ Após qualquer workflow completar
- ✅ Diariamente às 9h UTC (schedule)
- ✅ Manualmente (workflow_dispatch)

**O que faz:**
1. Executa `bash scripts/github/collect-workflow-errors.sh 20`
2. Gera `ERROR-REPORT-YYYYMMDD-HHMMSS.md`
3. Cria link `LATEST.md`
4. **Faz commit automático** no repositório
5. Upload como artifact (backup)

**Commits automáticos:**
```
chore: add error report - 2025-01-08 14:30:52
chore: add error report - 2025-01-08 15:45:23
```

---

### **Manual (Local)**

```bash
# Gerar relatório localmente
bash scripts/github/collect-workflow-errors.sh

# Consolidar múltiplos relatórios
bash scripts/github/consolidate-error-reports.sh
```

---

## 📋 Padrão de Nomenclatura

### **Relatórios Individuais**

**Formato:** `ERROR-REPORT-[DATA]-[HORA].md`

**Componentes:**
- `ERROR-REPORT-` ← Prefixo fixo
- `YYYYMMDD` ← Data (2025-01-08 = 20250108)
- `-` ← Separador
- `HHMMSS` ← Hora (14:30:52 = 143052)
- `.md` ← Extensão

**Exemplos:**
```
ERROR-REPORT-20250108-143052.md  ← 08/01/2025 às 14:30:52
ERROR-REPORT-20250108-150234.md  ← 08/01/2025 às 15:02:34
ERROR-REPORT-20250109-091520.md  ← 09/01/2025 às 09:15:20
```

---

### **Relatórios Consolidados**

**Formato:** `CONSOLIDATED-REPORT-[DATA]-[HORA].md`

**Componentes:**
- `CONSOLIDATED-REPORT-` ← Prefixo fixo
- `YYYYMMDD` ← Data
- `-` ← Separador
- `HHMMSS` ← Hora
- `.md` ← Extensão

**Exemplos:**
```
CONSOLIDATED-REPORT-20250108-180000.md
CONSOLIDATED-REPORT-20250109-180000.md
```

---

## 📊 Estrutura do Relatório

Cada relatório `.md` segue esta estrutura padrão:

```markdown
# 🚨 GitHub Actions - Relatório de Erros

**Gerado em:** 2025-01-08 14:30:52
**Repositório:** marceloterra/TradingSystem
**Total de Falhas Analisadas:** 3

---

## 📊 Resumo Executivo

| Workflow | Branch | Data | Status |
|----------|--------|------|--------|
| Code Quality | main | ... | ❌ Failed |

---

## 🔍 Detalhes dos Erros

### 🔴 [Workflow Name]

**Run ID:** `1234567890`
**Branch:** `main`
**Commit:** `abc1234`

#### 📋 Logs de Erro:
```
[error logs here]
```

#### 🔧 Comandos para Reproduzir:
```bash
gh run view 1234567890 --log
npm run lint -- --fix
```

#### 💡 Possíveis Soluções:
- Solução 1
- Solução 2

---

## 📚 Recursos Úteis

[Links para documentação]

---

**Gerado por:** `scripts/github/collect-workflow-errors.sh`
```

---

## 🗂️ Organização e Retenção

### **Commits no Repositório**

✅ **Todos os relatórios são versionados no Git**

**Vantagens:**
- Histórico completo de erros
- Auditoria de problemas
- Comparação entre períodos
- Rastreabilidade

**Commits automáticos:**
```bash
git log --oneline workflow-errors/

# Output:
abc1234 chore: add error report - 2025-01-08 15:45:23
def5678 chore: add error report - 2025-01-08 14:30:52
ghi9012 chore: add error report - 2025-01-08 09:00:00
```

---

### **Limpeza Periódica (Opcional)**

Para manter apenas últimos 30 dias:

```bash
# Remover relatórios com > 30 dias
find workflow-errors -name "ERROR-REPORT-*.md" -mtime +30 -delete

# Manter apenas últimos 20 relatórios
ls -t workflow-errors/ERROR-REPORT-*.md | tail -n +21 | xargs rm -f
```

**Automatizar (Opcional):**
Criar workflow mensal para limpeza.

---

## 🔍 Como Usar

### **Ver Último Relatório**

```bash
# Via link simbólico
cat workflow-errors/LATEST.md

# Ou abrir no editor
code workflow-errors/LATEST.md
```

---

### **Buscar por Período**

```bash
# Listar relatórios de janeiro/2025
ls workflow-errors/ERROR-REPORT-202501*.md

# Listar relatórios de um dia específico
ls workflow-errors/ERROR-REPORT-20250108-*.md

# Listar relatórios das últimas 24h
find workflow-errors -name "ERROR-REPORT-*.md" -mtime -1
```

---

### **Comparar Relatórios**

```bash
# Ver diferença entre dois relatórios
diff workflow-errors/ERROR-REPORT-20250108-143052.md \
     workflow-errors/ERROR-REPORT-20250109-091520.md

# Contar erros em cada relatório
grep -c "### 🔴" workflow-errors/ERROR-REPORT-*.md
```

---

### **Consolidar Relatórios**

```bash
# Consolidar todos os relatórios
bash scripts/github/consolidate-error-reports.sh

# Ver consolidado
cat workflow-errors/CONSOLIDATED-LATEST.md
```

---

## 📈 Análise de Tendências

### **Workflows que Mais Falham**

```bash
# Extrair workflows de todos os relatórios
grep "^| " workflow-errors/ERROR-REPORT-*.md | \
  awk -F'|' '{print $2}' | \
  sort | uniq -c | sort -rn
```

### **Horários de Pico de Falhas**

```bash
# Listar horários dos relatórios
ls workflow-errors/ERROR-REPORT-*.md | \
  sed 's/.*-\([0-9]*\).md/\1/' | \
  cut -c1-2 | sort | uniq -c
```

---

## 🔗 Links Úteis

- **Workflow Source**: `.github/workflows/always-generate-error-report.yml`
- **Script Generator**: `scripts/github/collect-workflow-errors.sh`
- **Consolidator**: `scripts/github/consolidate-error-reports.sh`
- **Documentation**: `scripts/github/README.md`

---

## 🆘 Troubleshooting

### **Relatório não foi gerado**

**Possíveis causas:**
1. Nenhuma falha detectada (normal)
2. Workflow não executou
3. Erro no script

**Solução:**
```bash
# Verificar execuções do workflow
gh run list --workflow="always-generate-error-report.yml"

# Gerar manualmente
bash scripts/github/collect-workflow-errors.sh
```

---

### **Commit não aparece no repositório**

**Possíveis causas:**
1. Sem permissões de escrita
2. Nenhuma mudança detectada
3. Workflow falhou

**Solução:**
Ver logs do workflow step "Commit Error Report"

---

### **Muitos relatórios acumulados**

**Solução:**
```bash
# Limpar relatórios antigos (> 30 dias)
find workflow-errors -name "ERROR-REPORT-*.md" -mtime +30 -delete

# Commit e push
git add workflow-errors/
git commit -m "chore: cleanup old error reports"
git push
```

---

**Última atualização:** 2025-01-08
**Mantido por:** GitHub Actions (Automated)
