# Traefik API Gateway - Migração Completa

**Data:** 2025-11-11
**Status:** ✅ Concluído
**Versão:** Traefik v3.0

## 📋 Sumário Executivo

Migração bem-sucedida de todos os serviços HTTP do TradingSystem para o Traefik API Gateway centralizado. A implementação fornece roteamento inteligente, segurança aprimorada, observabilidade e preparação para escalonamento futuro.

## 🎯 Objetivos Alcançados

- ✅ Gateway centralizado em produção (porta 9080)
- ✅ 5 serviços migrados e funcionando
- ✅ Descoberta automática via Docker labels
- ✅ Middlewares configurados (CORS, rate limiting, compression, circuit breaker)
- ✅ Health checks ativos em todos os serviços
- ✅ Dashboard operacional (porta 9081)
- ✅ Métricas Prometheus expostas

## 🗺️ Mapa de Rotas

### Gateway Principal
```
http://localhost:9080/          → Dashboard UI (catch-all)
http://localhost:9080/api/...   → APIs (rotas específicas abaixo)
http://localhost:9081/dashboard → Traefik Dashboard
```

### Rotas por Serviço

| Serviço | Porta Antiga | Rota Gateway | Backend | Priority |
|---------|--------------|--------------|---------|----------|
| Dashboard UI | 3103 | `/` | Passthrough | 1 |
| Workspace API | 3210 | `/api/workspace/*` | `/api/*` | 100 |
| Docs Hub | 3404 | `/docs/*` | `/*` | 50 |
| Docs API | 3405 | `/api/docs/*` | `/api/*` | 90 |
| TP Capital API | 4008 | `/api/tp-capital/*` | `/*` | 95 |

## 🔧 Configurações Técnicas

### Traefik Gateway

**Arquivo:** `tools/compose/docker-compose.0-gateway-stack.yml`

```yaml
services:
  traefik:
    image: traefik:v3.0
    container_name: api-gateway
    ports:
      - "9080:9080"   # HTTP Gateway
      - "9081:9080"   # Dashboard
      - "9443:9443"   # HTTPS (futuro)
    networks:
      - tradingsystem_backend
      - tradingsystem_frontend
      - tp_capital_backend
```

**Mudanças de Portas:**
- Gateway: `8080` → `9080` (conflito com adminer/evolution-api)
- Dashboard: `8081` → `9081` (conflito com pgWeb)

### Configuração Estática

**Arquivo:** `tools/traefik/traefik-minimal.yml`

```yaml
entryPoints:
  web:
    address: ":9080"

providers:
  docker:
    exposedByDefault: false
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

log:
  level: "DEBUG"

accessLog:
  filePath: "/var/log/traefik/access.log"
  format: "json"
```

### Middlewares Globais

**Arquivo:** `tools/traefik/dynamic/middlewares.yml`

```yaml
http:
  middlewares:
    # CORS Global
    cors-global:
      headers:
        accessControlAllowOriginList:
          - "http://localhost:3103"
          - "http://localhost:9080"

    # Security Headers
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true

    # Rate Limiting (100 req/min per IP)
    rate-limit-global:
      rateLimit:
        average: 100
        period: "1m"
        burst: 50

    # Compression (gzip/brotli)
    compress:
      compress:
        minResponseBodyBytes: 1024

    # Circuit Breaker (20% error rate)
    circuit-breaker:
      circuitBreaker:
        expression: "ResponseCodeRatio(500, 600, 0, 600) > 0.20"

    # Combined Chain
    api-standard:
      chain:
        middlewares:
          - cors-global
          - security-headers
          - rate-limit-global
          - compress
          - circuit-breaker
```

## 📦 Serviços Migrados

### 1. Workspace API

**Compose:** `tools/compose/docker-compose.4-3-workspace-stack.yml`

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.workspace-api.rule=PathPrefix(`/api/workspace`)"
  - "traefik.http.routers.workspace-api.priority=100"
  - "traefik.http.services.workspace-api.loadbalancer.server.port=3200"

  # Path transformation: /api/workspace/items → /api/items
  - "traefik.http.routers.workspace-api.middlewares=workspace-path-transform,api-standard@file"
  - "traefik.http.middlewares.workspace-path-transform.chain.middlewares=workspace-strip,workspace-addapi"
  - "traefik.http.middlewares.workspace-strip.stripprefix.prefixes=/api/workspace"
  - "traefik.http.middlewares.workspace-addapi.addprefix.prefix=/api"
```

**Acesso:**
```bash
# Via Gateway
curl http://localhost:9080/api/workspace/items

# Direto (ainda funciona)
curl http://localhost:3210/api/items
```

### 2. Dashboard UI

**Compose:** `tools/compose/docker-compose.1-dashboard-stack.yml`

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.dashboard-ui.rule=PathPrefix(`/`)"
  - "traefik.http.routers.dashboard-ui.priority=1"  # Catch-all
  - "traefik.http.services.dashboard-ui.loadbalancer.server.port=3103"
  - "traefik.http.routers.dashboard-ui.middlewares=static-standard@file"
```

