---
title: Service Launcher - Proposta OpenSpec Completa
date: 2025-10-18
author: AI Assistant
tags: [service-launcher, openspec, proposal, fix, refactoring]
status: ready-for-review
related_docs:
  - docs/reports/service-launcher-audit-plan.md
  - infrastructure/openspec/changes/fix-service-launcher-critical-issues/
---

# 🚀 Service Launcher - Proposta OpenSpec Completa

## 📋 Visão Geral

Esta proposta OpenSpec implementa todas as correções e melhorias identificadas no **[Service Launcher Audit Plan](./service-launcher-audit-plan.md)** usando o formato estruturado OpenSpec do projeto.

### ✅ Status da Proposta
- **Change ID**: `fix-service-launcher-critical-issues`
- **Localização**: `infrastructure/openspec/changes/fix-service-launcher-critical-issues/`
- **Status**: ✅ Pronta para revisão
- **Formato**: OpenSpec compliant

---

## 📊 Estatísticas da Proposta

### Conteúdo Criado
- **Total de linhas**: ~715 linhas
- **Arquivos criados**: 4 arquivos estruturados
- **Requirements**: 13 requirements funcionais
- **Scenarios**: 30 cenários de teste
- **Tasks**: 8 fases de implementação (~60 subtasks)

### Estrutura OpenSpec
```
infrastructure/openspec/changes/fix-service-launcher-critical-issues/
├── proposal.md          # Por quê, o quê, impacto, rollout
├── design.md            # Decisões técnicas, trade-offs, migração
├── tasks.md             # 8 fases de implementação detalhadas
└── specs/
    └── service-launcher/
        └── spec.md      # 13 requirements + 30 scenarios
```

---

## 🎯 Mapeamento: Audit Plan → OpenSpec

### P0 - Problemas Críticos

| # | Audit Plan | OpenSpec Requirement | Scenarios |
|---|------------|----------------------|-----------|
| 1 | Conflito de portas 9999 vs 3500 | `Service Launcher Port Configuration` | 3 scenarios |
| 2 | Carregamento .env incorreto | `Centralized Environment Configuration` | 2 scenarios |
| 3 | Portas de serviços incorretas | `Service Port Configuration Accuracy` | 2 scenarios |

**Tasks OpenSpec**: Section 1 (1.1-1.6) - ~2.5h

### P1 - Problemas Graves

| # | Audit Plan | OpenSpec Requirement | Scenarios |
|---|------------|----------------------|-----------|
| 4 | Typo "Laucher" → "Launcher" | `Consistent Naming` | 3 scenarios |
| 5 | Falta variáveis .env | `Environment Variables Documentation` | 2 scenarios |

**Tasks OpenSpec**: Sections 2-3 (2.1-3.6) - ~3-4h

### P2 - Melhorias Importantes

| # | Audit Plan | OpenSpec Requirement | Scenarios |
|---|------------|----------------------|-----------|
| 6 | Logs inconsistentes | `Structured Logging` | 3 scenarios |
| 7 | Falta testes | `Test Coverage` | 3 scenarios |
| 8 | Documentação fragmentada | `Documentation Standards Compliance` | 2 scenarios |

**Tasks OpenSpec**: Sections 4-6 (4.1-6.11) - ~10-14h

### Funcionalidades Core

| Funcionalidade | OpenSpec Requirement | Scenarios |
|----------------|----------------------|-----------|
| Health check básico | `Health Check API` | 1 scenario |
| Status agregado | `Aggregated Service Status API` | 3 scenarios |
| Launch de serviços | `Service Launch API` | 2 scenarios |
| CORS | `CORS Configuration` | 2 scenarios |
| Rate limiting | `Rate Limiting` | 2 scenarios |

---

## 📖 Documentos da Proposta

### 1. proposal.md
**Conteúdo**: Por quê, o quê mudou, impacto, rollout
- ✅ Justificativa clara dos problemas
- ✅ Lista de mudanças com marcação de breaking changes
- ✅ Impacto em código e specs
- ✅ Plano de rollout em 3 fases
- ✅ Guia de migração para porta 9999 → 3500

**Leia**: [`infrastructure/openspec/changes/fix-service-launcher-critical-issues/proposal.md`](/infrastructure/openspec/changes/fix-service-launcher-critical-issues/proposal.md)

