#!/bin/bash
echo "📦 Instalando extensões essenciais do Cursor..."

# Essenciais
cursor --install-extension anysphere.cursorpyright

# Python
cursor --install-extension ms-python.debugpy
cursor --install-extension ms-python.python

# Git
cursor --install-extension eamodio.gitlens
cursor --install-extension github.vscode-pull-request-github

# Formatação/Linting
cursor --install-extension dbaeumer.vscode-eslint
cursor --install-extension esbenp.prettier-vscode
cursor --install-extension foxundermoon.shell-format
cursor --install-extension timonwong.shellcheck

# Visualização
cursor --install-extension mechatroner.rainbow-csv
cursor --install-extension qwtel.sqlite-viewer
cursor --install-extension tomoki1207.pdf

# Markdown
cursor --install-extension bierner.markdown-preview-github-styles
cursor --install-extension bpruitt-goddard.mermaid-markdown-syntax-highlighting
cursor --install-extension yzhang.markdown-all-in-one

# Utilitários
cursor --install-extension gruntfuggly.todo-tree
cursor --install-extension rangav.vscode-thunder-client
cursor --install-extension redhat.vscode-yaml
cursor --install-extension streetsidesoftware.code-spell-checker
cursor --install-extension tamasfe.even-better-toml
cursor --install-extension ritwickdey.liveserver

echo "✅ Extensões instaladas!"
