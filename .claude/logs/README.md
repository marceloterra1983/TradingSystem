# Claude Code Automation Logs

Este diretório contém logs gerados automaticamente pelos hooks do Claude Code.

## Arquivos de Log

- **`bash-commands.log`** - Todos os comandos bash executados pelo Claude Code
- **`file-operations.log`** - Todas as operações de leitura/escrita/edição de arquivos
- **`task-executions.log`** - Todas as execuções de Task tool (agentes especializados)
- **`todo-updates.log`** - Todas as atualizações da lista de TODOs
- **`sudo-intercepts.log`** - Todos os comandos sudo interceptados e convertidos em scripts

## Formato

```
[YYYY-MM-DD HH:MM:SS] Event description
```

## Retenção

Logs são mantidos indefinidamente (gitignored). Para limpar:

```bash
# Limpar todos os logs
rm -f .claude/logs/*.log

# Limpar logs antigos (30+ dias)
find .claude/logs -name "*.log" -mtime +30 -delete

# Ver logs recentes
tail -f .claude/logs/bash-commands.log
```

## Monitoramento

```bash
# Ver todas as ações em tempo real
tail -f .claude/logs/*.log

# Ver apenas comandos bash
tail -f .claude/logs/bash-commands.log

# Ver apenas operações de arquivos
tail -f .claude/logs/file-operations.log

# Contar ações por tipo
wc -l .claude/logs/*.log
```

## Auditoria

Esses logs são úteis para:
- Auditar todas as ações do Claude Code
- Debugar problemas de automação
- Entender o fluxo de trabalho do agente
- Compliance e rastreabilidade

## Privacy

⚠️ **IMPORTANTE:** Esses logs podem conter informações sensíveis (paths, comandos, etc.). Nunca commite esses arquivos!
