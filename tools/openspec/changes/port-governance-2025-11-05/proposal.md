# Port Governance & Connectivity - Proposal

**Status:** DRAFT  
**Created:** 2025-11-05  
**Owner:** Platform Architecture  
**Priority:** P0 (Critical)  
**Complexity:** High  
**Estimated Effort:** 4-5 weeks

---

## Executive Summary

Implementar governança centralizada de portas em todo o ecossistema TradingSystem, eliminando conflitos, hardcoded ports, e dependências frágeis de conectividade (ex.: Telegram MTProto fora de rede Docker).

**Objetivos:**
1. Registro único autoritativo de todas as portas (`config/ports/registry.yaml`)
2. Geração automatizada de configurações (env, compose, docs)
3. Validação obrigatória em CI/CD (rejeitar PRs com portas fora do registro)
4. Containerização completa (eliminar dependências host/localhost)
5. Governança formal com ADR e processo de aprovação

---

## Problem Statement

### Current State

**Problemas identificados:**

1. **Portas Hardcoded Espalhadas**
   - Compose files: `ports: "3103:3103"`, `ports: "4010:4010"`
   - Scripts: `curl http://localhost:4007`, `PORT=3200 npm start`
   - Env files: múltiplos `.env` com valores conflitantes
   - Documentação: portas desatualizadas ou duplicadas

2. **Conflitos Frequentes**
   - Serviços competindo pela mesma porta
   - Mudanças quebram ambiente de outros desenvolvedores
   - Containers falhando com "port already in use"

3. **Conectividade Frágil**
   - **Caso Telegram:** Gateway API (Docker) → MTProto (nativo) usando `localhost:4007`
   - De dentro do container, `localhost` = próprio container
   - Resultado: `ECONNREFUSED`, sincronização quebrada

4. **Falta de Governança**
   - Nenhum processo formal para alocar portas
   - Desenvolvedores escolhem portas arbitrárias
   - Sem documentação centralizada
   - Sem validação automatizada

5. **Manutenção Custosa**
   - Mudança de porta requer edição manual em 10+ arquivos
   - Docs desatualizados
   - Troubleshooting demorado

### Impact

**Severidade:** 🔴 **CRÍTICA**

- **Dev Experience:** desenvolvedores perdem 2-3h/semana com conflitos de porta
- **Produção:** sincronização Telegram quebrada (0 mensagens novas)
- **Escalabilidade:** impossível adicionar serviços sem risco
- **Documentação:** 30%+ das portas documentadas estão incorretas
- **CI/CD:** builds falhando por conflitos intermitentes

**Estatísticas Atuais:**
- **Serviços:** 30+ serviços ativos
- **Portas em uso:** ~50 portas
- **Conflitos/mês:** 8-12 incidentes
- **Tempo médio de resolução:** 1-2 horas
- **Documentação atualizada:** <70%

---

## Proposed Solution

### High-Level Approach

**Princípios:**

1. **Single Source of Truth:** `config/ports/registry.yaml`
2. **Automation:** geração automatizada, não manual
3. **Validation:** CI/CD bloqueia mudanças inválidas
4. **Containerization:** eliminar dependências host
5. **Documentation:** sempre atualizada (gerada)

### Solution Components

#### 1. Port Registry (`config/ports/registry.yaml`)

```yaml
version: "1.0.0"
lastUpdated: "2025-11-05"

# Port Ranges (Reserved)
ranges:
  frontend: "3100-3199"
  documentation: "3200-3299"
  tools: "3300-3399"
  apis: "3400-3499"
  external-integrations: "4000-4099"
  databases-timescale: "5400-5499"
  databases-postgres: "5500-5599"
  redis: "6300-6399"
  pgbouncer: "6400-6499"
  rabbitmq: "5600-5699"
  monitoring: "9100-9199"

# Services
services:
  # Frontend Stack
  - name: dashboard
    stack: frontend
    port: 3103
    protocol: http
    owner: Frontend Team
    description: "Main React Dashboard"
    container: true
    
  # Documentation Stack
  - name: docs-hub
    stack: documentation
    port: 3400
    protocol: http
    owner: Documentation Team
    description: "Docusaurus Documentation Hub"
    container: true
    
  # API Stack
  - name: workspace-api
    stack: apis
    port: 3200
    protocol: http
    owner: Backend APIs
    description: "Workspace API (TimescaleDB)"
    container: true
    
  # Telegram Stack
  - name: telegram-mtproto
    stack: external-integrations
    port: 4007
    protocol: http
    owner: Telegram Team
    description: "MTProto Gateway (Native Telegram Connection)"
    container: true  # MUDANÇA: containerizar
    network: telegram_net
    
  - name: telegram-gateway-api
    stack: external-integrations
    port: 4010
    protocol: http
    owner: Telegram Team
    description: "Telegram Gateway REST API"
    container: true
    network: telegram_net
    depends_on:
      - telegram-mtproto
      - telegram-timescale
      - telegram-redis-master
    
  # Database Stack
  - name: telegram-timescale
    stack: databases-timescale
    port: 5434
    protocol: postgres
    owner: Database Team
    description: "TimescaleDB for Telegram Messages"
    container: true
    
  # Redis Stack
  - name: telegram-redis-master
    stack: redis
    port: 6379
    protocol: redis
    owner: Cache Team
    description: "Redis Master"
    container: true
    
  # ... (outros 25+ serviços)
```

