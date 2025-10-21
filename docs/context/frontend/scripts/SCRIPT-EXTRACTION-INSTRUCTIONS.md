---
title: "Script de Extração: Gemini CLI Style"
tags: ["script", "automation", "firecrawl", "extraction"]
domain: "frontend"
type: "instructions"
summary: "Instruções para criar script de extração automática de CSS via Firecrawl"
status: "ready"
last_review: "2025-10-19"
---

# Script de Extração: Gemini CLI Style

> **Objetivo**: Criar script bash para extrair HTML e CSS da página do Gemini CLI usando o Firecrawl Proxy.

## 📋 Script Bash

**Localização sugerida**: `scripts/docs/extract-gemini-style.sh`

```bash
#!/bin/bash

###############################################################################
# Script: extract-gemini-style.sh
# Description: Extrai HTML e CSS da página do Gemini CLI para análise
# Dependencies: curl, jq, Firecrawl Proxy (port 3600)
# Author: TradingSystem Team
# Date: 2025-10-19
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIRECRAWL_PROXY_URL="http://localhost:3600"
TARGET_URL="https://geminicli.com/docs/"
OUTPUT_DIR="docs/context/frontend/analysis/extracted"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_dependencies() {
    log_info "Verificando dependências..."

    # Check curl
    if ! command -v curl &> /dev/null; then
        log_error "curl não está instalado"
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq não está instalado"
        log_info "Instale com: sudo apt install jq"
        exit 1
    fi

    # Check Firecrawl Proxy
    if ! curl -s "${FIRECRAWL_PROXY_URL}/health" &> /dev/null; then
        log_error "Firecrawl Proxy não está acessível em ${FIRECRAWL_PROXY_URL}"
        log_info "Inicie com: cd backend/api/firecrawl-proxy && npm run dev"
        exit 1
    fi

    log_success "Todas as dependências OK"
}

create_output_dir() {
    log_info "Criando diretório de saída..."
    mkdir -p "${OUTPUT_DIR}"
    log_success "Diretório criado: ${OUTPUT_DIR}"
}

scrape_page() {
    log_info "Extraindo página: ${TARGET_URL}"

    local response
    response=$(curl -s -X POST "${FIRECRAWL_PROXY_URL}/api/v1/scrape" \
        -H "Content-Type: application/json" \
        -d "{
            \"url\": \"${TARGET_URL}\",
            \"formats\": [\"markdown\", \"html\", \"links\"],
            \"onlyMainContent\": false,
            \"timeout\": 30000
        }")

    # Check if request was successful
    if ! echo "${response}" | jq -e '.success' > /dev/null 2>&1; then
        log_error "Falha ao extrair página"
        echo "${response}" | jq '.' || echo "${response}"
        exit 1
    fi

    # Extract and save data
    log_info "Salvando dados extraídos..."

    # Save markdown
    echo "${response}" | jq -r '.data.markdown' > "${OUTPUT_DIR}/page_${TIMESTAMP}.md"
    log_success "Markdown salvo: page_${TIMESTAMP}.md"

    # Save HTML
    echo "${response}" | jq -r '.data.html' > "${OUTPUT_DIR}/page_${TIMESTAMP}.html"
    log_success "HTML salvo: page_${TIMESTAMP}.html"

    # Save links
    echo "${response}" | jq -r '.data.links[]' > "${OUTPUT_DIR}/links_${TIMESTAMP}.txt"
    log_success "Links salvos: links_${TIMESTAMP}.txt"

    # Save metadata
    echo "${response}" | jq '.data.metadata' > "${OUTPUT_DIR}/metadata_${TIMESTAMP}.json"
    log_success "Metadata salvo: metadata_${TIMESTAMP}.json"

    # Save full response
    echo "${response}" | jq '.' > "${OUTPUT_DIR}/full_response_${TIMESTAMP}.json"
    log_success "Resposta completa salva: full_response_${TIMESTAMP}.json"
}

extract_css_from_html() {
    log_info "Extraindo CSS inline do HTML..."

    local html_file="${OUTPUT_DIR}/page_${TIMESTAMP}.html"
    local css_file="${OUTPUT_DIR}/extracted_css_${TIMESTAMP}.css"

    if [ -f "${html_file}" ]; then
        # Extract <style> tags content
        grep -oP '(?<=<style>).*?(?=</style>)' "${html_file}" | sed 's/<[^>]*>//g' > "${css_file}" 2>/dev/null || true

        if [ -s "${css_file}" ]; then
            log_success "CSS extraído: extracted_css_${TIMESTAMP}.css"
        else
            log_warning "Nenhum CSS inline encontrado"
        fi
    fi
}

analyze_colors() {
    log_info "Analisando paleta de cores..."

    local css_file="${OUTPUT_DIR}/extracted_css_${TIMESTAMP}.css"
    local colors_file="${OUTPUT_DIR}/colors_${TIMESTAMP}.txt"

    if [ -f "${css_file}" ]; then
        # Extract hex colors
        grep -oE '#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}' "${css_file}" | sort -u > "${colors_file}" 2>/dev/null || true

        # Extract rgb/rgba colors
        grep -oE 'rgba?\([0-9, ]+\)' "${css_file}" | sort -u >> "${colors_file}" 2>/dev/null || true

        if [ -s "${colors_file}" ]; then
            local count=$(wc -l < "${colors_file}")
            log_success "Cores extraídas: ${count} cores únicas"
        fi
    fi
}

generate_report() {
    log_info "Gerando relatório..."

    local report_file="${OUTPUT_DIR}/EXTRACTION_REPORT_${TIMESTAMP}.md"

    cat > "${report_file}" << EOF
---
title: "Relatório de Extração: Gemini CLI"
date: $(date +"%Y-%m-%d %H:%M:%S")
source: ${TARGET_URL}
---

# Relatório de Extração: Gemini CLI

## 📊 Informações da Extração

- **URL**: ${TARGET_URL}
- **Data/Hora**: $(date +"%Y-%m-%d %H:%M:%S")
- **Timestamp**: ${TIMESTAMP}

## 📁 Arquivos Gerados

EOF

    # List generated files
    for file in "${OUTPUT_DIR}"/*"${TIMESTAMP}"*; do
        if [ -f "${file}" ]; then
            local filename=$(basename "${file}")
            local size=$(du -h "${file}" | cut -f1)
            echo "- \`${filename}\` (${size})" >> "${report_file}"
        fi
    done

    cat >> "${report_file}" << EOF

## 🎨 Análise de Cores

EOF

    # Add colors if available
    local colors_file="${OUTPUT_DIR}/colors_${TIMESTAMP}.txt"
    if [ -f "${colors_file}" ] && [ -s "${colors_file}" ]; then
        echo "\`\`\`" >> "${report_file}"
        head -20 "${colors_file}" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
    else
        echo "Nenhuma cor extraída automaticamente." >> "${report_file}"
    fi

    cat >> "${report_file}" << EOF

## 📋 Próximos Passos

1. Revisar o HTML extraído em \`page_${TIMESTAMP}.html\`
2. Analisar o CSS em \`extracted_css_${TIMESTAMP}.css\`
3. Verificar links em \`links_${TIMESTAMP}.txt\`
4. Comparar com a análise manual
5. Implementar no Docusaurus seguindo o guia de migração

## 🔗 Referências

- [Análise Manual](../gemini-cli-style-extraction.md)
- [Guia de Migração](../../guides/gemini-cli-theme-migration.md)

EOF

    log_success "Relatório gerado: EXTRACTION_REPORT_${TIMESTAMP}.md"
}

main() {
    echo ""
    log_info "=== Extração de Estilo: Gemini CLI ==="
    echo ""

    check_dependencies
    create_output_dir
    scrape_page
    extract_css_from_html
    analyze_colors
    generate_report

    echo ""
    log_success "=== Extração concluída com sucesso! ==="
    log_info "Verifique os arquivos em: ${OUTPUT_DIR}"
    echo ""
}

# Execute main function
main "$@"
```

