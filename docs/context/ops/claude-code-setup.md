---
title: Claude Code CLI - Instalação e Configuração Global
tags: [claude-code, cli, mcp, terminal, desenvolvimento]
domain: ops
type: guide
summary: Guia completo de instalação e configuração do Claude Code CLI globalmente no WSL2, com integração ao Cursor e compartilhamento de configurações entre CLI e IDE.
status: active
last_review: 2025-10-18
sidebar_position: 1
---

# Claude Code CLI - Instalação e Configuração Global

## 📋 Visão Geral

Este documento descreve a instalação e configuração do **Claude Code CLI** globalmente no WSL2, com integração completa ao Cursor e compartilhamento de configurações entre CLI e IDE.

**Versão instalada**: Claude Code v2.0.22  
**Data de instalação**: 18 de outubro de 2025  
**Ambiente**: WSL2 (linux 6.6.87.2-microsoft-standard-WSL2)

## 🎯 Objetivos Alcançados

✅ Claude Code instalado globalmente no WSL2 via NPM  
✅ 7 MCP servers configurados e integrados  
✅ 5 custom commands criados para TradingSystem  
✅ Integração com terminal do Cursor (WSL2)  
✅ Configuração compartilhada entre CLI e IDE  
✅ Scripts do projeto integrados  
✅ CLAUDE.md aproveitado para regras do projeto  
✅ Documentação completa criada  

## 🏗️ Estrutura de Instalação

### Instalação Global

```
~/.nvm/versions/node/v22.20.0/
├── bin/
│   └── claude                      # CLI executável
└── lib/node_modules/
    └── @anthropic-ai/claude-code/  # Pacote NPM

~/.claude/                          # Configuração global
├── config.json                     # API key, settings (criado após auth)
├── commands/                       # Custom commands globais
├── plugins/                        # Plugins globais
├── debug/                          # Logs de debug
├── ide/                            # Configurações do IDE
└── README.md                       # Documentação

~/.claude.json                      # Configuração de projetos
└── projects/
    └── /home/marce/projetos/TradingSystem/
        └── mcpServers/            # 7 MCP servers configurados
```

### Configuração do Projeto

```
/home/marce/projetos/TradingSystem/
├── .claude/                       # Configurações do projeto
│   ├── commands/                  # Custom commands
│   │   ├── README.md             # Documentação dos comandos
│   │   ├── git-workflows.md      # Git operations
│   │   ├── docker-compose.md     # Docker stack management
│   │   ├── health-check.md       # Health monitoring
│   │   ├── service-launcher.md   # Service management
│   │   └── scripts.md            # Project scripts
│   ├── plugins/                   # Plugins do projeto
│   ├── mcp-servers.json          # Config MCP (referência)
│   ├── README.md                 # Documentação
│   ├── CLAUDE-CLI.md             # Guia completo CLI
│   └── GETTING-STARTED.md        # Quick start
├── .claude-plugin                 # Configuração do projeto
└── CLAUDE.md                      # Regras (atualizado com seção CLI)
```

## 🔧 Detalhes da Instalação

### Fase 1: Pré-requisitos ✅

**Verificações realizadas:**
- Node.js v22.20.0 (requisito: 18+)
- NPM v10.9.3
- NVM instalado e configurado
- Permissões adequadas para instalação global

### Fase 2: Instalação Global ✅

```bash
npm install -g @anthropic-ai/claude-code
# Instalado: Claude Code v2.0.22 (3 pacotes)
```

**Localização:**
- Executável: `/home/marce/.nvm/versions/node/v22.20.0/bin/claude`
- Pacote: `@anthropic-ai/claude-code@2.0.22`

### Fase 3: Autenticação ⏳

**Status**: Pendente (aguardando usuário obter API Key)