#### 2. Port Sync Tool (`tools/ports/sync.js`)

```javascript
/**
 * Port Registry Sync Tool
 * Generates configuration files from registry.yaml
 */
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Read registry
const registry = yaml.load(
  fs.readFileSync('config/ports/registry.yaml', 'utf8')
);

// Generate .env.shared
generateEnvShared(registry.services);

// Generate compose files
generateComposeFiles(registry.services);

// Generate documentation
generatePortsDocs(registry);

// Generate health check script
generateHealthScript(registry.services);
```

#### 3. CI/CD Validation (`.github/workflows/port-governance.yml`)

```yaml
name: Port Governance Check

on: [pull_request, push]

jobs:
  validate-ports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Registry Schema
        run: npm run ports:validate
      
      - name: Check for Duplicates
        run: npm run ports:duplicates
      
      - name: Verify Generated Files
        run: |
          npm run ports:sync
          git diff --exit-code || (echo "❌ Generated files out of sync! Run 'npm run ports:sync'" && exit 1)
      
      - name: Check Hardcoded Ports
        run: npm run ports:scan-hardcoded
```

#### 4. MTProto Containerization

**Antes:**
```yaml
# MTProto rodando nativamente no host
# Gateway API tentando conectar em localhost:4007
```

**Depois:**
```yaml
services:
  telegram-mtproto:
    container_name: telegram-mtproto
    build:
      context: ./apps/telegram-gateway
      dockerfile: Dockerfile
    environment:
      - PORT=${TELEGRAM_MTPROTO_PORT:-4007}
      - TELEGRAM_API_ID=${TELEGRAM_API_ID}
      - TELEGRAM_API_HASH=${TELEGRAM_API_HASH}
    networks:
      - telegram_net
    ports:
      - "${TELEGRAM_MTPROTO_PORT:-4007}:4007"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4007/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    
  telegram-gateway-api:
    depends_on:
      telegram-mtproto:
        condition: service_healthy
    environment:
      - MTPROTO_SERVICE_URL=http://telegram-mtproto:4007
    networks:
      - telegram_net
```

#### 5. Governance Process (ADR-015)

```markdown
# ADR-015: Port Governance Policy

## Decision
Implement centralized port registry with CI enforcement.

## Process for New Ports
1. Developer proposes port in PR (edit registry.yaml)
2. Run `npm run ports:sync` to generate configs
3. Architecture committee reviews (3 approvers)
4. CI validates (schema, duplicates, range)
5. Merge only after approval + CI green

## Port Ranges
- Frontend: 3100-3199
- APIs: 3400-3499
- ... (see registry)

## Enforcement
- CI blocks PRs with invalid ports
- Pre-commit hook runs ports:sync
- Quarterly audit of compliance
```

---

## Benefits

### For Developers
- ✅ **Zero Conflicts:** portas gerenciadas centralmente
- ✅ **Auto-Docs:** documentação sempre atualizada
- ✅ **Fast Onboarding:** uma fonte, processo claro
- ✅ **CI Safety:** PRs validados automaticamente

### For Operations
- ✅ **Predictability:** portas fixas, sem surpresas
- ✅ **Health Monitoring:** script gerado automaticamente
- ✅ **Disaster Recovery:** configuração reproduzível
- ✅ **Audit Trail:** mudanças rastreadas via Git

### For Architecture
- ✅ **Governance:** processo formal de aprovação
- ✅ **Scalability:** faixas reservadas para crescimento
- ✅ **Standards:** padrões enforced via CI
- ✅ **Visibility:** registry como inventário completo

