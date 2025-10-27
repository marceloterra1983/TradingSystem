---
title: OpenAPI Specifications
description: OpenAPI specifications for TradingSystem APIs, integrated with Redocusaurus
tags: [api, openapi, redocusaurus]
owner: DocsOps
lastReviewed: 2025-10-25
---

# OpenAPI Specifications

Este diretório contém as especificações OpenAPI das APIs do TradingSystem, integradas com o Docusaurus via **Redocusaurus**.

## Arquivos Disponíveis

### status-api.openapi.yaml
Especificação da **Status API (Service Launcher)** (Port 3500)

**Endpoints principais:**
- `/health` - Health check
- `/api/status` - Status de todos os serviços
- `/api/health/full` - Health check completo (cached)
- `/circuit-breaker` - Estado do circuit breaker
- `/launch` - Lançar serviço em terminal
- `/api/auto-start/:serviceId` - Auto-start de serviços
- `/metrics` - Métricas Prometheus

**Ver documentação completa:** http://localhost:3205/api/status

### alert-router.openapi.yaml
Especificação do **Alert Router** (Port 8080)

**Endpoints principais:**
- `/health` - Health check
- `/github` - Webhook para alertas do Prometheus

**Ver documentação completa:** http://localhost:3205/api/alert-router

### firecrawl-proxy.openapi.yaml
Especificação do **Firecrawl Proxy** (Port 3600)

**Endpoints principais:**
- `/health` - Health check
- `/api/scrape` - Scraping de página única
- `/api/crawl` - Crawling de múltiplas páginas
- `/api/crawl/status/:jobId` - Status do crawl job

**Ver documentação completa:** http://localhost:3205/api/firecrawl

### documentation-api.openapi.yaml
Especificação da **Documentation API** (Port 3400)

**Endpoints principais:**
- `/api/v1/systems` - Gerenciamento de sistemas de documentação
- `/api/v1/ideas` - Gerenciamento de ideias e propostas
- `/api/v1/specs` - Gerenciamento de especificações técnicas
- `/api/v1/search` - Busca full-text via FlexSearch
- `/api/v1/files` - Upload e gerenciamento de arquivos
- `/api/v1/stats` - Estatísticas de uso

**Ver documentação completa:** http://localhost:3205/api/documentation-api

### workspace.openapi.yaml
Especificação da **Workspace API** (Port 3200)

**Endpoints principais:**
- `/api/items` - CRUD de itens do workspace
- `/api/items/status/:status` - Filtrar por status (backlog, in-progress, done)
- `/health` - Health check
- `/metrics` - Métricas Prometheus

**Ver documentação completa:** http://localhost:3205/api/workspace

### tp-capital.openapi.yaml
Especificação da **TP Capital API** (Port 4005)

**Endpoints principais:**
- `/health` - Health check
- `/signals` - CRUD de sinais de trading
- `/telegram/bots` - CRUD de bots do Telegram
- `/telegram/channels` - CRUD de canais do Telegram
- `/logs` - Application logs
- `/metrics` - Métricas Prometheus

**Ver documentação completa:** http://localhost:3205/api/tp-capital

### telegram-gateway-api.openapi.yaml
Especificação da **Telegram Gateway API** (Port 4010)

**Endpoints principais:**
- `/health` - Health check
- `/api/messages` - CRUD de mensagens do Telegram
- `/api/channels` - CRUD de canais
- `/api/telegram-gateway/auth/status` - Status de autenticação
- `/api/telegram-gateway/overview` - Visão geral do gateway
- `/api/telegram-gateway/sync-messages` - Sincronizar mensagens
- `/metrics` - Métricas Prometheus

**Ver documentação completa:** http://localhost:3205/api/telegram-gateway

## Integração com Redocusaurus

As specs são integradas ao Docusaurus via plugin `redocusaurus`. Configuração em `docusaurus.config.js`:

