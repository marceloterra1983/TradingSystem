# Claude Code Custom Commands

Lista completa de comandos customizados do Claude Code para o TradingSystem.

---

## 📋 Code Quality Commands

### `/quality-check` ⭐ **RECOMENDADO**
Verificação completa de qualidade de código.

```bash
/quality-check [--fix] [--full] [--format html]
```

**Verifica**:
- ✅ ESLint
- ✅ TypeScript types
- ✅ Unit tests + coverage
- ✅ Security audit
- ✅ Docker health
- ✅ Bundle size (--full)
- ✅ Code duplication (--full)
- ✅ Dead code (--full)

**Exemplos**:
```bash
/quality-check                    # Verificação básica
/quality-check --fix              # Com auto-fix
/quality-check --full             # Análise completa
/quality-check --full --format html  # Com relatório HTML
```

---

### `/lint`
ESLint para JavaScript/TypeScript.

```bash
/lint [frontend|backend|all] [--fix]
```

**Exemplos**:
```bash
/lint                            # Lint frontend
/lint --fix                      # Auto-fix
/lint backend                    # Lint backend
/lint --file src/App.tsx         # Arquivo específico
```

---

### `/type-check`
Verificação de tipos TypeScript.

```bash
/type-check [frontend|backend] [--pretty] [--watch]
```

**Exemplos**:
```bash
/type-check                      # Check frontend
/type-check --pretty             # Com cores
/type-check --watch              # Watch mode
```

---

### `/test`
Testes unitários com Vitest.

```bash
/test [frontend|backend] [--coverage] [--watch]
```

**Exemplos**:
```bash
/test                            # Todos os testes
/test --coverage                 # Com coverage
/test --watch                    # Watch mode
/test --file DocsPage            # Arquivo específico
```

---

### `/format`
Formatação de código com Prettier.

```bash
/format [target] [--check] [--staged]
```

**Exemplos**:
```bash
/format                          # Format frontend
/format --check                  # Apenas verificar
/format src/components/          # Diretório específico
/format --staged                 # Apenas staged files
```

---

### `/audit`
Security audit com npm audit.

```bash
/audit [frontend|backend] [--fix] [--level high]
```

**Exemplos**:
```bash
/audit                           # Audit frontend
/audit --level high              # Apenas high/critical
/audit --fix                     # Auto-fix (CUIDADO!)
/audit all                       # Todos os projetos
```

---

### `/build`
Build de produção.

```bash
/build [frontend|backend] [--analyze] [--clean]
```

**Exemplos**:
```bash
/build                           # Build frontend
/build --clean                   # Clean + build
/build --analyze                 # Com bundle analysis
```

---

## 🐳 Docker & Infrastructure Commands

### `/docker-compose`
Gerenciamento de Docker Compose stacks.

```bash
/docker-compose [action] [stack]
```

**Actions**: start, stop, restart, logs, ps, down

**Stacks**: infra, data, monitoring, rag, all

**Exemplos**:
```bash
/docker-compose start all        # Iniciar todos os stacks
/docker-compose logs rag         # Ver logs do RAG stack
/docker-compose restart infra    # Reiniciar infraestrutura
```

---

### `/health-check`
Verificação de saúde dos serviços.

```bash
/health-check [target]
```

**Targets**: all, services, containers, databases

**Exemplos**:
```bash
/health-check all                # Verificação completa
/health-check services           # Apenas serviços
/health-check --format json      # Saída JSON
```

---

## 🔧 Service Management Commands

### `/service-launcher`
Gerenciamento do service launcher.

```bash
/service-launcher [action]
```

**Actions**: start, stop, restart, status

**Exemplos**:
```bash
/service-launcher status         # Ver status
/service-launcher restart        # Reiniciar
```

---

## 📝 Documentation Commands

### `/update-docs`
Atualização de documentação.

```bash
/update-docs [--implementation] [--api] [--sync]
```