**Acesso:**
```bash
# Via Gateway (recomendado)
http://localhost:9080/

# Direto
http://localhost:3103/
```

### 3. Docs Hub

**Compose:** `tools/compose/docker-compose.2-docs-stack.yml`

```yaml
# docs-hub service
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.docs-hub.rule=PathPrefix(`/docs`)"
  - "traefik.http.routers.docs-hub.priority=50"
  - "traefik.http.services.docs-hub.loadbalancer.server.port=80"
  - "traefik.http.middlewares.docs-stripprefix.stripprefix.prefixes=/docs"
```

**Acesso:**
```bash
# Via Gateway
http://localhost:9080/docs/

# Direto
http://localhost:3404/
```

### 4. Docs API

**Compose:** `tools/compose/docker-compose.2-docs-stack.yml`

```yaml
# docs-api service
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.docs-api.rule=PathPrefix(`/api/docs`)"
  - "traefik.http.routers.docs-api.priority=90"
  - "traefik.http.services.docs-api.loadbalancer.server.port=3000"

  # Path transformation: /api/docs/search → /api/search
  - "traefik.http.middlewares.docs-api-path-transform.chain.middlewares=docs-api-strip,docs-api-addapi"
  - "traefik.http.middlewares.docs-api-strip.stripprefix.prefixes=/api/docs"
  - "traefik.http.middlewares.docs-api-addapi.addprefix.prefix=/api"
```

**Acesso:**
```bash
# Via Gateway
curl http://localhost:9080/api/docs/search?q=test

# Direto
curl http://localhost:3405/api/search?q=test
```

### 5. TP Capital API

**Compose:** `tools/compose/docker-compose.4-1-tp-capital-stack.yml`

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.tp-capital-api.rule=PathPrefix(`/api/tp-capital`)"
  - "traefik.http.routers.tp-capital-api.priority=95"
  - "traefik.http.services.tp-capital-api.loadbalancer.server.port=4005"

  # Path transformation: /api/tp-capital/signals → /signals
  - "traefik.http.middlewares.tpcapital-stripprefix.stripprefix.prefixes=/api/tp-capital"
```

**Rede Adicional:**
```yaml
networks:
  tradingsystem_backend:
    external: true
  tp_capital_backend:  # Rede dedicada do TP Capital
    external: true
```

**Acesso:**
```bash
# Via Gateway
curl http://localhost:9080/api/tp-capital/signals

