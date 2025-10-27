# Plano de Revisão - Documentação de APIs no Docusaurus

**Data:** 27 de Outubro de 2025
**Objetivo:** Revisar e atualizar a documentação de APIs para refletir o estado atual do projeto

---

## 📋 Análise da Situação Atual

### APIs Documentadas (7 arquivos)

| Arquivo | Status Documentado | Observações |
|---------|-------------------|-------------|
| `overview.mdx` | - | Catálogo geral de APIs |
| `data-capture.mdx` | 🚧 Planned | Correto (ainda não implementado) |
| `documentation-api.mdx` | ✅ Active | Port 3400 - OK |
| `integration-status.md` | - | ⚠️ Deveria ser .mdx |
| `order-manager.mdx` | 🚧 Planned | Correto (ainda não implementado) |
| `tp-capital-api.mdx` | ✅ Active | ⚠️ Port ERRADO (mostra 3200, deveria ser 4005) |
| `workspace-api.mdx` | ✅ Active | Port 3200 - OK |

### APIs Reais no Projeto (do services-manifest.json)

| ID | Port | Path | Documentado? |
|----|------|------|--------------|
| tp-capital-signals | 4005 | apps/tp-capital | ✅ Sim (port errado) |
| workspace-api | 3200 | backend/api/workspace | ✅ Sim |
| docs-api | 3400 | backend/api/documentation-api | ✅ Sim |
| status | 3500 | apps/status | ❌ NÃO |
| alert-router | N/A | tools/monitoring/alert-router | ❌ NÃO |
| firecrawl-proxy | 3600 | backend/api/firecrawl-proxy | ❌ NÃO |
| telegram-gateway-api | 4010 | backend/api/telegram-gateway | ❌ NÃO |

---

## 🔍 Problemas Identificados

### 1. Informações Desatualizadas

**TP Capital API - Port Incorreto:**
- **Documentado:** Port 3200
- **Real:** Port 4005
- **Impacto:** Desenvolvedores tentarão conectar na porta errada

### 2. APIs Não Documentadas (4 APIs)

**Faltam documentações para:**
1. **Status API** (Port 3500) - Service health monitoring
2. **Alert Router** (No port) - Alert routing infrastructure
3. **Firecrawl Proxy** (Port 3600) - Web scraping proxy
4. **Telegram Gateway API** (Port 4010) - Telegram message ingestion

### 3. Formato Inconsistente

- `integration-status.md` está em `.md` (deveria ser `.mdx` para consistência)

### 4. Organização Plana

- Todas as APIs em uma pasta plana
- Sem categorização (Production vs Planned vs Infrastructure)

---

## ✅ Plano de Ação

### Fase 1: Correções Críticas (30 min)

**Prioridade ALTA - Informações Incorretas**

#### 1.1 Corrigir Port do TP Capital API
- [ ] Atualizar `tp-capital-api.mdx`: Port 3200 → 4005
- [ ] Verificar se há outras referências ao port incorreto no documento

#### 1.2 Converter integration-status para .mdx
- [ ] Renomear `integration-status.md` → `integration-status.mdx`
- [ ] Adicionar frontmatter YAML completo
- [ ] Validar renderização no Docusaurus

---

### Fase 2: Adicionar APIs Faltantes (1h)

**Prioridade MÉDIA - Completude da Documentação**

#### 2.1 Criar Documentação - Status API
```
Arquivo: content/api/status-api.mdx
Port: 3500
Path: apps/status
Status: ✅ Active
```

**Conteúdo:**
- Propósito: Monitoramento de saúde de serviços
- Endpoints principais
- Response schemas
- Exemplos de uso
- Health check patterns

#### 2.2 Criar Documentação - Firecrawl Proxy API
```
Arquivo: content/api/firecrawl-proxy.mdx
Port: 3600
Path: backend/api/firecrawl-proxy
Status: ✅ Active
```

**Conteúdo:**
- Propósito: Proxy para Firecrawl web scraping
- Endpoints de scraping
- Rate limiting
- Request/Response formats
- Error handling

#### 2.3 Criar Documentação - Telegram Gateway API
```
Arquivo: content/api/telegram-gateway-api.mdx
Port: 4010
Path: backend/api/telegram-gateway
Status: ✅ Active
```

**Conteúdo:**
- Propósito: REST API para acesso a mensagens do Telegram
- Channel management endpoints
- Message retrieval
- Authentication
- Integration patterns

#### 2.4 Criar Documentação - Alert Router
```
Arquivo: content/api/alert-router.mdx
Port: N/A (internal)
Path: tools/monitoring/alert-router
Status: ✅ Active
```

**Conteúdo:**
- Propósito: Roteamento de alertas de monitoramento
- Configuration
- Alert types
- Routing rules
- Integration com Prometheus/Grafana

---

### Fase 3: Atualizar Overview (30 min)

**Prioridade MÉDIA - Catálogo Completo**

#### 3.1 Reorganizar API Catalog (overview.mdx)

**Nova Estrutura:**

```markdown
## Production APIs (Core)

### Infrastructure APIs
- Status API (3500) - Service health monitoring
- Alert Router (internal) - Alert routing

### Data APIs
- Documentation API (3400) - Document management
- Workspace API (3200) - Idea/task management

### Business APIs
- TP Capital API (4005) - Trading signals ingestion
- Telegram Gateway API (4010) - Telegram message access
- Firecrawl Proxy (3600) - Web scraping

## Planned APIs (Trading)

### Core Trading
- Data Capture API - Market data ingestion
- Order Manager API - Order execution
```