## 🚀 Como Usar

### 1. Criar o Script

```bash
# Criar arquivo
touch scripts/docs/extract-gemini-style.sh

# Copiar conteúdo acima

# Dar permissão de execução
chmod +x scripts/docs/extract-gemini-style.sh
```

### 2. Instalar Dependências

```bash
# Ubuntu/Debian
sudo apt install curl jq

# MacOS
brew install curl jq

# Windows (WSL)
sudo apt update && sudo apt install curl jq
```

### 3. Iniciar Firecrawl Proxy

```bash
# Terminal 1
cd backend/api/firecrawl-proxy
npm install
npm run dev
```

### 4. Executar Script

```bash
# Terminal 2
bash scripts/docs/extract-gemini-style.sh
```

## 📊 Saída Esperada

O script criará os seguintes arquivos em `docs/context/frontend/analysis/extracted/`:

```
extracted/
├── page_20251019_203000.md              # Conteúdo em markdown
├── page_20251019_203000.html            # HTML completo da página
├── links_20251019_203000.txt            # Lista de links
├── metadata_20251019_203000.json        # Metadata (title, description, etc.)
├── full_response_20251019_203000.json   # Resposta completa do Firecrawl
├── extracted_css_20251019_203000.css    # CSS inline extraído
├── colors_20251019_203000.txt           # Paleta de cores
└── EXTRACTION_REPORT_20251019_203000.md # Relatório da extração
```

## 🔍 Análise Pós-Extração

### Verificar HTML

```bash
# Visualizar no navegador
firefox docs/context/frontend/analysis/extracted/page_*.html

# Ou Chrome
google-chrome docs/context/frontend/analysis/extracted/page_*.html
```

### Analisar CSS

```bash
# Ver CSS extraído
cat docs/context/frontend/analysis/extracted/extracted_css_*.css

# Buscar variáveis CSS
grep -n "var(--" docs/context/frontend/analysis/extracted/extracted_css_*.css
```

### Verificar Cores

```bash
# Ver cores únicas
cat docs/context/frontend/analysis/extracted/colors_*.txt

# Contar cores
wc -l docs/context/frontend/analysis/extracted/colors_*.txt
```

## 🐛 Troubleshooting

### Erro: curl não encontrado

```bash
sudo apt install curl
```

### Erro: jq não encontrado

```bash
sudo apt install jq
```

### Erro: Firecrawl Proxy não acessível

```bash
# Verificar se está rodando
curl http://localhost:3600/health

# Iniciar se necessário
cd backend/api/firecrawl-proxy
npm run dev
```

### Erro: Permissão negada

```bash
chmod +x scripts/docs/extract-gemini-style.sh
```

## 📚 Próximos Passos

Após extrair o estilo:

1. **Comparar** com análise manual
2. **Identificar** variáveis CSS reais
3. **Mapear** para variáveis do Docusaurus
4. **Implementar** seguindo o guia de migração
5. **Testar** em ambiente local
6. **Ajustar** conforme necessário

## 🔗 Referências

-   [Análise Completa](../gemini-cli-style-extraction.md)
-   [Guia de Migração](../../guides/gemini-cli-theme-migration.md)
-   [Firecrawl Proxy API](../../../../backend/api/firecrawl-proxy/README.md)

---

**Status**: ✅ Pronto para uso  
**Última Atualização**: 2025-10-19
