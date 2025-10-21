# Claude Code CLI - Quick Reference Card

Comandos essenciais do Claude Code para TradingSystem.

## 🚀 Início Rápido

```bash
# Navegar para projeto
cd /home/marce/projetos/TradingSystem

# Modo Desenvolvimento (Permissões Completas) 🚀
bash .claude/claude-dev.sh
# ou com aliases:
claude-dev

# Modo Seguro (Com Confirmações) ✅
claude

# Modo não-interativo
claude --print "sua pergunta aqui"
```

## 🎯 Custom Commands

| Comando | Uso | Descrição |
|---------|-----|-----------|
| `/git-workflows` | `commit feat "msg"` | Git com Conventional Commits |
| `/docker-compose` | `start-all` | Gerenciar stacks Docker |
| `/health-check` | `all` | Health monitoring completo |
| `/service-launcher` | `start dashboard` | Gerenciar serviços Node.js |
| `/scripts` | `health-check-all` | Executar scripts do projeto |

## 📋 Comandos Comuns

### Health Check
```bash
/health-check all                    # Completo
/health-check services              # Apenas serviços
/health-check containers            # Apenas containers
/health-check databases             # Apenas databases
/health-check api                   # Via API (cached)
```

### Services
```bash
/service-launcher start dashboard   # Iniciar serviço
/service-launcher stop all          # Parar todos
/service-launcher status            # Ver status
/service-launcher logs dashboard    # Ver logs
/service-launcher ports             # Portas usadas
/service-launcher kill-port 3103    # Matar porta
```

### Docker
```bash
/docker-compose start-all           # Iniciar tudo
/docker-compose stop-all            # Parar tudo
/docker-compose start infra         # Stack específico
/docker-compose status              # Ver status
/docker-compose logs prometheus     # Ver logs
```

### Git
```bash
/git-workflows commit feat "msg"    # Commit feature
/git-workflows commit fix "msg"     # Commit bugfix
/git-workflows commit docs "msg"    # Commit docs
/git-workflows branch feature name  # Nova branch
/git-workflows status               # Git status
/git-workflows push                 # Push com checks
```

### Scripts
```bash
/scripts start-all-stacks           # Iniciar stacks
/scripts stop-all-stacks            # Parar stacks
/scripts health-check-all           # Health check
/scripts validate-env               # Validar .env
```

## 🔌 MCP Servers

| Server | Uso | Status |
|--------|-----|--------|
| fs-tradingsystem | Acesso a arquivos | ✅ |
| git-tradingsystem | Operações Git | ⚠️ |
| fetch | HTTP requests | ⚠️ |
| memory | Memória persistente | ✅ |
| sequential-thinking | Raciocínio estendido | ✅ |
| time | Data/hora | ⚠️ |
| everything | Busca universal | ✅ |

**Verificar**: `claude mcp list`

## 🛠️ CLI Options

```bash
claude --print "query"              # Não-interativo
claude --dangerously-skip-permissions  # Pular confirmações
claude --permission-mode bypassPermissions  # Modo bypass
claude --debug                      # Modo debug
claude --verbose                    # Modo verbose
claude --continue                   # Continuar conversa
claude --resume [id]                # Retomar sessão
claude --model sonnet               # Escolher modelo
claude --add-dir /path              # Adicionar diretório
```

## 🔓 Modos de Permissão

| Modo | Comando | Uso |
|------|---------|-----|
| **Desenvolvimento** | `claude-dev` | Permissões completas (rápido) |
| **Seguro** | `claude-safe` | Com confirmações (seguro) |
| **Print** | `claude-run "cmd"` | Não-interativo (automação) |

**Docs**: [PERMISSIONS-GUIDE.md](PERMISSIONS-GUIDE.md)

## 📚 Docs Principais

| Arquivo | Descrição |
|---------|-----------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Guia de início |
| [CLAUDE-CLI.md](CLAUDE-CLI.md) | Guia completo CLI |
| [commands/README.md](commands/README.md) | Docs dos comandos |
| [CLAUDE.md](../../CLAUDE.md) | Regras do projeto |

## 🔐 Autenticação

```bash
# Primeira vez
claude                              # Flow interativo

# Com subscrição
claude setup-token                  # Token persistente

# Verificar
claude --print "test"               # Deve funcionar
```

## ❓ Troubleshooting

| Erro | Solução |
|------|---------|
| Invalid API key | `claude` (autenticar) |
| MCP connection failed | Normal, conecta on-demand |
| Command not found | `cd /home/marce/projetos/TradingSystem` |
| Permission denied | `claude --add-dir /path` |

## 🚀 Workflows

### Desenvolvimento
```bash
/docker-compose start-all
/health-check all
/service-launcher start dashboard
# Fazer alterações
/git-workflows commit feat "Add X"
```

### Troubleshooting
```bash
/health-check all
/service-launcher status
/service-launcher logs <service>
/service-launcher restart <service>
```

### Deploy
```bash
/scripts validate-env
/health-check all
/git-workflows push
```

## 🎯 Serviços & Portas

| Serviço | Porta | Comando |
|---------|-------|---------|
| Dashboard | 3103 | `start dashboard` |
| Docusaurus | 3004 | `start docusaurus` |
| Workspace API | 3200 | `start workspace-api` |
| TP Capital | 3200 | `start tp-capital` |
| B3 Market Data | 3302 | `start b3-market-data` |
| Documentation API | 3400 | `start documentation-api` |
| Service Launcher | 3500 | `start service-launcher` |
| Firecrawl Proxy | 3600 | `start firecrawl-proxy` |

## 📦 Arquivos Config

| Arquivo | Propósito |
|---------|-----------|
| `~/.claude.json` | Config global + MCPs |
| `.claude-plugin` | Config do projeto |
| `.claude/commands/` | Custom commands |
| `CLAUDE.md` | Regras do projeto |

## 🔍 Verificações Rápidas

```bash
# Versão
claude --version

# MCPs
claude mcp list

# Config
cat ~/.claude.json | jq

# Debug
claude doctor

# Logs
ls -la ~/.claude/debug/
```

---

**Docs completos**: [CLAUDE-CLI.md](CLAUDE-CLI.md) | **Setup**: [docs/context/ops/claude-code-setup.md](../../docs/context/ops/claude-code-setup.md)

