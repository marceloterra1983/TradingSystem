# Claude Code Configuration

This directory contains Claude Code configurations for the TradingSystem project.

## 🚀 Quick Start

### Modo Desenvolvimento (Permissões Completas)

```bash
# Opção 1: Script (Recomendado)
bash .claude/claude-dev.sh

# Opção 2: Configurar aliases (uma vez)
bash .claude/AUTO-SETUP.sh
# Depois:
claude-dev

# Opção 3: Comando direto
claude --dangerously-skip-permissions
```

### Modo Seguro (Com Confirmações)

```bash
cd /home/marce/projetos/TradingSystem
claude
```

## 📁 Estrutura

### Scripts

-   **`claude-dev.sh`** - Modo desenvolvimento com permissões completas
-   **`aliases.sh`** - Aliases convenientes para o shell
-   **`AUTO-SETUP.sh`** - Auto-configuração de aliases

### Documentação

-   **`GETTING-STARTED.md`** - Guia de início rápido (9.2 KB)
-   **`CLAUDE-CLI.md`** - Guia completo do CLI (8.1 KB)
-   **`QUICK-REFERENCE.md`** - Referência rápida (4.8 KB)
-   **`PERMISSIONS-GUIDE.md`** - Guia completo de permissões (8.9 KB)
-   **`INSTALLATION-SUMMARY.md`** - Resumo da instalação (7.5 KB)

### Custom Commands

-   **`commands/git-workflows.md`** - Git operations (2.0 KB)
-   **`commands/docker-compose.md`** - Docker management (2.4 KB)
-   **`commands/health-check.md`** - Health monitoring (3.8 KB)
-   **`commands/service-launcher.md`** - Service management (4.5 KB)
-   **`commands/scripts.md`** - Project automation (5.6 KB)

### Configuração

-   **`mcp-servers.json`** - MCP servers configuration
-   **`.claude-plugin`** (raiz do projeto) - Project configuration

## 🔓 Permissões Configuradas

**Modo ativo**: Bypass (Full Permissions)

**Auto-approve tools**: 12 ferramentas

-   Bash, Read, Write, Edit, Glob, Grep
-   Task, WebFetch, WebSearch, BashOutput
-   KillShell, NotebookEdit, TodoWrite

**Diretórios permitidos**: `/home/marce/projetos/TradingSystem`

## 📚 Principais Guias

| Guia                                               | Quando Usar                | Tamanho |
| -------------------------------------------------- | -------------------------- | ------- |
| [GETTING-STARTED.md](GETTING-STARTED.md)           | Primeira vez, autenticação | 9.2 KB  |
| [QUICK-REFERENCE.md](QUICK-REFERENCE.md)           | Referência rápida          | 4.8 KB  |
| [PERMISSIONS-GUIDE.md](PERMISSIONS-GUIDE.md)       | Entender permissões        | 8.9 KB  |
| [CLAUDE-CLI.md](CLAUDE-CLI.md)                     | Guia completo              | 8.1 KB  |
| [INSTALLATION-SUMMARY.md](INSTALLATION-SUMMARY.md) | Resumo instalação          | 7.5 KB  |

## ⚡ Aliases Disponíveis

Após executar `bash .claude/AUTO-SETUP.sh`:

| Alias              | Descrição                               |
| ------------------ | --------------------------------------- |
| `claude-dev`       | Modo desenvolvimento (full permissions) |
| `claude-safe`      | Modo seguro (com confirmações)          |
| `claude-run "cmd"` | Executar comando rápido                 |
| `claude-mcp`       | Listar MCP servers                      |
| `claude-config`    | Ver configuração                        |
| `claude-debug`     | Modo debug                              |
| `claude-cmd "cmd"` | Executar custom command                 |
| `claude-at <dir>`  | Claude em outro diretório               |

## 🎯 Estatísticas

-   **Total de arquivos**: 135
-   **Tamanho total**: 2.3 MB
-   **MCP Servers**: 7 configurados
-   **Custom Commands**: 5 criados
-   **Documentação**: 6 guias (~48 KB)
-   **Scripts**: 3 utilitários (~8.5 KB)

## 📦 Arquivos Instalados

### Configuração Principal

```
.claude-plugin (3.4 KB)          Project configuration
```

### Scripts (8.5 KB total)

```
claude-dev.sh (3.3 KB)           Modo desenvolvimento
aliases.sh (2.1 KB)              Aliases convenientes
AUTO-SETUP.sh (3.1 KB)           Auto-configuração
```

### Documentação (48 KB total)

```
GETTING-STARTED.md (9.2 KB)      Quick start
CLAUDE-CLI.md (8.1 KB)           Guia completo CLI
PERMISSIONS-GUIDE.md (8.9 KB)    Guia de permissões
QUICK-REFERENCE.md (4.8 KB)      Referência rápida
INSTALLATION-SUMMARY.md (7.5 KB) Resumo instalação
README.md (1.5 KB)               Este arquivo
```

### Custom Commands (18.3 KB total)

```
commands/README.md (4.1 KB)
commands/git-workflows.md (2.0 KB)
commands/docker-compose.md (2.4 KB)
commands/health-check.md (3.8 KB)
commands/service-launcher.md (4.5 KB)
commands/scripts.md (5.6 KB)
```

## ⚠️ Segurança

**Modo de permissões completas ativo!**

✅ **Use para**:

-   Desenvolvimento local
-   Prototipagem rápida
-   Automação de tarefas
-   Workflow contínuo

❌ **NÃO use para**:

-   Dados sensíveis
-   Ambientes de produção
-   Sem backups Git
-   Código não revisado

**Leia**: [PERMISSIONS-GUIDE.md](PERMISSIONS-GUIDE.md)

## 🔗 Links Úteis

-   **Claude Code Repo**: https://github.com/anthropics/claude-code
-   **Console Anthropic**: https://console.anthropic.com/
-   **Documentação**: https://docs.anthropic.com/
-   **MCP Protocol**: https://modelcontextprotocol.io/

## 🎊 Status

### Claude Code CLI

✅ **Instalação completa**  
✅ **MCP Servers configurados** (7/7)  
✅ **Custom Commands criados** (5/5)  
✅ **Permissões configuradas** (Bypass Mode)  
✅ **Documentação completa** (6 guias)  
⏳ **Autenticação pendente** (usuário)

**Próximo passo**: Autenticar (ver [GETTING-STARTED.md](GETTING-STARTED.md))

### Cline (Claude Dev)

✅ **.clinerules criado** (8 KB)  
✅ **.vscode/settings.json criado** (4 KB)  
✅ **MCP Servers configurados** (7/7 compartilhados)  
✅ **Auto-approve habilitado** (via settings)  
✅ **Documentação completa** (guia de 12 KB)  
⏳ **Setup manual pendente** (5 min via Cursor UI)

**Próximo passo**: Configurar via Cursor (ver [CLINE-SETUP.md](CLINE-SETUP.md))

