---
title: "Docusaurus Ports Strategy"
description: "Port allocation strategy for docs services, API proxy, and previews."
tags:
  - tools
  - docusaurus
  - networking
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Estratégia de Portas do Docusaurus

**Data**: 2025-10-29  
**Status**: ✅ Padronizado  
**Versão**: 1.0

---

## 🎯 Estratégia Unificada

### Exposição

- **Desenvolvimento local:** porta **3400** (servidor Docusaurus/Vite)
- **Produção (containers):** rota Traefik `http://localhost:9080/docs` (sem porta dedicada)

#### Modo Desenvolvimento (Local)
```bash
cd docs
npm run docs:dev  # Roda em http://localhost:3400
```

- **Hot reload** habilitado
- **Watch mode** para mudanças em arquivos
- **Fast refresh** para desenvolvimento rápido
- Acessível diretamente em `http://localhost:3400`

#### Modo Produção (Container via Traefik)
```bash
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d
```

- **NGINX** servindo build estático (porta interna 80)
- **Roteamento externo:** Traefik → `http://localhost:9080/docs`
- **Sem** `ports:` publicados no compose (apenas redes internas)
- Recomenda-se validar pelo gateway: `curl http://localhost:9080/docs/health`

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Docusaurus Strategy                 │
└─────────────────────────────────────────────────────┘

DEVELOPMENT MODE (Local)
├─ Port: 3400 (npm run docs:dev)
├─ Hot reload: ✅
└─ URL: http://localhost:3400

PRODUCTION MODE (Containers)
├─ Porta interna: 80 (NGINX)
├─ Traefik Router: http://localhost:9080/docs
└─ Sem publicação direta de porta

FRONTEND INTEGRATION
├─ Dev: proxy `/docs` → http://localhost:3400
├─ Prod: proxy `/docs` → http://localhost:9080/docs
└─ Iframe: usa rota acima conforme ambiente
```

---

## 📊 Resumo Rápido

| Modo | Comando | URL | Observações |
|------|---------|-----|-------------|
| Dev local | `npm run docs:dev` | `http://localhost:3400` | Hot reload e watch mode habilitados |
| Container | `docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d` | `http://localhost:9080/docs` (via Traefik) | Servido pelo NGINX interno na porta 80 |
| Frontend (iframe) | Proxy `/docs` do Vite | `/docs` → ambiente atual | Same-origin, sem CORS; respeita dev/prod automaticamente |

---

## 📋 Configurações

### 1. Frontend Dashboard

**Arquivo**: `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`

```typescript
// Sempre usa porta 3400 (via proxy /docs ou direto)
const iframeSrc = activeView === 'docs'
  ? (import.meta.env.DEV 
      ? `${window.location.origin}/docs`  // Via Vite proxy (recomendado)
      : apiConfig.docsUrl)                // Produção
  : undefined;
```

**Arquivo**: `frontend/dashboard/src/config/api.ts`

```typescript
docsUrl: import.meta.env.VITE_DOCUSAURUS_URL || '/docs',
// Proxied through Vite to NGINX (localhost:3400)
```

**Arquivo**: `frontend/dashboard/vite.config.ts`

```typescript
const docsProxy = resolveProxy(
  env.VITE_DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_URL,
  'http://localhost:9080/docs',  // Default via Traefik em produção
);
```

### 2. Docusaurus Config

**Arquivo**: `docs/package.json`

```json
{
  "scripts": {
    "docs:dev": "docusaurus start --host 0.0.0.0 --port 3400",
    "docs:serve": "docusaurus serve --dir build --host 0.0.0.0 --port 3400"
  }
}
```

### 3. Docker Compose

**Arquivo**: `tools/compose/docker-compose.docs.yml`

```yaml
services:
  documentation:
    # Nenhuma porta publicada (Traefik cuida da exposição)
    networks:
      - tradingsystem_frontend
      - tradingsystem_backend
```

### 4. Service Manifest

**Arquivo**: `config/services-manifest.json`

```json
{
  "id": "docusaurus",
  "port": 3400,
  "start": "npm start -- --port 3400"
}
```

---

## ❌ Portas Depreciadas

### ~~Porta 3205~~ ⚠️ **DEPRECIADA - NÃO USAR**

- **Status**: ❌ Removida de todas as configurações
- **Razão**: Apareceu acidentalmente, nunca foi parte da estratégia oficial
- **Ação**: Todas as referências removidas

---

## 🔍 Verificações

### Verificar se porta 3400 está em uso

```bash
# Linux/macOS
lsof -i :3400

# Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3400

# Docker
docker ps --filter "publish=3400"
```

### Verificar qual processo está usando

```bash
# Se for Docusaurus dev
ps aux | grep docusaurus | grep 3400

# Se for container
docker ps | grep documentation
```

---

## 📝 Checklist de Migração

- [x] Padronizar todas as referências para porta 3400
- [x] Remover todas as referências à porta 3205
- [x] Atualizar frontend para usar /docs (proxy) ou 3400 direto
- [x] Garantir que scripts usam porta 3400
- [x] Documentar estratégia unificada
- [x] Atualizar configurações do container NGINX

---

## 🚀 Como Usar

### Desenvolvimento Local

```bash
cd docs
npm run docs:dev
# Acesse: http://localhost:3400
```

### Container (Produção)

```bash
# Build do Docusaurus
cd docs
npm run docs:build

# Start container (sem publicar porta)
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d

# Acesse via Traefik
docs_url="http://localhost:9080/docs"
open "$docs_url"  # macOS
xdg-open "$docs_url"  # Linux
```

### No Dashboard (Iframe)

O Dashboard usa `/docs` (Vite proxy → Traefik), garantindo:
- ✅ Mesma origem (sem CORS)
- ✅ Funciona tanto em dev (`http://localhost:3400`) quanto em produção (`http://localhost:9080/docs`)
- ✅ Assets carregam corretamente

---

## 🔗 Referências

- **Docker Compose**: `tools/compose/docker-compose.docs.yml`
- **NGINX Config**: `tools/compose/documentation/nginx.conf`
- **Frontend Config**: `frontend/dashboard/src/config/api.ts`
- **Vite Proxy**: `frontend/dashboard/vite.config.ts`
- **Package Scripts**: `docs/package.json`
