---
title: Guia Completo de Extensões para Terminal
sidebar_position: 1
tags: [guide, documentation]
domain: shared
type: guide
summary: Guia Completo de Extensões para Terminal
status: active
last_review: 2025-10-22
---

# Guia Completo de Extensões para Terminal

## 🎯 Extensões para Botões e Funcionalidades do Terminal

### **1. Extensões Principais para Botões**

#### **Terminal Copy Button**
- **ID**: `terminal-copy-button`
- **Funcionalidade**: Botão de copiar ao lado da linha de comando
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Copy Button"

#### **Terminal Commands**
- **ID**: `terminal-commands`
- **Funcionalidade**: Botões de comandos e execução
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Commands"

#### **Terminal Tabs**
- **ID**: `terminal-tabs`
- **Funcionalidade**: Botões de abas e gerenciamento
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Tabs"

#### **Terminal Manager**
- **ID**: `terminal-manager`
- **Funcionalidade**: Gerenciamento avançado de terminais
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Manager"

### **2. Extensões para Autocomplete e Produtividade**

#### **Terminal Runner**
- **ID**: `terminal-runner`
- **Funcionalidade**: Execução rápida de comandos
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Runner"

#### **Command Runner**
- **ID**: `command-runner`
- **Funcionalidade**: Execução de comandos salvos
- **Como instalar**: Ctrl+Shift+X → Procurar "Command Runner"

#### **Terminal Helper**
- **ID**: `terminal-helper`
- **Funcionalidade**: Ajuda e sugestões de comandos
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Helper"

### **3. Extensões para Visual e Temas**

#### **Terminal Colors**
- **ID**: `terminal-colors`
- **Funcionalidade**: Melhora cores do terminal
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Colors"

#### **Terminal Themes**
- **ID**: `terminal-themes`
- **Funcionalidade**: Temas para terminal
- **Como instalar**: Ctrl+Shift+X → Procurar "Terminal Themes"

### **4. Extensões para Git e Versionamento**

#### **GitLens**
- **ID**: `gitlens`
- **Funcionalidade**: Integração Git avançada
- **Como instalar**: Ctrl+Shift+X → Procurar "GitLens"

#### **Git Graph**
- **ID**: `git-graph`
- **Funcionalidade**: Visualização gráfica do Git
- **Como instalar**: Ctrl+Shift+X → Procurar "Git Graph"

### **5. Extensões para Docker e Containers**

#### **Docker**
- **ID**: `docker`
- **Funcionalidade**: Gerenciamento de containers
- **Como instalar**: Ctrl+Shift+X → Procurar "Docker"

#### **Docker Compose**
- **ID**: `docker-compose`
- **Funcionalidade**: Suporte a Docker Compose
- **Como instalar**: Ctrl+Shift+X → Procurar "Docker Compose"

## 🚀 Configurações Recomendadas

### **Settings.json para Terminal**
```json
{
  "terminal.integrated.copyOnSelection": true,
  "terminal.integrated.rightClickBehavior": "copyPaste",
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.cursorBlinking": true,
  "terminal.integrated.tabs.enabled": true,
  "terminal.integrated.tabs.showActions": "always",
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.showWelcome": false
}
```

### **Keybindings.json para Atalhos**
```json
[
  {
    "key": "ctrl+shift+c",
    "command": "workbench.action.terminal.copySelection",
    "when": "terminalFocus"
  },
  {
    "key": "ctrl+shift+v",
    "command": "workbench.action.terminal.paste",
    "when": "terminalFocus"
  },
  {
    "key": "ctrl+shift+r",
    "command": "workbench.action.terminal.runSelectedText",
    "when": "terminalFocus"
  }
]
```

## 📋 Lista de Extensões por Categoria

### **Botões e Interface**
- Terminal Copy Button
- Terminal Commands
- Terminal Tabs
- Terminal Manager
- Terminal Runner

### **Produtividade**
- Command Runner
- Terminal Helper
- Terminal Utils
- Terminal Colors

### **Git e Versionamento**
- GitLens
- Git Graph
- Git History
- Git Blame

### **Docker e Containers**
- Docker
- Docker Compose
- Kubernetes
- Container Registry

### **Temas e Visual**
- Terminal Themes
- Terminal Colors
- Nerd Fonts
- Powerline

## 🔧 Instalação em Lote

### **Script para instalar todas as extensões**
```bash
#!/bin/bash
EXTENSIONS=(
    "terminal-copy-button"
    "terminal-commands"
    "terminal-tabs"
    "terminal-manager"
    "terminal-runner"
    "command-runner"
    "terminal-helper"
    "terminal-colors"
    "gitlens"
    "docker"
)

for ext in "${EXTENSIONS[@]}"; do
    echo "Instalando $ext..."
    cursor --install-extension "$ext"
done
```

## 📝 Notas Importantes

1. **Reiniciar** o Cursor após instalar extensões
2. **Configurar** atalhos de teclado
3. **Testar** funcionalidades após instalação
4. **Atualizar** extensões regularmente
5. **Verificar** compatibilidade com versão do Cursor

## 🎯 Recomendações por Uso

### **Para Desenvolvimento Web**
- Terminal Copy Button
- Terminal Commands
- GitLens
- Docker

### **Para Desenvolvimento Mobile**
- Terminal Runner
- Terminal Helper
- Command Runner

### **Para DevOps**
- Terminal Manager
- Docker
- Kubernetes
- Terminal Utils

### **Para Iniciantes**
- Terminal Helper
- Terminal Colors
- Command Runner
- Terminal Copy Button









