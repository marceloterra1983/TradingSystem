# Claude Code Automation Guide

## 🎯 Objetivo

Este guia explica como o Claude Code foi configurado para **trabalhar de forma autônoma** até a conclusão das tarefas, minimizando interrupções para perguntas.

## 📁 Arquivos Configurados

### 1. `.claude/settings.json` (Configuração Principal)

Contém hooks automáticos para logging e permissões amplas.

#### Hooks Configurados

**PreToolUse** (Antes de executar ferramentas):
- **Bash** → Log de comandos em `.claude/logs/bash-commands.log`
- **Write/Edit** → Log de operações de arquivo em `.claude/logs/file-operations.log`
- **Task** → Log de tasks em `.claude/logs/task-executions.log`

**PostToolUse** (Depois de executar ferramentas):
- **All tools (*)** → Notificação desktop (se disponível)
- **Bash** → Log de conclusão
- **Task** → Log de conclusão
- **TodoWrite** → Log de atualizações em `.claude/logs/todo-updates.log`

#### Permissões

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Bash", "Read", "Write", "Edit", "Glob", "Grep",
      "Task", "WebFetch", "WebSearch", "BashOutput",
      "KillShell", "NotebookEdit", "TodoWrite",
      "SlashCommand", "ExitPlanMode"
    ]
  }
}
```

**Todas as ferramentas essenciais estão pré-aprovadas**, reduzindo prompts de confirmação.

### 2. `.claude/commands/fix.md` (Comando de Auto-Fix)

Comando personalizado `/fix` que executa workflow completo de correção automática.

#### Workflow

```
1. Scan → 2. Fix → 3. Verify → 4. Report
```

#### Regras de Comportamento

✅ **NÃO PARA** para:
- Fixes de linting automáticos
- Formatação de código
- Correções de TypeScript simples
- Restart de containers unhealthy
- Correções de warnings

🛑 **PARA** apenas para:
- Operações destrutivas (deletar dados de produção)
- Comandos `sudo` (requerem senha)
- Deployments/git push
- Erros críticos sem solução automática

## 🚀 Como Usar

### Modo Manual (Uso Direto)

```bash
# No terminal Claude Code
/fix
```

### Modo Automático (Instruções Explícitas)

Quando você pedir algo, sempre inclua contexto de automação:

```
Execute this task completely without stopping:
1. Fix all linting errors
2. Run tests
3. Build project
4. Only stop if CRITICAL error

Use /fix command for automation.
```

### Exemplo de Prompt Ideal

```
I need to refactor the authentication module.

Requirements:
1. Move auth logic from controllers to services
2. Add JWT validation middleware
3. Write unit tests
4. Fix any linting/type errors automatically

Execute until completion. Use /fix at the end to ensure clean code.
Only stop if breaking changes require approval.
```

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
# Todos os logs
tail -f .claude/logs/*.log

# Apenas comandos bash
tail -f .claude/logs/bash-commands.log

# Apenas operações de arquivos
tail -f .claude/logs/file-operations.log

# Apenas tasks
tail -f .claude/logs/task-executions.log

# Interceptações de sudo
tail -f .claude/logs/sudo-intercepts.log
```

### Análise de Logs

```bash
# Contar ações por tipo
wc -l .claude/logs/*.log

# Ver últimas 50 ações
tail -50 .claude/logs/bash-commands.log

# Listar scripts sudo criados
ls -lh .claude/sudo-scripts/

# Buscar erros
grep -i "error\|failed" .claude/logs/*.log
```

## 🔐 Tratamento Especial de Sudo

### Comportamento Automático

Quando Claude Code identificar necessidade de `sudo`, ele **AUTOMATICAMENTE**:

1. ✅ **Cria script** em `.claude/sudo-scripts/sudo_[timestamp].sh`
2. ✅ **Inclui todos os comandos** sudo necessários no script
3. ✅ **Torna executável** (chmod +x)
4. ✅ **Mostra para você**:
   - 📁 Localização do script
   - 📋 Comandos que serão executados
   - 🔑 Como executar: `sudo bash [script-path]`
5. ⏸️ **Aguarda sua confirmação** para continuar
6. ❌ **NUNCA executa** sudo diretamente

### Workflow Completo

#### Exemplo Real

**Situação:** Claude Code precisa instalar pacote

**1. Detecção Automática:**
```bash
# Claude Code identifica:
sudo apt-get install postgresql-client
```

**2. Script Gerado:**
```
📁 .claude/sudo-scripts/sudo_20251109_143022.sh
```

**3. Claude Code Mostra:**
```
⚠️  SUDO COMMAND DETECTED ⚠️

I've created a script that requires administrator privileges.

📁 Script Location: .claude/sudo-scripts/sudo_20251109_143022.sh

📋 Commands to be executed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
sudo apt-get install postgresql-client
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 To execute, run:
   sudo bash .claude/sudo-scripts/sudo_20251109_143022.sh

⚠️  Review the script before running:
   cat .claude/sudo-scripts/sudo_20251109_143022.sh

After execution, please confirm so I can continue.
```

**4. Você Revisa:**
```bash
# Ver conteúdo do script
cat .claude/sudo-scripts/sudo_20251109_143022.sh
```

**5. Você Executa (se aprovado):**
```bash
sudo bash .claude/sudo-scripts/sudo_20251109_143022.sh
```

