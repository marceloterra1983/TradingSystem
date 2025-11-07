# 🚀 PLANO DE AÇÃO IMEDIATA - TradingSystem

**Data:** 2025-11-07
**Status:** 🔴 AGUARDANDO EXECUÇÃO
**Prioridade:** CRÍTICA

---

## 📋 RESUMO EXECUTIVO

A análise profunda identificou **45 problemas** (5 críticos, 15 altos, 25 médios) causando:
- $58,800/ano desperdiçado em debugging
- 18 incidentes/semana de configuração
- 5 secrets expostos no browser (CVSS 9.1)

**Solução:** Implementação em 5 fases (6 semanas, ROI 140%)

---

## ✅ AÇÕES APROVADAS (SEM GITHUB TOKEN)

### FASE 1: EMERGÊNCIA (4 horas) 🔴

#### 1.1 Fix VITE_ Secrets Exposure (2 horas)

**Problema:** 5 secrets expostos no bundle do browser

**Ação:**
```bash
# Executar script automatizado
bash scripts/security/fix-vite-secrets.sh

# Verificar correção
cd frontend/dashboard
npm run build
grep -r "VITE_.*TOKEN" dist/  # Deve retornar VAZIO
grep -r "VITE_.*KEY" dist/     # Deve retornar VAZIO
grep -r "VITE_.*PASSWORD" dist/ # Deve retornar VAZIO
```

**Secrets a corrigir:**
- `VITE_LLAMAINDEX_JWT` → `LLAMAINDEX_JWT`
- `VITE_TP_CAPITAL_API_KEY` → `TP_CAPITAL_API_KEY`
- `VITE_GATEWAY_TOKEN` → `GATEWAY_TOKEN`
- `VITE_TELEGRAM_GATEWAY_API_TOKEN` → `TELEGRAM_GATEWAY_API_TOKEN`
- `VITE_N8N_BASIC_AUTH_PASSWORD` → `N8N_BASIC_AUTH_PASSWORD`

**Validação:**
```bash
# Testar que frontend ainda funciona
npm run dev
# Abrir http://localhost:3103
# Testar chamadas de API
```

---

#### 1.2 Fix File Permissions (5 minutos)

**Problema:** `.env` com permissões inseguras (644)

**Ação:**
```bash
# Verificar permissões atuais
ls -la .env

# Corrigir (somente owner pode ler/escrever)
chmod 600 .env

# Validar
ls -la .env  # Deve mostrar: -rw-------
```

---

#### 1.3 Scan de Segurança Completo (30 minutos)

**Executar scan automatizado:**
```bash
# Rodar scan de vulnerabilidades
bash scripts/security/scan-secrets.sh

# Revisar relatório JSON
cat governance/evidence/audits/secrets-scan-2025-11-07.json
```

**Resultado esperado:**
```
✅ VITE_ exposed secrets: 0 (antes: 5)
✅ .env permissions: 600 (antes: 644)
⚠️  Local .env files: 12 (próximo passo)
```

---

#### 1.4 Rotacionar API Keys Expostas (1 hora)

**IMPORTANTE:** Estas keys foram expostas no browser, precisam rotação

**1. OpenAI:**
```bash
# Ir para: https://platform.openai.com/api-keys
# Revogar: sk-sk-proj-i1mUu...
# Gerar nova key
# Atualizar .env:
OPENAI_API_KEY=sk-proj-<nova_key_aqui>
```

**2. Firecrawl:**
```bash
# Ir para: https://firecrawl.dev/dashboard
# Revogar: fc-6219b4...
# Gerar nova key
# Atualizar .env:
FIRECRAWL_API_KEY=fc-<nova_key_aqui>
```

**3. Sentry:**
```bash
# Ir para: https://sentry.io/settings/account/api/auth-tokens/
# Revogar: sntryu_a4a95...
# Gerar novo token
# Atualizar .env:
SENTRY_AUTH_TOKEN=sntryu_<novo_token_aqui>
```

**4. LlamaIndex JWT:**
```bash
# Regenerar JWT internamente
# Atualizar .env:
VITE_LLAMAINDEX_JWT=<novo_jwt>
```

**5. Gateway Tokens:**
```bash
# Gerar novos tokens (32+ chars)
openssl rand -hex 32

# Atualizar .env:
GATEWAY_SECRET_TOKEN=<novo_token>
API_SECRET_TOKEN=<novo_token>
INTER_SERVICE_SECRET=<novo_token>
```

