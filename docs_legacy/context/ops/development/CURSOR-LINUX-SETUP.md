---
title: Cursor IDE Setup for Linux
sidebar_position: 20
tags: [ops, development, cursor, linux, setup, guide]
domain: ops
type: guide
summary: Complete setup guide for Cursor IDE on Linux including configuration and troubleshooting
status: active
last_review: "2025-10-17"
---

# 🎯 Configuração do Cursor para Linux - Guia Rápido

> Terminal Linux (WSL) agora é o padrão no Cursor!

## ✅ O Que Foi Configurado

Criei 4 arquivos de configuração em `.vscode/`:

1. **`settings.json`** - Terminal padrão WSL + configurações gerais
2. **`tasks.json`** - 10 tarefas automatizadas prontas para uso
3. **`launch.json`** - Configurações de debug para Node.js
4. **`extensions.json`** - Extensões recomendadas

---

## 🚀 Ativação Imediata (3 passos)

### 1️⃣ Recarregar o Cursor

**Opção A - Command Palette:**
```
Ctrl+Shift+P → "Developer: Reload Window" → Enter
```

**Opção B - Fechar e Abrir:**
Feche e abra o Cursor novamente.

### 2️⃣ Abrir Terminal

Pressione: `` Ctrl+` ``

O terminal agora abre **automaticamente no WSL Ubuntu**! 🐧

### 3️⃣ Testar

No terminal que abriu, digite:
```bash
pwd
```

Deve mostrar: `/home/marce/projetos/TradingSystem`

**✅ Pronto! Seu Cursor está configurado para Linux!**

---

## 🎮 Como Usar

### Abrir Terminal Linux

| Ação | Atalho |
|------|--------|
| Abrir/Fechar Terminal | `` Ctrl+` `` |
| Novo Terminal | `` Ctrl+Shift+` `` |
| Alternar Perfil | Clique na seta ▼ ao lado do `+` |

### Executar Tarefas Rápidas

**1. Via Command Palette:**
```
Ctrl+Shift+P → "Tasks: Run Task" → Escolher tarefa
```

**2. Via Atalho (Task Padrão):**
```
Ctrl+Shift+B
```
Isso executa automaticamente: **"Start Dev Services"**

**Tarefas Disponíveis:**
- 🚀 Start Dev Services (Linux)
- 🔧 Start Laucher
- 🤖 Start Flowise
- ⚙️ Linux Environment Setup
- 🐳 Start Monitoring Stack
- 🛑 Stop All Services
- 📊 Check Service Status
- 🔍 Make Scripts Executable

### Debugar Aplicações

**1. Abrir Debug:**
```
Ctrl+Shift+D
```

**2. Escolher Configuração:**
- Debug Idea Bank API
- Debug Laucher
- Debug TP-Capital

**3. Iniciar:**
```
F5
```

**Breakpoints:**
- Clicar na margem esquerda do editor
- Ou pressionar `F9` na linha desejada

---

## 📋 Tarefas Prontas

### 🚀 Start Dev Services (Linux)
**Atalho:** `Ctrl+Shift+B`  
**O que faz:** Executa o script legado `start-trading-system-dev.sh`.  
**Recomendação atual:** rode `bash start-all-services.sh` no terminal para o fluxo suportado.

### 🔧 Start Laucher
**O que faz:** Inicia apenas o Laucher API (porta 9999)

### 🤖 Start Flowise
**O que faz:** Inicia Flowise (porta 3001)

### ⚙️ Linux Environment Setup
**O que faz:** Executa script de setup automático do ambiente

### 🐳 Start Monitoring Stack
**Status:** utilize os scripts oficiais (`start-all-stacks.sh` / `stop-all-stacks.sh`) ou docker compose diretamente.

### 🛑 Stop All Docker Services
**Status:** usar `bash stop-all-stacks.sh` para encerrar todos os containers auxiliares.

### 🛑 Stop All Node Services
**O que faz:** Para processos Node.js (`pkill node`). Prefira `pkill -f "npm run dev"` para garantir que todos os serviços atuais sejam encerrados.

### 📊 Check Service Status
**O que faz:** Mostra portas locais, incluindo containers Docker Compose ativos.

### 🔍 Make Scripts Executable
**O que faz:** Torna todos os scripts `.sh` executáveis

---

## 🎯 Fluxo de Trabalho Típico

### Manhã (Iniciar Ambiente)

```
1. Abrir Cursor no projeto
2. Pressionar Ctrl+Shift+B (Start Dev Services)
3. Aguardar serviços iniciarem
4. Acessar http://localhost:5173 (Dashboard)
```

### Desenvolvimento

```
1. Fazer alterações no código
2. Se necessário debugar: Ctrl+Shift+D → F5
3. Testar no navegador
```

### Final do Dia (Parar Ambiente)

```
1. Ctrl+Shift+P → "Tasks: Run Task"
2. Escolher "Stop All Node Services" (ou executar `pkill -f "npm run dev"`)
3. Se necessário, execute `bash stop-all-stacks.sh` para encerrar os containers auxiliares
```

---

## 🔧 Configurações Detalhadas

### Terminal Padrão

**Atual:** Ubuntu (WSL)

**Alterar:** Edite `.vscode/settings.json`:
```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

