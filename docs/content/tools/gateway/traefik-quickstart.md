---
title: Traefik API Gateway - Quick Start
description: Guia rápido de implementação do Traefik como API Gateway no TradingSystem
tags:
  - gateway
  - traefik
  - infrastructure
  - security
slug: /tools/gateway/quickstart
sidebar_position: 1
last_review: '2025-11-11'
---

# 🚀 Traefik API Gateway - Quick Start

Este guia irá configurar o Traefik como API Gateway centralizado para todos os serviços HTTP do TradingSystem em **30 minutos**.

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Serviços básicos rodando (Dashboard, Workspace API, Docs)
- Redes Docker criadas: `tradingsystem_backend`, `tradingsystem_frontend`

## 🎯 O que será implementado

- ✅ API Gateway centralizado (Traefik) na porta 8080
- ✅ Dashboard de monitoramento (porta 8081)
- ✅ Roteamento automático para todos os serviços
- ✅ Rate limiting global (100 req/min)
- ✅ CORS centralizado
- ✅ Compressão automática (gzip/brotli)
- ✅ Métricas Prometheus
- ✅ Health checks automáticos

---

## 📦 Passo 1: Iniciar o Gateway

```bash
# Navegar para o diretório do projeto
cd /home/marce/Projetos/TradingSystem

# Iniciar o Traefik
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# Verificar logs
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml logs -f
```

**Esperado:**
```
api-gateway  | time="2025-11-11T..." level=info msg="Configuration loaded from file: /etc/traefik/traefik.yml"
api-gateway  | time="2025-11-11T..." level=info msg="Traefik version 3.0"
api-gateway  | time="2025-11-11T..." level=info msg="Starting provider *docker.Provider"
```

**Validar:**
```bash
# Verificar container
docker ps | grep api-gateway

# Acessar dashboard
open http://localhost:8081/dashboard/

# Verificar métricas
curl http://localhost:8080/metrics | grep traefik_
```

---

## 🔗 Passo 2: Migrar Primeiro Serviço (Workspace API)

### 2.1. Adicionar labels Traefik

