---
title: "Bash Vs Venv"
tags: [documentation]
domain: devops
type: guide
summary: "Documentation for Bash Vs Venv"
status: active
last_review: "2025-11-08"
---# 🔧 Como Escolher Entre Bash e Venv

## ✅ Configuração Atual

O terminal **padrão** agora é **bash normal** (sem venv).

---

## 🎯 Como Funciona Agora

### **Clicar no "+" (Novo Terminal):**

```
Clique no "+" → Abre bash normal (SEM venv)
```

### **Para Abrir com Venv:**

```
Clique na seta ▼ ao lado do "+" → Selecione "venv"
```

---

## 📋 Passo a Passo Visual

### **Opção 1: Bash Normal (Padrão)**

```
1. Clique no botão "+"
2. Terminal abre com bash normal
3. Sem venv ativo
```

**Prompt:**

```bash
marce@marcelopc:~/Projetos/CursoLangChain$
```

### **Opção 2: Bash com Venv**

```
1. Clique na SETA ▼ ao lado do "+"
2. Selecione "venv" no menu dropdown
3. Terminal abre com venv ativo automaticamente
```

**Prompt:**

```bash
✅ Ambiente virtual ativado automaticamente!
📍 Python: Python 3.12.3
📦 Projeto: CursoLangChain

🐍 marce@marcelopc:~/Projetos/CursoLangChain$
```

---

## 🔀 Perfis Disponíveis

### **1. bash (Padrão)**

- **Ícone:** 💻 Terminal
- **Ativação:** Clique no "+"
- **Uso:** Comandos gerais, git, npm, etc
- **Venv:** NÃO ativo

### **2. venv**

- **Ícone:** 🐍 Cobra verde
- **Ativação:** Clique na ▼ → Selecione "venv"
- **Uso:** Desenvolvimento Python, pip, scripts Python
- **Venv:** Ativo automaticamente

---

## 🎨 Interface Visual

```
┌──────────────────────────────────────┐
│  [+] [▼] [⋮] [^] [×]                │
│   ↑   ↑                              │
│   │   └─ Menu dropdown (bash/venv)  │
│   └───── Novo terminal (bash)       │
└──────────────────────────────────────┘
```

**Menu Dropdown (▼):**

```
┌─────────────────┐
│ bash            │ ← Terminal padrão
│ venv (🐍)       │ ← Com Python venv
└─────────────────┘
```

---

## 💡 Casos de Uso

### **Quando Usar Bash Normal:**

✅ **Comandos Git:**

```bash
git status
git add .
git commit -m "mensagem"
git push
```

✅ **Comandos do Sistema:**

```bash
ls -la
cd outra-pasta
mkdir nova-pasta
rm arquivo.txt
```

✅ **Node.js / npm:**

```bash
npm install
npm run dev
npm test
```

✅ **Docker:**

```bash
docker ps
docker-compose up
```

### **Quando Usar Venv:**

✅ **Desenvolvimento Python:**

```bash
python script.py
python -m module
```

✅ **Gerenciamento de Pacotes:**

```bash
pip install package
pip list
pip freeze
```

✅ **Executar código Python:**

```bash
python arq_py_aula_3/runnable_desafio.py
python -c "print('hello')"
```

✅ **Jupyter / IPython:**

```bash
jupyter notebook
ipython
```

---

## 🚀 Atalhos de Teclado

### **Novo Terminal (bash padrão):**

```
Ctrl + '  (Ctrl + aspas simples)
```

### **Trocar de Profile Depois:**

```
1. Clique na ▼ na aba do terminal
2. Selecione o profile desejado
```

### **Ou via Command Palette:**

```
Ctrl+Shift+P → "Terminal: Select Default Profile"
Escolha: bash ou venv
```

---

## 🔄 Trocar o Padrão de Volta para Venv

Se você quiser voltar a ter venv como padrão:

### **Opção 1: Via Settings.json**

```json
{
  "terminal.integrated.defaultProfile.linux": "venv"  // venv como padrão
}
```

