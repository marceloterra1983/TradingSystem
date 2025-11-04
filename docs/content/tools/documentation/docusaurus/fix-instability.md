---
title: "Fixing Docusaurus Instability"
description: "Root cause analysis and remediation steps for docs dev-server instability."
tags:
  - tools
  - docusaurus
  - stability
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Correção Completa - Instabilidade do Docusaurus

**Data**: 2025-10-29  
**Status**: ✅ **CORRIGIDO - REQUER REINÍCIO DO SERVICE LAUNCHER**

---

## 🔍 Problemas Identificados e Corrigidos

### 1. ❌ Health Check Usando Endpoint com Redirect
**Problema**: Service Launcher verificava `http://localhost:3400/` que retorna 301 redirect

**Correção**: ✅ Atualizado para usar `/health` que retorna 200 OK diretamente

**Arquivo**: `apps/status/server.js` (linha 245)
```javascript
path: '/health', // ✅ Alterado de '/' para '/health'
```

### 2. ❌ NGINX Autoindex Habilitado
**Problema**: Mostrava listagem de diretórios em vez de servir conteúdo

**Correção**: ✅ Desabilitado `autoindex`

**Arquivo**: `tools/compose/documentation/nginx.conf`

### 3. ❌ Frontend Usando URL Incorreta
**Problema**: Iframe tentava acessar `/docs` sem o path versionado

**Correção**: ✅ Atualizado para usar `/docs/next/`

**Arquivo**: `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`

### 4. ⚠️ Circuit Breaker Aberto (Estado Antigo)
**Problema**: Service Launcher acumulou falhas e circuit breaker está aberto

**Solução**: Reiniciar Service Launcher para resetar o estado

---

## 🚀 Ações Necessárias

### 1. Reiniciar Service Launcher (OBRIGATÓRIO)

O Service Launcher precisa ser reiniciado para:
- Aplicar a mudança de `/` para `/health`
- Resetar o circuit breaker
- Recarregar a configuração correta da porta (3400)

**Opções:**

#### Opção A: Se estiver rodando como processo Node.js
```bash
# Encontrar o processo
ps aux | grep "service.*launcher\|status.*3500" | grep -v grep

# Reiniciar (substitua <PID> pelo ID do processo)
kill <PID>

# Iniciar novamente
cd apps/status
npm run dev
```

#### Opção B: Se estiver rodando via script
```bash
# Parar e iniciar novamente
# (verifique como você iniciou o Service Launcher)
```

### 2. Verificar Container NGINX
```bash
# Container deve estar healthy
docker ps --filter name=documentation

# Health endpoint deve retornar JSON
curl http://localhost:3400/health
# Esperado: {"status":"healthy","service":"documentation"}
```

### 3. Verificar Frontend
- Recarregue a página do Dashboard (`http://localhost:3103/#/docs`)
- O banner vermelho deve desaparecer após o Service Launcher reiniciar
- O iframe deve carregar corretamente

---

## ✅ Verificação Final

Após reiniciar o Service Launcher, execute:

```bash
# 1. Verificar status do Docusaurus no Service Launcher
curl -s http://localhost:3500/api/status | jq '.services[] | select(.id=="docusaurus")'

# Deve mostrar:
# {
#   "id": "docusaurus",
#   "status": "ok",  ← ✅ Não mais "down"
#   "healthUrl": "http://localhost:3400/health",  ← ✅ Correto
#   "port": 3400  ← ✅ Não mais 3205
# }
```

---

## 📋 Mudanças Aplicadas

1. ✅ `apps/status/server.js` - Health check path atualizado para `/health`
2. ✅ `tools/compose/documentation/nginx.conf` - Autoindex desabilitado
3. ✅ `frontend/dashboard/src/components/pages/DocusaurusPage.tsx` - URL do iframe corrigida

---

## 🎯 Resultado Esperado

Após reiniciar o Service Launcher:
- ✅ Banner vermelho desaparece
- ✅ Service Launcher reporta Docusaurus como "ok"
- ✅ Iframe carrega corretamente
- ✅ Sem mais instabilidade

---

**Última Atualização**: 2025-10-29

