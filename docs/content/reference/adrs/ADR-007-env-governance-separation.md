---
title: "ADR-007: Separação de Secrets e Defaults em Variáveis de Ambiente"
status: proposed
date: 2025-11-07
deciders: [SecurityEngineering, DevOps, Frontend Guild]
consulted: [Data Platform, Telegram Squad, TP Capital Squad]
informed: [All Developers]
tags:
  - adr
  - security
  - governance
  - configuration
---

# ADR-007: Separação de Secrets e Defaults em Variáveis de Ambiente

## Status

**PROPOSED** - Aguardando aprovação

## Context

O TradingSystem vem enfrentando conflitos recorrentes relacionados ao gerenciamento de variáveis de ambiente:

### Problema 1: Arquivo `.env` Monolítico
- `.env` contém 394 linhas misturando secrets e configurações
- Scripts sobrescrevem `.env` regularmente, causando perda de customizações locais
- Developer commitam secrets acidentalmente (~5% dos PRs)
- Dificuldade em identificar quais variáveis são sensíveis

### Problema 2: Política de Portas 7000 Nunca Implementada
- Documentação afirma que bancos de dados usam faixa 7000-7299
- Realidade: TimescaleDB usa 5433, QuestDB usa 9002
- `.env` declara portas fictícias (7000, 7011, 7012)
- Docker Compose usa portas reais diferentes
- Resultado: Confusão, scripts quebrados, debugging demorado

### Problema 3: Múltiplas Fontes de Verdade
- `.env` - declara portas (algumas fictícias)
- `docker-compose.yml` - implementa portas reais
- `docs/ports-services.mdx` - documenta portas (mix de real/fictício)
- `CLAUDE.md` - repete portas do `.env`
- Nenhuma fonte é autoritativa

### Impacto Medido
- ~5 horas/semana perdidas em debugging de configuração
- 18 incidentes/semana relacionados a portas/APIs
- 0% de cobertura de testes validando portas reais vs. declaradas

**Análise completa:** [`outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md`](../../../../outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md)

## Decision

Adotaremos uma **arquitetura de 3 camadas para variáveis de ambiente**:

### Arquitetura Proposta

```
config/
  .env.defaults       # ✅ Commitado - valores não-sensíveis
.env.local            # ❌ Gitignored - overrides locais
.env                  # ❌ Gitignored - secrets apenas
.env.example          # ✅ Commitado - template com placeholders
```

### Precedência de Carregamento

```javascript
// Ordem de carregamento (prioridade crescente)
dotenv.config({ path: 'config/.env.defaults' });  // 1. Defaults
dotenv.config({ path: '.env.local' });            // 2. Local overrides
dotenv.config({ path: '.env' });                  // 3. Secrets (maior prioridade)
```

### Decisão sobre Política de Portas 7000

**DECISÃO: Abandonar política 7000**

**Justificativa:**
1. Nunca foi implementada (portas reais estão em 5000-5499 e 9000-9299)
2. Não há benefício técnico em migrar todas as portas
3. Risco de quebrar ambientes existentes em produção
4. Faixas atuais funcionam bem e são documentadas

**Ação:**
- Remover todas as declarações fictícias de portas 7000-7299 do `.env`
- Usar apenas portas reais conforme `docker-compose.yml`
- Eleger `docker-compose.yml` como fonte autoritativa
- Auto-gerar documentação a partir dos compose files

### Definição de Secret vs. Default

**É SECRET se:**
- Nome termina com: `_KEY`, `_TOKEN`, `_PASSWORD`, `_PASS`, `_SECRET`
- Começa com: `OPENAI_`, `ANTHROPIC_`, `GITHUB_`, `SENTRY_`
- Contém dados de autenticação real

**É DEFAULT se:**
- Portas, URLs, flags booleanos
- Valores não sensíveis (log levels, pool sizes)
- Configurações commitáveis

### Exemplo Prático

**Antes (`.env` monolítico):**
```bash
# Tudo misturado
OPENAI_API_KEY=sk-real-key-here
WORKSPACE_PORT=3200
TIMESCALEDB_PORT=7000  # ❌ Porta fictícia!
LOG_LEVEL=info
```

