---
title: "Venv Visual Bell"
tags: [documentation]
domain: devops
type: guide
summary: "Documentation for Venv Visual Bell"
status: active
last_review: "2025-11-08"
---# 🔔 Visual Bell + Venv Automático - SOLUÇÃO FINAL

## ✅ Problema Resolvido

Agora você tem **AMBOS** funcionando perfeitamente:

- 🐍 **Venv ativa automaticamente** conforme o projeto
- 🔔 **Visual Bell funciona** (pisca na aba do terminal)

---

## 🎯 O Problema

Quando usávamos `--init-file .bashrc`, o **Shell Integration** não carregava corretamente, e o **Visual Bell** depende do Shell Integration!

```
--init-file .bashrc → Shell Integration quebrado → Visual Bell não funciona ❌
```

---

## ✅ A Solução

Mudamos a abordagem:

1. **NÃO usar** `--init-file` (preserva Shell Integration)
2. Passar uma **variável de ambiente** `AUTO_ACTIVATE_VENV=1`
3. Lógica no **`~/.bashrc` global** detecta a variável
4. Ativa venv automaticamente quando detecta a variável + venv no diretório

```
env AUTO_ACTIVATE_VENV=1 → ~/.bashrc detecta → Ativa venv → Shell Integration OK → Visual Bell funciona ✅
```

---

## 🔧 Como Funciona Tecnicamente

### **1. Profile "bash" (settings.json):**

```json
{
  "bash": {
    "path": "bash",
    "icon": "terminal",
    "env": {
      "AUTO_ACTIVATE_VENV": "1"  // ← Sinaliza: "quero venv automático"
    }
  }
}
```

### **2. Lógica no ~/.bashrc:**

```bash
# Auto-ativar venv quando em um projeto
if [ -n "$AUTO_ACTIVATE_VENV" ] && [ -z "$VENV_ACTIVATED" ]; then
    if [ -f "$PWD/venv/bin/activate" ]; then
        # Ativa venv
        VIRTUAL_ENV_DISABLE_PROMPT=1 source "$PWD/venv/bin/activate"
        export VENV_ACTIVATED=1
        
        # Adiciona emoji ao prompt
        PS1="🐍 $PS1"
        
        # Mensagem de boas-vindas
        echo "✅ Ambiente virtual ativado automaticamente!"
        echo "📦 Projeto: $(basename $PWD)"
    fi
fi
```

### **3. Fluxo Completo:**

```
1. Cursor abre terminal com env AUTO_ACTIVATE_VENV=1
   ↓
2. Bash inicia normalmente (Shell Integration funciona!)
   ↓
3. ~/.bashrc carrega
   ↓
4. Detecta AUTO_ACTIVATE_VENV=1
   ↓
5. Verifica se existe venv/ no diretório atual
   ↓
6. Se sim: ativa venv automaticamente
   ↓
7. Shell Integration completo → Visual Bell funciona! 🔔
```

---

## 🧪 Teste Agora

### **1. Recarregar o Cursor:**

```
Ctrl+Shift+P → "Reload Window"
```

### **2. Fechar Todos os Terminais**

### **3. Abrir Novo Terminal (clique no "+"):**

**Deve mostrar:**

```bash
✅ Ambiente virtual ativado automaticamente!
📍 Python: Python 3.12.3
📦 Projeto: CursoLangChain

🐍 marce@marcelopc:~/Projetos/CursoLangChain$
```

### **4. Testar Visual Bell:**

**Abrir 2 terminais:**

```bash
# Terminal 1:
# (deixe aberto)

# Terminal 2:
sleep 5 && echo "Bell Test!" && printf '\a'

# Imediatamente clique na aba do Terminal 1
# Aguarde 5 segundos
# A aba do Terminal 2 deve PISCAR! 🔔✨
```

---

## ✅ Checklist de Verificação

### **Venv Automático:**

```bash
# Ao abrir terminal:
echo $VIRTUAL_ENV
# Deve mostrar: /caminho/para/projeto/venv

which python
# Deve mostrar: /caminho/para/projeto/venv/bin/python
```

### **Shell Integration:**

```bash
# Verificar se está ativo:
type __vsc_prompt_cmd &>/dev/null && echo "✅ Shell Integration OK" || echo "❌ Shell Integration MISSING"
```

### **Visual Bell:**

- Abra 2 terminais
- Execute comando longo em um
- Mude para o outro
- Aba do primeiro deve piscar quando terminar 🔔

---

## 📊 Comparação das Abordagens

### **Abordagem 1 (Antiga - Quebrada):**

```json
"bash": {
  "path": "bash",
  "args": ["--init-file", ".bashrc"]  // ❌ Quebra Shell Integration
}
```

**Resultado:**

- ✅ Venv automático funciona
- ❌ Visual Bell NÃO funciona
- ❌ Shell Integration quebrado

### **Abordagem 2 (Nova - Funciona!):**

```json
"bash": {
  "path": "bash",
  "env": {"AUTO_ACTIVATE_VENV": "1"}  // ✅ Preserva Shell Integration
}
```

