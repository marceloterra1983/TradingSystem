# Claude Configuration Directory

Este diretório contém configurações para ferramentas de IA (Claude Code, Cline/Codex) no projeto TradingSystem.

## 📁 Estrutura de Arquivos

```
claude/
├── README.md                    # Este arquivo
├── MCP-FILESYSTEM-SETUP.md     # Guia completo do MCP Filesystem Server
├── mcp-servers.json            # Configuração de servidores MCP
├── settings.local.json         # Configurações locais do Claude CLI
├── test-mcp-fs.sh              # Script de teste do filesystem server
└── agents/                     # Agentes especializados (se existirem)
```

## 🔧 Configuração Atual

### MCP Servers Configurados

1. **fs-tradingsystem** - Filesystem Server
   - Caminho: `/home/marce/Projetos/TradingSystem`
   - Status: ✅ Configurado e testado

2. **github** - GitHub Integration
   - Repositório: `marceloterra1983/TradingSystem`
   - Status: ✅ Habilitado

3. **openapi-docs** - OpenAPI Specifications
   - Specs: workspace, documentation-api, tp-capital
   - Status: ✅ Habilitado

4. **docker-compose** - Docker Management
   - Status: ✅ Habilitado

5. **postgres-frontend-apps** - PostgreSQL Integration
   - Status: ✅ Habilitado

6. **sentry** - Error Tracking
   - Status: ✅ Habilitado

## 📚 Documentação

### Guias Principais

- **[MCP-FILESYSTEM-SETUP.md](./MCP-FILESYSTEM-SETUP.md)** - Setup e troubleshooting do filesystem server
- **[CLAUDE.md](../CLAUDE.md)** - Instruções principais do projeto para Claude Code

### Arquivos de Configuração

- **`mcp-servers.json`** - Define os servidores MCP disponíveis
- **`settings.local.json`** - Configurações específicas do Claude CLI

### Referência Externa

- **`config/mcp/servers.json`** - Lista de servidores habilitados (para Codex/Cline)
- **`config/.env.defaults`** - Variáveis de ambiente padrão (incluindo `MCP_FS_ROOT`)

## 🚀 Quick Start

### Para Claude Code (CLI)

```bash
# Navegar para o projeto
cd /home/marce/Projetos/TradingSystem

# Iniciar Claude Code CLI
claude

# Os servidores MCP serão carregados automaticamente
```

### Para Cline/Codex (VSCode Extension)

1. Abrir VSCode no diretório do projeto
2. Ativar extensão Cline
3. Verificar servidores MCP na aba Settings
4. Servidores listados em `config/mcp/servers.json` serão carregados

## 🧪 Testes

### Testar Filesystem Server

```bash
bash claude/test-mcp-fs.sh
```

### Verificar Instalação

```bash
npm list @modelcontextprotocol/server-filesystem
```

### Logs do Cline (VSCode)

1. `Ctrl+Shift+P`
2. Digite: "Developer: Show Logs"
3. Selecione: "Extension Host"
4. Procure por: "mcp" ou "filesystem"

## 🔄 Atualizações Recentes

### 2025-10-29: Correção MCP Filesystem

- ✅ Corrigido `MCP_FS_ROOT` para caminho absoluto
- ✅ Adicionada variável `ALLOWED_DIRECTORIES`
- ✅ Criado script de teste automático
- ✅ Documentação completa criada
- ✅ Validação de funcionamento realizada

## 📞 Suporte

### Problemas Comuns

1. **Servidor não inicia**: Reinicie o VSCode (`Ctrl+Shift+P` → "Reload Window")
2. **Permissão negada**: Verifique permissões do diretório do projeto
3. **Variáveis não expandem**: Use caminhos absolutos diretos

### Documentação Completa

Consulte [MCP-FILESYSTEM-SETUP.md](./MCP-FILESYSTEM-SETUP.md) para troubleshooting detalhado.

## 🔗 Links Úteis

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Cline Extension](https://github.com/cline/cline)
- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