**Depois (`config/.env.defaults` - commitado):**
```bash
# Apenas valores não-sensíveis
WORKSPACE_PORT=3200
TIMESCALEDB_PORT=5433  # ✅ Porta real!
LOG_LEVEL=info
```

**Depois (`.env` - gitignored):**
```bash
# Apenas secrets
OPENAI_API_KEY=sk-real-key-here
```

**Depois (`.env.local` - opcional, gitignored):**
```bash
# Overrides locais do developer
LOG_LEVEL=debug
WORKSPACE_PORT=3210  # Developer quer porta diferente
```

## Consequences

### Positivas

✅ **Segurança Aumentada**
- Secrets isolados em arquivo gitignored
- Menor risco de commits acidentais
- Auditoria facilitada (secrets em 1 arquivo)

✅ **Customização Preservada**
- Developer pode criar `.env.local` sem perder mudanças
- Scripts não sobrescrevem customizações
- Cada developer tem ambiente próprio

✅ **Documentação Consistente**
- `docker-compose.yml` = fonte de verdade
- Portas reais documentadas corretamente
- `CLAUDE.md` referencia docs/ports-services.mdx

✅ **Debugging Simplificado**
- Portas no `.env` == portas reais
- Sem portas fictícias causando confusão
- Validação automatizada em CI/CD

### Negativas

⚠️ **Migration Overhead**
- Developers precisam rodar script de migração
- Atualizar workflows locais (CI/CD, scripts)
- Documentação precisa ser reescrita

⚠️ **Curva de Aprendizado**
- Developer novo precisa entender 3 arquivos (vs. 1 antes)
- Treinamento necessário para equipe
- Mais complexidade inicial

⚠️ **Tooling Impact**
- Scripts existentes precisam carregar múltiplos arquivos
- Docker Compose precisa referenciar ambos
- CI/CD precisa ajustar env_file paths

### Neutras

🔵 **Port Policy Abandonment**
- Faixa 7000 removida da documentação
- Não impacta funcionalidade (nunca foi usada)
- Faixas atuais (5000-5499, 9000-9299) mantidas

## Implementation

### Fase 1: Critical Fix (2-3 horas)

**Script de Migração:**
```bash
bash scripts/governance/migrate-env-governance.sh --dry-run  # Preview
bash scripts/governance/migrate-env-governance.sh            # Execute
```

**Resultado:**
- ✅ `config/.env.defaults` criado
- ✅ `.env` reduzido (apenas secrets)
- ✅ `.env.local.example` criado
- ✅ `.env.backup-TIMESTAMP` criado

### Fase 2: Validation (1 semana)

**Atualizar scripts para carregar múltiplos arquivos:**
```bash
# scripts/start.sh
source config/.env.defaults
[[ -f .env.local ]] && source .env.local
source .env
```

**Adicionar validação em CI/CD:**
```bash
npm run governance:check  # Valida:
  # - .env não contém defaults
  # - Portas no .env == docker-compose
  # - Frontend sem localhost hardcoded
```

### Fase 3: Documentation (1 semana)

**Atualizar documentação:**
- ✅ `CLAUDE.md` - remover portas 7000, linkar ports-services.mdx
- ✅ `docs/ports-services.mdx` - eleger como fonte única
- ✅ `governance/controls/ENVIRONMENT-VARIABLES-POLICY.md` - atualizar
- ✅ `README.md` - adicionar instruções de setup

**Auto-geração de docs:**
```bash
npm run ports:sync  # Gera ports-services.mdx de docker-compose.yml
```

### Fase 4: Enforcement (1 mês)

**Pre-commit hooks:**
```yaml
# .pre-commit-config.yaml
- id: check-env-separation
  entry: bash scripts/governance/validate-env-separation.sh
  language: system
```

**CI/CD validation:**
```yaml
# .github/workflows/governance.yml
- name: Validate Environment Governance
  run: |
    bash scripts/env/validate-env.sh
    bash scripts/governance/validate-env-separation.sh
```

## Migration Guide

### Para Developers

**1. Backup seu `.env` atual:**
```bash
cp .env .env.my-backup
```

