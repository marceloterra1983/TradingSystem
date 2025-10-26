---
title: Cursor - Setup Rápido
sidebar_position: 21
tags: [ops, development, cursor, quick-start, setup, pt-br]
domain: ops
type: guide
summary: Guia rápido de configuração do Cursor IDE em português
status: active
last_review: "2025-10-17"
---

# ⚡ Cursor Linux - Setup Rápido

## 🚀 Ativar Agora (30 segundos)

### 1. Recarregar
```
Ctrl+Shift+P → "Reload" → Enter
```

### 2. Abrir Terminal
```
Ctrl+`
```

**✅ Pronto! Terminal agora é WSL Ubuntu** 🐧

---

## 🎮 Atalhos Principais

| Ação | Atalho |
|------|--------|
| **Terminal** | `` Ctrl+` `` |
| **Iniciar Tudo** | `Ctrl+Shift+B` |
| **Tarefas** | `Ctrl+Shift+P` → Tasks |
| **Debug** | `Ctrl+Shift+D` → F5 |

---

## ⚡ Comandos Rápidos

### Iniciar
```
Ctrl+Shift+B
```

### Parar
```bash
pkill -f "npm run dev"
```

> O fluxo atual utiliza os scripts `start-all-services.sh` e `check-services.sh`.  
> Docker local não é mais necessário para o TradingSystem.

### Status
```bash
bash check-services.sh
```

---

## 📋 Tarefas Disponíveis

- 🚀 Start Dev Services
- 🛑 Stop Services
- 📊 Check Status
- 🔍 Make Scripts Executable

**Acessar:** `Ctrl+Shift+P` → "Tasks: Run Task"

---

## 📚 Docs Completas

- [CURSOR-LINUX-SETUP.md](CURSOR-LINUX-SETUP.md) - Guia completo
- [Configurações VS Code (GitHub)](https://github.com/marceloterra/TradingSystem/blob/main/.vscode/README.md) - Configurações
- [../onboarding/START-HERE-LINUX.md](../onboarding/START-HERE-LINUX.md) - Setup ambiente

---

**🎯 Primeiro Uso:**
1. `Ctrl+Shift+P` → Reload
2. `` Ctrl+` `` → Terminal abre no Linux
3. `Ctrl+Shift+B` → Inicia tudo
4. http://localhost:5173 → Dashboard

**Pronto!** ✨



