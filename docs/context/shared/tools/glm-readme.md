---
title: GLM - Claude CLI com API Z.ai
sidebar_position: 50
tags: [glm, claude, cli, tools, shared]
domain: shared
type: reference
summary: GLM usage guide for Claude CLI with Z.ai API integration
status: active
last_review: "2025-10-17"
---

# GLM - Claude CLI com API Z.ai

> **Documentação completa em:** `tools/glm/`

## 🚀 Uso Rápido

### Da Raiz do Projeto

```bash
# Executar Claude com permissões totais
./glm

# Menu interativo de modos
./glm-modos
```

### De Qualquer Lugar

```bash
# Após configurar PATH (ou reiniciar terminal)
glm
```

## 📚 Documentação

Toda documentação está organizada em `tools/glm/`:

- **[tools/glm/README.md](https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/README.md)** - Documentação principal
- **[tools/glm/GLM-INDEX.md](https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/GLM-INDEX.md)** - Índice completo
- **[tools/glm/GLM-QUICK-START.txt](https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/GLM-QUICK-START.txt)** - Guia visual

## 🎯 O que é GLM?

Comando personalizado que executa Claude Code com:
- ✅ API Z.ai configurada
- ✅ Autenticação automática
- ✅ Permissões totais (desenvolvimento)

## 📁 Arquivos na Raiz

- `glm` - Wrapper executável (chama [`tools/glm/glm.sh`](https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/glm.sh))
- `glm-modos` - Wrapper do menu interativo (chama [`tools/glm/glm-modos.sh`](https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/glm-modos.sh))
- `GLM-README.md` - Este arquivo

## 🔧 Configuração

```bash
# Primeira vez: adicionar ao PATH
export PATH="$HOME/bin:$PATH"

# Ou reinicie o terminal (PATH já está em ~/.bashrc)
```

## ⚡ Comandos Disponíveis

```bash
# Uso direto
./glm                              # Permissões totais
./glm-modos                        # Menu de modos

# Ou via PATH
glm                                # De qualquer lugar
```

## 📖 Mais Informações

Veja a documentação completa em:
- https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/README.md
- https://github.com/marceloterra/TradingSystem/blob/main/tools/glm/GLM-INDEX.md

---

**Versão:** 1.2.0 | **Localização:** `tools/glm/`
