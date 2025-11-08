---
title: "Venv Activation"
tags: [documentation]
domain: devops
type: guide
summary: "Documentation for Venv Activation"
status: active
last_review: "2025-11-08"
---# 🚀 Ativação Automática do Ambiente Virtual - TradingSystem

Este projeto está configurado para ativar automaticamente o ambiente virtual Python quando você abrir um terminal no VS Code/Cursor.

## ✅ Como Usar

### 1. Recarregar a Janela

Pressione `Ctrl+Shift+P` e digite: `Reload Window`

### 2. Abrir Novo Terminal

Pressione `Ctrl+'` para abrir um novo terminal

### 3. Verificar Ativação

Você deve ver:

```bash
🚀 TradingSystem - Ambiente virtual ativado automaticamente!
📍 Python: Python 3.12.3
💼 Projeto: TradingSystem
🐍 Pacotes Python: 8 instalados

(venv) marce@marcelopc:~/Projetos/TradingSystem$
```

---

## 📦 Pacotes Python Instalados

O ambiente virtual já vem com os pacotes básicos:

- `python-dotenv` - Gerenciamento de variáveis de ambiente
- `requests` - Cliente HTTP
- `psycopg2-binary` - Driver PostgreSQL/TimescaleDB

### Instalar Dependências de Módulos Específicos

```bash
# Para o serviço timescaledb-sync:
pip install -r backend/services/timescaledb-sync/requirements.txt


# Ou instalar tudo de uma vez:
find . -name "requirements.txt" -not -path "*/node_modules/*" -exec pip install -r {} \;
```

---

## 🔧 Troubleshooting

### Não ativou automaticamente?

1. Feche TODOS os terminais abertos
2. Recarregue a janela (`Ctrl+Shift+P` → `Reload Window`)
3. Abra um novo terminal

### Selecionar profile manualmente

Clique na seta `▼` ao lado do `+` no terminal e selecione: `🔵 venv`

### Ativar manualmente

```bash
source venv/bin/activate
```

---

## 🛠️ Estrutura do Projeto

Este é um projeto **misto Node.js + Python**:

```
TradingSystem/
├── venv/                           ← Ambiente virtual Python
├── .bashrc                         ← Script de ativação automática
├── .vscode/settings.json           ← Configuração do editor
│
├── backend/
│   └── services/
│       └── timescaledb-sync/       ← Serviço Python
│           ├── config.py
│           ├── sync.py
│           └── requirements.txt
│
├── tools/
│       ├── requirements.txt
│       └── pyproject.toml
│
└── scripts/
    └── lib/python/                 ← Utilitários Python
        └── health_logger.py
```

---

## 📝 Comandos Úteis

### Verificar Ambiente Ativo

```bash
echo $VIRTUAL_ENV
# Deve mostrar: /home/marce/Projetos/TradingSystem/venv

which python
# Deve mostrar: /home/marce/Projetos/TradingSystem/venv/bin/python
```

### Listar Pacotes

```bash
pip list
pip freeze > requirements-frozen.txt  # Gerar snapshot das versões
```

### Instalar Novo Pacote

```bash
pip install nome-do-pacote
# Atualizar requirements se necessário
```

### Desativar venv

```bash
deactivate
```

---

## 🔄 Para Remover (se necessário)

```bash
rm -rf venv .bashrc
# Remover configurações do .vscode/settings.json manualmente
```

---

## 🎯 Integração com Node.js

O venv Python funciona paralelamente ao projeto Node.js:

- **Node.js:** Aplicação principal, frontend, backend TypeScript
- **Python:** Scripts de sync, agents AI, utilitários de dados

Ambos os ambientes são independentes e podem ser usados simultaneamente no mesmo terminal!

---

## 📚 Próximos Passos

1. **Instalar dependências Python dos módulos:**

   ```bash
   pip install -r backend/services/timescaledb-sync/requirements.txt
   ```

2. **Configurar variáveis de ambiente:**
   Edite o arquivo `.env` na raiz do projeto

3. **Testar serviços Python:**

   ```bash
   python backend/services/timescaledb-sync/sync.py
   ```

---

**✅ Configurado automaticamente em:** $(date)  
**🔧 Script usado:** `/home/marce/Projetos/setup-venv-auto.sh`
