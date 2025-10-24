---
title: Scripts antigos com porta hardcoded
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: O Service Launcher é um serviço auxiliar Node.js/Express que orquestra serviços locais e monitora sua saúde. Atualmente possui problemas críticos que ...
status: active
last_review: "2025-10-23"
---

## Context
O Service Launcher é um serviço auxiliar Node.js/Express que orquestra serviços locais e monitora sua saúde. Atualmente possui problemas críticos que impedem funcionamento correto e violam padrões do projeto TradingSystem.

**Stakeholders:**
- Operações: Precisa de monitoramento confiável
- Frontend (Dashboard): Consome `/api/status` para exibir saúde dos serviços
- Desenvolvedores: Precisam configurar e debugar facilmente

**Constraints:**
- Deve ser compatível com Windows e Linux/WSL
- Não pode introduzir novas dependências externas (apenas Pino para logs)
- Deve manter backward compatibility temporária (scripts suportam 9999 e 3500)
- Precisa seguir padrões do projeto (CLAUDE.md, DOCUMENTATION-STANDARD.md)

## Goals / Non-Goals

### Goals
- ✅ Corrigir problemas críticos que impedem funcionamento (P0)
- ✅ Estabelecer consistência profissional (corrigir typo "Laucher")
- ✅ Simplificar configuração via variáveis de ambiente centralizadas
- ✅ Melhorar qualidade com testes e logging estruturado
- ✅ Documentar adequadamente seguindo padrões do projeto

### Non-Goals
- ❌ Adicionar novas funcionalidades (circuit breaker, Prometheus metrics)
- ❌ Reescrever em outra linguagem ou framework
- ❌ Suporte para containers (serviço roda nativamente)
- ❌ Integração com sistemas externos de alertas
- ❌ Mudanças em outros serviços além do Service Launcher

## Decisions

### Decision 1: Porta Default 3500 (não 9999)
**Escolha:** Mudar default de 9999 para 3500

**Rationale:**
- Sistema já espera 3500 (Dashboard, scripts, documentação)
- Apenas o código usava 9999 (erro de configuração inicial)
- Alinhamento com portas do projeto (3xxx para APIs)
- Scripts de startup já suportam ambas as portas como fallback

**Alternatives considered:**
- Manter 9999: Requeriria atualizar +25 arquivos de documentação e configuração
- Usar variável sem default: Forçaria configuração manual sempre
- Escolhido: 3500 como default + variável para override

**Migration:**
```bash
# Scripts antigos com porta hardcoded
curl http://localhost:9999/api/status  # ❌ Vai falhar

# Solução 1: Remover hardcoded, usar default 3500
curl http://localhost:3500/api/status  # ✅ Funciona

# Solução 2: Override se necessário
SERVICE_LAUNCHER_PORT=9999 npm start  # ✅ Backward compat
```

### Decision 2: Carregamento .env do Root
**Escolha:** Carregar `.env` do root do projeto, não local

**Rationale:**
- Padrão estabelecido no CLAUDE.md para TODOS os serviços
- Permite configuração centralizada e consistente
- Evita duplicação de variáveis em múltiplos `.env` locais
- Facilita DevOps e automação

**Implementation:**
```javascript
// ❌ ANTES (errado)
require('dotenv').config();

// ✅ DEPOIS (correto)
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
```

**Alternatives considered:**
- Manter .env local: Viola padrão, dificulta configuração
- Usar variáveis de sistema: Menos explícito, dificulta onboarding
- Escolhido: Root .env + defaults razoáveis no código

### Decision 3: Logging Estruturado com Pino
**Escolha:** Implementar logging com Pino (não console.log)

**Rationale:**
- Pino já é usado em outros serviços do projeto (Workspace API)
- Formato JSON estruturado facilita parsing e análise
- Suporta níveis de log e metadata
- Performance superior ao Winston/Bunyan

**Implementation:**
```javascript
const pino = require('pino');
const logger = pino({
  level: process.env.SERVICE_LAUNCHER_LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    }
  }
});

// Uso
logger.info({ serviceName, port, latencyMs }, 'Service health check completed');
logger.error({ error: err.message, stack: err.stack }, 'Health check failed');
```

