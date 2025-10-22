#!/bin/bash

# Script para backup das configurações do Cursor
# Uso: bash scripts/backup-cursor-config.sh

set -e

echo "🔄 Iniciando backup das configurações do Cursor..."

# Diretório de backup
BACKUP_DIR="$HOME/cursor-config-backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/cursor-config-$DATE"

# Criar diretório de backup
mkdir -p "$BACKUP_PATH"

echo "📁 Criando backup em: $BACKUP_PATH"

# 1. Configurações do projeto (.vscode/)
if [ -d ".vscode" ]; then
    echo "✅ Copiando .vscode/"
    cp -r .vscode "$BACKUP_PATH/"
else
    echo "⚠️  .vscode/ não encontrado"
fi

# 2. Configurações do Cursor (.cursor/)
if [ -d ".cursor" ]; then
    echo "✅ Copiando .cursor/"
    cp -r .cursor "$BACKUP_PATH/"
else
    echo "⚠️  .cursor/ não encontrado"
fi

# 3. Configurações globais do Cursor
if [ -d "$HOME/.cursor" ]; then
    echo "✅ Copiando ~/.cursor/"
    cp -r "$HOME/.cursor" "$BACKUP_PATH/cursor-global"
else
    echo "⚠️  ~/.cursor/ não encontrado"
fi

# 4. Configurações do sistema
echo "✅ Copiando configurações do sistema"
cp "$HOME/.bashrc" "$BACKUP_PATH/bashrc" 2>/dev/null || echo "⚠️  .bashrc não encontrado"
cp "$HOME/.profile" "$BACKUP_PATH/profile" 2>/dev/null || echo "⚠️  .profile não encontrado"
cp "$HOME/.gitconfig" "$BACKUP_PATH/gitconfig" 2>/dev/null || echo "⚠️  .gitconfig não encontrado"

# 5. Lista de extensões instaladas
echo "✅ Salvando lista de extensões"
if command -v cursor >/dev/null 2>&1; then
    cursor --list-extensions > "$BACKUP_PATH/extensions.txt" 2>/dev/null || echo "⚠️  Não foi possível listar extensões"
else
    echo "⚠️  Cursor CLI não encontrado"
fi

# 6. Criar arquivo de informações
cat > "$BACKUP_PATH/README.md" << EOF
# Backup das Configurações do Cursor

**Data**: $(date)
**Sistema**: $(uname -a)
**Usuário**: $(whoami)
**Diretório**: $(pwd)

## Arquivos Incluídos

- \`.vscode/\` - Configurações do projeto
- \`.cursor/\` - Configurações do Cursor
- \`cursor-global/\` - Configurações globais do Cursor
- \`bashrc\` - Configurações do terminal
- \`profile\` - Configurações de ambiente
- \`gitconfig\` - Configurações do Git
- \`extensions.txt\` - Lista de extensões

## Como Restaurar

1. Copie os arquivos de volta para o projeto
2. Instale as extensões: \`cursor --install-extension <extensão>\`
3. Reinicie o Cursor

## Comandos Úteis

\`\`\`bash
# Verificar configurações
ls -la .vscode/
ls -la .cursor/

# Instalar extensões
cursor --install-extension ms-python.python
cursor --install-extension eamodio.gitlens
\`\`\`
EOF

# 7. Criar arquivo compactado
echo "📦 Criando arquivo compactado..."
cd "$BACKUP_DIR"
tar -czf "cursor-config-$DATE.tar.gz" "cursor-config-$DATE"
rm -rf "cursor-config-$DATE"

echo "✅ Backup concluído!"
echo "📁 Localização: $BACKUP_DIR/cursor-config-$DATE.tar.gz"
echo "📊 Tamanho: $(du -h "$BACKUP_DIR/cursor-config-$DATE.tar.gz" | cut -f1)"

# Mostrar conteúdo do backup
echo ""
echo "📋 Conteúdo do backup:"
tar -tzf "$BACKUP_DIR/cursor-config-$DATE.tar.gz" | head -20