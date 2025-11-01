# Troubleshooting: MCPs não carregam no TradingSystem

## ❓ Problema

Quando você executa `claude` na pasta `/home/marce/projetos`, os MCPs são carregados normalmente. Mas quando executa na pasta `/home/marce/projetos/tradingsystem`, o Claude abre sem os MCPs.

## 🔍 Causa Raiz

O Claude Code CLI resolve configurações seguindo esta hierarquia:

1. **Configuração local do projeto** (`.claude-plugin` + `.claude/`)
2. **Configuração global** (`~/.claude.json`)

**O que estava acontecendo:**

- Na pasta `/projetos`: Claude usava a configuração **global** (`~/.claude.json`) que tem MCPs
- Na pasta `/projetos/tradingsystem`: Faltava o arquivo `.claude-plugin` que indica ao Claude para usar a configuração local

## ✅ Solução Implementada

### 1. Criado `.claude-plugin`

Arquivo na raiz do projeto que força o Claude a usar a configuração local:

```json
{
  "version": "1.0",
  "name": "TradingSystem",
  "mcp": {
    "configFiles": [".claude/mcp-servers.json"]
  },
  "settings": {
    "configFiles": [".claude/settings.json"]
  }
}
```

### 2. Estrutura de Configuração

```
TradingSystem/
├── .claude-plugin              # ← Configuração local (NOVO)
└── .claude/
    ├── mcp-servers.json       # 6 MCPs configurados
    ├── settings.json          # Hooks e settings
    ├── README.md              # Documentação
    ├── validate-config.sh     # Script de validação
    └── agents/                # Agentes especializados
```

### 3. Script de Validação

Execute para verificar a configuração:

```bash
bash .claude/validate-config.sh
```

## 🚀 Como Usar Agora

### Sempre use o caminho completo:

```bash
cd /home/marce/Projetos/TradingSystem
claude
```

### Dentro do Claude, verifique os MCPs:

```
/mcp list
```

Você deve ver:

- ✅ fs-tradingsystem
- ✅ github
- ✅ openapi-docs
- ✅ docker-compose
- ✅ postgres-frontend-apps
- ✅ sentry

## 🔧 Se os MCPs ainda não carregarem

### 1. Verifique o diretório

```bash
pwd  # Deve retornar: /home/marce/Projetos/TradingSystem
```

**IMPORTANTE:** Use sempre a capitalização correta:
- ✅ `/home/marce/Projetos/TradingSystem` (P e T maiúsculos)
- ❌ `/home/marce/projetos/tradingsystem` (minúsculos)

### 2. Execute a validação

```bash
bash .claude/validate-config.sh
```

### 3. Verifique as variáveis de ambiente

Os MCPs `github`, `postgres-frontend-apps` e `sentry` precisam de variáveis de ambiente definidas no `.env`:

```bash
# .env (na raiz do projeto)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
MCP_POSTGRES_URL=postgresql://...
SENTRY_AUTH_TOKEN=...
```

### 4. Execute Claude com debug

```bash
ANTHROPIC_LOG=debug claude
```

Isso mostrará logs detalhados de carregamento dos MCPs.

### 5. Force reload da configuração

```bash
# Dentro do Claude
/doctor

# Ou reinicie o Claude
exit
claude
```

## 📊 Hierarquia de Resolução de Configuração

O Claude Code procura configuração nesta ordem:

```
1. .claude-plugin na raiz do projeto (PRIORIDADE) ← Criado agora
   ↓
2. .claude/ no diretório atual
   ↓
3. ~/.claude.json (global - FALLBACK)
```

## 🎯 Resultado Esperado

Após a solução, você terá:

- ✅ MCPs carregam automaticamente em `/home/marce/Projetos/TradingSystem`
- ✅ Configuração isolada por projeto
- ✅ Script de validação para troubleshooting
- ✅ Documentação completa em `.claude/README.md`

## 📚 Documentação Adicional

- **Configuração completa**: `.claude/README.md`
- **Instruções para Claude**: `CLAUDE.md` (raiz)
- **Setup de MCPs**: Documentação oficial do Claude Code

## 🔗 Links Úteis

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)

---

**Última atualização:** 2025-10-31  
**Status:** ✅ Resolvido