**Alternatives considered:**
- Manter console.log: Não estruturado, dificulta parsing
- Winston: Mais pesado, overkill para este caso
- Custom logger: Reinventar a roda, não recomendado
- Escolhido: Pino (padrão do projeto, leve, estruturado)

### Decision 4: Suite de Testes Completa
**Escolha:** Implementar testes com estrutura existente (Jest/Supertest)

**Coverage targets:**
- Endpoints: 100% (são críticos)
- Configuration: 100% (evita regressões)
- Utils: 80%+ (funções auxiliares)
- Overall: 80%+

**Test structure:**
```
tests/
├── endpoints.test.js    # GET /health, GET /api/status, POST /launch
├── config.test.js       # Carregamento de env vars, defaults
└── integration.test.js  # CORS, rate limiting, Dashboard integration
```

**Rationale:**
- Service Launcher é crítico para monitoramento do sistema
- Bugs podem causar falsos positivos/negativos em health checks
- Testes previnem regressões durante refactoring
- Melhora confiança para deploy

**Alternatives considered:**
- Testes manuais apenas: Não escalável, propenso a erros
- E2E apenas: Muito lento, dificulta debugging
- Escolhido: Unit + Integration tests (rápido, confiável, escalável)

### Decision 5: Documentação Reestruturada
**Escolha:** Criar docs/ directory com arquivos especializados

**Structure:**
```
apps/service-launcher/
├── README.md              # Overview + Quick Start
└── docs/
    ├── ARCHITECTURE.md    # Design decisions
    ├── API.md             # Endpoint reference
    ├── CONFIGURATION.md   # Environment variables
    └── TROUBLESHOOTING.md # Common problems
```

**Rationale:**
- Separação de concerns (overview vs detalhes técnicos)
- Facilita navegação e manutenção
- Segue DOCUMENTATION-STANDARD.md do projeto
- Inclui diagramas PlantUML para arquitetura

**Alternatives considered:**
- README gigante: Difícil de navegar, não escalável
- Wiki externa: Desconexão do código, não versionado
- Escolhido: Docs locais + links para docs/context/ central

## Risks / Trade-offs

### Risk 1: Breaking Changes na Porta
**Risk:** Scripts/ferramentas que usam porta 9999 hardcoded vão quebrar

**Mitigation:**
- Scripts de startup já suportam ambas as portas (9999 e 3500)
- Documentar migration guide claramente
- Adicionar warning logs quando porta não-default é usada
- Manter suporte para SERVICE_LAUNCHER_PORT override

**Impact:** Baixo (maioria já usa 3500, scripts têm fallback)

### Risk 2: Typo Correction em ~90 Arquivos
**Risk:** Substituição em massa pode introduzir erros não detectados

**Mitigation:**
- Usar busca case-sensitive: `rg "Laucher"` (não catch "launcher" correto)
- Revisar cada mudança em arquivos de código (não apenas docs)
- Rodar testes após cada batch de mudanças
- Code review cuidadoso da substituição

**Impact:** Baixo (typo é consistente, fácil detectar via grep)

### Risk 3: Performance de Logging Estruturado
**Risk:** Logging JSON pode ser mais lento que console.log

**Mitigation:**
- Pino é otimizado para performance (benchmark > Winston)
- Configurar `pino-pretty` apenas em dev (JSON puro em prod)
- Usar níveis de log apropriados (info, não debug excessivo)
- Monitorar latência após deploy

**Impact:** Desprezível (Pino é rápido, benefício > custo)

### Risk 4: Cobertura de Testes Incompleta
**Risk:** Alguns edge cases podem não ser cobertos

**Mitigation:**
- Começar com happy paths (success, 4xx, 5xx)
- Adicionar testes para bugs encontrados (regression tests)
- Usar coverage reports para identificar gaps
- Priorizar testes de endpoints críticos (/api/status)

**Impact:** Médio (teste é incremental, sempre pode melhorar)

## Migration Plan

### Phase 1: Critical Fixes (P0) - Deploy Day 1
**Steps:**
1. Merge PR com correções P0 (porta, .env, configurações)
2. Deploy em ambiente de teste
3. Validar Dashboard integration
4. Smoke test: health checks, launch endpoint
5. Deploy em produção
6. Monitorar logs por 2 horas

