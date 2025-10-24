# 📝 Diretrizes para Arquivos Markdown (.md)

**Versão:** 1.0  
**Data:** 23 de Outubro de 2025  
**Status:** Ativo

---

## 🎯 Objetivo

Estabelecer diretrizes claras para criação, organização e manutenção de arquivos `.md` no projeto TradingSystem, garantindo que:

- ✅ Apenas arquivos `.md` essenciais sejam criados na raiz
- ✅ Arquivos gerados por IA/scripts sejam organizados em `reports/`
- ✅ README.md sejam consolidados e informativos
- ✅ Documentação seja descoberta e mantida facilmente

---

## 📁 Estrutura de Arquivos .md

### ✅ Arquivos Permitidos na Raiz

**APENAS estes arquivos podem existir na raiz do projeto:**

```
TradingSystem/
├── README.md           ✅ Documentação principal do projeto
├── CHANGELOG.md        ✅ Histórico de mudanças
├── CLAUDE.md          ✅ Instruções para IA
└── LICENSE            ✅ Licença do projeto
```

**NENHUM outro arquivo .md é permitido na raiz!**

### 📂 Pasta reports/ - Arquivos Gerados

**Todos os arquivos .md gerados por IA, scripts ou análises devem ir para `reports/`:**

```
reports/
├── README.md                    ✅ Índice dos relatórios
├── 2025-10-23/                 📅 Relatórios por data
│   ├── analise-scripts.md      📊 Análise de scripts
│   ├── limpeza-projeto.md      🧹 Relatório de limpeza
│   └── reorganizacao.md        📁 Relatório de reorganização
├── session-reports/             📋 Relatórios de sessão
│   ├── 2025-10-20/             📅 Por data
│   └── 2025-10-21/             📅 Por data
└── ai-generated/                 🤖 Arquivos gerados por IA
    ├── analysis-reports/        📊 Análises
    └── summaries/               📝 Resumos
```

### 📚 README.md por Diretório

**Cada diretório de primeiro nível DEVE ter um README.md informativo:**

```
TradingSystem/
├── README.md                    ✅ Raiz - Visão geral do projeto
├── docs/README.md              ✅ Documentação
├── scripts/README.md           ✅ Scripts e automação
├── frontend/README.md          ✅ Frontend
├── backend/README.md           ✅ Backend
├── config/README.md            ✅ Configurações
├── tools/README.md             ✅ Ferramentas
├── apps/README.md              ✅ Aplicações
└── reports/README.md           ✅ Relatórios
```

---

## 🚫 Regras de Criação

### ❌ NÃO Criar na Raiz

**Estes tipos de arquivos NÃO são permitidos na raiz:**

- ❌ `ANALISE-*.md` - Análises temporárias
- ❌ `REPORTE-*.md` - Relatórios de sessão
- ❌ `PHASE-*.md` - Relatórios de fase
- ❌ `SUMMARY-*.md` - Resumos temporários
- ❌ `PROPOSTA-*.md` - Propostas temporárias
- ❌ `REVISAO-*.md` - Revisões temporárias
- ❌ `LIMPEZA-*.md` - Relatórios de limpeza
- ❌ `TEMP-*.md` - Arquivos temporários
- ❌ `*-COMPLETE.md` - Relatórios completos
- ❌ `*-SUMMARY.md` - Resumos de sessão

### ✅ Onde Criar

**Para cada tipo de arquivo:**

| Tipo de Arquivo | Localização | Exemplo |
|------------------|-------------|---------|
| **Análises de IA** | `reports/ai-generated/analysis/` | `reports/ai-generated/analysis/2025-10-23-script-analysis.md` |
| **Relatórios de Sessão** | `reports/session-reports/YYYY-MM-DD/` | `reports/session-reports/2025-10-23/cleanup-report.md` |
| **Propostas Temporárias** | `reports/proposals/` | `reports/proposals/2025-10-23-reorganization-proposal.md` |
| **Documentação Oficial** | `docs/context/` | `docs/context/shared/guidelines/` |
| **README de Diretório** | Dentro do diretório | `scripts/README.md` |

---

## 🤖 Diretrizes para IA e Scripts

### Para IA (Claude, ChatGPT, etc.)

**Ao gerar arquivos .md, SEMPRE:**