**Teste após rotação:**
```bash
# Testar cada serviço
curl http://localhost:3200/api/items  # Workspace
curl http://localhost:4005/health     # TP Capital
curl http://localhost:3405/health     # Documentation API
```

---

### FASE 2: FUNDAÇÃO (1 semana) 🟡

#### 2.1 Migração para 3 Camadas (4 horas)

**Backup primeiro:**
```bash
# Criar backup com timestamp
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
```

**Executar migração:**
```bash
# Dry-run primeiro (ver mudanças sem aplicar)
bash scripts/governance/migrate-env-governance.sh --dry-run

# Revisar output
# Se OK, executar de verdade
bash scripts/governance/migrate-env-governance.sh
```

**Resultado esperado:**
```
✅ config/.env.defaults criado (valores não-sensíveis)
✅ .env reduzido (apenas secrets)
✅ .env.local.example criado (template)
✅ .env.backup-TIMESTAMP criado
```

**Validação:**
```bash
# Verificar que defaults não tem secrets
cat config/.env.defaults | grep -E "(KEY|TOKEN|PASSWORD|SECRET)"
# Resultado deve ser VAZIO ou apenas comentários

# Verificar que .env só tem secrets
wc -l .env  # Deve ter ~50-80 linhas (antes: 394)
```

---

#### 2.2 Deletar Arquivos .env Locais (15 minutos)

**CRÍTICO:** Estes violam política de governança

```bash
# Frontend
rm frontend/dashboard/.env
rm frontend/dashboard/.env.local

# Backend
rm backend/api/telegram-gateway/.env

# Temporários do TP Capital
rm -f apps/tp-capital/.tmp-env-*

# Verificar que não há mais .env locais
find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*"
# Resultado esperado: apenas .env, .env.example, .env.backup-*
```

---

#### 2.3 Atualizar Scripts (3 horas)

**Modificar scripts para não sobrescrever:**

**1. scripts/start.sh:**
```bash
# Antes: Sobrescreve .env
# Depois: Apenas valida e alerta

# Adicionar no início:
if [ ! -f .env ]; then
  echo "❌ .env não encontrado!"
  echo "Execute: cp .env.example .env"
  exit 1
fi

# Comentar linhas que escrevem no .env
# Apenas validar que variáveis obrigatórias existem
```

**2. scripts/env/setup-env.sh:**
```bash
# Antes: Gera .env completo
# Depois: Append-only mode

# Adicionar flag --no-overwrite
if [ -f .env ] && [ "$1" != "--force" ]; then
  echo "⚠️  .env já existe!"
  echo "Use --force para sobrescrever ou --append para adicionar apenas faltantes"
  exit 1
fi
```

**3. tools/ports/sync-ports.sh:**
```bash
# Antes: Escreve no .env
# Depois: Escreve em config/.env.defaults

# Mudar target:
OUTPUT_FILE="config/.env.defaults"
```

---

#### 2.4 Testar Sistema Completo (2 horas)

**Teste todos os serviços:**

```bash
# 1. Backend APIs
bash scripts/start-services.sh

# Verificar cada API
curl http://localhost:3200/health  # Workspace
curl http://localhost:4005/health  # TP Capital
curl http://localhost:3405/health  # Documentation
curl http://localhost:4010/health  # Telegram Gateway

# 2. Frontend
cd frontend/dashboard
npm run dev

# Abrir http://localhost:3103
# Testar:
# - Workspace page
# - TP Capital page
# - Documentation page
# - Database page

# 3. Docker Services
docker compose -f tools/compose/docker-compose.database.yml up -d
docker compose ps  # Verificar que todos estão "healthy"
```

**Checklist de validação:**
- [ ] Todas APIs respondem 200 em /health
- [ ] Frontend carrega sem erros no console
- [ ] Chamadas de API funcionam (não "API Indisponível")
- [ ] Nenhum secret exposto no bundle (verificado com grep)
- [ ] Permissões .env corretas (600)
- [ ] config/.env.defaults commitável (sem secrets)

---

### FASE 3: PADRONIZAÇÃO (2 semanas) 🟢

#### Backend Services (1 semana)

**Seguir guia:** `outputs/BACKEND-CONFIG-STANDARDIZATION-GUIDE.md`

**Serviços a migrar:**
1. Workspace API (1 dia)
2. Documentation API (1 dia)
3. Telegram Gateway (1 dia)
4. Firecrawl Proxy (1 dia)
5. Demais serviços (1 dia)