**2. Rodar migração:**
```bash
bash scripts/governance/migrate-env-governance.sh
```

**3. Revisar arquivos gerados:**
```bash
cat config/.env.defaults  # Verificar se não há secrets
cat .env                  # Verificar se só tem secrets
```

**4. (Opcional) Criar `.env.local` para customizações:**
```bash
cp .env.local.example .env.local
# Editar .env.local com portas customizadas, etc.
```

**5. Testar:**
```bash
bash scripts/start.sh --validate-env
```

### Para CI/CD

**Antes:**
```yaml
# GitHub Actions
- name: Load env
  run: |
    cp .env.example .env
    echo "OPENAI_API_KEY=${{ secrets.OPENAI_KEY }}" >> .env
```

**Depois:**
```yaml
# GitHub Actions
- name: Load env
  run: |
    # config/.env.defaults já está commitado
    # Apenas injetar secrets
    echo "OPENAI_API_KEY=${{ secrets.OPENAI_KEY }}" > .env
    echo "SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_TOKEN }}" >> .env
```

### Para Scripts

**Antes:**
```bash
# Script carrega apenas .env
source .env
```

**Depois:**
```bash
# Script carrega em ordem de precedência
source config/.env.defaults
[[ -f .env.local ]] && source .env.local
source .env
```

## Rollback Plan

Se houver problemas críticos:

**1. Restaurar backup:**
```bash
TIMESTAMP=<seu-timestamp>
cp .env.backup-$TIMESTAMP .env
```

**2. Remover arquivos novos:**
```bash
rm config/.env.defaults
rm .env.local.example
```

**3. Reverter commits:**
```bash
git revert <commit-hash-da-migração>
```

**Critérios para rollback:**
- Mais de 3 serviços falhando após migração
- CI/CD quebrado por mais de 2h
- Impossibilidade de carregar secrets

## Validation Criteria

**Migração é considerada bem-sucedida se:**

✅ Todos os serviços startam corretamente
✅ Nenhum secret encontrado em `config/.env.defaults`
✅ CI/CD valida arquivos automaticamente
✅ Developers conseguem criar `.env.local` sem conflitos
✅ Documentação reflete portas reais
✅ Zero incidentes de commit acidental de secrets

**Métricas de sucesso (30 dias):**
- Redução de 80% em incidentes de "API Indisponível"
- Zero commits com secrets expostos
- Redução de 50% em tempo de debugging de configuração

## References

- **Analysis Report:** [outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md](../../../../outputs/GOVERNANCE-CONFLICTS-ANALYSIS-2025-11-07.md)
- **Migration Script:** [scripts/governance/migrate-env-governance.sh](../../../../scripts/governance/migrate-env-governance.sh)
- **Governance Policy:** [governance/controls/ENVIRONMENT-VARIABLES-POLICY.md](../../../../governance/controls/ENVIRONMENT-VARIABLES-POLICY.md)
- **Secrets Policy:** [governance/policies/secrets-env-policy.md](../../../../governance/policies/secrets-env-policy.md)
- **Port Registry:** [docs/content/tools/ports-services.mdx](../../tools/ports-services.mdx)
- **Related ADR:** [ADR-003: Port Allocation Strategy](./ADR-003-port-allocation-strategy.md) (if exists)

## Decision Log

| Date | Decider | Action | Rationale |
|------|---------|--------|-----------|
| 2025-11-07 | Claude Code | Proposed ADR | Analysis revealed critical governance conflicts |
| TBD | SecurityEngineering | Review | Awaiting approval on secrets separation |
| TBD | DevOps | Review | Awaiting approval on CI/CD changes |
| TBD | All Stakeholders | Vote | Final decision on implementation |

## Next Steps

- [ ] Review by SecurityEngineering
- [ ] Review by DevOps
- [ ] Test migration in sandbox environment
- [ ] Update CI/CD pipelines
- [ ] Schedule team training session
- [ ] Execute migration in development
- [ ] Monitor for 1 week
- [ ] Execute migration in production

---

**Status:** 🟡 PROPOSED - Awaiting stakeholder review
**Owner:** SecurityEngineering
**Last Updated:** 2025-11-07
