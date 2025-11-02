# Lista de Comandos Claude Code - TradingSystem

**Comandos customizados disponíveis no Claude Code CLI**

---

## 🎯 Comandos de Qualidade de Código (Novos!)

### `/quality-check` ⭐ **PRINCIPAL**
Verificação completa de qualidade de código (linting, types, tests, security, docker).

```bash
/quality-check                      # Verificação básica
/quality-check --fix                # Com auto-fix
/quality-check --full               # Análise completa (inclui duplication, dead code)
/quality-check --full --format html # Gera relatório HTML
/quality-check --frontend           # Apenas frontend
/quality-check --backend            # Apenas backend
```

**Verifica**:
- ✅ ESLint (0 errors)
- ✅ TypeScript (0 type errors)
- ✅ Tests + Coverage (≥80%)
- ✅ Security audit (0 high/critical)
- ✅ Docker health
- ✅ Bundle size (--full)
- ✅ Code duplication (--full)
- ✅ Dead code (--full)

---

### `/lint`
ESLint para JavaScript/TypeScript.

```bash
/lint                               # Lint frontend
/lint --fix                         # Auto-fix issues
/lint backend                       # Lint backend
/lint all                           # Lint tudo
/lint --file src/App.tsx            # Arquivo específico
```

---

### `/type-check`
Verificação de tipos TypeScript.

```bash
/type-check                         # Check frontend
/type-check --pretty                # Com cores e formatação
/type-check --watch                 # Watch mode (re-check on save)
/type-check --file src/App.tsx      # Arquivo específico
/type-check backend                 # Backend TypeScript
```

---

### `/test`
Testes unitários com Vitest.

```bash
/test                               # Todos os testes
/test --coverage                    # Com relatório de coverage
/test --watch                       # Watch mode
/test --file DocsPage               # Arquivo específico
/test --only-failed                 # Apenas testes que falharam
/test --ui                          # Abrir UI interativa
/test backend                       # Testes do backend
```

---

### `/format`
Formatação de código com Prettier.

```bash
/format                             # Format frontend
/format --check                     # Apenas verificar (sem modificar)
/format src/components/             # Diretório específico
/format --staged                    # Apenas arquivos staged (Git)
/format all                         # Format tudo
```

---

### `/audit`
Security audit com npm audit.

```bash
/audit                              # Audit frontend
/audit --level high                 # Apenas high/critical
/audit --fix                        # Auto-fix (CUIDADO!)
/audit --production                 # Apenas dependências de produção
/audit --json                       # Output JSON
/audit all                          # Todos os projetos
```

---

### `/build`
Build de produção.

```bash
/build                              # Build frontend
/build --clean                      # Clean antes de build
/build --analyze                    # Com análise de bundle
/build --watch                      # Watch mode (dev)
/build all                          # Build tudo
```

---

## 🐳 Comandos Docker

### `/docker-compose`
Gerenciamento de Docker Compose stacks.

```bash
/docker-compose start all           # Iniciar todos os stacks
/docker-compose start infra         # Iniciar infraestrutura
/docker-compose start rag           # Iniciar RAG stack
/docker-compose stop all            # Parar tudo
/docker-compose restart infra       # Reiniciar
/docker-compose logs rag            # Ver logs
/docker-compose ps                  # Ver containers rodando
```

---

### `/health-check`
Verificação de saúde dos serviços.

```bash
/health-check all                   # Verificação completa
/health-check services              # Apenas serviços Node.js
/health-check containers            # Apenas containers Docker
/health-check databases             # Apenas bancos de dados
/health-check --format json         # Output JSON
/health-check --format prometheus   # Formato Prometheus
```

---

## 🔧 Comandos de Desenvolvimento

### `/service-launcher`
Gerenciamento do service launcher.

```bash
/service-launcher start             # Iniciar
/service-launcher stop              # Parar
/service-launcher restart           # Reiniciar
/service-launcher status            # Ver status
```

---

### `/start`
Iniciar servidor de desenvolvimento.

```bash
/start                              # Iniciar dashboard
/start frontend                     # Frontend
/start backend                      # Backend APIs
/start all                          # Tudo
```

---

## 📝 Comandos de Documentação

### `/update-docs`
Atualização de documentação.

```bash
/update-docs --implementation       # Docs de implementação
/update-docs --api                  # Docs de API
/update-docs --sync                 # Sincronizar docs
/update-docs --validate             # Validar frontmatter
```

---

### `/doc-api`
Gerar documentação de API.

```bash
/doc-api --openapi                  # OpenAPI/Swagger
/doc-api --graphql                  # GraphQL schema
/doc-api --interactive              # Docs interativas
```

---

## 🔍 Comandos Git

### `/commit`
Commit com conventional commits.

```bash
/commit "fix: resolve bug"         # Conventional commit
/commit "feat: add feature"         # Nova feature
/commit --no-verify                 # Skip hooks
/commit --amend                     # Amend last commit
```

---

### `/git-workflows`
Git workflows.