**6. Você Confirma no Chat:**
```
Script executado com sucesso! Continue.
```

**7. Claude Code Continua Automaticamente** com o workflow

## 🎛️ Customização

### Adicionar Novo Hook

Edite `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"[$(date)] Fetching: $CLAUDE_TOOL_INPUT\" >> .claude/logs/web-requests.log"
          }
        ]
      }
    ]
  }
}
```

### Criar Novo Comando Automatizado

Crie `.claude/commands/seu-comando.md`:

```markdown
---
description: Seu comando automatizado
---

# Instruções para Claude Code

Execute as seguintes tarefas sem parar para perguntas:
1. Task 1
2. Task 2
3. Task 3

Regras:
- NÃO pare para confirmação
- Continue até completar
- Apenas pare se erro CRÍTICO

Use TodoWrite para tracking.
```

## 🔒 Segurança

### O Que Claude Code NUNCA Fará Automaticamente

Mesmo com permissões amplas, o Claude Code **sempre perguntará** antes de:

1. **Comandos Destrutivos**
   ```bash
   rm -rf /
   git push --force origin main
   DROP DATABASE production
   ```

2. **Operações Privilegiadas (Gera Script Automaticamente)**
   ```bash
   sudo apt-get install        # → Vira script
   sudo chmod 777 /etc/passwd  # → Vira script
   ```
   **Nota:** Comandos sudo são interceptados e convertidos em scripts para você executar manualmente.

3. **Deployments**
   ```bash
   kubectl apply -f production.yaml
   docker push
   npm publish
   ```

4. **Modificações em Arquivos Sensíveis**
   ```
   .env
   credentials.json
   private_key.pem
   ```

### Logs de Auditoria

Todos os logs em `.claude/logs/` são **gitignored** por segurança, mas permanecerão no sistema para auditoria local.

## 📈 Best Practices

### 1. Use Instruções Explícitas

❌ **Ruim:**
```
Fix the code
```

✅ **Bom:**
```
Fix all linting errors, type errors, and failing tests.
Run /fix command. Continue until all checks pass.
Only stop if critical blocker requires human decision.
```

### 2. Defina Critérios de Parada

```
Continue until:
- All tests passing (green)
- Zero linting errors
- Build succeeds

Stop only if:
- Breaking change detected
- API contract changes
- Database migration needed
```

### 3. Use TodoWrite para Tracking

O Claude Code já usa TodoWrite automaticamente (hooks configurados), mas você pode reforçar:

```
Create detailed todo list with TodoWrite.
Mark tasks as completed immediately after finishing.
Show progress in real-time.
```

## 🧪 Testando a Configuração

### Teste 1: Logging Automático

```bash
# No Claude Code, execute:
/fix

# Em outro terminal:
tail -f .claude/logs/bash-commands.log

# Você deve ver logs aparecendo em tempo real
```

### Teste 2: Permissões

```bash
# Peça para Claude Code:
# "Run npm install and fix any errors without asking"

# Deve executar diretamente sem prompts
```

### Teste 3: Notificações Desktop

```bash
# Execute qualquer comando
# Você deve receber notificação desktop ao completar (se notify-send instalado)
```

## 🆘 Troubleshooting

### Problema: Claude Code ainda pergunta demais

**Solução 1:** Seja mais explícito nas instruções
```
Execute without asking for confirmation unless CRITICAL error.
```

**Solução 2:** Use `/fix` command para workflows conhecidos

**Solução 3:** Verifique permissões em `.claude/settings.json`

### Problema: Logs não aparecem

**Solução:**
```bash
# Verificar se diretório existe
ls -la .claude/logs/

# Recriar se necessário
mkdir -p .claude/logs
```

### Problema: Notificações não funcionam

**Solução:**
```bash
# Instalar notify-send (Ubuntu/Debian)
sudo apt-get install libnotify-bin

# Testar
notify-send "Test" "Claude Code notification"
```

## 📚 Recursos Adicionais

- **[.claude/README.md](./README.md)** - Documentação do Claude Code CLI
- **[.claude/commands/](./commands/)** - Todos os comandos disponíveis
- **[.claude/logs/README.md](./logs/README.md)** - Documentação de logs
- **[.claude/sudo-scripts/README.md](./sudo-scripts/README.md)** - Scripts sudo gerados automaticamente

## 🎯 Resumo

**O que foi configurado:**
✅ Hooks automáticos para logging
✅ Permissões amplas (menos prompts)
✅ Comando `/fix` para auto-correção
✅ Logs de auditoria em `.claude/logs/`
✅ Notificações desktop
✅ **Interceptação automática de sudo** com geração de scripts

**O que Claude Code faz agora:**
✅ Executa tasks até conclusão
✅ Apenas para em situações críticas
✅ Loga todas as ações
✅ Notifica progresso
✅ Mantém auditoria completa
✅ **Gera scripts sudo automaticamente** (sem executar diretamente)

**O que você precisa fazer:**
✅ Usar instruções explícitas
✅ Definir critérios de parada claros
✅ Confiar no processo automatizado
✅ Revisar logs quando necessário
✅ **Executar scripts sudo manualmente** quando solicitado (após revisar)

---

**Última atualização:** 2025-11-09
**Versão:** 1.0.0