**Exemplos**:
```bash
/update-docs --implementation    # Atualizar docs de implementação
/update-docs --api               # Atualizar docs de API
/update-docs --sync              # Sincronizar docs
```

---

## 🔍 Git & Workflow Commands

### `/git-workflows`
Git workflows e conventional commits.

```bash
/git-workflows [action]
```

**Actions**: commit, push, pull, status

**Exemplos**:
```bash
/git-workflows commit            # Commit com conventional format
/git-workflows status            # Git status
```

---

### `/commit`
Commit com conventional commits e emoji.

```bash
/commit [message] [--no-verify] [--amend]
```

**Exemplos**:
```bash
/commit "fix: resolve search bug"
/commit "feat: add telegram bot" --no-verify
```

---

## 📊 Analysis & Reporting Commands

### `/architecture-review`
Revisão de arquitetura.

```bash
/architecture-review [--modules] [--patterns] [--security]
```

---

### `/performance-audit`
Auditoria de performance.

```bash
/performance-audit [--frontend] [--backend] [--full]
```

---

### `/code-review`
Code review automatizado.

```bash
/code-review [file-path] [--full]
```

---

## 🚀 Workflow Scripts

### `/workflow`
Execute workflow scripts genéricos.

```bash
/workflow [name] [type]
```

**Types**: bugfix, feature, deployment, testing, analysis

**Exemplos**:
```bash
/workflow "fix-search-bug" "bugfix"
/workflow "add-bot" "feature"
/workflow "deploy-v1.2" "deployment"
```

---

## 🎯 Quick Commands (One-liners)

### `/fix-all`
Auto-fix tudo (lint + format).

```bash
/fix-all
```

Executa:
```bash
npm run lint:fix
npx prettier --write src/
```

---

### `/clean-install`
Clean install de dependências.

```bash
/clean-install [target]
```

Executa:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### `/dev`
Iniciar servidor de desenvolvimento.

```bash
/dev [target]
```

**Targets**: frontend, backend, all

---

## 📚 Help & Documentation

### `/help-commands`
Lista todos os comandos disponíveis.

```bash
/help-commands [category]
```

**Categories**: quality, docker, git, workflow

---

## 🎯 Workflows Recomendados

### Pre-Commit Workflow

```bash
/lint --fix
/format
/type-check
/test
```

Ou simplesmente:
```bash
/quality-check --fix
```

---

### Pre-Deploy Workflow

```bash
/quality-check --full
/health-check all
/audit --level high
/build --analyze
```

---

### Debug Workflow

```bash
/health-check all
/docker-compose logs rag
/service-launcher status
```

---

## 📖 Documentação Completa

- **Code Quality**: [docs/content/development/code-quality-checklist.md](../../docs/content/development/code-quality-checklist.md)
- **Quick Reference**: [CODE-QUALITY-COMMANDS.md](../../CODE-QUALITY-COMMANDS.md)
- **Workflow System**: [scripts/workflows/README.md](../../scripts/workflows/README.md)
- **CLAUDE.md**: [CLAUDE.md](../../CLAUDE.md)

---

## 🔧 Criando Novos Comandos

Para criar um novo comando customizado:

1. Criar arquivo `.claude/commands/my-command.md`
2. Seguir o formato:

```markdown
# My Command

Descrição do comando.

## Usage

\`\`\`bash
/my-command [args]
\`\`\`

## Examples

\`\`\`bash
/my-command --option
\`\`\`

## Implementation

\`\`\`bash
# Bash commands here
echo "Hello from {{args}}"
\`\`\`
```

3. Reiniciar Claude Code ou recarregar comandos

---

## ⚙️ Configuração

### VSCode Integration

Instalar extensões recomendadas:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

### Git Hooks (Husky)

Setup pre-commit hooks:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

---

**Última Atualização**: 2025-11-02
**Total de Comandos**: 20+