### 2. design.md (~400 linhas)
**Conteúdo**: Decisões técnicas detalhadas
- ✅ Contexto completo do problema
- ✅ Goals vs Non-Goals claramente definidos
- ✅ 5 decisões técnicas principais:
  - Porta default 3500 com rationale
  - Carregamento .env do root
  - Logging estruturado com Pino
  - Suite de testes com coverage
  - Documentação reestruturada
- ✅ Análise de riscos e mitigações
- ✅ Plano de migração em 3 fases
- ✅ 4 Open Questions documentadas

**Leia**: [`infrastructure/openspec/changes/fix-service-launcher-critical-issues/design.md`](/infrastructure/openspec/changes/fix-service-launcher-critical-issues/design.md)

### 3. tasks.md (~200 linhas)
**Conteúdo**: Implementação passo a passo
- ✅ **8 seções principais**:
  1. Critical Port Fixes (P0) - ~2.5h
  2. Typo Correction (P1) - ~2-3h
  3. Environment Variables (P1) - ~1h
  4. Structured Logging (P2) - ~2h
  5. Test Suite (P2) - ~4-6h
  6. Documentation (P2) - ~4-6h
  7. Validation (All phases)
  8. Deployment & Monitoring

- ✅ **~60 subtasks** com checkboxes
- ✅ Estimativas de tempo por seção
- ✅ Ordem de execução claramente definida
- ✅ Validações após cada fase

**Leia**: [`infrastructure/openspec/changes/fix-service-launcher-critical-issues/tasks.md`](/infrastructure/openspec/changes/fix-service-launcher-critical-issues/tasks.md)

### 4. specs/service-launcher/spec.md (~450 linhas)
**Conteúdo**: Requirements formais com scenarios
- ✅ **13 Requirements funcionais**:
  - Service Launcher Port Configuration
  - Centralized Environment Configuration
  - Service Port Configuration Accuracy
  - Structured Logging
  - Health Check API
  - Aggregated Service Status API
  - Service Launch API
  - Environment Variables Documentation
  - Test Coverage
  - Documentation Standards Compliance
  - Consistent Naming
  - CORS Configuration
  - Rate Limiting

- ✅ **30 Scenarios de teste**:
  - Cada requirement tem 1-3 scenarios
  - Formato WHEN/THEN/AND
  - Cobertura de success, error e edge cases

**Leia**: [`infrastructure/openspec/changes/fix-service-launcher-critical-issues/specs/service-launcher/spec.md`](/infrastructure/openspec/changes/fix-service-launcher-critical-issues/specs/service-launcher/spec.md)

---

## 🔍 Destaques da Proposta

### ✨ Pontos Fortes

1. **Estruturada e Completa**
   - Segue rigorosamente formato OpenSpec
   - 715 linhas de documentação detalhada
   - 13 requirements + 30 scenarios testáveis

2. **Priorizada e Estimada**
   - P0 (2.5h) → P1 (3-4h) → P2 (10-14h)
   - Total: 15.5-20.5 horas
   - MVP possível com apenas P0+P1 (5.5-6.5h)

3. **Decisões Técnicas Documentadas**
   - 5 decisões principais com rationale
   - Alternatives considered para cada uma
   - Risks/mitigations identificados
   - Open questions documentadas

4. **Plano de Migração Detalhado**
   - 3 fases de deploy
   - Rollback strategies
   - Validation checkpoints
   - Monitoring requirements

5. **Testável e Verificável**
   - 30 scenarios cobrem success + error + edge cases
   - Validation steps após cada fase
   - Coverage target de 80%+
   - CI/CD integration ready

### 🎨 Qualidade da Documentação

**Formato OpenSpec Compliant:**
- ✅ `## ADDED Requirements` (não MODIFIED/REMOVED - novo capability)
- ✅ `#### Scenario:` formato correto (4 hashtags)
- ✅ WHEN/THEN/AND structure
- ✅ SHALL/MUST para requirements normativos

**Alinhamento com Projeto:**
- ✅ Segue CLAUDE.md (standards do projeto)
- ✅ Referencia DOCUMENTATION-STANDARD.md
- ✅ Usa ferramentas do projeto (Pino, Jest, PlantUML)
- ✅ Mantém consistência com outros serviços

---

## 🚀 Próximos Passos

### 1. Revisão da Proposta
- [ ] Revisar `proposal.md` - entender o why/what/impact
- [ ] Revisar `design.md` - validar decisões técnicas
- [ ] Revisar `tasks.md` - confirmar ordem e estimativas
- [ ] Revisar `spec.md` - validar requirements e scenarios

