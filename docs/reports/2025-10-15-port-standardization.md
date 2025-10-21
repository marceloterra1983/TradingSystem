---
title: Dashboard Port Standardization Report
sidebar_position: 2
tags: [ports, configuration, dashboard, standardization, infrastructure]
domain: ops
type: reference
summary: Report documenting standardization of Dashboard port from 3101 to 3103 across all project files
status: active
last_review: 2025-10-17
---

# 🔧 Dashboard Port Standardization

**Data:** 15 de Outubro de 2025  
**Status:** ✅ COMPLETO  
**Problema:** Inconsistência entre portas 3101 e 3103 para o Dashboard  
**Solução:** Padronização para porta **3103** em todo o projeto

---

## 📊 Análise do Problema

### Confusão Identificada

O Dashboard tinha referências a **duas portas diferentes**:

- ❌ **Porta 3101** - Mencionada em documentação e scripts
- ✅ **Porta 3103** - Configurada no código fonte (Vite)

### Código Fonte (REAL)

```typescript
// vite.config.ts
server: {
  port: 3103,
  strictPort: true,
}
```

```json
// package.json
"dev:vite": "vite --host 0.0.0.0 --port 3103 --strictPort"
```

```typescript
// cypress.config.ts
baseUrl: 'http://localhost:3103'
```

### Arquivos com Porta Incorreta (3101)

1. `backend/manifest.json` - Manifestava porta 3101
2. `scripts/services/start-all.sh` - Documentação e código
3. `scripts/services/stop-all.sh` - Arrays de portas
4. `scripts/services/status.sh` - Verificações de porta
5. `scripts/utils/open-services.sh` - URLs de serviços
6. `scripts/docker/start-stacks.sh` - Informações de acesso
7. `CLAUDE.md` - Documentação principal
8. `SYSTEM-OVERVIEW.md` - Visão geral do sistema
9. `docs/README.md` - Documentação central
10. `docs/context/intro.md` - Introdução
11. `docs/context/ops/scripts/README.md` - Guia de scripts
12. `docs/context/ops/onboarding/*` - Guias de onboarding
13. `docs/context/ops/repository/service-manifest-blueprint.md`
14. `backend/api/documentation-api/src/server.js` - CORS origins
15. `docs/context/frontend/guides/documentation-quick-start.md`

---

## 🎯 Decisão: Porta Oficial 3103

### Razões

1. ✅ **Código fonte usa 3103** (vite.config.ts, package.json)
2. ✅ **strictPort: true** - Não tenta outras portas automaticamente
3. ✅ **Cypress configurado para 3103** - Testes E2E
4. ✅ **Maior consistência** em arquivos do frontend
5. ✅ **Configuração explícita** vs documentação

**Princípio:** O código fonte é a verdade absoluta. Documentação deve refletir o código, não o contrário.

---

## ✅ Arquivos Corrigidos

### 1. Configuração Central
- ✅ `backend/manifest.json` (3101 → 3103)

### 2. Scripts de Gerenciamento
- ✅ `scripts/services/start-all.sh`
- ✅ `scripts/services/stop-all.sh`
- ✅ `scripts/services/status.sh`
- ✅ `scripts/utils/open-services.sh`
- ✅ `scripts/docker/start-stacks.sh`

### 3. Documentação Principal
- ✅ `CLAUDE.md` (4 ocorrências)
- ✅ `SYSTEM-OVERVIEW.md` (2 ocorrências)

### 4. Documentação Técnica
- ✅ `docs/context/intro.md`
- ✅ `docs/context/ops/scripts/README.md`
- ✅ `docs/context/ops/onboarding/START-SERVICES.md`
- ✅ `docs/context/ops/onboarding/QUICK-REFERENCE.md`
- ✅ `docs/context/ops/onboarding/GUIA-INICIO-DEFINITIVO.md`
- ✅ `docs/context/ops/repository/service-manifest-blueprint.md`
- ✅ `docs/context/frontend/guides/documentation-quick-start.md`

### 5. Backend APIs
- ✅ `backend/api/documentation-api/src/server.js` (CORS origins)

---

## 📋 Padrão Estabelecido

### Mapa de Portas do Projeto

| Serviço | Porta | URL | Status |
|---------|-------|-----|--------|
| **Dashboard** | **3103** | http://localhost:3103 | ✅ Padronizado |
| Documentation Hub | 3004 | http://localhost:3004 | ✅ Correto |
| Workspace (Idea Bank) | 3102 | http://localhost:3102 | ✅ Correto |
| TP-Capital | 3200 | http://localhost:3200 | ✅ Correto |
| B3 | 3302 | http://localhost:3302 | ✅ Correto |
| Documentation API | 3400 | http://localhost:3400 | ✅ Correto |
| Laucher | 3500 | http://localhost:3500 | ✅ Correto |

---

## 🚀 Como Usar

### Iniciar Dashboard

```bash
cd frontend/apps/dashboard
npm run dev
```

**Acesso:** http://localhost:3103

### Verificar Status

```bash
bash scripts/services/status.sh
```

### Abrir no Navegador

```bash
bash scripts/utils/open-services.sh
```

---

## 📊 Impacto

### Arquivos Modificados
- **Total:** 15+ arquivos
- **Scripts:** 5 arquivos
- **Documentação:** 10+ arquivos
- **Backend:** 1 arquivo

### Benefícios
- ✅ **Zero confusão** sobre qual porta usar
- ✅ **Documentação alinhada** com código
- ✅ **Scripts funcionais** em todos os cenários
- ✅ **Onboarding facilitado** para novos desenvolvedores
- ✅ **Testes E2E corretos** (Cypress)

---

## 🔍 Validação

Para confirmar que tudo está correto:

```bash
# 1. Verificar porta no código
cat frontend/apps/dashboard/vite.config.ts | grep "port:"

# 2. Verificar porta no manifest
cat backend/manifest.json | grep -A 10 '"dashboard"'

# 3. Verificar scripts
grep -r "3103" scripts/services/

# 4. Iniciar dashboard e confirmar porta
cd frontend/apps/dashboard && npm run dev
# Deve mostrar: http://localhost:3103
```

---

## 📚 Referências

- **Vite Config:** `frontend/apps/dashboard/vite.config.ts`
- **Package.json:** `frontend/apps/dashboard/package.json`
- **Manifest:** `backend/manifest.json`
- **Documentação Principal:** `CLAUDE.md`

---

**✅ PADRONIZAÇÃO COMPLETA**

Porta oficial do Dashboard: **3103**

Data: 15/10/2025  
Implementado por: Claude AI Assistant
