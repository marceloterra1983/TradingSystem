# Estratégia de Portas do Docusaurus

**Data**: 2025-10-29  
**Status**: ✅ Padronizado  
**Versão**: 1.0

---

## 🎯 Estratégia Unificada

### Porta Padrão: **3400**

A porta **3400** é o padrão oficial e único para o Docusaurus, independentemente do modo de execução:

#### Modo Desenvolvimento (Local)
```bash
cd docs
npm run docs:dev  # Roda em http://localhost:3400
```

- **Hot reload** habilitado
- **Watch mode** para mudanças em arquivos
- **Fast refresh** para desenvolvimento rápido
- Acessível diretamente em `http://localhost:3400`

#### Modo Produção (Container)
```bash
docker compose -f tools/compose/docker-compose.docs.yml up -d documentation
```

- **NGINX** servindo build estático
- **Build otimizado** (`docs/build/`)
- Acessível em `http://localhost:3400`
- Volume montado: `docs/build` → container

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

PRODUCTION MODE (Container)
├─ Port: 3400 (NGINX)
├─ Source: docs/build/ (static files)
└─ URL: http://localhost:3400

FRONTEND INTEGRATION
├─ Dev: http://localhost:3400 (direct) ou /docs (Vite proxy)
├─ Prod: /docs (Vite proxy → http://localhost:3400)
└─ Iframe: Usa URL acima dependendo do ambiente
```

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
  'http://localhost:3400',  // Padrão: 3400
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
    ports:
      - "${DOCS_PORT:-3400}:80"  # Porta 3400 → NGINX porta 80
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

# Start container
docker compose -f tools/compose/docker-compose.docs.yml up -d documentation

# Acesse: http://localhost:3400
```

### No Dashboard (Iframe)

O Dashboard automaticamente usa `/docs` (via Vite proxy) que redireciona para `http://localhost:3400`, garantindo:
- ✅ Mesma origem (sem CORS)
- ✅ Funciona tanto em dev quanto em produção
- ✅ Assets carregam corretamente

---

## 🔗 Referências

- **Docker Compose**: `tools/compose/docker-compose.docs.yml`
- **NGINX Config**: `tools/compose/documentation/nginx.conf`
- **Frontend Config**: `frontend/dashboard/src/config/api.ts`
- **Vite Proxy**: `frontend/dashboard/vite.config.ts`
- **Package Scripts**: `docs/package.json`

