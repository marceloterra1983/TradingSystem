# MCP Filesystem Server - Setup e Verificação

## ✅ Status da Instalação

O servidor MCP Filesystem está **instalado e configurado corretamente** no projeto.

## 📁 Configuração Atual

### Arquivos de Configuração

1. **`.claude/mcp-servers.json`** - Configuração do servidor MCP
2. **`config/.env.defaults`** - Variáveis de ambiente padrão
3. **`config/mcp/servers.json`** - Referência para servidores habilitados

### Configuração do Filesystem Server

```json
{
  "mcpServers": {
    "fs-tradingsystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/marce/Projetos/TradingSystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "/home/marce/Projetos/TradingSystem"
      }
    }
  }
}
```

### Variáveis de Ambiente

Em `config/.env.defaults`:

```bash
MCP_FS_ROOT=/home/marce/Projetos/TradingSystem
```

## 🔧 Como o Codex (Cline) Usa o MCP

O Codex (extensão Cline no VSCode) carrega os servidores MCP automaticamente quando:

1. **VSCode é aberto** no diretório do projeto
2. **Cline é ativado** pela primeira vez
3. O arquivo **`config/mcp/servers.json`** é lido
4. Os servidores habilitados em **`servers.json`** são iniciados
5. As configurações são carregadas de **`.claude/mcp-servers.json`**

### Processo de Carregamento

```
1. VSCode inicia no projeto
   ↓
2. Cline extensão é ativada
   ↓
3. Lê config/mcp/servers.json
   ↓
4. Para cada servidor habilitado:
   - Carrega definição de .claude/mcp-servers.json
   - Expande variáveis de ambiente (se necessário)
   - Inicia processo com npx
   ↓
5. Servidor aguarda comandos JSON-RPC via stdin
```

## 🧪 Verificação da Instalação

### 1. Testar Servidor Manualmente

```bash
# Executar script de teste
bash .claude/test-mcp-fs.sh
```

**Saída esperada:**
```
✅ Server started successfully (timed out waiting for stdin - expected behavior)
```

### 2. Verificar Instalação do Pacote

```bash
npm list @modelcontextprotocol/server-filesystem
```

**Saída esperada:**
```
└── @modelcontextprotocol/server-filesystem@2025.8.21
```

### 3. Testar Execução Direta

```bash
npx -y @modelcontextprotocol/server-filesystem /home/marce/Projetos/TradingSystem
```

**Saída esperada:**
```
Secure MCP Filesystem Server running on stdio
```

O servidor ficará aguardando entrada (Ctrl+C para sair).

## 🔍 Verificando no Codex (Cline)

### No VSCode com Cline

1. Abra a **sidebar do Cline** (ícone no lado esquerdo)
2. Clique em **Settings** (engrenagem)
3. Vá para **MCP Servers**
4. Verifique se `fs-tradingsystem` está listado e **habilitado**

### Status Esperado

```
✅ fs-tradingsystem (running)
   Command: npx -y @modelcontextprotocol/server-filesystem
   Path: /home/marce/Projetos/TradingSystem
```

## 🐛 Troubleshooting

### Problema: Servidor não inicia no Cline

**Solução 1: Recarregar VSCode**
```bash
# No VSCode: Ctrl+Shift+P
# Digitar: "Reload Window"
```

**Solução 2: Verificar logs do Cline**
```bash
# No VSCode: Ctrl+Shift+P
# Digitar: "Developer: Show Logs"
# Selecionar: "Extension Host"
# Procurar por: "mcp" ou "filesystem"
```

**Solução 3: Reinstalar servidor**
```bash
npm install @modelcontextprotocol/server-filesystem@latest
```

### Problema: Variável MCP_FS_ROOT não expande

**Causa:** O Cline pode não expandir variáveis de ambiente shell automaticamente.

**Solução:** Use caminho absoluto direto (já aplicado na configuração atual):
```json
"args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/marce/Projetos/TradingSystem"]
```

### Problema: "EACCES: permission denied"

**Solução:** Verificar permissões do diretório:
```bash
ls -la /home/marce/Projetos/TradingSystem
chmod -R u+rw /home/marce/Projetos/TradingSystem
```

## 📚 Referências

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [Cline Documentation](https://github.com/cline/cline)

## 🎯 Próximos Passos

1. ✅ Instalação concluída
2. ✅ Configuração atualizada
3. ✅ Testes realizados
4. ⏳ Reiniciar VSCode para carregar configuração
5. ⏳ Verificar no painel do Cline se servidor está ativo

## 📝 Changelog

- **2025-10-29**: Correção da configuração MCP filesystem
  - Atualizado `MCP_FS_ROOT` para caminho absoluto
  - Adicionada variável `ALLOWED_DIRECTORIES`
  - Criado script de teste `.claude/test-mcp-fs.sh`
  - Documentação completa criada
