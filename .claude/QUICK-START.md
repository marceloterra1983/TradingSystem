# Quick Start: Claude Code Automation

## 🚀 Início Rápido (5 minutos)

### 1. Testar Automação Básica

```bash
# Abra o Claude Code
cd /home/marce/Projetos/TradingSystem
claude
```

No chat do Claude Code, digite:

```
Execute this task completely without stopping:
1. Check git status
2. List recent commits
3. Show project structure

Continue until completion.
```

**Resultado esperado:** Claude Code executa tudo sem parar para perguntas! ✅

### 2. Testar Comando /fix

No Claude Code:

```
/fix
```

**Resultado esperado:**
- Scans for issues
- Fixes automatically
- Reports results
- **Sem perguntas!** ✅

### 3. Testar Interceptação de Sudo

No Claude Code, tente:

```
Install postgresql-client package
```

**Resultado esperado:**
```
⚠️  SUDO COMMAND DETECTED ⚠️

I've created a script: .claude/sudo-scripts/sudo_[timestamp].sh

📋 Commands to be executed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
sudo apt-get install postgresql-client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 To execute, run:
   sudo bash .claude/sudo-scripts/sudo_[timestamp].sh

After execution, confirm so I can continue.
```

**Você faz:**
```bash
# Revisar
cat .claude/sudo-scripts/sudo_[timestamp].sh

# Executar (se aprovado)
sudo bash .claude/sudo-scripts/sudo_[timestamp].sh

# Confirmar no chat
# "Script executed successfully!"
```

**Claude Code continua automaticamente!** ✅

### 4. Monitorar Logs em Tempo Real

Em outro terminal:

```bash
# Ver todas as ações em tempo real
tail -f .claude/logs/*.log

# Ou apenas bash commands
tail -f .claude/logs/bash-commands.log
```

**Resultado:** Você vê cada ação sendo logada! ✅

### 5. Verificar Scripts Sudo Criados

```bash
# Listar scripts
ls -lh .claude/sudo-scripts/

# Ver último script
cat $(ls -t .claude/sudo-scripts/sudo_*.sh | head -1)

# Ver log de interceptações
cat .claude/logs/sudo-intercepts.log
```

## 📊 Estrutura de Arquivos

```
.claude/
├── settings.json              # ✅ Configurado (hooks + permissions)
├── commands/
│   └── fix.md                 # ✅ Comando /fix criado
├── helpers/
│   └── sudo-interceptor.sh    # ✅ Interceptor de sudo
├── logs/                      # ✅ Logs automáticos
│   ├── bash-commands.log
│   ├── file-operations.log
│   ├── task-executions.log
│   ├── todo-updates.log
│   └── sudo-intercepts.log
├── sudo-scripts/              # ✅ Scripts sudo gerados
│   └── sudo_[timestamp].sh
├── AUTOMATION-GUIDE.md        # 📖 Guia completo
└── QUICK-START.md             # 📖 Este arquivo
```

## ✅ Checklist de Verificação

### Configuração

- [x] `.claude/settings.json` configurado
- [x] Hooks PreToolUse funcionando
- [x] Hooks PostToolUse funcionando
- [x] Permissões amplas definidas
- [x] Hook de sudo configurado

### Comandos

- [x] `/fix` disponível
- [x] Logs sendo criados automaticamente
- [x] Scripts sudo sendo gerados
- [x] Notificações desktop (se `notify-send` disponível)

### Teste Manual

```bash
# 1. Verificar configuração
cat .claude/settings.json | jq '.hooks'

# 2. Verificar diretórios
ls -la .claude/logs/
ls -la .claude/sudo-scripts/

# 3. Verificar permissões
cat .claude/settings.json | jq '.permissions.allow'

# 4. Testar geração de logs
# (executar qualquer comando no Claude Code e verificar logs)
```

## 🎯 Exemplos Práticos

### Exemplo 1: Refactoring Automático

