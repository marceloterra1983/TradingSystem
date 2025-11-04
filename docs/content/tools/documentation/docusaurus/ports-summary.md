---
title: "Docusaurus Ports Summary"
description: "Quick lookup table for documentation related ports and services."
tags:
  - tools
  - docusaurus
  - networking
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Resumo da Padronização de Portas - Docusaurus

**Data**: 2025-10-29  
**Status**: ✅ **COMPLETO**

---

## ✅ Mudanças Aplicadas

### 1. Frontend Dashboard
- ✅ **Arquivo**: `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`
- ✅ **Mudança**: Removida referência à porta 3205
- ✅ **Estratégia**: Sempre usa `/docs` (proxy Vite) → `http://localhost:3400`

### 2. Configuração NGINX
- ✅ **Arquivo**: `tools/compose/documentation/nginx.conf`
- ✅ **Mudança**: Configurado para servir `/next/` como versão padrão
- ✅ **Estratégia**: Redireciona `/` → `/next/` (versão atual)

### 3. Documentação
- ✅ **Novo Arquivo**: `docs/DOCUSAURUS-PORTS-STRATEGY.md`
- ✅ **Atualizado**: `docs/content/troubleshooting/docusaurus-iframe-fix.md`
- ✅ **Atualizado**: `docs/content/tools/documentation/redocusaurus/overview.mdx` (nota sobre porta 3205)

---

## 📋 Estratégia Final

### Porta Padrão: **3400**

| Modo | Comando | URL | Descrição |
|------|---------|-----|-----------|
| **Dev Local** | `npm run docs:dev` | `http://localhost:3400` | Hot reload, watch mode |
| **Container** | `docker compose up documentation` | `http://localhost:3400` | NGINX servindo build estático |
| **Frontend (Iframe)** | Via Vite proxy | `/docs` → `localhost:3400` | Same-origin, sem CORS |

---

## ❌ Porta Depreciada

### ~~3205~~ 
- **Status**: Removida de configurações do Docusaurus
- **Nota**: Porta 3205 ainda existe para **Order Manager API** (.NET), não relacionada ao Docusaurus

---

## 🧪 Verificação

### Verificar se está funcionando:

```bash
# 1. Dev Server (se rodando)
curl -I http://localhost:3400

# 2. Container (se rodando)
docker ps | grep documentation
curl -I http://localhost:3400

# 3. Frontend proxy
# Acesse: http://localhost:3103/#/docs
# Deve carregar Docusaurus via /docs → localhost:3400
```

### Build do Docusaurus:

O build gera arquivos em `docs/build/next/` (versão atual). O NGINX está configurado para:
1. Redirecionar `/` → `/next/`
2. Servir arquivos de `/next/`
3. Fallback para outras versões em `/1.0.0/`, etc.

Isso é o comportamento padrão do Docusaurus com versionamento habilitado.

---

## 📝 Arquivos Modificados

1. ✅ `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`
2. ✅ `tools/compose/documentation/nginx.conf`
3. ✅ `docs/DOCUSAURUS-PORTS-STRATEGY.md` (novo)
4. ✅ `docs/content/troubleshooting/docusaurus-iframe-fix.md`
5. ✅ `docs/content/tools/documentation/redocusaurus/overview.mdx`

---

## 🎯 Próximos Passos (Opcional)

- [ ] Revisar documentação versionada (versão 1.0.0) - pode manter como histórico
- [ ] Adicionar validação em scripts para garantir porta 3400
- [ ] Atualizar CHANGELOG com mudanças

---

## 📚 Referências

- **Estratégia Completa**: `docs/DOCUSAURUS-PORTS-STRATEGY.md`
- **Docker Compose**: `tools/compose/docker-compose.docs.yml`
- **Vite Config**: `frontend/dashboard/vite.config.ts`

