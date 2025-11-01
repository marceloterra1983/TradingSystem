# Claude Code Configuration

Este diretório contém as configurações locais do Claude Code CLI para o projeto TradingSystem.

## 📁 Estrutura

```
.claude/
├── README.md                    # Este arquivo
├── mcp-servers.json            # Configuração dos MCP servers
├── settings.json               # Settings locais (hooks, etc)
└── agents/                     # Agentes especializados
    ├── mcp-*.md               # Agentes MCP
    └── ...
```

## 🔌 MCP Servers Configurados

1. **fs-tradingsystem** - Filesystem operations
2. **github** - GitHub integration
3. **openapi-docs** - API specifications
4. **docker-compose** - Docker management
5. **postgres-frontend-apps** - PostgreSQL access
6. **sentry** - Error tracking

## 🚀 Como Usar

### Iniciar Claude Code no Projeto

```bash
# Sempre use o caminho completo e consistente
cd /home/marce/Projetos/TradingSystem
claude
```

### Verificar MCPs Carregados

Dentro do Claude:
```
/mcp list
```

### Testar MCP Filesystem

```bash
bash .claude/test-mcp-fs.sh
```

## 🔧 Troubleshooting

### MCPs não carregam?

1. Verifique se está no diretório correto:
   ```bash
   pwd  # Deve retornar: /home/marce/Projetos/TradingSystem
   ```

2. Verifique o arquivo `.claude-plugin` na raiz:
   ```bash
   cat ../.claude-plugin
   ```

3. Verifique as variáveis de ambiente:
   ```bash
   echo $GITHUB_PERSONAL_ACCESS_TOKEN
   echo $MCP_POSTGRES_URL
   echo $SENTRY_AUTH_TOKEN
   ```

4. Execute Claude com debug:
   ```bash
   ANTHROPIC_LOG=debug claude
   ```

### Conflito de Configurações?

O Claude Code resolve configurações nesta ordem:
1. `.claude-plugin` na raiz do projeto (prioridade)
2. `.claude/` no diretório atual
3. `~/.claude.json` (global - fallback)

## 📚 Documentação

- **Guia completo**: `CLAUDE.md` na raiz do projeto
- **MCP Setup**: `.claude/MCP-FILESYSTEM-SETUP.md`
- **AI Agents**: `ai/AGENTS.md`

## 🔗 Variáveis de Ambiente

As seguintes variáveis devem estar definidas no `.env` da raiz:

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
MCP_POSTGRES_URL=postgresql://...
SENTRY_AUTH_TOKEN=...
```

**IMPORTANTE:** O Claude carrega variáveis do `.env` automaticamente quando inicia no projeto.
