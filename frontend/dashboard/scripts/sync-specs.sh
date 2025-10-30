#!/bin/bash
# Script para sincronizar arquivos OpenAPI specs do Docusaurus para o Dashboard
# Uso: bash scripts/sync-specs.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$DASHBOARD_ROOT/../.." && pwd)"
DOCS_SPECS_DIR="$PROJECT_ROOT/docs/static/specs"
DASHBOARD_SPECS_DIR="$DASHBOARD_ROOT/public/specs"

# Verificar se os diretórios existem
if [ ! -d "$DOCS_SPECS_DIR" ]; then
  echo "❌ Erro: Diretório de specs do Docusaurus não encontrado: $DOCS_SPECS_DIR"
  exit 1
fi

if [ ! -d "$DASHBOARD_SPECS_DIR" ]; then
  echo "📁 Criando diretório: $DASHBOARD_SPECS_DIR"
  mkdir -p "$DASHBOARD_SPECS_DIR"
fi

# Contadores
copied=0
updated=0
skipped=0

echo "🔄 Sincronizando specs do Docusaurus para o Dashboard..."
echo "   Origem: $DOCS_SPECS_DIR"
echo "   Destino: $DASHBOARD_SPECS_DIR"
echo ""

# Copiar/atualizar cada arquivo .yaml
for spec_file in "$DOCS_SPECS_DIR"/*.yaml; do
  if [ ! -f "$spec_file" ]; then
    continue
  fi

  filename=$(basename "$spec_file")
  dest_file="$DASHBOARD_SPECS_DIR/$filename"

  # Verificar se precisa copiar (arquivo não existe ou foi modificado)
  if [ ! -f "$dest_file" ] || [ "$spec_file" -nt "$dest_file" ]; then
    cp "$spec_file" "$dest_file"
    if [ ! -f "$dest_file" ]; then
      echo "  ✅ Criado: $filename"
      ((copied++))
    else
      echo "  🔄 Atualizado: $filename"
      ((updated++))
    fi
  else
    echo "  ⏭️  Mantido: $filename (já está atualizado)"
    ((skipped++))
  fi
done

echo ""
echo "✅ Sincronização concluída:"
echo "   📄 Criados: $copied"
echo "   🔄 Atualizados: $updated"
echo "   ⏭️  Mantidos: $skipped"
echo ""
echo "📊 Total de arquivos em $DASHBOARD_SPECS_DIR:"
ls -1 "$DASHBOARD_SPECS_DIR"/*.yaml 2>/dev/null | wc -l || echo "0"