### 2. Aprovação
- [ ] Discutir breaking changes (porta 9999 → 3500)
- [ ] Confirmar timeline (MVP vs Full quality)
- [ ] Aprovar tecnologias (Pino para logs, Jest para testes)
- [ ] Aprovar prioridades (P0 > P1 > P2)

### 3. Implementação
**Opção A: MVP Rápido (5.5-6.5h)**
```bash
# Fazer apenas P0 + P1
cd infrastructure/openspec/changes/fix-service-launcher-critical-issues
# Seguir tasks.md sections 1-3
```

**Opção B: Qualidade Completa (15.5-20.5h)**
```bash
# Fazer P0 + P1 + P2
cd infrastructure/openspec/changes/fix-service-launcher-critical-issues
# Seguir tasks.md sections 1-6
```

**Opção C: Incremental**
```bash
# Week 1: P0 (sistema funciona)
# Week 2: P1 (consistência profissional)
# Week 3: P2 (qualidade enterprise)
```

### 4. Validação OpenSpec
```bash
# Após aprovação, validar formalmente
cd infrastructure/openspec
openspec validate fix-service-launcher-critical-issues --strict
```

### 5. Implementação e Tracking
```bash
# Marcar tasks como completas em tasks.md
# Fazer commits incrementais
# Testar após cada seção
# Deploy em fases (test → staging → prod)
```

---

## 📚 Referências Cruzadas

### Documentos Relacionados
- **[Service Launcher Audit Plan](./service-launcher-audit-plan.md)** - Análise completa original (11 problemas identificados)
- **[CLAUDE.md](../../CLAUDE.md)** - Padrões do projeto TradingSystem
- **[DOCUMENTATION-STANDARD.md](../DOCUMENTATION-STANDARD.md)** - Formato de documentação oficial
- **[OpenSpec AGENTS.md](../../infrastructure/openspec/AGENTS.md)** - Guia OpenSpec completo

### Código Afetado
- `frontend/apps/service-launcher/server.js` - Main logic
- `frontend/apps/service-launcher/README.md` - Service docs
- `docs/context/backend/api/service-launcher/README.md` - API reference
- `scripts/startup/start-service-launcher.{sh,ps1}` - Startup scripts
- ~90 arquivos com typo "Laucher"

### Changes Relacionados
- `add-service-launcher-health-summary` - Adiciona métricas agregadas (complementar)

---

## 💡 Recomendações

### Para Desenvolvimento Rápido
Se você quer o **sistema funcionando rapidamente**:
1. ✅ Implemente apenas **P0** (tasks section 1)
2. ✅ Deploy e valide integração com Dashboard
3. ⏰ P1 e P2 podem ser feitos incrementalmente depois

**Resultado**: 2.5 horas → Sistema funcional

### Para Qualidade Profissional
Se você quer **consistência e configurabilidade**:
1. ✅ Implemente **P0 + P1** (tasks sections 1-3)
2. ✅ Sistema funciona + typo corrigido + .env documentado
3. ⏰ P2 (testes, logs, docs) pode ser backlog

**Resultado**: 5.5-6.5 horas → Sistema consistente e profissional

### Para Qualidade Enterprise
Se você quer **manutenibilidade de longo prazo**:
1. ✅ Implemente **P0 + P1 + P2** completo
2. ✅ Testes automatizados (80%+ coverage)
3. ✅ Logging estruturado
4. ✅ Documentação completa com diagramas

**Resultado**: 15.5-20.5 horas → Sistema enterprise-grade

---

## ✅ Checklist de Aprovação

Antes de iniciar implementação:
- [ ] Proposta revisada e aprovada
- [ ] Breaking changes discutidos e aceitos
- [ ] Timeline acordado (MVP vs Full)
- [ ] Prioridades confirmadas (P0 > P1 > P2)
- [ ] Decisões técnicas validadas
- [ ] Riscos entendidos e mitigações aprovadas
- [ ] Plano de migração aceito

---

## 📞 Contato

**Dúvidas sobre a proposta?**
- Revisar: `infrastructure/openspec/changes/fix-service-launcher-critical-issues/`
- Consultar: [OpenSpec AGENTS.md](../../infrastructure/openspec/AGENTS.md)
- Referir ao: [Audit Plan original](./service-launcher-audit-plan.md)

---

**Status**: 📝 Aguardando aprovação para iniciar implementação

**Última atualização**: 2025-10-18













