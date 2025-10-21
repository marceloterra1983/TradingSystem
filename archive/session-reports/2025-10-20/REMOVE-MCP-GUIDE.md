# 🗑️ Guia para Remover MCPs

**Data**: 2025-10-16  
**Problema**: MCPs instalados causando conflitos

---

## 🔍 Verificação Atual

### ✅ Status do Projeto TradingSystem

```bash
# Verificado:
✅ Sem pacotes MCP em node_modules/ da raiz
✅ Sem arquivos mcp.json na raiz
✅ Sem configurações MCP em package.json
✅ Apenas configurações Claude Code padrão
```

**Conclusão**: **Não há MCPs instalados localmente no projeto TradingSystem**

---

## 📍 Onde os MCPs Podem Estar

Os MCPs (Model Context Protocol servers) podem estar instalados em 3 locais diferentes:

### 1. 🌍 Global (Sistema)
**Local**: `~/.config/Claude/` ou `~/.cursor/mcp/`

### 2. 📁 Projeto (Local)
**Local**: `<projeto>/.mcp/` ou `<projeto>/node_modules/`

### 3. 🔧 Cursor/Claude Desktop Config
**Local**: `~/.config/Cursor/User/globalStorage/` ou configurações do app

---

## 🗑️ Como Remover MCPs

### Opção 1: Remover node_modules da Raiz (Se Existir)

```bash
cd /home/marce/projetos/TradingSystem

# Backup primeiro (opcional)
mv node_modules node_modules.backup
mv package.json package.json.backup
mv package-lock.json package-lock.json.backup

# Ou simplesmente remover
rm -rf node_modules
rm package-lock.json
# Manter package.json se tiver dependências necessárias
```

**Nota**: No TradingSystem, o `package.json` da raiz tem apenas:
```json
{
  "devDependencies": {
    "eslint": "^9.37.0",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "express-rate-limit": "^8.1.0"
  }
}
```

**Decisão**: ⚠️ **Provavelmente seguro remover**, mas essas deps podem estar sendo usadas.

---

### Opção 2: Remover Configurações MCP do Cursor/Claude

#### Para Cursor:

1. **Abra Cursor Settings** (Ctrl+,)
2. **Procure por "MCP"**
3. **Desabilite ou remova configurações MCP**

**Ou via arquivo**:
```bash
# Editar configurações do Cursor
code ~/.config/Cursor/User/settings.json

# Remover entradas como:
# "mcp.servers": { ... }
# "mcp.enabled": true
```

#### Para Claude Desktop:

```bash
# macOS
rm -rf ~/Library/Application\ Support/Claude/mcp_servers/

# Linux
rm -rf ~/.config/Claude/mcp_servers/

# Windows
rmdir /s %APPDATA%\Claude\mcp_servers\
```

---

### Opção 3: Remover MCPs Instalados Globalmente

```bash
# Verificar se há MCPs globais
npm list -g | grep mcp

# Remover específicos
npm uninstall -g @modelcontextprotocol/server-*
npm uninstall -g @anthropic/mcp-*

# Ou verificar diretório global
ls -la ~/.npm/
ls -la /usr/local/lib/node_modules/ | grep mcp
```

---

### Opção 4: Limpar Completamente (Radical)

Se quiser começar do zero:

```bash
cd /home/marce/projetos/TradingSystem

# Remover node_modules da raiz (se não for necessário)
rm -rf node_modules package-lock.json

# Verificar se quebra algo
npm run dev  # Em cada subprojeto

# Se funcionar normalmente, está OK
# Se quebrar, restore:
mv node_modules.backup node_modules
mv package-lock.json.backup package-lock.json
```

---

## 🎯 Recomendação para TradingSystem

### ✅ Opção Segura (Recomendada)

**Mantenha o package.json da raiz**, mas remova node_modules se estiver causando problemas:

```bash
cd /home/marce/projetos/TradingSystem

# 1. Backup (segurança)
cp package.json package.json.backup

# 2. Remover node_modules se estiver causando problemas
rm -rf node_modules

# 3. Reinstalar apenas o necessário
npm install

# 4. Verificar se Dashboard funciona
cd frontend/apps/dashboard
npm run dev
```

---

### ⚠️ Se o Problema for no Gemini/Cursor

Se o problema está no Gemini ou Cursor (não no projeto):

1. **Feche o Cursor**
2. **Limpe o cache**:
   ```bash
   rm -rf ~/.config/Cursor/Cache/
   rm -rf ~/.config/Cursor/CachedData/
   ```
3. **Remova configurações MCP**:
   ```bash
   # Edite manualmente
   nano ~/.config/Cursor/User/settings.json
   # Remova seções "mcp.*"
   ```
4. **Reabra o Cursor**

---

## 🔍 Diagnóstico Específico

Para saber exatamente onde está o problema MCP:

```bash
# 1. Verificar processos MCP rodando
ps aux | grep mcp

# 2. Verificar portas MCP
lsof -i -P | grep mcp

# 3. Verificar logs do Cursor
tail -f ~/.config/Cursor/logs/*.log | grep -i mcp

# 4. Verificar configurações globais
cat ~/.config/Cursor/User/settings.json | grep -i mcp
```

---

## ❓ Qual é o Problema Específico?

Para ajudar melhor, me diga:

1. **Qual erro aparece**? (mensagem completa)
2. **Onde aparece**? (Cursor, Terminal, Console do navegador)
3. **Quando aparece**? (Ao abrir projeto, ao salvar arquivo, ao rodar comando)

Com essas informações, posso dar uma solução mais direcionada!

---

## 🚀 Status Atual do TradingSystem

```
✅ Dashboard: Rodando em http://localhost:3103/
✅ Performance: Otimizado (1.1MB bundle)
✅ Build: Funcionando (3.29s)
✅ Sem MCPs instalados localmente no projeto
```

**Próximo passo**: Se o problema persistir, forneça detalhes do erro para investigação mais específica.

---

**Criado**: 2025-10-16  
**Propósito**: Guia de remoção de MCPs do TradingSystem













