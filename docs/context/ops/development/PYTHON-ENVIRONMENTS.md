---
title: Python Virtual Environments Guide
sidebar_position: 30
tags: [ops, development, python, environments, venv, guide]
domain: ops
type: guide
summary: Guide for managing Python virtual environments including setup, activation, and best practices
status: active
last_review: 2025-10-17
---

# 🐍 Ambientes Virtuais Python

Este documento descreve os ambientes virtuais Python configurados no TradingSystem.

## 📋 Ambientes Disponíveis

### 1. `.venv` - Ambiente Principal
**Localização:** `/home/marce/projetos/TradingSystem/.venv`  
**Python:** 3.12.3  
**Tamanho:** ~1.2 GB  
**Pacotes:** 29  

**Finalidade:**  
Ambiente principal do projeto para desenvolvimento de APIs backend.

**Pacotes Principais:**
- `fastapi` 0.114.2
- `uvicorn` 0.30.6
- `pydantic` 2.12.0

**Como Ativar:**
```bash
cd /home/marce/projetos/TradingSystem
source .venv/bin/activate
```

**Quando Usar:**
- Desenvolvimento de APIs REST (Idea Bank, TP Capital, etc.)
- Testes de backend
- Scripts Python gerais do projeto

---

No momento apenas o ambiente principal `.venv` está configurado no WSL. Se novos ambientes forem criados, atualize esta documentação para refletir os caminhos corretos.

## 🚀 Início Rápido

### Exibir Informações dos Ambientes

Ao abrir um novo terminal no projeto, digite:

```bash
tsinfo
```

Isso exibirá uma mensagem formatada com todos os ambientes disponíveis e comandos úteis.

### Configuração do Terminal

O terminal do Cursor está configurado para:
- ✅ **NÃO ativar** automaticamente nenhum ambiente virtual
- ✅ Iniciar sempre na raiz do projeto (`/home/marce/projetos/TradingSystem`)
- ✅ Usar bash como shell padrão

**Configuração:** `.vscode/settings.json`
```json
{
  "python.terminal.activateEnvironment": false
}
```

### Ativação Manual

Você deve ativar o ambiente virtual manualmente conforme necessário:

```bash
# Ativar ambiente principal
source .venv/bin/activate

# Desativar ambiente atual
deactivate
```

---

## 📦 Gerenciamento de Pacotes

### Instalar Novo Pacote

```bash
# Ativar o ambiente desejado
source .venv/bin/activate

# Instalar pacote
pip install nome-do-pacote

# Atualizar requirements (se aplicável)
pip freeze > requirements.txt

# Desativar
deactivate
```

### Listar Pacotes Instalados

```bash
# Com ambiente ativado
pip list

# Ou diretamente sem ativar
.venv/bin/pip list
```

### Atualizar Pacotes

```bash
source .venv/bin/activate
pip install --upgrade nome-do-pacote
deactivate
```

---

## 🧹 Manutenção

### Verificar Tamanho dos Ambientes

```bash
du -sh .venv
```

### Limpar Cache do Pip

```bash
# Em cada ambiente
source .venv/bin/activate
pip cache purge
deactivate
```

### Recriar Ambiente (se necessário)

```bash
# Backup de requirements
.venv/bin/pip freeze > requirements-backup.txt

# Remover ambiente antigo
rm -rf .venv

# Criar novo ambiente
python3 -m venv .venv

# Reinstalar pacotes
source .venv/bin/activate
pip install -r requirements-backup.txt
deactivate
```

---

## 🔧 Troubleshooting

### Problema: VSCode/Cursor ativa venv automaticamente

**Solução:** Verificar `.vscode/settings.json`:
```json
{
  "python.terminal.activateEnvironment": false
}
```

### Problema: Conflito de dependências entre ambientes

**Solução:** Cada ambiente é isolado. Use o ambiente correto para cada tarefa.

### Problema: "command not found" ao ativar ambiente

**Solução:** Verificar se o caminho está correto:
```bash
ls -la .venv/bin/activate
source .venv/bin/activate
```

---

## 📚 Referências

- [Python venv Documentation](https://docs.python.org/3/library/venv.html)

---

**Última Atualização:** 2025-10-13  
**Mantido por:** TradingSystem Team