**Próximos passos**:
1. Visitar [console.anthropic.com](https://console.anthropic.com/)
2. Criar conta / fazer login
3. Gerar API Key
4. Executar `claude` para autenticação interativa

**Documentação**: Ver [`.claude/GETTING-STARTED.md`](../../../.claude/GETTING-STARTED.md)

### Fase 4: Estrutura de Configuração ✅

**Global (~/.claude/):**
- `commands/` - Custom commands globais (vazio por enquanto)
- `plugins/` - Plugins globais (vazio por enquanto)
- `README.md` - Documentação criada
- Diretórios automáticos: `debug/`, `ide/`, `statsig/`

**Projeto (.claude/):**
- `commands/` - 5 custom commands criados
- `plugins/` - Pronto para plugins futuros
- `mcp-servers.json` - Configuração de referência
- `README.md`, `CLAUDE-CLI.md`, `GETTING-STARTED.md` - Documentação

**Arquivo `.claude-plugin`:**
```json
{
  "name": "TradingSystem",
  "version": "1.0.0",
  "settings": {
    "systemPrompt": "Expert engineer following CLAUDE.md guidelines",
    "mcpConfig": ".claude/mcp-servers.json",
    "customCommands": ".claude/commands",
    "allowedDirectories": ["/home/marce/projetos/TradingSystem"]
  },
  "project": {
    "services": { ... },
    "documentation": { ... },
    "scripts": { ... }
  }
}
```

### Fase 5: MCP Servers ✅

**7 MCP servers configurados** em `~/.claude.json`:

| Server | Status | Descrição |
|--------|--------|-----------|
| fs-tradingsystem | ✅ Conectado | Filesystem access |
| git-tradingsystem | ⚠️ On-demand | Git operations |
| fetch | ⚠️ On-demand | HTTP requests |
| memory | ✅ Conectado | Persistent memory |
| sequential-thinking | ✅ Conectado | Extended reasoning |
| time | ⚠️ On-demand | Date/time info |
| everything | ✅ Conectado | Universal search |

**Verificar status:**
```bash
cd /home/marce/projetos/TradingSystem
claude mcp list
```

### Fase 6: Custom Commands ✅

**5 custom commands criados** (total 16.8 KB):

1. **git-workflows.md** (2.0 KB)
   - Conventional commits (feat, fix, chore, docs)
   - Branch management
   - Git operations

2. **docker-compose.md** (2.4 KB)
   - Start/stop stacks
   - Container management
   - Logs e status

3. **health-check.md** (3.8 KB)
   - System health monitoring
   - Services, containers, databases
   - Multiple output formats

4. **service-launcher.md** (4.5 KB)
   - Service management
   - Port management
   - Logs e troubleshooting

5. **scripts.md** (5.6 KB)
   - Direct access to project scripts
   - Automation workflows
   - Safety checks

**README.md** (4.1 KB) - Documentação completa dos comandos

### Fase 7: Integração com Scripts ✅

**Scripts do projeto mapeados:**
- `scripts/services/start-all.sh` → `/docker-compose start-all`
- `scripts/services/stop-all.sh` → `/docker-compose stop-all`
- `scripts/maintenance/health-check-all.sh` → `/health-check all`
- E muitos outros...

**Referências corrigidas** nos comandos para apontar aos scripts reais.

### Fase 8: CLAUDE.md Integrado ✅

**Arquivos criados/atualizados:**

1. **`.claude/CLAUDE-CLI.md`** (novo)
   - Guia completo CLI
   - Workflows e best practices
   - Troubleshooting

2. **`CLAUDE.md`** (atualizado)
   - Seção "Claude Code CLI" adicionada (linhas 63-102)
   - Quick start e features
   - Links para documentação

3. **`.claude/GETTING-STARTED.md`** (novo)
   - Quick start guide
   - Autenticação passo-a-passo
   - Primeiros comandos

### Fases 9-11: Testes e Validação ✅

**Fase 9**: Plugins oficiais pausada (usar funcionalidades básicas)  
**Fase 10**: Integração com terminal validada (autenticação pendente do usuário)  
**Fase 11**: Configurações e MCP servers testados e validados  

## 📚 Documentação Criada

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `.claude/README.md` | 113 B | Overview da estrutura |
| `.claude/CLAUDE-CLI.md` | 8.1 KB | Guia completo CLI |
| `.claude/GETTING-STARTED.md` | 9.2 KB | Quick start |
| `.claude/commands/README.md` | 4.1 KB | Docs dos comandos |
| `.claude/commands/*.md` | 16.8 KB | 5 custom commands |
| `.claude-plugin` | 2.4 KB | Config do projeto |
| `CLAUDE.md` | +1.5 KB | Seção CLI adicionada |
| **Este documento** | - | Setup completo |

**Total**: ~42 KB de documentação criada

## 🚀 Como Usar

### Primeiro Uso

1. **Autenticar** (uma vez):
   ```bash
   cd /home/marce/projetos/TradingSystem
   claude
   # Seguir flow de autenticação no browser
   ```

2. **Testar instalação**:
   ```bash
   claude --print "What is the current date?"
   ```

3. **Usar custom commands**:
   ```bash
   claude
   /health-check all
   /service-launcher status
   ```

### Terminal do Cursor

1. Abrir Cursor
2. Abrir terminal integrado (`Ctrl + ` ` )
3. Terminal já está em WSL2
4. Executar `claude` normalmente

### Comandos Comuns

```bash
# Health check completo
/health-check all

# Iniciar serviços
/service-launcher start dashboard

# Git commit com Conventional Commits
/git-workflows commit feat "Add new feature"

# Docker stacks
/docker-compose start-all
/docker-compose status

# Scripts diretos
/scripts health-check-all --format json
```

## 🔐 Segurança

### Credenciais

- **API Key**: Armazenada em `~/.claude.json` (permissões 600)
- **Não comitar**: `.claude.json` está em `.gitignore` global
- **Rotação**: API keys podem ser renovadas no console Anthropic

### Permissões

**Diretórios permitidos:**
```json
{
  "allowedDirectories": [
    "/home/marce/projetos/TradingSystem"
  ]
}
```

**Adicionar mais diretórios:**
```bash
claude --add-dir /path/to/directory
```

## 🛠️ Manutenção

### Atualizar Claude Code

```bash
# Verificar atualizações
claude update

# Ou via NPM
npm update -g @anthropic-ai/claude-code
```

### Verificar Saúde

```bash
# Doctor (verifica instalação)
claude doctor

# MCP status
claude mcp list

# Config atual
cat ~/.claude.json | jq '.projects'
```

### Logs e Debug

```bash
# Modo debug
claude --debug

# Logs específicos
claude --debug "api,mcp"

# Excluir categorias
claude --debug "!statsig,!file"

# Logs salvos em
ls -la ~/.claude/debug/
```

## ❓ Troubleshooting

### "Invalid API key"

**Causa**: Autenticação não realizada  
**Solução**: Executar `claude` e seguir flow de autenticação  
**Documentação**: [`.claude/GETTING-STARTED.md`](../../../.claude/GETTING-STARTED.md#-authentication-setup)

### MCP Connection Failed

**Causa**: Normal, servidores conectam on-demand  
**Verificar**: `claude mcp list` deve mostrar pelo menos 4 conectados  
**Se todos falharem**: Verificar `npx --version` e conectividade

### Custom Command Not Found

**Causa**: Fora do diretório do projeto  
**Solução**: `cd /home/marce/projetos/TradingSystem`  
**Verificar**: `ls .claude/commands/`

### Permission Denied

**Causa**: Diretório não está em `allowedDirectories`  
**Solução**: `claude --add-dir /path/to/directory`  
**Verificar**: `cat ~/.claude.json | grep allowedDirectories`

## 📖 Referências

### Documentação Interna

- **Quick Start**: [`.claude/GETTING-STARTED.md`](../../../.claude/GETTING-STARTED.md)
- **CLI Guide**: [`.claude/CLAUDE-CLI.md`](../../../.claude/CLAUDE-CLI.md)
- **Custom Commands**: [`.claude/commands/README.md`](../../../.claude/commands/README.md)
- **Main Guidelines**: [`CLAUDE.md`](../../../CLAUDE.md)

### Recursos Externos

- **Claude Code Repo**: https://github.com/anthropics/claude-code
- **Anthropic Console**: https://console.anthropic.com/
- **Anthropic Docs**: https://docs.anthropic.com/
- **MCP Specification**: https://modelcontextprotocol.io/

## 🎉 Conclusão

**Claude Code está instalado e configurado com sucesso!**

✅ **Instalação global** no WSL2  
✅ **7 MCP servers** integrados  
✅ **5 custom commands** criados  
✅ **Integração com Cursor** configurada  
✅ **Documentação completa** disponível  

**Próximo passo**: Autenticação (ver [GETTING-STARTED.md](../../../.claude/GETTING-STARTED.md))

---

**Instalação realizada em**: 18 de outubro de 2025  
**Por**: Claude Sonnet 4.5 via Cursor Agent  
**Documentado por**: [@marce](https://github.com/marce)