Editar [`tools/compose/docker-compose.4-3-workspace-stack.yml`](https://github.com/marceloterra1983/TradingSystem/blob/main/docs/tools/compose/docker-compose.4-3-workspace-stack.yml):

```yaml
services:
  workspace-api:
    # ... configuração existente ...
    labels:
      - "com.tradingsystem.stack=workspace"
      - "com.tradingsystem.tier=application"

      # ============ ADICIONAR ESTAS LINHAS ============
      # Traefik - Enable routing
      - "traefik.enable=true"

      # Traefik - HTTP Router
      - "traefik.http.routers.workspace.rule=PathPrefix(`/api/workspace`)"
      - "traefik.http.routers.workspace.entrypoints=web"
      - "traefik.http.routers.workspace.service=workspace"

      # Traefik - Service
      - "traefik.http.services.workspace.loadbalancer.server.port=3200"

      # Traefik - Middlewares
      - "traefik.http.routers.workspace.middlewares=api-standard@file"
```

### 2.2. Reiniciar serviço

```bash
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml up -d
```

### 2.3. Validar roteamento

```bash
# Via gateway (NOVO - porta 8080)
curl http://localhost:8080/api/workspace/health

# Via porta direta (ANTIGO - porta 3210)
curl http://localhost:3210/health

# Ambos devem retornar 200 OK
```

**Verificar no Dashboard:**
1. Abrir http://localhost:8081/dashboard/
2. Clicar em "HTTP" → "Routers"
3. Confirmar que router `workspace@docker` aparece
4. Status deve ser **verde** (healthy)

---

## 🎨 Passo 3: Migrar Dashboard UI

### 3.1. Adicionar labels Traefik

Editar [`tools/compose/docker-compose.1-dashboard-stack.yml`](https://github.com/marceloterra1983/TradingSystem/blob/main/docs/tools/compose/docker-compose.1-dashboard-stack.yml):

```yaml
services:
  dashboard:
    # ... configuração existente ...
    labels:
      - "com.tradingsystem.stack=frontend-ui"
      - "com.tradingsystem.service=dashboard"

      # ============ ADICIONAR ESTAS LINHAS ============
      # Traefik - Enable routing
      - "traefik.enable=true"

      # Traefik - HTTP Router (root path)
      - "traefik.http.routers.dashboard.rule=Host(`localhost`)"
      - "traefik.http.routers.dashboard.entrypoints=web"
      - "traefik.http.routers.dashboard.service=dashboard"
      - "traefik.http.routers.dashboard.priority=1"  # Catch-all (lowest priority)

      # Traefik - Service
      - "traefik.http.services.dashboard.loadbalancer.server.port=3103"

      # Traefik - Middlewares
      - "traefik.http.routers.dashboard.middlewares=static-standard@file"
```

### 3.2. Atualizar configuração do Vite

Editar [`frontend/dashboard/vite.config.ts`](https://github.com/marceloterra1983/TradingSystem/blob/main/docs/frontend/dashboard/vite.config.ts):

```typescript
export default defineConfig({
  server: {
    proxy: {
      // ============ ATUALIZAR ESTAS LINHAS ============
      // Via gateway (não mais porta direta)
      '/api/workspace': {
        target: 'http://localhost:8080',  // ← Gateway (não mais 3210)
        changeOrigin: true,
      },
      '/api/tp-capital': {
        target: 'http://localhost:8080',  // ← Gateway (não mais 4008)
        changeOrigin: true,
      },
      // ... demais proxies ...
    }
  }
});
```

### 3.3. Reiniciar Dashboard

```bash
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d
```

### 3.4. Validar

```bash
# Via gateway
curl http://localhost:8080/

# Deve retornar HTML do Dashboard
```

---

## 📚 Passo 4: Migrar Docs Hub

### 4.1. Adicionar labels Traefik

Editar [`tools/compose/docker-compose.2-docs-stack.yml`](https://github.com/marceloterra1983/TradingSystem/blob/main/docs/tools/compose/docker-compose.2-docs-stack.yml):

```yaml
services:
  documentation:
    # ... configuração existente ...
    labels:
      - "com.tradingsystem.stack=2-docs-stack"
      - "com.tradingsystem.service=docs-static"

      # ============ ADICIONAR ESTAS LINHAS ============
      # Traefik - Enable routing
      - "traefik.enable=true"

      # Traefik - HTTP Router
      - "traefik.http.routers.docs.rule=PathPrefix(`/docs`)"
      - "traefik.http.routers.docs.entrypoints=web"
      - "traefik.http.routers.docs.service=docs"
      - "traefik.http.routers.docs.priority=10"

      # Traefik - Service
      - "traefik.http.services.docs.loadbalancer.server.port=80"

      # Traefik - Middlewares
      - "traefik.http.routers.docs.middlewares=static-standard@file"

  docs-api:
    # ... configuração existente ...
    labels:
      - "com.tradingsystem.stack=2-docs-stack"
      - "com.tradingsystem.service=docs-api"

      # ============ ADICIONAR ESTAS LINHAS ============
      # Traefik - Enable routing
      - "traefik.enable=true"

      # Traefik - HTTP Router
      - "traefik.http.routers.docs-api.rule=PathPrefix(`/api/docs`)"
      - "traefik.http.routers.docs-api.entrypoints=web"
      - "traefik.http.routers.docs-api.service=docs-api"
      - "traefik.http.routers.docs-api.priority=20"

      # Traefik - Service
      - "traefik.http.services.docs-api.loadbalancer.server.port=3000"

      # Traefik - Middlewares
      - "traefik.http.routers.docs-api.middlewares=api-standard@file"
```

### 4.2. Reiniciar serviços

```bash
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d
```

### 4.3. Validar

```bash
# Via gateway
curl http://localhost:8080/docs/

# Deve retornar HTML do Docusaurus
```

---

## ✅ Passo 5: Validação Final

### 5.1. Executar script de validação

```bash
bash scripts/gateway/validate-traefik.sh --verbose
```

**Esperado:**
```
================================================================================
  TradingSystem - Traefik API Gateway Validation
================================================================================

[✓] Docker is running
[✓] Network tradingsystem_backend exists
[✓] Network tradingsystem_frontend exists
[✓] Traefik container is running
[✓] Traefik container is healthy
[✓] Traefik API is accessible
[✓] Traefik Dashboard is accessible
[✓] Gateway entrypoint is accessible
[✓] Prometheus metrics are exposed
[✓] Found 3 configured routers
[✓] Found 8 configured middlewares
[✓] Service workspace-api is healthy
[✓] Service dashboard is healthy
[✓] Service docs-hub is healthy

================================================================================
  Validation Summary
================================================================================
Passed:   13
Failed:   0
Warnings: 0

✓ All critical checks passed!
```

### 5.2. Teste de rate limiting

```bash
# Fazer 110 requisições rápidas
for i in {1..110}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/workspace/health
done

# Últimas 10 devem retornar 429 (Too Many Requests)
```

### 5.3. Verificar dashboard Traefik

Abrir http://localhost:8081/dashboard/ e validar:

1. **HTTP Routers** (3 routers):
   - `dashboard@docker` (Priority: 1)
   - `docs@docker` (Priority: 10)
   - `workspace@docker` (Priority: 20)

2. **HTTP Services** (3 services):
   - `dashboard@docker` (1 server, green)
   - `docs@docker` (1 server, green)
   - `workspace@docker` (1 server, green)

3. **HTTP Middlewares** (8 middlewares):
   - `api-standard@file`
   - `static-standard@file`
   - `cors-global@file`
   - `rate-limit-global@file`
   - `compress@file`
   - (outros)

---

## 📊 Passo 6: Métricas e Monitoramento

### 6.1. Integrar com Prometheus

Adicionar job ao `tools/monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'traefik'
    static_configs:
      - targets: ['api-gateway:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 6.2. Criar dashboard no Grafana

Importar dashboard oficial do Traefik:
1. Abrir Grafana: http://localhost:3000
2. Click "+" → "Import"
3. ID: `17346` (Traefik Official Dashboard)
4. Selecionar datasource: Prometheus
5. Click "Import"

### 6.3. Configurar alertas

Criar alerta para latência alta:

```yaml
# tools/monitoring/alerts/traefik.yml
groups:
  - name: traefik
    interval: 30s
    rules:
      - alert: TraefikHighLatency
        expr: histogram_quantile(0.95, traefik_service_request_duration_seconds_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Traefik high latency detected"
          description: "P95 latency is {{ $value }}s (threshold: 0.5s)"

      - alert: TraefikHighErrorRate
        expr: rate(traefik_service_requests_total{code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Traefik high error rate detected"
          description: "Error rate is {{ $value }} (threshold: 5%)"
```

---

## 🎓 Próximos Passos

### Sprint 2 (Semana 2-3)
- [ ] Migrar TP Capital API
- [ ] Migrar Telegram Gateway API
- [ ] Migrar MTProto Gateway
- [ ] Migrar Firecrawl Proxy
- [ ] Configurar circuit breaker

### Sprint 3 (Semana 4-5)
- [ ] Migrar n8n
- [ ] Migrar Kestra
- [ ] Migrar Grafana
- [ ] Migrar Admin UIs (pgAdmin, pgWeb)
- [ ] Implementar autenticação JWT

### Sprint 4 (Semana 6)
- [ ] Documentar runbooks
- [ ] Treinamento de equipe
- [ ] Load testing (k6)
- [ ] Plano de rollback

---

## 🔧 Troubleshooting

### Gateway não inicia
```bash
# Verificar logs
docker logs api-gateway

# Verificar configuração
docker exec api-gateway cat /etc/traefik/traefik.yml

# Reiniciar
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml restart
```

### Serviço não aparece no dashboard
```bash
# Verificar labels
docker inspect workspace-api | jq '.[].Config.Labels'

# Verificar rede
docker inspect workspace-api | jq '.[].NetworkSettings.Networks'

# Deve estar em tradingsystem_backend
```

### 404 ao acessar via gateway
```bash
# Verificar router no Traefik
curl http://localhost:8081/api/http/routers | jq '.[] | select(.name=="workspace@docker")'

# Verificar regra de roteamento
# PathPrefix deve corresponder ao path usado
```

### Rate limiting não funciona
```bash
# Verificar middleware aplicado
curl http://localhost:8081/api/http/routers/workspace@docker | jq '.middlewares'

# Deve incluir "rate-limit-global@file"
```

---

## 📚 Referências

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Middlewares](https://doc.traefik.io/traefik/middlewares/overview/)
- [Metrics](https://doc.traefik.io/traefik/observability/metrics/prometheus/)

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verificar logs: `docker logs api-gateway`
2. Executar validação: `bash scripts/gateway/validate-traefik.sh --verbose`
3. Consultar [Architecture Review](https://github.com/marceloterra1983/TradingSystem/blob/main/docs/governance/evidence/reports/reviews/architecture-2025-11-01)
4. Abrir issue no repositório
