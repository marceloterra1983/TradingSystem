# 📊 Relatórios TradingSystem

**Diretório para arquivos .md gerados por IA, scripts e análises temporárias.**

---

## 📁 Estrutura

```
reports/
├── README.md                    ✅ Este arquivo - Índice dos relatórios
├── 2025-10-23/                 📅 Relatórios por data
│   ├── script-cleanup-analysis.md
│   ├── project-reorganization.md
│   └── documentation-consolidation.md
├── session-reports/             📋 Relatórios de sessão
│   ├── 2025-10-20/             📅 Por data
│   └── 2025-10-21/             📅 Por data
├── ai-generated/                 🤖 Arquivos gerados por IA
│   ├── analysis/               📊 Análises e relatórios
│   └── summaries/              📝 Resumos e sínteses
└── proposals/                  📋 Propostas temporárias
```

---

## 🎯 Objetivo

Este diretório serve como **depósito organizado** para:

- ✅ **Análises de IA** - Relatórios gerados por Claude, ChatGPT, etc.
- ✅ **Scripts de automação** - Outputs de scripts de análise
- ✅ **Relatórios de sessão** - Documentação de sessões de trabalho
- ✅ **Propostas temporárias** - Documentos de planejamento
- ✅ **Análises de código** - Relatórios de qualidade, limpeza, etc.

---

## 📋 Índice de Relatórios

### 2025-10-23
- [Análise de Scripts](2025-10-23/script-cleanup-analysis.md) - Análise completa dos scripts do projeto
- [Reorganização do Projeto](2025-10-23/project-reorganization.md) - Reorganização da estrutura de pastas
- [Consolidação de Documentação](2025-10-23/documentation-consolidation.md) - Consolidação dos README.md

### Session Reports
- [2025-10-20](session-reports/2025-10-20/) - Relatórios de sessão
- [2025-10-21](session-reports/2025-10-21/) - Relatórios de sessão

### AI Generated
- [Analysis](ai-generated/analysis/) - Análises geradas por IA
- [Summaries](ai-generated/summaries/) - Resumos e sínteses

### Proposals
- [Proposals](proposals/) - Propostas temporárias e planejamentos

---

## 🚫 Regras Importantes

### ❌ NÃO Criar na Raiz
**Estes tipos de arquivos NÃO são permitidos na raiz do projeto:**

- ❌ `ANALISE-*.md`
- ❌ `REPORTE-*.md` 
- ❌ `PHASE-*.md`
- ❌ `SUMMARY-*.md`
- ❌ `PROPOSTA-*.md`
- ❌ `REVISAO-*.md`
- ❌ `LIMPEZA-*.md`
- ❌ `TEMP-*.md`
- ❌ `*-COMPLETE.md`
- ❌ `*-SUMMARY.md`

### ✅ Onde Criar
**Para cada tipo de arquivo:**

| Tipo | Localização | Exemplo |
|------|-------------|---------|
| **Análises de IA** | `ai-generated/analysis/` | `ai-generated/analysis/2025-10-23-script-analysis.md` |
| **Relatórios de Sessão** | `session-reports/YYYY-MM-DD/` | `session-reports/2025-10-23/cleanup-report.md` |
| **Propostas** | `proposals/` | `proposals/2025-10-23-reorganization-proposal.md` |
| **Relatórios por Data** | `YYYY-MM-DD/` | `2025-10-23/script-cleanup-analysis.md` |

---

## 🤖 Para IA e Scripts

### Diretrizes para IA
1. **SEMPRE pergunte** antes de criar arquivos .md
2. **Use a pasta reports/** - Nunca crie na raiz
3. **Organize por data** - `reports/YYYY-MM-DD/`
4. **Nome descritivo** - `2025-10-23-script-analysis.md`
5. **Atualize este índice** - Adicione entrada aqui

### Para Scripts
```bash
#!/bin/bash
# Exemplo de script que gera relatórios

# 1. Criar diretório por data
REPORT_DIR="reports/$(date +%Y-%m-%d)"
mkdir -p "$REPORT_DIR"

# 2. Gerar arquivo com nome descritivo
REPORT_FILE="$REPORT_DIR/$(date +%Y-%m-%d)-analysis.md"

# 3. Conteúdo do relatório
cat > "$REPORT_FILE" << EOF
# Análise - $(date +%Y-%m-%d)

## Resumo
...

## Detalhes
...
EOF

# 4. Atualizar índice
echo "- [$(date +%Y-%m-%d) - Análise]($REPORT_FILE)" >> reports/README.md
```

---

## 🧹 Manutenção

### Limpeza Regular
Execute mensalmente para mover arquivos .md da raiz:

```bash
# Encontrar arquivos .md na raiz (exceto permitidos)
find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md"

# Mover para reports/
for file in $(find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md"); do
    mv "$file" "reports/$(date +%Y-%m-%d)/"
done
```

### Validação
```bash
# Verificar se há arquivos .md não permitidos na raiz
find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md"
```

---

## 📚 Documentação Relacionada

- 📖 [Diretrizes para Arquivos .md](docs/context/shared/guidelines/MARKDOWN-FILE-GUIDELINES.md)
- 📁 [Estrutura do Projeto](docs/context/shared/project-structure.md)
- 🧹 [Scripts de Limpeza](scripts/maintenance/)

---

## 🎯 Benefícios

### Para Desenvolvedores
- ✅ **Descoberta fácil** - Saber onde encontrar relatórios
- ✅ **Organização clara** - Estrutura previsível
- ✅ **Manutenção simples** - Menos arquivos na raiz
- ✅ **Histórico preservado** - Relatórios organizados por data

### Para IA
- ✅ **Contexto claro** - Saber onde criar arquivos
- ✅ **Organização automática** - Padrões consistentes
- ✅ **Descoberta fácil** - Encontrar relatórios anteriores
- ✅ **Manutenção reduzida** - Menos arquivos para gerenciar

### Para o Projeto
- ✅ **Profissionalismo** - Estrutura organizada
- ✅ **Escalabilidade** - Fácil adicionar novos tipos
- ✅ **Manutenibilidade** - Limpeza regular
- ✅ **Documentação rica** - Histórico preservado

---

**Última atualização:** 23 de Outubro de 2025  
**Próxima revisão:** 23 de Novembro de 2025- [2025-10-23-PROPOSTA-REORGANIZACAO.md](reports/2025-10-23/2025-10-23-PROPOSTA-REORGANIZACAO.md) - Moved from root during validation
- [2025-10-23-ANALISE-LIMPEZA-AGRESSIVA.md](reports/2025-10-23/2025-10-23-ANALISE-LIMPEZA-AGRESSIVA.md) - Moved from root during validation
- [2025-10-23-IMPLEMENTATION-SUMMARY.md](reports/2025-10-23/2025-10-23-IMPLEMENTATION-SUMMARY.md) - Moved from root during validation
- [2025-10-23-INSTALLATION-SUMMARY.md](reports/2025-10-23/2025-10-23-INSTALLATION-SUMMARY.md) - Moved from root during validation
- [2025-10-23-GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md](reports/2025-10-23/2025-10-23-GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md) - Moved from root during validation
