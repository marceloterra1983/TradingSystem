---
title: Setup MCP
description: Instruções de configuração dos MCPs no Cursor
tags:
  - tools
  - mcp
owner: MCPGuild
lastReviewed: '2025-10-27'
---

# 🚀 Instruções de Configuração dos MCPs no Cursor

## ✅ MCPs Instalados e Funcionando Imediatamente

Os seguintes MCPs já estão prontos para uso (não precisam de configuração adicional):

1. **GitKraken** - Operações Git avançadas
2. **Filesystem** - Navegação rápida no projeto
3. **Docker** - Gerenciamento de containers
4. **NPM** - Pesquisa de pacotes e documentação

## ⚙️ MCPs que Precisam de Configuração

### 1. GitHub MCP 🐙

**Para que serve:** Gerenciar repositórios, issues, pull requests diretamente do Cursor

**Como configurar:**

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" → "Generate new token (classic)"
3. Dê um nome: `Cursor MCP Token`
4. Selecione os seguintes scopes:
   - ✅ `repo` (acesso completo a repositórios)
   - ✅ `read:org` (ler dados da organização)
   - ✅ `workflow` (se usar GitHub Actions)
5. Clique em "Generate token"
6. Copie o token gerado

7. Edite o arquivo: `~/.cursor/mcp.json`
8. Encontre a seção do GitHub e adicione o token:

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "COLE_SEU_TOKEN_AQUI"
  }
}
```

### 2. PostgreSQL MCP 🐘

**Para que serve:** Consultar bancos de dados, inspecionar schemas, debugging de dados

**Configuração para TimescaleDB (trading):**

1. Edite o arquivo: `~/.cursor/mcp.json`
2. Encontre a seção do postgres e configure:

**Para desenvolvimento local:**
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://timescale:pass_timescale@localhost:5433/trading"
  }
}
```

**Se preferir usar o PostgreSQL do LangGraph:**
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://postgres:postgres@localhost:5435/tradingsystem"
  }
}
```

## 🔄 Como Aplicar as Mudanças

Após editar o arquivo `~/.cursor/mcp.json`:

1. **Salve o arquivo**
2. **Feche completamente o Cursor** (Ctrl+Q)
3. **Reabra o Cursor**
4. Os MCPs estarão ativos!

## 🧪 Como Testar se Está Funcionando

Depois de reiniciar o Cursor, você pode testar os MCPs:

### Testando Filesystem:
Pergunte ao Cursor: "Liste todos os arquivos TypeScript no diretório frontend/dashboard"

### Testando Docker:
Pergunte ao Cursor: "Quais containers Docker estão rodando?"

### Testando NPM:
Pergunte ao Cursor: "Qual a versão mais recente do React?"

### Testando PostgreSQL (após configurar):
Pergunte ao Cursor: "Mostre as tabelas no banco de dados trading"

### Testando GitHub (após configurar):
Pergunte ao Cursor: "Liste os últimos 5 commits do repositório"

## 📝 Verificar MCPs Ativos

Você pode verificar quais MCPs estão ativos no Cursor:

1. Abra as configurações do Cursor (Ctrl+,)
2. Procure por "MCP" na barra de pesquisa
3. Você verá todos os servidores MCP configurados

## 🔒 Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `~/.cursor/mcp.json` no Git
- Mantenha seus tokens seguros
- Use tokens com permissões mínimas necessárias
- Revogue tokens que não estão mais em uso

## 🆘 Troubleshooting

### MCP não está funcionando?

1. Verifique se o arquivo `~/.cursor/mcp.json` está com JSON válido
2. Verifique se reiniciou o Cursor completamente
3. Olhe os logs do Cursor: Menu > Help > Toggle Developer Tools > Console

### Erro de conexão com PostgreSQL?

1. Verifique se o container do banco está rodando:
   ```bash
   docker ps | grep timescaledb
   ```

2. Se não estiver, inicie:
   ```bash
   cd /home/marce/Projetos/TradingSystem
   docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb
   ```

### Erro com NPX?

1. Verifique se o Node.js está instalado:
   ```bash
   node --version
   npm --version
   ```

2. Se necessário, limpe o cache do NPX:
   ```bash
   npx clear-npx-cache
   ```

## 📚 Recursos Adicionais

- [Documentação oficial MCP](https://modelcontextprotocol.io/)
- [MCPs disponíveis](https://github.com/modelcontextprotocol/servers)
- [Cursor MCP Docs](https://docs.cursor.com/context/mcp)

---

**Última atualização:** $(date +%Y-%m-%d)
**Configurado em:** $(date +%Y-%m-%d)