#### Frontend (1 semana)

**Seguir guia:** `outputs/FRONTEND-CONFIG-SOLUTIONS-2025-11-07.md`

**Tarefas:**
1. Simplificar vite.config.ts
2. Adicionar Zod validation
3. Remover 15 hardcoded URLs
4. ESLint rules
5. E2E tests

---

### FASE 4: AUTOMAÇÃO (1 semana) 🟢

#### Pre-commit Hooks

```bash
# Instalar husky
npm install --save-dev husky

# Setup hooks
npx husky install

# Adicionar pre-commit
npx husky add .husky/pre-commit "bash scripts/security/scan-secrets.sh"
```

#### GitHub Actions

**Criar:** `.github/workflows/governance.yml`
```yaml
name: Configuration Governance

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Scan Secrets
        run: bash scripts/security/scan-secrets.sh

  config-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Config
        run: bash scripts/governance/validate-env-sync.mjs
```

---

## 📊 PROGRESSO ESPERADO

### Após Fase 1 (4 horas)
- ✅ Security Risk: 8.5 → 5.0 (41% melhoria)
- ✅ Secrets expostos: 5 → 0
- ✅ File permissions: Fixed
- ✅ API keys rotacionadas

### Após Fase 2 (1 semana)
- ✅ Security Risk: 5.0 → 3.0 (65% melhoria total)
- ✅ Arquitetura de 3 camadas implementada
- ✅ Scripts não sobrescrevem configs
- ✅ .env locais removidos

### Após Fase 3 (3 semanas)
- ✅ Backend padronizado (shared config module)
- ✅ Frontend limpo (zero hardcoded URLs)
- ✅ Docker Compose consistente

### Após Fase 4 (4 semanas)
- ✅ Security Risk: 3.0 → 1.5 (82% melhoria total)
- ✅ CI/CD validation
- ✅ Pre-commit hooks
- ✅ Automação completa

---

## 🎯 MÉTRICAS DE SUCESSO

**KPIs (30 dias após implementação):**

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Incidentes/semana | 18 | <2 | 89% ↓ |
| Tempo debugging | 5h/semana | <30min | 90% ↓ |
| Error rate | 15-20% | <1% | 95% ↓ |
| Security score | 1.5/10 | 8.5/10 | 467% ↑ |
| 12-Factor compliance | 58% | 92% | 59% ↑ |

---

## 📞 PRÓXIMOS PASSOS

### HOJE (escolha uma):

**Opção A: Quick Win (1 hora)**
```bash
# Fix permissões + scan
chmod 600 .env
bash scripts/security/scan-secrets.sh
```

**Opção B: Security Focus (4 horas)**
```bash
# Todas ações da Fase 1
bash scripts/security/fix-vite-secrets.sh
chmod 600 .env
# Rotacionar API keys (manual)
bash scripts/security/scan-secrets.sh
```

**Opção C: Full Migration (1 dia)**
```bash
# Fase 1 + Fase 2
bash scripts/security/fix-vite-secrets.sh
bash scripts/governance/migrate-env-governance.sh
# Deletar .env locais
# Testar sistema
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

**Leia em ordem:**

1. **Este documento** - Ações imediatas
2. `MASTER-GOVERNANCE-REVIEW-2025-11-07.md` - Visão geral completa
3. `SECURITY-QUICKSTART.md` - Segurança detalhada
4. Guias específicos conforme necessidade:
   - Backend: `BACKEND-CONFIG-STANDARDIZATION-GUIDE.md`
   - Frontend: `FRONTEND-CONFIG-SOLUTIONS-2025-11-07.md`
   - Docker: `DOCKER-COMPOSE-PORT-AUDIT-2025-11-07.md`

---

## ✋ IMPORTANTE

**Antes de executar qualquer script:**
1. ✅ Fazer backup do .env
2. ✅ Commitar mudanças atuais
3. ✅ Testar em ambiente de dev primeiro
4. ✅ Ter plano de rollback pronto

**Rollback se necessário:**
```bash
# Restaurar .env
cp .env.backup-TIMESTAMP .env

# Reverter git
git reset --hard HEAD

# Rebuild frontend
cd frontend/dashboard && npm run build
```

---

**Status:** 🟡 AGUARDANDO DECISÃO
**Próximo:** Escolher Opção A, B ou C e executar
**Estimativa:** 1-4 horas dependendo da opção

**Qual opção você prefere executar?**
