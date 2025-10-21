# 🔧 Fix Terminal Error - Cursor

## ❌ Erro que você está vendo:

```
The terminal process failed to launch: Starting directory (cwd)
"\\wsl.localhost\Ubuntu\home\marce\projetos\docker-local" does not exist.

The terminal process failed to launch: Invalid starting directory
"\\wsl.localhost\\\wsl.localhost\Ubuntu\home\marce\projetos\TradingSystem"
```

## ✅ Solução Rápida:

### 1. Recarregar Cursor
```
Ctrl+Shift+P → "Developer: Reload Window" → Enter
```

### 2. Testar Terminal
```
Ctrl+`
```

**Deve abrir no WSL Ubuntu no diretório correto!** ✅

---

## 🔍 Por que aconteceu?

### Problema 1: Diretório Incorreto
- Cursor estava tentando abrir em `docker-local` em vez de `TradingSystem`
- Caminho Windows (`\\wsl.localhost\...`) não funcionou

### Problema 2: Caminho Duplicado
- Configuração tinha caminho duplicado: `\\wsl.localhost\\\wsl.localhost\...`

## 🛠️ O que foi corrigido:

### 1. Diretório de Trabalho
```json
// ANTES (incorreto)
"terminal.integrated.cwd": "${workspaceFolder}"

// DEPOIS (correto)
"terminal.integrated.cwd": "/home/marce/projetos/TradingSystem"
```

### 2. Argumentos WSL
```json
// ANTES (sem diretório)
"args": ["-d", "Ubuntu"]

// DEPOIS (com diretório correto)
"args": ["-d", "Ubuntu", "--cd", "/home/marce/projetos/TradingSystem"]
```

---

## ✅ Verificação

Após recarregar, o terminal deve:

1. **Abrir no WSL Ubuntu** 🐧
2. **Diretório correto**: `/home/marce/projetos/TradingSystem`
3. **Sem erros**

### Testar:
```bash
pwd
# Deve mostrar: /home/marce/projetos/TradingSystem

ls
# Deve mostrar: backend, frontend, infrastructure, etc.
```

---

## 🐛 Se ainda der erro:

### Opção 1: Reset Manual
```
Ctrl+Shift+P → "Terminal: Select Default Profile" → Ubuntu (WSL)
```

### Opção 2: Verificar WSL
```powershell
# No PowerShell do Windows
wsl --list
wsl -d Ubuntu
```

### Opção 3: Usar PowerShell temporariamente
```
Ctrl+Shift+P → "Terminal: Select Default Profile" → PowerShell
```

---

## 📚 Alternativas

### Se WSL não funcionar:

**PowerShell com WSL:**
```powershell
wsl -d Ubuntu
cd /home/marce/projetos/TradingSystem
```

**Git Bash:**
```bash
wsl -d Ubuntu
cd /home/marce/projetos/TradingSystem
```

---

**🎯 Solução:** Recarregar Cursor (`Ctrl+Shift+P` → "Reload Window")

**Teste:** `` Ctrl+` `` → Deve abrir no Linux ✅





