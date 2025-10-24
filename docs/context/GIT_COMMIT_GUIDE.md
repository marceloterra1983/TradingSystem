---
title: Service Launcher - Guia de Commit
sidebar_position: 1
tags: [guide, documentation]
domain: shared
type: guide
summary: Service Launcher - Guia de Commit
status: active
last_review: "2025-10-22"
---

# Service Launcher - Guia de Commit

## 🎯 Opção 1: Commit Único (Recomendado)

```bash
cd /home/marce/projetos/TradingSystem

# Stage todos os arquivos modificados/criados
git add apps/service-launcher/server.js
git add apps/service-launcher/package.json
git add apps/service-launcher/package-lock.json
git add apps/service-launcher/README.md
git add apps/service-launcher/ENV_VARIABLES.md
git add apps/service-launcher/IMPLEMENTATION_NOTES.md
git add apps/service-launcher/src/utils/logger.js
git add apps/service-launcher/tests/endpoints.test.js
git add apps/service-launcher/tests/config.test.js
git add apps/service-launcher/docs/ARCHITECTURE.md
git add apps/service-launcher/docs/diagrams/

git add docs/context/backend/api/service-launcher/README.md
git add docs/reports/service-launcher-audit-plan.md
git add docs/reports/service-launcher-openspec-proposal.md
git add docs/reports/service-launcher-implementation-summary.md

git add tools/openspec/changes/fix-service-launcher-critical-issues/

# Commit usando mensagem do arquivo
git commit -F COMMIT_MESSAGE.md

# Push
git push origin HEAD
```

---

## 🔄 Opção 2: Commits Atômicos

### Commit 1: Critical Fixes (P0)
```bash
git add apps/service-launcher/server.js

git commit -m "fix(service-launcher): corrigir porta default e .env loading (P0)

BREAKING CHANGE: Porta default mudou de 9999 para 3500

- fix: Carregar .env do project root (não local)
- fix: Porta default 3500 (alinhado com CLAUDE.md)
- fix: library-api porta 3200 (foi 3102)
- fix: Corrigir nome 'Laucher' → 'Launcher' em código
- test: Validado com curl http://localhost:3500/health

Refs: tools/openspec/changes/fix-service-launcher-critical-issues/"
```

### Commit 2: Documentation (P1)
```bash
git add apps/service-launcher/ENV_VARIABLES.md
git add docs/context/backend/api/service-launcher/README.md

git commit -m "docs(service-launcher): documentar variáveis SERVICE_LAUNCHER_* (P1)

- docs: Criar ENV_VARIABLES.md com 16 variáveis
- docs: Atualizar README backend com porta 3500
- docs: Corrigir typo 'Laucher' → 'Launcher' em docs

Refs: #service-launcher"
```

### Commit 3: Structured Logging (P2)
```bash
git add apps/service-launcher/src/utils/logger.js
git add apps/service-launcher/server.js

git commit -m "feat(service-launcher): implementar logging estruturado com Pino (P2)

- feat: Criar logger.js com Pino
- feat: Substituir console.log por logger estruturado
- feat: Eventos semânticos (startup, health_check, launch, etc)
- feat: Pretty print em dev, JSON em prod
- feat: Log levels configuráveis via env

Refs: #service-launcher"
```

### Commit 4: Test Suite (P2)
```bash
git add apps/service-launcher/tests/endpoints.test.js
git add apps/service-launcher/tests/config.test.js
git add apps/service-launcher/package.json

git commit -m "test(service-launcher): adicionar suite de testes completa (P2)

- test: Criar endpoints.test.js (12 testes)
- test: Atualizar config.test.js (7 testes)
- test: Configurar Jest no package.json
- test: 25 testes total, 66% coverage

Test Suites: 3 passed
Tests: 25 passed
Coverage: 66.46%

Refs: #service-launcher"
```

### Commit 5: Documentation (P2)
```bash
git add apps/service-launcher/README.md
git add apps/service-launcher/docs/
git add apps/service-launcher/IMPLEMENTATION_NOTES.md

git commit -m "docs(service-launcher): reescrever docs com YAML frontmatter e PlantUML (P2)

- docs: Reescrever README com YAML frontmatter
- docs: Criar ARCHITECTURE.md com decisões técnicas
- docs: Adicionar 3 diagramas PlantUML
- docs: Criar IMPLEMENTATION_NOTES.md

Segue DOCUMENTATION-STANDARD.md do projeto.

Refs: #service-launcher"
```