**Prompt:**
```
Refactor the authentication module:
1. Move logic to services
2. Add JSDoc comments
3. Fix all linting errors
4. Run tests

Execute completely without stopping.
Only stop if breaking change detected.
```

**Resultado:** Claude Code executa tudo e só para se houver breaking change! ✅

### Exemplo 2: Setup de Ambiente

**Prompt:**
```
Setup development environment:
1. Install Node.js dependencies
2. Setup environment variables
3. Initialize databases
4. Run health checks

Continue until all services are healthy.
Generate sudo scripts if needed.
```

**Resultado:**
- Instala deps ✅
- Configura .env ✅
- Gera script sudo para DB init 📝
- Você executa script manualmente ✅
- Claude Code continua após confirmação ✅

### Exemplo 3: Fix All Issues

**Prompt:**
```
/fix
```

**Resultado:**
```
✅ Scanning for issues...
✅ Found 23 linting errors
✅ Fixed 21 automatically
✅ 2 warnings remaining (acceptable)
✅ All tests passing
✅ Build successful

Task completed! Ready for commit.
```

## 🔍 Troubleshooting Rápido

### Problema: Logs vazios

```bash
# Verificar se hooks estão ativos
cat .claude/settings.json | jq '.hooks.PreToolUse'

# Recriar diretório de logs
mkdir -p .claude/logs
```

### Problema: Scripts sudo não gerados

```bash
# Verificar hook de sudo
cat .claude/settings.json | jq '.hooks.PreToolUse[] | select(.matcher == "Bash")'

# Verificar helper existe
ls -la .claude/helpers/sudo-interceptor.sh
```

### Problema: Claude Code ainda pergunta demais

**Solução:** Seja mais explícito:
```
Execute WITHOUT ASKING until completion.
Only stop if CRITICAL ERROR.
```

## 📚 Próximos Passos

1. **Ler guia completo:** [AUTOMATION-GUIDE.md](./AUTOMATION-GUIDE.md)
2. **Explorar comandos:** `ls .claude/commands/`
3. **Customizar hooks:** Editar `.claude/settings.json`
4. **Criar comandos customizados:** Adicionar `.claude/commands/seu-comando.md`

## 💡 Dicas Profissionais

### Dica 1: Use Instruções Claras

❌ Ruim: "Fix the code"
✅ Bom: "Fix all linting errors, run tests, and build. Continue until all checks pass."

### Dica 2: Defina Critérios de Parada

```
Continue until:
- All tests green
- Zero errors
- Build succeeds

Stop only if:
- Breaking change
- Requires human decision
```

### Dica 3: Monitore em Tempo Real

```bash
# Terminal 1: Claude Code
claude

# Terminal 2: Logs
tail -f .claude/logs/bash-commands.log

# Terminal 3: Scripts sudo
watch -n 1 'ls -lh .claude/sudo-scripts/'
```

### Dica 4: Auditoria Regular

```bash
# Ver histórico completo
cat .claude/logs/bash-commands.log | grep "$(date +%Y-%m-%d)"

# Contar ações do dia
grep "$(date +%Y-%m-%d)" .claude/logs/*.log | wc -l

# Scripts sudo criados hoje
find .claude/sudo-scripts -name "sudo_$(date +%Y%m%d)*.sh"
```

## 🎓 Comandos Úteis

```bash
# Ver todos os comandos disponíveis
ls .claude/commands/*.md

# Ver configuração atual
cat .claude/settings.json | jq '.'

# Limpar logs antigos
find .claude/logs -name "*.log" -mtime +30 -delete

# Limpar scripts sudo antigos
find .claude/sudo-scripts -name "sudo_*.sh" -mtime +30 -delete

# Backup da configuração
cp .claude/settings.json .claude/settings.json.backup
```

---

**Última atualização:** 2025-11-09
**Versão:** 1.0.0

**Pronto para começar? Execute `/fix` no Claude Code!** 🚀