### Metrics

**Antes:**
- Conflitos/mês: 8-12
- Tempo de resolução: 1-2h
- Docs atualizados: 70%
- Hardcoded ports: ~50

**Depois (projetado):**
- Conflitos/mês: 0-1
- Tempo de resolução: 5-10min
- Docs atualizados: 100% (gerados)
- Hardcoded ports: 0 (bloqueados por CI)

---

## Risks & Mitigations

### Risk 1: Breaking Changes
**Risk:** Mudanças em portas quebram ambientes locais  
**Severity:** Medium  
**Mitigation:**
- Comunicação prévia (Slack + email + changelog)
- Script de migração (`npm run ports:migrate-local`)
- Rollout gradual (stack por stack)
- Período de transição (2 semanas com portas antigas + novas)

### Risk 2: MTProto Containerization
**Risk:** MTProto depende de DLLs/credenciais do host  
**Severity:** High  
**Mitigation:**
- Validar requisitos antes de containerizar
- Se necessário, manter `host.docker.internal` como fallback
- Documentar limitações
- Plano B: registry com `container: false` para MTProto

### Risk 3: CI Overhead
**Risk:** Validação de portas torna CI lento  
**Severity:** Low  
**Mitigation:**
- Validação rápida (~10s)
- Rodar só em PRs (não em push para main)
- Cache de validação

### Risk 4: Team Resistance
**Risk:** Time ignora processo, edita portas manualmente  
**Severity:** Medium  
**Mitigation:**
- Workshop de onboarding
- Pre-commit hook automatiza sync
- CI bloqueia (não apenas alerta)
- Revisão trimestral de compliance

---

## Success Criteria

### Must Have (MVP)
- ✅ Registry YAML com 100% dos serviços atuais
- ✅ Script sync gerando env + compose + docs
- ✅ CI job validando portas (blocking)
- ✅ MTProto containerizado OU fallback documentado
- ✅ ADR-015 aprovado e publicado

### Should Have
- ✅ Pre-commit hook para ports:sync
- ✅ Health check script gerado
- ✅ Grafana dashboard com portas (opcional)
- ✅ Guia de onboarding atualizado

### Nice to Have
- 🔄 CLI interativa para alocar portas (`npm run ports:new`)
- 🔄 Alertas Slack para mudanças de porta
- 🔄 Painel web com visualização do registry

---

## Stakeholders

| Role | Name | Responsibility |
|------|------|----------------|
| **Owner** | Platform Architecture | Design, approval, coordination |
| **Contributors** | Backend APIs Team | Migrate API services |
| **Contributors** | Frontend Team | Migrate Dashboard |
| **Contributors** | Telegram Team | MTProto containerization |
| **Contributors** | DevOps/Infra | CI/CD + compose updates |
| **Reviewers** | Tech Leads (Backend, Frontend, Infra) | Review + approval |
| **Informed** | All Developers | Communication, training |

---

## Next Steps

1. **Review Proposal** (This Week)
   - Circulate to stakeholders
   - Gather feedback
   - Refine scope/timeline

2. **Create Design Doc** (Next Week)
   - Detailed architecture
   - File structure
   - API contracts
   - Migration plan

3. **Create Tasks** (Next Week)
   - Break into implementable chunks
   - Assign owners
   - Estimate effort

4. **Approval Gate** (Week 3)
   - Architecture committee review
   - Approve/reject/iterate

5. **Implementation** (Week 3-5)
   - Execute tasks
   - Incremental rollout
   - Monitor + adjust

---

## Open Questions

1. **MTProto:** Containerização é viável ou precisamos de fallback permanente?
2. **Rollout:** Big bang ou gradual (stack por stack)?
3. **Monitoring:** Integramos com Grafana agora ou em fase 2?
4. **Legacy:** Há serviços deprecados que podemos ignorar?
5. **External:** APIs externas (fora do nosso controle) entram no registry?

---

## References

- Telegram Diagnostic Report: `TELEGRAM-DIAGNOSTIC-REPORT-2025-11-05.md`
- Current Port Docs: `docs/content/tools/ports-services.mdx`
- Compose Files: `tools/compose/docker-compose.*.yml`
- OpenSpec Guide: `tools/openspec/AGENTS.md`

---

**Approval Required From:**
- [ ] Tech Lead Backend
- [ ] Tech Lead Frontend  
- [ ] DevOps Lead
- [ ] Platform Architect

**Status:** DRAFT - Awaiting Review