Opções: `"Ubuntu (WSL)"` | `"PowerShell"` | `"Command Prompt"`

### Perfis de Terminal

Clique na seta ▼ ao lado do `+` no terminal para alternar:
- 🐧 Ubuntu (WSL) - **Padrão**
- 💙 PowerShell
- ⚫ Command Prompt
- 🦊 Git Bash

### Line Endings

**Configurado:** LF (Linux)

Todos os novos arquivos usarão line endings Linux automaticamente.

### Encoding

**Configurado:** UTF-8

---

## 📦 Extensões Recomendadas

### Instalar Automaticamente

1. Pressione `Ctrl+Shift+P`
2. Digite: "Extensions: Show Recommended Extensions"
3. Clique em "Install All"

### Lista de Extensões

**Essenciais:**
- Remote - WSL
- Docker

**Desenvolvimento:**
- ESLint
- Prettier
- GitLens

**API Testing:**
- Thunder Client

**Shell Script:**
- ShellCheck
- Shell Format

**Utilities:**
- Code Spell Checker
- Todo Tree

---

## 🐛 Troubleshooting

### Terminal não abre no WSL

**Solução 1:**
```
Ctrl+Shift+P → "Developer: Reload Window"
```

**Solução 2:**
Verificar se WSL está funcionando:
```powershell
wsl --list
wsl -d Ubuntu
```

### Tarefas não aparecem

**Solução:**
1. Verificar se arquivo `.vscode/tasks.json` existe
2. Recarregar window: `Ctrl+Shift+P` → "Reload Window"

### Debug não funciona

**Verificar:**
1. Dependências instaladas (`node_modules`)
2. Porta não está em uso
3. Arquivo existe no caminho especificado

### Scripts sem permissão

**Executar tarefa:**
```
Ctrl+Shift+P → Tasks: Run Task → Make Scripts Executable
```

Ou manualmente no terminal:
```bash
chmod +x tools/scripts/*.sh
```

---

## 📝 Atalhos Úteis

| Ação | Atalho |
|------|--------|
| **Terminal** | |
| Abrir/Fechar Terminal | `` Ctrl+` `` |
| Novo Terminal | `` Ctrl+Shift+` `` |
| **Comandos** | |
| Command Palette | `Ctrl+Shift+P` |
| Quick Open | `Ctrl+P` |
| **Tarefas** | |
| Run Build Task | `Ctrl+Shift+B` |
| Run Task | `Ctrl+Shift+P` → Tasks |
| **Debug** | |
| Abrir Debug | `Ctrl+Shift+D` |
| Start/Continue | `F5` |
| Stop | `Shift+F5` |
| Step Over | `F10` |
| Step Into | `F11` |
| Toggle Breakpoint | `F9` |
| **Navegação** | |
| Explorer | `Ctrl+Shift+E` |
| Search | `Ctrl+Shift+F` |
| Source Control | `Ctrl+Shift+G` |
| Extensions | `Ctrl+Shift+X` |

---

## 📚 Documentação Adicional

### Dentro do Projeto

- **[Configurações VS Code (GitHub)](https://github.com/marceloterra/TradingSystem/blob/main/.vscode/README.md)** - Documentação completa das configurações
- **[../onboarding/START-HERE-LINUX.md](../onboarding/START-HERE-LINUX.md)** - Guia de setup Linux

### Online

- [VSCode Tasks](https://code.visualstudio.com/docs/editor/tasks)
- [VSCode Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [WSL Extension](https://code.visualstudio.com/docs/remote/wsl)

---

## ✅ Checklist de Verificação

- [ ] Cursor recarregado (`Ctrl+Shift+P` → Reload Window)
- [ ] Terminal abre no WSL (`` Ctrl+` ``)
- [ ] `pwd` mostra caminho Linux
- [ ] Tarefas aparecem (`Ctrl+Shift+B`)
- [ ] Extensões recomendadas instaladas
- [ ] Scripts executáveis (`chmod +x` executado)

---

## 🎉 Próximos Passos

### 1. Testar Setup Automático

```
Ctrl+Shift+P → Tasks: Run Task → Linux Environment Setup
```

### 2. Iniciar Ambiente

```
Ctrl+Shift+B
```

### 3. Desenvolver!

Tudo está configurado e pronto para uso! 🚀

---

## 💡 Dicas

### Criar Alias Personalizados

Adicione ao `~/.bashrc`:
```bash
alias tsd='cd ~/projetos/TradingSystem'
alias tsd-start='tsd && ./tools/scripts/start-trading-system-dev.sh --start-monitoring'
```

### Usar Tasks Frequentemente

- `Ctrl+Shift+B` é seu melhor amigo
- Configure atalhos customizados para tarefas específicas
- Use Terminal Splits para ver múltiplos serviços

### Debug Eficiente

- Use Watch para monitorar variáveis
- Conditional Breakpoints para debugging específico
- Logpoints para logging sem modificar código

---

**🎊 Configuração Completa!**

Seu Cursor agora está otimizado para desenvolvimento Linux!

Pressione `` Ctrl+` `` para abrir o terminal e começar! 🐧