#### 3.2 Adicionar Tech Stack Summary
- Tabela com todas as APIs
- Tecnologias usadas (Express, Node.js, databases)
- Porta, status, repo path

#### 3.3 Atualizar Quick Links
- Links para todas as 11 APIs (7 existentes + 4 novas)

---

### Fase 4: Melhorar Estrutura (1h)

**Prioridade BAIXA - Organização**

#### 4.1 Adicionar sidebar_position em Todos os Arquivos

**Ordem Lógica:**
```
1. overview.mdx (Catálogo)
2. integration-status.mdx (Status de integração)

Production - Infrastructure (3-5):
3. status-api.mdx
4. alert-router.mdx
5. firecrawl-proxy.mdx

Production - Data (6-7):
6. documentation-api.mdx
7. workspace-api.mdx

Production - Business (8-9):
8. tp-capital-api.mdx
9. telegram-gateway-api.mdx

Planned - Trading (10-11):
10. data-capture.mdx
11. order-manager.mdx
```

#### 4.2 Padronizar Frontmatter

**Template para todas as APIs:**
```yaml
---
title: [API Name] API
sidebar_label: [Short Name]
sidebar_position: [number]
description: [One-line description]
tags:
  - api
  - [category]
  - [technology]
status: [Active/Planned]
port: [number]
repository: [path]
lastReviewed: 'YYYY-MM-DD'
owner: BackendGuild
---
```

#### 4.3 Adicionar Seções Padrão

**Estrutura padrão para cada API doc:**
1. Overview (propósito, use cases)
2. Getting Started (quick start, authentication)
3. Endpoints (principais endpoints com exemplos)
4. Request/Response Schemas
5. Error Handling
6. Rate Limiting
7. Examples (código em múltiplas linguagens)
8. OpenAPI Spec Link (se disponível)

---

### Fase 5: Validação (30 min)

**Prioridade ALTA - Quality Assurance**

#### 5.1 Verificar Informações
- [ ] Todos os ports corretos
- [ ] Todos os paths corretos
- [ ] Status correto (Active vs Planned)
- [ ] Links funcionando

#### 5.2 Build do Docusaurus
- [ ] `npm run docs:build` sem erros
- [ ] Verificar broken links
- [ ] Testar navegação no sidebar

#### 5.3 Testes de Integração
- [ ] Verificar se OpenAPI specs existem para as APIs ativas
- [ ] Confirmar que Redocusaurus está renderizando specs
- [ ] Testar exemplos de curl/código

---

## 📊 Resumo das Mudanças

| Categoria | Quantidade | Tempo Estimado |
|-----------|-----------|----------------|
| Correções de informações | 2 | 30 min |
| Novas documentações | 4 APIs | 1h |
| Atualização de overview | 1 | 30 min |
| Melhorias de estrutura | 11 arquivos | 1h |
| Validação | - | 30 min |
| **TOTAL** | **18 mudanças** | **3h 30min** |

---

## 🎯 Priorização

### ✅ FAZER AGORA (Fase 1 + Fase 5)
- Corrigir port do TP Capital (4005)
- Converter integration-status para .mdx
- Validar build

### 🟡 FAZER HOJE (Fase 2 + Fase 3)
- Adicionar 4 APIs faltantes
- Atualizar overview.mdx

### 🟢 FAZER ESTA SEMANA (Fase 4)
- Reorganizar sidebar_position
- Padronizar frontmatter
- Adicionar seções padrão

---

## 📁 Estrutura Final Esperada

```
docs/content/api/
├── _category_.json
├── overview.mdx                    (Catálogo - Position 1)
├── integration-status.mdx          (Status - Position 2)
│
├── Infrastructure APIs (3-5)
│   ├── status-api.mdx             (Position 3)
│   ├── alert-router.mdx           (Position 4)
│   └── firecrawl-proxy.mdx        (Position 5)
│
├── Data APIs (6-7)
│   ├── documentation-api.mdx      (Position 6)
│   └── workspace-api.mdx          (Position 7)
│
├── Business APIs (8-9)
│   ├── tp-capital-api.mdx         (Position 8)
│   └── telegram-gateway-api.mdx   (Position 9)
│
└── Planned Trading APIs (10-11)
    ├── data-capture.mdx           (Position 10)
    └── order-manager.mdx          (Position 11)
```

---

## 🔗 Referências

**Para criar novas documentações:**
- Template: `docs/content/reference/templates/API-TEMPLATE.mdx` (criar se não existir)
- Services Manifest: `config/services-manifest.json`
- OpenAPI Specs: Verificar em cada repo (`backend/api/*/openapi.yaml`)

**Para validação:**
- Health check: `scripts/maintenance/health-check-all.sh`
- Port verification: `scripts/validation/detect-port-conflicts.sh`
- Docusaurus build: `npm run docs:build`

---

## ✅ Critérios de Sucesso

1. ✅ **Informações Corretas**
   - Todos os ports corretos
   - Todos os paths corretos
   - Status atualizado

2. ✅ **Completude**
   - Todas as 7 APIs ativas documentadas
   - Todas as 2 APIs planned documentadas
   - 0 APIs faltando

3. ✅ **Qualidade**
   - Frontmatter padronizado
   - Seções consistentes
   - Exemplos de código

4. ✅ **Navegação**
   - Sidebar organizado logicamente
   - Links funcionando
   - Build sem erros

---

**Criado por:** Claude Code
**Data:** 2025-10-27
**Próximo Passo:** Executar Fase 1 (Correções Críticas)