**Rollback:**
```bash
# Se necessário reverter
git revert <commit-hash>
npm start
# Scripts de startup automaticamente detectam porta disponível
```

**Validation:**
- `curl http://localhost:3500/health` retorna 200
- Dashboard mostra status correto dos serviços
- Nenhum erro nos logs

### Phase 2: Consistency (P1) - Deploy Day 2-3
**Steps:**
1. Merge PR com correção de typo "Laucher"
2. Merge PR com variáveis .env documentadas
3. Deploy gradual (teste → staging → prod)
4. Atualizar .env em todos os ambientes

**Rollback:**
- Typo correction é safe (não afeta funcionalidade)
- .env changes são backward compatible (defaults funcionam)

**Validation:**
- `rg -i "laucher"` não retorna matches em código/docs
- `.env.example` tem todas as variáveis SERVICE_LAUNCHER_*
- Configuração via .env funciona corretamente

### Phase 3: Quality (P2) - Deploy Week 1
**Steps:**
1. Merge PR com logging estruturado
2. Merge PR com test suite
3. Merge PR com documentação
4. Deploy após CI passar (testes devem estar green)
5. Monitorar coverage reports

**Rollback:**
- Logging: Safe (Pino é drop-in replacement)
- Testes: Não afetam runtime (apenas CI)
- Docs: Não afeta código

**Validation:**
- `npm test` passa com 80%+ coverage
- Logs estruturados aparecem corretamente
- Documentação acessível e completa

### Monitoring Post-Deploy
**Day 1-7:**
- Verificar logs para erros inesperados
- Monitorar latência de health checks
- Validar rate limiting não está bloqueando legítimo
- Confirmar CORS funciona com Dashboard

**Metrics to watch:**
- Error rate (deve ser ~0%)
- Average latency (deve ser < 500ms)
- Health check success rate (deve ser > 95%)
- Dashboard connection errors (deve ser 0)

## Open Questions

### Q1: Circuit Breaker é necessário agora?
**Status:** Não implementar nesta proposta

**Reason:** 
- Adiciona complexidade desnecessária para MVP
- Pode ser adicionado em proposta futura se necessário
- Health checks simples são suficientes atualmente

**Follow-up:** Avaliar após 30 dias de operação

### Q2: Prometheus metrics devem ser adicionados?
**Status:** Não implementar nesta proposta

**Reason:**
- Não há dashboard Grafana configurado ainda
- Monitoramento básico via logs é suficiente
- Pode ser adicionado quando infra Prometheus estiver pronta

**Follow-up:** Criar proposta separada quando Prometheus estiver ativo

### Q3: Launch endpoint precisa funcionar em Linux?
**Status:** Funciona parcialmente, não bloqueia

**Reason:**
- POST /launch é específico para Windows Terminal/PowerShell
- Health checks (funcionalidade principal) funcionam em ambos
- Suporte Linux pode ser adicionado em proposta futura

**Workaround:** Usar scripts de startup nativos no Linux

### Q4: Rate limiting está configurado adequadamente?
**Status:** Sim, 200 req/min é razoável

**Reason:**
- Serviço é local, não exposto à internet
- Dashboard faz ~1 req/30s para health checks
- 200 req/min é suficiente para cenários locais

**Monitoring:** Avaliar após deploy se precisa ajustar

## References

### Related Documents
- [CLAUDE.md](../../../CLAUDE.md) - Padrões do projeto
- [DOCUMENTATION-STANDARD.md](../../../docs/DOCUMENTATION-STANDARD.md) - Formato de docs
- [Audit Plan](../../../docs/reports/service-launcher-audit-plan.md) - Análise completa de problemas
- [Backend README](../../../docs/context/backend/README.md) - Contexto de APIs

### Related Code
- `apps/service-launcher/server.js` - Main service
- `frontend/dashboard/src/components/pages/ConnectionsPage.tsx` - Dashboard integration
- `scripts/startup/start-service-launcher.{sh,ps1}` - Startup scripts
- `backend/api/workspace/` - Exemplo de service similar (usa Pino)

### Related Changes
- `add-service-launcher-health-summary` - Change que adiciona métricas agregadas (complementar)