```bash
/git-workflows commit               # Commit interativo
/git-workflows status               # Git status
/git-workflows push                 # Push com validação
```

---

## 📊 Comandos de Análise

### `/architecture-review`
Revisão de arquitetura.

```bash
/architecture-review --modules      # Revisar módulos
/architecture-review --patterns     # Revisar patterns
/architecture-review --security     # Revisar segurança
/architecture-review --dependencies # Revisar dependências
```

---

### `/performance-audit`
Auditoria de performance.

```bash
/performance-audit --frontend       # Frontend apenas
/performance-audit --backend        # Backend apenas
/performance-audit --full           # Análise completa
```

---

### `/code-review`
Code review automatizado.

```bash
/code-review src/App.tsx            # Arquivo específico
/code-review --full                 # Review completo
```

---

## 🚀 Comandos de Workflow

### `/workflow-orchestrator`
Orquestrar workflows complexos (veja output acima para detalhes).

```bash
/workflow-orchestrator create --name "deploy" --template "web-app"
/workflow-orchestrator run workflow.json
/workflow-orchestrator schedule --cron "0 2 * * *" backup.json
/workflow-orchestrator monitor --live
```

---

## 🛠️ Comandos Utilitários

### `/todo`
Gerenciar TODOs.

```bash
/todo add "Implementar feature X"   # Adicionar
/todo list                          # Listar
/todo complete 1                    # Marcar como completo
/todo remove 2                      # Remover
```

---

### `/explain-code`
Explicar código.

```bash
/explain-code src/App.tsx           # Explicar arquivo
/explain-code --function handleClick # Função específica
```

---

### `/refactor-code`
Refatorar código.

```bash
/refactor-code src/App.tsx          # Sugerir refactoring
/refactor-code --pattern factory    # Aplicar pattern
```

---

### `/debug-error`
Debug de erros.

```bash
/debug-error "Cannot read property 'map' of undefined"
/debug-error --stack trace.log
```

---

## 🎯 Workflows Recomendados

### Pre-Commit
```bash
/quality-check --fix
```

Ou manual:
```bash
/lint --fix && /format && /type-check && /test
```

### Pre-Deploy
```bash
/quality-check --full
/health-check all
/audit --level high
/build --analyze
```

### Debug Issues
```bash
/health-check all
/docker-compose logs rag
/service-launcher status
/type-check
```

### Daily Development
```bash
# Manhã
/start all
/health-check all

# Antes de commit
/quality-check --fix

# Fim do dia
/docker-compose stop all
```

---

## 📚 Ajuda e Documentação

### Ver Detalhes de um Comando

```bash
# Ver documentação completa
cat .claude/commands/quality-check.md

# Ou no Claude Code
/help quality-check
```

### Listar Todos os Comandos

```bash
# Ver índice
cat .claude/commands/README.md

# Ou listar arquivos
ls -la .claude/commands/
```

### Documentação Adicional

- [Code Quality Checklist](docs/content/development/code-quality-checklist.md)
- [Quick Reference](CODE-QUALITY-COMMANDS.md)
- [Claude Commands Guide](CLAUDE-COMMANDS-READY.md)
- [Workflow System](WORKFLOW-SYSTEM-READY.md)

---

## 💡 Dicas de Uso

### Alias Úteis

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
alias qc='claude /quality-check'
alias qcf='claude /quality-check --fix'
alias qcfull='claude /quality-check --full'
```

### VSCode Integration

Tasks (`.vscode/tasks.json`):

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Quality Check",
      "type": "shell",
      "command": "claude /quality-check --fix",
      "problemMatcher": []
    }
  ]
}
```

### Git Hooks

Pre-commit hook (`.git/hooks/pre-commit`):

```bash
#!/bin/bash
claude /quality-check --fix
```

---

## 🔗 Links Rápidos

- **CLAUDE.md**: [CLAUDE.md](CLAUDE.md) - Instruções do projeto
- **Comandos**: [.claude/commands/README.md](.claude/commands/README.md)
- **Scripts**: [scripts/maintenance/](scripts/maintenance/)
- **Health Checks**: [scripts/maintenance/health-check-all.sh](scripts/maintenance/health-check-all.sh)

---

**Total de Comandos**: 51 disponíveis
**Última Atualização**: 2025-11-02
**Status**: ✅ Pronto para Uso

---

## 📋 Quick Reference Card

| Categoria | Comando Principal | Uso Comum |
|-----------|------------------|-----------|
| **Qualidade** | `/quality-check` | `--fix` ou `--full` |
| **Linting** | `/lint` | `--fix` |
| **Tipos** | `/type-check` | `--pretty` |
| **Testes** | `/test` | `--coverage` |
| **Formato** | `/format` | auto |
| **Security** | `/audit` | `--level high` |
| **Build** | `/build` | `--analyze` |
| **Docker** | `/docker-compose` | `start all` |
| **Health** | `/health-check` | `all` |
| **Git** | `/commit` | `"feat: msg"` |

**Comando mais usado**: `/quality-check --fix` 🏆
