# 🔓 Claude Code - Guia de Permissões

Guia completo sobre modos de permissão do Claude Code no TradingSystem.

## 📋 Modos de Permissão

### 1. Modo Padrão (Seguro) ✅

**Descrição**: Claude solicita aprovação para cada ação (edição, comandos, etc.)

**Quando usar**: 
- Trabalho com dados sensíveis
- Revisão cuidadosa de mudanças
- Ambientes de produção
- Quando não conhece bem o Claude Code

**Como usar**:
```bash
cd /home/marce/projetos/TradingSystem
claude
```

**Características**:
- ✅ Controle total sobre cada ação
- ✅ Seguro para ambientes críticos
- ⚠️ Mais lento (requer aprovações)
- ⚠️ Interrompe o fluxo de trabalho

---

### 2. Modo Desenvolvimento (Permissões Completas) 🚀

**Descrição**: Claude executa ações automaticamente sem solicitar aprovação

**Quando usar**:
- Desenvolvimento local rápido
- Ambiente de desenvolvimento confiável
- Você tem backups (Git)
- Tarefas repetitivas/automação
- Prototipagem rápida

**Como usar**:
```bash
# Opção 1: Script conveniente
bash .claude/claude-dev.sh

# Opção 2: Alias (após configurar)
claude-dev

# Opção 3: Comando direto
claude --dangerously-skip-permissions
```

**Características**:
- ✅ Velocidade máxima
- ✅ Fluxo de trabalho contínuo
- ✅ Ideal para desenvolvimento
- ⚠️ Menos controle manual
- ⚠️ **NÃO use com dados sensíveis**

---

### 3. Modo Print (Não-interativo) 📄

**Descrição**: Executa um comando e sai (sem sessão interativa)

**Quando usar**:
- Scripts automatizados
- CI/CD pipelines
- Consultas rápidas
- Integração com outros tools

**Como usar**:
```bash
# Com permissões
claude --print --dangerously-skip-permissions "seu comando aqui"

# Sem permissões (seguro)
claude --print "seu comando aqui"

# Via alias
claude-run "seu comando aqui"
```

**Características**:
- ✅ Automação fácil
- ✅ Pode ser usado em pipes
- ✅ Output formatado
- ⚠️ Sem contexto de sessão

---

## ⚙️ Configuração Atual

### Arquivo `.claude-plugin`

```json
{
  "settings": {
    "permissionMode": "bypassPermissions",
    "dangerouslySkipPermissions": true,
    "autoApproveTools": [
      "Bash",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "Task",
      "WebFetch",
      "WebSearch",
      "BashOutput",
      "KillShell",
      "NotebookEdit",
      "TodoWrite"
    ]
  }
}
```

### Ferramentas Auto-aprovadas

| Ferramenta | Descrição | Permissão |
|------------|-----------|-----------|
| `Bash` | Executar comandos shell | ✅ Auto |
| `Read` | Ler arquivos | ✅ Auto |
| `Write` | Escrever arquivos | ✅ Auto |
| `Edit` | Editar arquivos | ✅ Auto |
| `Glob` | Buscar arquivos (padrões) | ✅ Auto |
| `Grep` | Buscar texto em arquivos | ✅ Auto |
| `Task` | Gerenciar tasks/TODOs | ✅ Auto |
| `WebFetch` | Fazer HTTP requests | ✅ Auto |
| `WebSearch` | Buscar na web | ✅ Auto |
| `BashOutput` | Ver output de comandos | ✅ Auto |
| `KillShell` | Matar processos shell | ✅ Auto |
| `NotebookEdit` | Editar notebooks | ✅ Auto |
| `TodoWrite` | Escrever TODOs | ✅ Auto |

---

## 🚀 Scripts e Aliases

### Scripts Criados

#### 1. `claude-dev.sh` - Modo Desenvolvimento

```bash
bash .claude/claude-dev.sh
```

**Features**:
- ✅ Verificações de segurança
- ✅ Avisos claros sobre permissões
- ✅ Confirmação antes de iniciar
- ✅ Configurações exibidas
- ✅ Navegação automática para projeto

#### 2. `aliases.sh` - Atalhos Convenientes

```bash
source .claude/aliases.sh
```

**Aliases disponíveis**:

| Alias | Comando | Descrição |
|-------|---------|-----------|
| `claude-dev` | `claude-dev.sh` | Modo desenvolvimento |
| `claude-safe` | `claude` | Modo seguro |
| `claude-run` | `claude --print` | Executar comando |
| `claude-mcp` | `claude mcp list` | Listar MCPs |
| `claude-config` | `cat ~/.claude.json` | Ver config |
| `claude-debug` | `claude --debug` | Modo debug |
| `claude-cmd <cmd>` | Função | Executar custom command |
| `claude-at <dir>` | Função | Claude em outro diretório |

### Carregar Aliases Automaticamente

Adicione ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
# Claude Code Aliases
if [ -f /home/marce/projetos/TradingSystem/.claude/aliases.sh ]; then
    source /home/marce/projetos/TradingSystem/.claude/aliases.sh