### Commit 6: OpenSpec & Reports
```bash
git add tools/openspec/changes/fix-service-launcher-critical-issues/
git add docs/reports/service-launcher-*.md
git add COMMIT_MESSAGE.md
git add GIT_COMMIT_GUIDE.md

git commit -m "docs(openspec): adicionar proposta fix-service-launcher-critical-issues

- docs: Criar OpenSpec proposal completo
- docs: 13 requirements + 30 scenarios
- docs: Audit plan e implementation summary
- docs: Commit guides e mensagens sugeridas

Refs: #openspec, #service-launcher"
```

---

## 📋 Verificação Antes do Commit

```bash
# 1. Verificar arquivos modificados
git status

# 2. Ver diff das mudanças principais
git diff apps/service-launcher/server.js | head -50

# 3. Rodar testes
cd apps/service-launcher
npm test

# 4. Verificar serviço funcionando
curl http://localhost:3500/health
curl http://localhost:3500/api/status | jq '.overallStatus'

# 5. Validar logs
tail -20 /tmp/service-launcher-pino.log
```

---

## 🚀 Após o Commit

### Criar Pull Request
```bash
# Opção 1: CLI do GitHub
gh pr create \
  --title "fix(service-launcher): implementar correções críticas P0+P1+P2" \
  --body-file COMMIT_MESSAGE.md \
  --label enhancement,bug,documentation

# Opção 2: Manual
# Ir para GitHub.com e criar PR manualmente
# Usar COMMIT_MESSAGE.md como descrição
```

### Checklist do PR
- [ ] Título descritivo com conventional commits
- [ ] Descrição completa (COMMIT_MESSAGE.md)
- [ ] Link para OpenSpec proposal
- [ ] Screenshots dos testes passando
- [ ] Link para docs atualizadas
- [ ] Menção a breaking changes
- [ ] Migration guide incluído

---

## 📊 Arquivos por Categoria

### Código Fonte (5 arquivos)
```bash
apps/service-launcher/server.js              # Modificado
apps/service-launcher/package.json           # Modificado
apps/service-launcher/src/utils/logger.js   # Novo
```

### Testes (2 arquivos)
```bash
apps/service-launcher/tests/endpoints.test.js  # Novo
apps/service-launcher/tests/config.test.js     # Modificado
```

### Documentação do Serviço (6 arquivos)
```bash
apps/service-launcher/README.md                 # Modificado
apps/service-launcher/ENV_VARIABLES.md          # Novo
apps/service-launcher/IMPLEMENTATION_NOTES.md   # Novo
apps/service-launcher/docs/ARCHITECTURE.md      # Novo
apps/service-launcher/docs/diagrams/*.puml      # Novo (3 files)
```

### Documentação Central (4 arquivos)
```bash
docs/context/backend/api/service-launcher/README.md      # Modificado
docs/reports/service-launcher-audit-plan.md              # Novo
docs/reports/service-launcher-openspec-proposal.md       # Novo
docs/reports/service-launcher-implementation-summary.md  # Novo
```

### OpenSpec (4 arquivos)
```bash
tools/openspec/changes/fix-service-launcher-critical-issues/proposal.md
tools/openspec/changes/fix-service-launcher-critical-issues/design.md
tools/openspec/changes/fix-service-launcher-critical-issues/tasks.md
tools/openspec/changes/fix-service-launcher-critical-issues/specs/service-launcher/spec.md
```

### Git Guides (2 arquivos)
```bash
COMMIT_MESSAGE.md    # Novo
GIT_COMMIT_GUIDE.md  # Novo (este arquivo)
```

**Total:** 20+ arquivos modificados/criados

---

## 🎯 Recomendação

**Para este caso, recomendo:**
- **Opção 1** (Commit único) se você quer merge rápido
- **Opção 2** (Commits atômicos) se você quer histórico detalhado

Ambos estão prontos para uso!