```javascript
[
  'redocusaurus',
  {
    specs: [
      {
        id: 'documentation-api',
        spec: 'static/specs/documentation-api.openapi.yaml',
        route: '/api/documentation-api',
      },
      {
        id: 'workspace-api',
        spec: 'static/specs/workspace.openapi.yaml',
        route: '/api/workspace',
      },
    ],
    theme: {
      primaryColor: '#0f172a',
    },
  },
]
```

## Como Adicionar Novas APIs

### 1. Copiar spec para este diretório

```bash
cp /path/to/new-api.openapi.yaml docs/static/specs/
```

### 2. Adicionar configuração no docusaurus.config.js

```javascript
{
  id: 'new-api',
  spec: 'static/specs/new-api.openapi.yaml',
  route: '/api/new-api',
}
```

### 3. Adicionar ao navbar (opcional)

```javascript
{
  type: 'dropdown',
  label: 'APIs',
  items: [
    // ... existing items
    {
      label: 'New API',
      to: '/api/new-api',
    },
  ],
}
```

### 4. Criar documentação MDX de overview

```bash
touch docs/content/api/new-api.mdx
```

Incluir:
- Overview da API
- Quick start examples
- Principais endpoints
- Rate limiting
- Autenticação
- Exemplos de integração
- Link para spec completa: `<a href="/api/new-api">View Full API Documentation</a>`

## Manutenção das Specs

### Fonte Canônica

As specs neste diretório são **cópias** das specs canônicas localizadas em:

```
docs_legacy/context/backend/api/specs/*.openapi.yaml
```

### Sincronização

Para atualizar as specs do docs com as versões canônicas:

```bash
# Copiar todas as specs
cp docs_legacy/context/backend/api/specs/*.openapi.yaml docs/static/specs/

# Ou copiar individualmente
cp docs_legacy/context/backend/api/specs/documentation-api.openapi.yaml docs/static/specs/
cp docs_legacy/context/backend/api/specs/workspace.openapi.yaml docs/static/specs/
```

### Validação

Validar specs OpenAPI antes de commitar:

```bash
# Usando openapi-cli (npm install -g @redocly/cli)
redocly lint static/specs/documentation-api.openapi.yaml
redocly lint static/specs/workspace.openapi.yaml

# Usando swagger-cli
swagger-cli validate static/specs/documentation-api.openapi.yaml
```

## Estrutura das Specs

Todas as specs seguem o padrão **OpenAPI 3.1.0**:

```yaml
openapi: 3.1.0
info:
  title: API Name
  version: 1.0.0
  description: |
    API description with details about functionality,
    authentication, rate limiting, etc.
servers:
  - url: http://localhost:PORT
    description: Local development
paths:
  /endpoint:
    get:
      summary: Endpoint summary
      tags: [Tag]
      responses:
        '200':
          description: Success response
components:
  schemas:
    Model:
      type: object
      properties:
        field: string
```

## Features do Redocusaurus

- ✅ **Interactive Documentation**: Explore APIs interativamente
- ✅ **Try It Out**: Testar endpoints diretamente da documentação
- ✅ **Code Examples**: Exemplos automáticos em múltiplas linguagens
- ✅ **Search**: Busca integrada nos endpoints
- ✅ **Dark Mode**: Suporte a tema escuro
- ✅ **Responsive**: Mobile-friendly
- ✅ **Download Spec**: Download da spec OpenAPI

## Troubleshooting

### Spec não aparece no Docusaurus

1. Verificar se o arquivo existe em `static/specs/`
2. Verificar configuração em `docusaurus.config.js`
3. Limpar cache do Docusaurus: `npm run clear && npm run build`
4. Verificar console do browser para erros

### Erro de parsing da spec

1. Validar spec com `redocly lint`
2. Verificar sintaxe YAML (indentação, etc.)
3. Verificar versão OpenAPI (deve ser 3.0.x ou 3.1.x)
4. Verificar se todos os `$ref` estão corretos

### Links quebrados

1. Verificar se a rota em `route:` está correta
2. Verificar se não há conflito com outras rotas
3. Limpar cache: `npm run clear`

## Referências

- [Redocusaurus Documentation](https://github.com/rohit-gohri/redocusaurus)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [Swagger Editor](https://editor.swagger.io/)
