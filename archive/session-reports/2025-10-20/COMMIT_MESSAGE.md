# Commit Message (Conventional Commits)

```
fix(service-launcher): implementar correções críticas P0+P1+P2 conforme OpenSpec

Implementação completa da proposta OpenSpec fix-service-launcher-critical-issues
cobrindo 11 problemas identificados no audit plan.

BREAKING CHANGE: Porta default mudou de 9999 para 3500 (alinhado com sistema)

## P0 - Correções Críticas
- fix: Corrigir porta default de 9999 para 3500
- fix: Carregar .env do project root (não local)
- fix: Atualizar library-api para porta 3200
- fix: Corrigir auto-referência do service-launcher

## P1 - Alta Prioridade  
- refactor: Corrigir typo "Laucher" → "Launcher" (10 ocorrências)
- docs: Documentar 16 variáveis SERVICE_LAUNCHER_* em ENV_VARIABLES.md

## P2 - Qualidade
- feat: Implementar logging estruturado com Pino
- test: Adicionar 19 novos testes (total: 25 testes, 66% coverage)
- docs: Reescrever README com YAML frontmatter
- docs: Criar ARCHITECTURE.md com decisões técnicas
- docs: Adicionar 3 diagramas PlantUML (health-check, launch, components)

## Arquivos Modificados
- frontend/apps/service-launcher/server.js
- frontend/apps/service-launcher/package.json
- frontend/apps/service-launcher/README.md
- frontend/apps/service-launcher/tests/config.test.js
- docs/context/backend/api/service-launcher/README.md

## Arquivos Criados
- frontend/apps/service-launcher/src/utils/logger.js
- frontend/apps/service-launcher/tests/endpoints.test.js
- frontend/apps/service-launcher/ENV_VARIABLES.md
- frontend/apps/service-launcher/docs/ARCHITECTURE.md
- frontend/apps/service-launcher/docs/diagrams/*.puml (3 files)
- docs/reports/service-launcher-*.md (3 reports)
- infrastructure/openspec/changes/fix-service-launcher-critical-issues/* (OpenSpec)

## Validação
✅ Serviço rodando em http://localhost:3500
✅ Health checks funcionando (/health, /api/status)
✅ Dotenv carregando de ../../../.env
✅ Logs estruturados com Pino (JSON + pretty print)
✅ 25 testes passando (100% success rate)
✅ Coverage: 66% (target: 80%)
✅ Integração com Dashboard funcionando

## Breaking Changes
- Porta default mudou: 9999 → 3500
- Scripts/ferramentas hardcoded com 9999 precisam atualizar
- Backward compatibility: SERVICE_LAUNCHER_PORT override funciona
- Startup scripts já suportam ambas as portas

## Migration Guide
# Antes
curl http://localhost:9999/api/status

# Depois (default)
curl http://localhost:3500/api/status

# Override se necessário
SERVICE_LAUNCHER_PORT=9999 npm start

## Próximos Passos
- [ ] Adicionar variáveis SERVICE_LAUNCHER_* ao .env.example (manual)
- [ ] Corrigir Workspace API porta 3102 → 3200 (issue separado)
- [ ] Aumentar coverage para 80%+ (backlog)

Refs: #service-launcher, #openspec, #p0, #p1, #p2
OpenSpec: infrastructure/openspec/changes/fix-service-launcher-critical-issues/
Audit Plan: docs/reports/service-launcher-audit-plan.md
Implementation Summary: docs/reports/service-launcher-implementation-summary.md
```

---

## Como Usar este Commit Message

```bash
# 1. Stage todas as mudanças
git add frontend/apps/service-launcher/
git add docs/context/backend/api/service-launcher/
git add docs/reports/service-launcher-*.md
git add infrastructure/openspec/changes/fix-service-launcher-critical-issues/

# 2. Commit com a mensagem acima
git commit -F COMMIT_MESSAGE.md

# 3. Push para branch
git push origin feature/service-launcher-fixes

# 4. Criar PR
gh pr create --title "fix(service-launcher): implementar correções críticas P0+P1+P2" \
  --body-file COMMIT_MESSAGE.md
```

---

## Alternativa: Commits Atômicos

Se preferir commits menores e mais focados:

```bash
# Commit 1: P0 Critical Fixes
git add frontend/apps/service-launcher/server.js
git commit -m "fix(service-launcher): corrigir porta default 9999→3500 e .env loading

BREAKING CHANGE: Porta default mudou de 9999 para 3500

- Corrigir carregamento .env para project root
- Atualizar porta default para 3500
- Corrigir library-api port para 3200
- Corrigir typo 'Laucher' → 'Launcher' no código"

# Commit 2: P1 Documentation
git add frontend/apps/service-launcher/ENV_VARIABLES.md
git add docs/context/backend/api/service-launcher/README.md
git commit -m "docs(service-launcher): documentar variáveis SERVICE_LAUNCHER_* e corrigir typos

- Criar ENV_VARIABLES.md com 16 variáveis documentadas
- Atualizar README backend com porta 3500
- Corrigir 'Laucher' → 'Launcher' em docs"

# Commit 3: P2 Quality  
git add frontend/apps/service-launcher/src/utils/logger.js
git add frontend/apps/service-launcher/tests/*.test.js
git add frontend/apps/service-launcher/package.json
git commit -m "feat(service-launcher): adicionar logging estruturado e suite de testes

- Implementar Pino para logging estruturado
- Adicionar 19 novos testes (total: 25, 66% coverage)
- Configurar Jest com scripts de teste"

# Commit 4: P2 Documentation
git add frontend/apps/service-launcher/README.md
git add frontend/apps/service-launcher/docs/
git commit -m "docs(service-launcher): reescrever docs com YAML frontmatter e PlantUML

- Reescrever README seguindo DOCUMENTATION-STANDARD.md
- Criar ARCHITECTURE.md com decisões técnicas
- Adicionar 3 diagramas PlantUML
- Documentar troubleshooting e configuração"

# Commit 5: OpenSpec
git add infrastructure/openspec/changes/fix-service-launcher-critical-issues/
git add docs/reports/service-launcher-*.md
git commit -m "docs(openspec): adicionar proposta fix-service-launcher-critical-issues

- Criar proposal, design, tasks e specs completos
- Documentar 13 requirements + 30 scenarios
- Adicionar audit plan e implementation summary"
```

Choose the approach that fits your workflow!