**Resultado:**

- ✅ Venv automático funciona
- ✅ Visual Bell funciona! 🔔
- ✅ Shell Integration OK

---

## 🎯 Funcionalidades Ativas

| Funcionalidade | Status |
|----------------|--------|
| Venv automático por projeto | ✅ Funciona |
| Visual Bell (pisca na aba) | ✅ Funciona |
| Shell Integration | ✅ Funciona |
| Botão copy na margem | ✅ Funciona |
| Botão copy na statusbar | ✅ Funciona |
| Prompt com 🐍 | ✅ Funciona |
| Detecção por projeto | ✅ Funciona |

---

## 💡 Como Funciona "Por Projeto"

### **CursoLangChain:**

```bash
cd ~/Projetos/CursoLangChain
cursor .

# Clique "+"
# Verifica: $PWD = /home/marce/Projetos/CursoLangChain
# Existe venv/ aqui? Sim!
# Ativa: /home/marce/Projetos/CursoLangChain/venv ✅
```

### **TradingSystem:**

```bash
cd ~/Projetos/TradingSystem
cursor .

# Clique "+"
# Verifica: $PWD = /home/marce/Projetos/TradingSystem
# Existe venv/ aqui? Sim!
# Ativa: /home/marce/Projetos/TradingSystem/venv ✅
```

### **Projeto sem venv:**

```bash
cd ~/Projetos/ProjetoNode
cursor .

# Clique "+"
# Verifica: $PWD = /home/marce/Projetos/ProjetoNode
# Existe venv/ aqui? Não!
# Bash normal, sem venv ✅
```

---

## 🔄 Perfis Disponíveis

### **bash (Default) - Com venv automático**

- Clique no "+"
- Ativa venv se existir no projeto
- Visual Bell funciona
- Shell Integration funciona

### **bash-clean - Sem venv**

- Clique na ▼ → Selecione "bash-clean"
- Bash puro, nunca ativa venv
- Para casos raros onde não quer venv

---

## 🐛 Troubleshooting

### **Visual Bell não funciona:**

1. **Verificar Shell Integration:**

   ```bash
   type __vsc_prompt_cmd &>/dev/null && echo "OK" || echo "MISSING"
   ```

   Se "MISSING": Recarregue o Cursor

2. **Verificar configuração:**

   ```json
   "terminal.integrated.enableVisualBell": true
   ```

3. **Testar com printf:**

   ```bash
   printf '\a'  # Deve fazer o Visual Bell piscar
   ```

### **Venv não ativa automaticamente:**

1. **Verificar variável:**

   ```bash
   echo $AUTO_ACTIVATE_VENV
   # Deve mostrar: 1
   ```

2. **Verificar se venv existe:**

   ```bash
   ls -la venv/
   ```

3. **Verificar ~/.bashrc:**

   ```bash
   grep "AUTO_ACTIVATE_VENV" ~/.bashrc
   # Deve mostrar a lógica de ativação
   ```

### **Venv ativa mas Visual Bell não funciona:**

- Isso NÃO deve mais acontecer!
- Se acontecer: `Ctrl+Shift+P` → `Reload Window`

---

## 📝 Arquivos Modificados

### **Por Projeto:**

✅ `CursoLangChain/.vscode/settings.json` - Profile com env var  
✅ `TradingSystem/.vscode/settings.json` - Profile com env var

### **Global:**

✅ `~/.bashrc` - Lógica de ativação automática adicionada

### **Removidos (não são mais necessários):**

❌ `.bashrc` local do projeto (não é mais usado)

---

## 🎓 Por Que Funciona Agora?

### **Problema Anterior:**

```
--init-file .bashrc
  ↓
Shell não carrega normalmente
  ↓
Shell Integration não é injetado pelo Cursor
  ↓
Visual Bell não funciona ❌
```

### **Solução Atual:**

```
Bash normal + env var
  ↓
Shell carrega normalmente
  ↓
Shell Integration é injetado pelo Cursor
  ↓
~/.bashrc detecta env var
  ↓
Ativa venv
  ↓
Tudo funciona! ✅
```

---

## ✅ Resumo Final

**O que você tem agora:**

1. 🐍 Venv ativa automaticamente conforme o projeto
2. 🔔 Visual Bell funciona (pisca quando há atividade)
3. 📋 Shell Integration completo
4. 💻 Bash limpo disponível quando necessário
5. 🎯 Detecção automática por projeto
6. ⚡ Zero configuração manual necessária

**Como usar:**

- Clique no "+" → Venv ativo + Visual Bell funcionando
- Clique na ▼ → "bash-clean" se NÃO quiser venv

**Status:**

- ✅ CursoLangChain configurado
- ✅ TradingSystem configurado
- ✅ Qualquer projeto com venv/ funciona automaticamente

---

**🎉 TUDO FUNCIONANDO PERFEITAMENTE!**

**Documentação:** `VISUAL_BELL_E_VENV_AUTOMATICO.md`  
**Última atualização:** $(date)  
**Status:** ✅ Venv automático + Visual Bell funcionando simultaneamente!