### **Opção 2: Via Command Palette**

```
Ctrl+Shift+P → "Terminal: Select Default Profile" → venv
```

---

## 📊 Comparação

| Aspecto | Bash Normal | Venv |
|---------|-------------|------|
| Ativação | Clique no "+" | Clique na ▼ → venv |
| Venv Python | ❌ Não | ✅ Sim (automático) |
| Velocidade | ⚡ Instantâneo | 🐌 ~1s (carrega venv) |
| Uso Geral | ✅ Melhor | ❌ Limitado |
| Python | ⚠️ Python global | ✅ Python do venv |
| Pip | ⚠️ Pip global | ✅ Pip do venv |
| Visual Bell | ✅ Funciona | ✅ Funciona |
| Shell Integration | ✅ Funciona | ✅ Funciona |

---

## 🎯 Fluxo de Trabalho Recomendado

### **Desenvolvimento Típico:**

```
1. Abrir projeto no Cursor
2. Clicar "+" → Bash normal
3. Comandos git, navegação, etc
4. Quando precisar Python:
   - Clique ▼ → "venv"
   - Ou ative manualmente: source venv/bin/activate
```

### **Desenvolvimento Focado em Python:**

```
1. Abrir projeto no Cursor
2. Ctrl+Shift+P → "Terminal: Select Default Profile" → venv
3. Todos os novos terminais terão venv ativo
4. Quando terminar: trocar default de volta para bash
```

---

## ⚙️ Configurações Aplicadas

### **CursoLangChain & TradingSystem:**

```json
{
  // Bash é o padrão
  "terminal.integrated.defaultProfile.linux": "bash",
  
  // Python NÃO ativa venv automaticamente
  "python.terminal.activateEnvironment": false,
  
  // Mas o Python do venv continua sendo usado pelo editor
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  
  // Dois perfis disponíveis
  "terminal.integrated.profiles.linux": {
    "bash": {
      "path": "bash",
      "icon": "terminal"
    },
    "venv": {
      "path": "bash",
      "args": ["--init-file", "${workspaceFolder}/.bashrc"],
      "icon": "snake",
      "color": "terminal.ansiGreen"
    }
  }
}
```

---

## 🔍 Como Saber Qual Terminal Está Ativo

### **Bash Normal:**

```bash
marce@marcelopc:~/path$
```

- Sem prefixo (venv)
- Sem emoji 🐍

### **Venv Ativo:**

```bash
🐍 marce@marcelopc:~/path$
```

- Emoji 🐍 no início
- Aba do terminal com ícone de cobra 🐍

### **Verificar via Comando:**

```bash
echo $VIRTUAL_ENV
# Vazio = bash normal
# Caminho = venv ativo
```

---

## 💡 Dicas Pro

### **Dica 1: Múltiplos Terminais**

```
Terminal 1 (bash): git, comandos gerais
Terminal 2 (venv): desenvolvimento Python
Terminal 3 (bash): docker, logs
```

### **Dica 2: Ativar Venv Manualmente**

```bash
# Em qualquer bash normal:
source venv/bin/activate

# Agora tem venv sem precisar criar novo terminal
```

### **Dica 3: Alias Úteis**

Adicione ao `~/.bashrc`:

```bash
alias venv='source venv/bin/activate'
alias dvenv='deactivate'
```

Uso:

```bash
venv      # Ativa venv
dvenv     # Desativa venv
```

---

## 📝 Resumo

**Antes:**

- Clique no "+" → venv ativo (sempre)

**Agora:**

- Clique no "+" → bash normal
- Clique na ▼ → Escolha venv quando precisar

**Vantagem:**

- ✅ Mais flexível
- ✅ Terminal mais rápido para tarefas gerais
- ✅ Venv disponível quando necessário
- ✅ Visual Bell funciona em ambos

---

**✅ Configuração aplicada em:**

- CursoLangChain
- TradingSystem

**🎯 Resultado:**

- Bash é o padrão
- Venv disponível no menu dropdown
- Escolha conforme necessidade!