1. **Pergunte antes de criar** - "Posso criar um arquivo de análise em `reports/`?"
2. **Use a pasta reports/** - Nunca crie na raiz
3. **Organize por data** - `reports/YYYY-MM-DD/`
4. **Nome descritivo** - `2025-10-23-script-cleanup-analysis.md`
5. **Adicione ao índice** - Atualize `reports/README.md`

### Para Scripts de Automação

**Scripts que geram arquivos .md devem:**

```bash
#!/bin/bash
# Script que gera relatórios

# 1. Criar diretório por data
REPORT_DIR="reports/$(date +%Y-%m-%d)"
mkdir -p "$REPORT_DIR"

# 2. Gerar arquivo com nome descritivo
REPORT_FILE="$REPORT_DIR/$(date +%Y-%m-%d)-script-analysis.md"

# 3. Conteúdo do relatório
cat > "$REPORT_FILE" << EOF
# Análise de Scripts - $(date +%Y-%m-%d)

## Resumo
...

## Detalhes
...
EOF

# 4. Atualizar índice
echo "- [$(date +%Y-%m-%d) - Análise de Scripts]($REPORT_FILE)" >> reports/README.md
```

---

## 📋 Checklist de Criação

### Antes de Criar um Arquivo .md

- [ ] **É realmente necessário?** - Evite duplicação
- [ ] **Local correto?** - Raiz apenas para README.md, CHANGELOG.md, CLAUDE.md
- [ ] **Nome descritivo?** - `2025-10-23-script-analysis.md`
- [ ] **Organizado por data?** - Use `reports/YYYY-MM-DD/`
- [ ] **Índice atualizado?** - Adicione ao README.md apropriado

### Para README.md

- [ ] **Visão geral clara** - O que é este diretório?
- [ ] **Estrutura documentada** - Como está organizado?
- [ ] **Como usar** - Instruções de uso
- [ ] **Links relevantes** - Para documentação relacionada
- [ ] **Atualizado** - Informações atuais

---

## 🧹 Manutenção

### Limpeza Regular

**Execute mensalmente:**

```bash
# 1. Encontrar arquivos .md na raiz (exceto permitidos)
find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md"

# 2. Mover para reports/
for file in $(find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md"); do
    mv "$file" "reports/$(date +%Y-%m-%d)/"
done

# 3. Atualizar índice
echo "## $(date +%Y-%m-%d)" >> reports/README.md
echo "Arquivos movidos da raiz para organização." >> reports/README.md
```

### Validação

**Script de validação:**

```bash
#!/bin/bash
# validate-md-structure.sh

echo "🔍 Validando estrutura de arquivos .md..."

# Verificar arquivos na raiz
ROOT_MD_FILES=$(find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "CHANGELOG.md" ! -name "CLAUDE.md")

if [ -n "$ROOT_MD_FILES" ]; then
    echo "❌ Arquivos .md não permitidos na raiz:"
    echo "$ROOT_MD_FILES"
    exit 1
fi

# Verificar README.md em diretórios
MISSING_READMES=$(find . -type d -name "docs" -o -name "scripts" -o -name "frontend" -o -name "backend" -o -name "config" -o -name "tools" -o -name "apps" | while read dir; do
    if [ ! -f "$dir/README.md" ]; then
        echo "$dir"
    fi
done)

if [ -n "$MISSING_READMES" ]; then
    echo "⚠️ Diretórios sem README.md:"
    echo "$MISSING_READMES"
fi

echo "✅ Validação concluída!"
```

---

## 📊 Exemplos

### ✅ Exemplo Correto - Relatório de Análise

```
reports/
├── README.md
└── 2025-10-23/
    └── script-cleanup-analysis.md
```

**Conteúdo do arquivo:**
```markdown
# Análise de Limpeza de Scripts - 2025-10-23

## Resumo
Análise dos scripts da pasta `scripts/` para identificar redundâncias.

## Métodos
- Análise semântica de conteúdo
- Verificação de duplicatas
- Avaliação de utilidade

## Resultados
- 32 scripts identificados para remoção
- 15 scripts para reorganização
- 3 scripts para consolidação

## Recomendações
1. Remover scripts obsoletos
2. Reorganizar por categoria
3. Consolidar funcionalidades similares
```

### ❌ Exemplo Incorreto - Arquivo na Raiz

```
TradingSystem/
├── README.md
├── CHANGELOG.md
├── CLAUDE.md
└── ANALISE-SCRIPTS-2025-10-23.md  ❌ NÃO PERMITIDO
```

### ✅ Exemplo Correto - README de Diretório

```
scripts/
├── README.md  ✅ Informa sobre scripts disponíveis
├── core/
├── docker/
└── maintenance/
```

**Conteúdo do README.md:**
```markdown
# Scripts TradingSystem

## Visão Geral
Scripts automatizados para gerenciar serviços, containers e infraestrutura.

## Categorias
- **core/**: Scripts principais de inicialização
- **docker/**: Scripts de containers e BuildKit
- **maintenance/**: Scripts de limpeza e manutenção

## Uso Rápido
```bash
# Iniciar ambiente completo
bash scripts/core/start-trading-system-dev.sh

# Parar todos os serviços
bash scripts/core/stop-trading-system-dev.sh
```

## Documentação
- [Guia Completo](docs/context/ops/scripts/)
- [Troubleshooting](docs/context/ops/troubleshooting/)
```

---

## 🎯 Benefícios

### Para Desenvolvedores
- ✅ **Descoberta fácil** - Saber onde encontrar documentação
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
- ✅ **Documentação rica** - README informativos

---

## 🚀 Implementação

### Fase 1: Limpeza Imediata
1. Mover arquivos .md existentes da raiz para `reports/`
2. Criar estrutura de pastas em `reports/`
3. Atualizar `reports/README.md`

### Fase 2: Validação
1. Executar script de validação
2. Corrigir violações encontradas
3. Documentar exceções (se houver)

### Fase 3: Automação
1. Criar script de limpeza automática
2. Adicionar ao CI/CD (se aplicável)
3. Treinar equipe nas diretrizes

---

## 📞 Suporte

**Dúvidas sobre estas diretrizes?**

- 📖 Consulte `docs/context/shared/guidelines/`
- 🤖 Pergunte à IA sobre organização
- 📝 Documente exceções em `reports/`

**Lembre-se:** O objetivo é manter o projeto organizado e profissional, facilitando a descoberta e manutenção da documentação.

---

**Última atualização:** 23 de Outubro de 2025  
**Próxima revisão:** 23 de Novembro de 2025