fi
```

Depois execute:
```bash
source ~/.bashrc  # ou ~/.zshrc
```

---

## ⚠️ Segurança e Boas Práticas

### ✅ FAÇA

1. **Use em Desenvolvimento Local**
   ```bash
   # Ambiente de dev: OK ✅
   claude-dev
   ```

2. **Tenha Backups (Git)**
   ```bash
   git status
   git add -A
   git commit -m "backup antes de usar Claude"
   ```

3. **Revise Mudanças Importantes**
   ```bash
   git diff
   git log -p
   ```

4. **Use Modo Seguro para Tarefas Críticas**
   ```bash
   claude-safe  # Com confirmações
   ```

### ❌ NÃO FAÇA

1. **NÃO Use com Dados Sensíveis**
   ```bash
   # ❌ Dados de produção
   # ❌ Credenciais/API keys
   # ❌ Dados de clientes
   ```

2. **NÃO Use em Produção**
   ```bash
   # ❌ Servidores de produção
   # ❌ Ambientes críticos
   # ❌ Sem backups
   ```

3. **NÃO Ignore Avisos**
   ```bash
   # Se o script avisar, LEIA! ⚠️
   ```

---

## 🔄 Trocar Entre Modos

### De Desenvolvimento para Seguro

```bash
# Parar sessão atual (Ctrl+C)
# Iniciar modo seguro
claude-safe
```

### De Seguro para Desenvolvimento

```bash
# Parar sessão atual (Ctrl+C)
# Iniciar modo desenvolvimento
claude-dev
```

### Temporariamente Desabilitar Permissões

Remova ou comente em `.claude-plugin`:

```json
{
  "settings": {
    // "permissionMode": "bypassPermissions",
    // "dangerouslySkipPermissions": true,
  }
}
```

---

## 🛠️ Troubleshooting

### Permissões não funcionando

**Problema**: Claude ainda pede confirmação

**Soluções**:
```bash
# 1. Verificar .claude-plugin
cat .claude-plugin | jq '.settings.dangerouslySkipPermissions'
# Deve retornar: true

# 2. Usar flag explícito
claude --dangerously-skip-permissions

# 3. Usar script
claude-dev
```

### Script não executando

**Problema**: `Permission denied`

**Solução**:
```bash
chmod +x .claude/claude-dev.sh
chmod +x .claude/aliases.sh
```

### Aliases não funcionando

**Problema**: `command not found`

**Solução**:
```bash
# 1. Source manualmente
source .claude/aliases.sh

# 2. Adicionar ao ~/.bashrc
echo 'source /home/marce/projetos/TradingSystem/.claude/aliases.sh' >> ~/.bashrc
source ~/.bashrc

# 3. Verificar carregamento
type claude-dev
```

---

## 📊 Comparação de Modos

| Característica | Modo Seguro | Modo Desenvolvimento | Modo Print |
|----------------|-------------|----------------------|------------|
| **Aprovação manual** | ✅ Sim | ❌ Não | ❌ Não |
| **Velocidade** | 🐌 Lento | 🚀 Rápido | ⚡ Muito rápido |
| **Segurança** | 🔒 Alta | ⚠️ Média | ⚠️ Média |
| **Uso recomendado** | Produção | Desenvolvimento | Automação |
| **Interativo** | ✅ Sim | ✅ Sim | ❌ Não |
| **Ideal para** | Iniciantes | Desenvolvedores | Scripts/CI |

---

## 📚 Exemplos de Uso

### Desenvolvimento Rápido

```bash
# Iniciar em modo dev
claude-dev

# Usar custom commands livremente
/health-check all
/service-launcher start dashboard
/git-workflows commit feat "Add feature"
```

### Consultas Rápidas

```bash
# Verificar status
claude-run "/health-check services"

# Ver logs
claude-run "/service-launcher logs dashboard"

# Git status
claude-run "/git-workflows status"
```

### Debug

```bash
# Modo debug com permissões
claude-debug

# Ver todas as operações
# Útil para troubleshooting
```

### Automação

```bash
#!/bin/bash
# Script de deploy automatizado

# Health check
claude-run "/health-check all" | jq '.overallHealth'

# Se OK, fazer deploy
if [ $? -eq 0 ]; then
    claude-run "/scripts validate-env"
    claude-run "/git-workflows push"
fi
```

---

## 🎯 Recomendações Finais

### Para Desenvolvimento Diário

1. **Use `claude-dev`** para trabalho normal
2. **Tenha Git configurado** (backup automático)
3. **Revise commits** antes de push
4. **Alterne para `claude-safe`** quando necessário

### Para Tarefas Críticas

1. **Sempre use `claude-safe`**
2. **Leia cada prompt** antes de aprovar
3. **Faça backups** antes de grandes mudanças
4. **Teste em branch separado**

### Para Automação

1. **Use `claude-run`** para scripts
2. **Documente o script** claramente
3. **Adicione error handling**
4. **Teste extensivamente**

---

## 📖 Referências

- **Script principal**: [`.claude/claude-dev.sh`](claude-dev.sh)
- **Aliases**: [`.claude/aliases.sh`](aliases.sh)
- **Configuração**: [`.claude-plugin`](../.claude-plugin)
- **CLI Guide**: [`CLAUDE-CLI.md`](CLAUDE-CLI.md)
- **Claude Code Docs**: https://github.com/anthropics/claude-code

---

**✅ Permissões configuradas com sucesso!**

**Modo atual**: Desenvolvimento (Permissões Completas)  
**Script**: `.claude/claude-dev.sh`  
**Aliases**: `.claude/aliases.sh`  
**Status**: 🚀 Pronto para uso rápido!