# Direto
curl http://localhost:4008/signals
```

## 🔍 Descobertas e Soluções

### Problema 1: Conflito de Priority

**Sintoma:** Requisições retornando 404 mesmo com router configurado

**Causa:** O router interno do Traefik (`api@internal`) tem priority máxima e captura todas as rotas `/api/*`

**Solução:** Configurar priorities altas nos routers customizados (90-100)

```yaml
# ❌ ERRADO (priority muito baixa)
- "traefik.http.routers.workspace-api.priority=20"

# ✅ CORRETO (priority alta)
- "traefik.http.routers.workspace-api.priority=100"
```

### Problema 2: Arquivos .backup causando erros

**Sintoma:** Middlewares não carregando, erro "field not found"

**Causa:** File provider carrega TODOS os arquivos `.yml`, incluindo backups com configurações antigas

**Solução:** Renomear backups para `.disabled`

```bash
cd tools/traefik/dynamic
mv middlewares.yml.backup middlewares.yml.backup.disabled
mv routes.yml.backup routes.yml.backup.disabled
```

### Problema 3: Path Transformation

**Sintoma:** Backend recebendo path completo em vez de transformado

**Causa:** stripPrefix sozinho não funciona quando precisa adicionar prefixo de volta

**Solução:** Usar chain de middlewares (strip + add)

```yaml
# Para transformar: /api/workspace/items → /api/items
- "traefik.http.middlewares.workspace-path-transform.chain.middlewares=workspace-strip,workspace-addapi"
- "traefik.http.middlewares.workspace-strip.stripprefix.prefixes=/api/workspace"
- "traefik.http.middlewares.workspace-addapi.addprefix.prefix=/api"
```

### Problema 4: Redes Isoladas

**Sintoma:** Gateway timeout ao acessar TP Capital

**Causa:** Traefik não estava na rede `tp_capital_backend`

**Solução:** Adicionar todas as redes necessárias ao Traefik

```yaml
# docker-compose.0-gateway-stack.yml
networks:
  tradingsystem_backend:
    external: true
  tradingsystem_frontend:
    external: true
  tp_capital_backend:
    external: true
```

## 📊 Validação e Testes

### Script de Validação

**Arquivo:** `scripts/gateway/validate-traefik.sh`

```bash
# Validação completa
bash scripts/gateway/validate-traefik.sh --verbose

# Auto-fix de problemas comuns
bash scripts/gateway/validate-traefik.sh --fix
```

### Testes Manuais

```bash
# 1. Dashboard UI
curl -I http://localhost:9080/ | grep "200 OK"

# 2. Workspace API
curl http://localhost:9080/api/workspace/items | jq '.success'

# 3. Docs API
curl http://localhost:9080/api/docs/search?q=test | jq '.success'

# 4. TP Capital API
curl http://localhost:9080/api/tp-capital/signals | jq '.data[0].asset'

# 5. Traefik Dashboard
curl -I http://localhost:9081/dashboard/ | grep "200 OK"

# 6. Prometheus Metrics
curl http://localhost:9080/metrics | grep "traefik_http_requests_total"
```

### Health Checks

```bash
# Ver status de todos os routers
curl -s http://localhost:9080/api/http/routers | jq '.[] | {name, status, rule}'

# Ver status de todos os services
curl -s http://localhost:9080/api/http/services | jq '.[] | {name, status}'

# Ver middlewares carregados
curl -s http://localhost:9080/api/http/middlewares | jq '.[] | {name, type, status}'
```

## 🚀 Comandos Úteis

### Gerenciamento do Gateway

```bash
# Iniciar Traefik
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# Ver logs
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml logs -f

# Restart (aplicar mudanças)
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# Parar
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml down
```

### Debug

```bash
# Ver configuração do Traefik
docker exec api-gateway cat /etc/traefik/traefik.yml

# Ver middlewares carregados
docker exec api-gateway ls -la /etc/traefik/dynamic/

# Access logs em tempo real
docker exec api-gateway tail -f /var/log/traefik/access.log | jq '.'

# Ver rotas detectadas
curl -s http://localhost:9080/api/http/routers | jq 'keys'
```

## 📈 Métricas e Observabilidade

### Prometheus Metrics

```bash
# Endpoint de métricas
curl http://localhost:9080/metrics

# Métricas principais:
# - traefik_http_requests_total
# - traefik_http_request_duration_seconds
# - traefik_service_requests_total
# - traefik_entrypoint_requests_total
```

### Access Logs

```bash
# Logs estruturados em JSON
docker exec api-gateway cat /var/log/traefik/access.log | jq '.'

# Filtrar por status code
docker exec api-gateway cat /var/log/traefik/access.log | jq 'select(.DownstreamStatus == 404)'

# Ver rotas mais acessadas
docker exec api-gateway cat /var/log/traefik/access.log | jq -r '.RequestPath' | sort | uniq -c | sort -rn | head -10
```

## 🔐 Segurança

### Middlewares Ativos

- **CORS:** Permitir `localhost:3103` e `localhost:9080`
- **Security Headers:** Frame-deny, XSS protection, content-type-nosniff
- **Rate Limiting:** 100 req/min por IP (burst 50)
- **Circuit Breaker:** Abre após 20% de erros

### Health Checks

Todos os serviços têm health checks configurados:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 5s
  retries: 5
```

## 📝 Próximos Passos

### Melhorias Futuras

1. **HTTPS/TLS**
   - Configurar Let's Encrypt
   - Certificados automáticos
   - Redirecionamento HTTP → HTTPS

2. **Autenticação**
   - JWT middleware
   - OAuth2 integration
   - API keys por serviço

3. **Observabilidade**
   - Integração com Grafana
   - Alertas Prometheus
   - Tracing distribuído (Jaeger)

4. **Performance**
   - Caching HTTP
   - Compression tuning
   - Connection pooling

5. **Alta Disponibilidade**
   - Múltiplas instâncias Traefik
   - Load balancing
   - Health check avançado

## 🆘 Troubleshooting

### Gateway não inicia

```bash
# Verificar conflitos de porta
sudo netstat -tlnp | grep -E "9080|9081"

# Verificar logs
docker logs api-gateway --tail 50
```

### Serviço não detectado

```bash
# Verificar label traefik.enable
docker inspect SERVICE_NAME | jq '.[0].Config.Labels'

# Verificar rede
docker inspect SERVICE_NAME | jq '.[0].NetworkSettings.Networks'
```

### 404 ou Gateway Timeout

```bash
# Verificar router
curl -s http://localhost:9080/api/http/routers/ROUTER_NAME | jq '.'

# Verificar service backend
curl -s http://localhost:9080/api/http/services/SERVICE_NAME | jq '.loadBalancer.servers'

# Testar acesso direto
curl http://CONTAINER_IP:PORT/PATH
```

## 📚 Referências

- [Traefik v3.0 Documentation](https://doc.traefik.io/traefik/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Middlewares](https://doc.traefik.io/traefik/middlewares/overview/)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

**Migração Completa:** 2025-11-11
**Responsável:** Claude Code
**Status:** ✅ Produção
