# API Improvement Plan - Estrutura, Documentação, Saúde e Estabilidade

> **Plano abrangente para melhorar as APIs do TradingSystem**
> **Data:** 2025-11-05
> **Status:** Em Análise

## 📊 Análise da Situação Atual

### APIs Ativas

| API | Port | Status | Documentação | Testes | Monitoramento |
|-----|------|--------|--------------|--------|---------------|
| Workspace API | 3200 | ✅ Ativo | ⚠️ Parcial | ⚠️ Básico | ✅ Prometheus |
| TP Capital | 4005 | ✅ Ativo | ⚠️ Parcial | ⚠️ Básico | ✅ Prometheus |
| Documentation API | 3405 | ✅ Ativo | ❌ Mínima | ❌ Nenhum | ⚠️ Parcial |
| Service Launcher | 3500 | ✅ Ativo | ⚠️ Parcial | ❌ Nenhum | ⚠️ Parcial |
| Firecrawl Proxy | 3600 | ✅ Ativo | ❌ Mínima | ❌ Nenhum | ❌ Nenhum |

### Pontos Fortes

✅ **Arquitetura bem definida** - Clean Architecture + DDD
✅ **Prometheus metrics** - Workspace e TP Capital
✅ **Circuit Breaker** - TP Capital com Opossum
✅ **Rate Limiting** - Todas as APIs
✅ **Input Validation** - TP Capital com Zod
✅ **Docker deployment** - Todas containerizadas

### Pontos de Melhoria

⚠️ **Documentação OpenAPI incompleta** - Falta specs para alguns endpoints
⚠️ **Cobertura de testes baixa** - ~30% (meta: 80%)
⚠️ **Health checks inconsistentes** - Formato varia entre APIs
⚠️ **Versionamento ausente** - APIs sem `/v1`, `/v2`
⚠️ **Inter-service auth missing** - Serviços confiam mutuamente
⚠️ **Logs não estruturados** - Alguns serviços sem Pino
⚠️ **API Gateway ausente** - Sem centralização de auth/routing

## 🎯 Comandos e Agentes Disponíveis

### Comandos Slash (/.claude/commands/)

#### 1. `/doc-api` - Documentação de API

**Descrição:** Gera documentação OpenAPI/Swagger completa

**Uso:**
```bash
/doc-api --service workspace --format openapi
/doc-api --service tp-capital --interactive
```

**O que faz:**
- Gera specs OpenAPI 3.0
- Cria exemplos de requisição/resposta
- Valida contra código existente
- Integra com Redocusaurus

---

#### 2. `/generate-api-documentation` - Auto-geração de Docs

**Descrição:** Gera documentação a partir do código

**Uso:**
```bash
/generate-api-documentation --format swagger-ui
/generate-api-documentation --format redoc
/generate-api-documentation --format postman
```

**Output:**
- `openapi.yaml` validado
- Redoc/Swagger UI integration
- Postman collection export

---

#### 3. `/project-health-check` - Análise de Saúde

**Descrição:** Avalia saúde geral do projeto

**Uso:**
```bash
/project-health-check --30-days
/project-health-check --sprint
```

**Métricas:**
- Code quality score
- Test coverage
- Documentation completeness
- Technical debt
- Performance metrics

---

#### 4. `/optimize-api-performance` - Otimização

**Descrição:** Analisa e otimiza performance de APIs

**Uso:**
```bash
/optimize-api-performance workspace-api
```

**Áreas de análise:**
- Query optimization
- Caching strategies
- Response times
- Database indexes
- N+1 queries

---

#### 5. `/architecture-review` - Revisão de Arquitetura

**Descrição:** Análise profunda da arquitetura

**Uso:**
```bash
/architecture-review --scope modules
/architecture-review --scope patterns
/architecture-review --scope dependencies
```

**Avalia:**
- Design patterns
- SOLID principles
- Coupling/cohesion
- Security practices
- Scalability

---

#### 6. `/setup-load-testing` - Testes de Carga

**Descrição:** Configura testes de carga com k6

**Uso:**
```bash
/setup-load-testing --capacity
/setup-load-testing --stress
/setup-load-testing --spike
```

**Gera:**
- Scripts k6 customizados
- Cenários de teste
- Métricas de performance
- Relatórios detalhados

---

#### 7. `/setup-comprehensive-testing` - Suite de Testes

**Descrição:** Setup completo de testing infrastructure

**Uso:**
```bash
/setup-comprehensive-testing --full-stack
```

**Configura:**
- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)
- API contract tests
- Load tests (k6)

---

#### 8. `/security-audit` - Auditoria de Segurança

**Descrição:** Análise de vulnerabilidades

**Uso:**
```bash
/security-audit --full
```

**Verifica:**
- OWASP Top 10
- Dependency vulnerabilities
- Authentication/Authorization
- Input validation
- SQL injection risks

---

#### 9. `/design-rest-api` - Design de API

**Descrição:** Projeta nova API seguindo best practices

**Uso:**
```bash
/design-rest-api --v1
/design-rest-api --graphql-hybrid
```

**Cria:**
- Estrutura RESTful
- Endpoints consistentes
- Validação de entrada
- Error handling
- Versioning strategy

---

#### 10. `/test-automation-orchestrator` - Orquestração de Testes

**Descrição:** Automatiza execução de testes

**Uso:**
```bash
/test-automation-orchestrator --parallel
/test-automation-orchestrator --pipeline-optimization
```

---

## 🚀 Plano de Melhoria (Priorizado)

### Fase 1: Fundação (1-2 semanas)

#### 1.1 Documentação OpenAPI Completa

**Comando:** `/doc-api`

**Ações:**
```bash
# Workspace API
/doc-api --service workspace --format openapi --output docs/static/specs/workspace-api.yaml

# TP Capital
/doc-api --service tp-capital --format openapi --output docs/static/specs/tp-capital-api.yaml

# Documentation API
/doc-api --service documentation-api --format openapi --output docs/static/specs/docs-api.yaml

# Service Launcher
/doc-api --service service-launcher --format openapi --output docs/static/specs/service-launcher-api.yaml
```

**Resultado esperado:**
- ✅ 4 specs OpenAPI 3.0 completas
- ✅ Integração com Redocusaurus
- ✅ Exemplos de requisição/resposta
- ✅ Schemas validados

---

#### 1.2 Health Checks Padronizados

**Criar:** `backend/shared/health/standardHealthCheck.js`

```javascript
/**
 * Standard health check format for all APIs
 */
export function createStandardHealthCheck(serviceName, dependencies = {}) {
  return async (req, res) => {
    const checks = {
      status: 'healthy',
      service: serviceName,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {}
    };

    // Check each dependency
    for (const [name, checkFn] of Object.entries(dependencies)) {
      try {
        const result = await checkFn();
        checks.dependencies[name] = {
          status: 'healthy',
          ...result
        };
      } catch (error) {
        checks.dependencies[name] = {
          status: 'unhealthy',
          error: error.message
        };
        checks.status = 'degraded';
      }
    }

    const statusCode = checks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(checks);
  };
}
```

**Implementar em todas as APIs:**
```javascript
import { createStandardHealthCheck } from '../../../backend/shared/health/index.js';

app.get('/health', createStandardHealthCheck('workspace-api', {
  timescaledb: async () => {
    await timescaleClient.query('SELECT 1');
    return { latency: '5ms' };
  },
  redis: async () => {
    await redis.ping();
    return { latency: '2ms' };
  }
}));
```

---

#### 1.3 Logging Estruturado (Pino)

**Padronizar em todas as APIs:**

```javascript
import { createLogger } from '../../../backend/shared/logger/index.js';

const logger = createLogger('service-name', {
  version: '1.0.0',
  base: {
    environment: process.env.NODE_ENV
  }
});

// Usage
logger.info({ userId: 123, action: 'create_item' }, 'Item created');
logger.error({ error: err, userId: 123 }, 'Failed to create item');
```

---

### Fase 2: Qualidade (2-3 semanas)

#### 2.1 Suite de Testes Completa

**Comando:** `/setup-comprehensive-testing --full-stack`

**Implementar:**

**A. Unit Tests (Meta: 80% coverage)**
```bash
# Workspace API
npm run test apps/workspace/src/**/*.test.js

# TP Capital
npm run test apps/tp-capital/src/**/*.test.js
```

**B. Integration Tests**
```bash
# API contract tests
npm run test:integration
```

**C. E2E Tests (Playwright)**
```bash
# API endpoints E2E
npm run test:e2e:api
```

**D. Load Tests (k6)**
```bash
# Performance benchmarks
k6 run tests/performance/workspace-api.k6.js
```

---

#### 2.2 API Versioning

**Implementar versionamento em todas as APIs:**

```javascript
// v1 routes
import routesV1 from './routes/v1/index.js';
app.use('/api/v1', routesV1);

// v2 routes (future)
import routesV2 from './routes/v2/index.js';
app.use('/api/v2', routesV2);

// Redirect /api/* to /api/v1/* (backward compatibility)
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/v')) {
    return res.redirect(308, `/api/v1${req.path}`);
  }
  next();
});
```

---

#### 2.3 Inter-Service Authentication

**Criar:** `backend/shared/middleware/interServiceAuth.js`

```javascript
export function requireInterServiceAuth(req, res, next) {
  const serviceToken = req.headers['x-service-token'];
  const validToken = process.env.INTER_SERVICE_SECRET;

  if (!serviceToken || serviceToken !== validToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid service authentication'
    });
  }

  next();
}

// Usage
app.use('/internal/*', requireInterServiceAuth);
```

**Adicionar em `.env`:**
```bash
INTER_SERVICE_SECRET=generate-secure-token-here
```

---

### Fase 3: Resiliência (3-4 semanas)

#### 3.1 Circuit Breakers em Todas as APIs

**Padronizar Circuit Breaker:**

```javascript
import CircuitBreaker from 'opossum';
import { createLogger } from '../shared/logger/index.js';

const logger = createLogger('circuit-breaker');

export function createCircuitBreaker(asyncFunction, name) {
  const breaker = new CircuitBreaker(asyncFunction, {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name
  });

  breaker.fallback(() => ({
    error: 'Service temporarily unavailable',
    message: 'Circuit breaker is open'
  }));

  breaker.on('open', () => logger.error({ name }, 'Circuit breaker opened'));
  breaker.on('halfOpen', () => logger.warn({ name }, 'Circuit breaker half-open'));
  breaker.on('close', () => logger.info({ name }, 'Circuit breaker closed'));

  return breaker;
}
```

---

#### 3.2 Rate Limiting Avançado

**Implementar rate limiting por tenant/user:**

```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000,
  max: async (req) => {
    // Premium users get higher limits
    const userId = req.userId;
    const userTier = await getUserTier(userId);
    return userTier === 'premium' ? 1000 : 100;
  },
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

app.use('/api/', limiter);
```

---

#### 3.3 Request/Response Validation (Zod)

**Padronizar validação em todas as APIs:**

```typescript
import { z } from 'zod';

// Schema definition
const CreateItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['documentacao', 'coleta-dados', 'banco-dados']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).max(10).optional()
});

// Validation middleware
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  };
}

// Usage
app.post('/api/v1/items', validateBody(CreateItemSchema), createItemHandler);
```

---

### Fase 4: Observabilidade (2 semanas)

#### 4.1 Distributed Tracing (OpenTelemetry)

**Implementar:** `backend/shared/tracing/index.js`

```javascript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

export const tracer = provider.getTracer('trading-system');
```

---

#### 4.2 Grafana Dashboards

**Criar dashboards padronizados:**

```yaml
# tools/monitoring/grafana/dashboards/api-overview.json
{
  "dashboard": {
    "title": "API Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

---

### Fase 5: API Gateway (2-3 semanas)

#### 5.1 Implementar Kong/Traefik

**Escolha:** Kong (recomendado para TradingSystem)

**Configuração:** `tools/compose/docker-compose.kong.yml`

```yaml
services:
  kong-database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kong
      POSTGRES_USER: kong
      POSTGRES_PASSWORD: ${KONG_PG_PASSWORD}

  kong:
    image: kong:latest
    ports:
      - "8000:8000"  # HTTP
      - "8443:8443"  # HTTPS
      - "8001:8001"  # Admin API
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
    depends_on:
      - kong-database

  konga:
    image: pantsel/konga:latest
    ports:
      - "1337:1337"  # Konga UI
    environment:
      DB_ADAPTER: postgres
      DB_HOST: kong-database
```

**Configurar serviços no Kong:**
```bash
# Add Workspace API
curl -X POST http://localhost:8001/services \
  --data "name=workspace-api" \
  --data "url=http://workspace:3200"

# Add route
curl -X POST http://localhost:8001/services/workspace-api/routes \
  --data "paths[]=/workspace"

# Add JWT auth
curl -X POST http://localhost:8001/services/workspace-api/plugins \
  --data "name=jwt"

# Add rate limiting
curl -X POST http://localhost:8001/services/workspace-api/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100"
```

---

## 📋 Checklist de Implementação

### Fase 1: Fundação ✅
- [ ] Gerar specs OpenAPI para todas as APIs (`/doc-api`)
- [ ] Padronizar health checks (formato JSON consistente)
- [ ] Implementar logging estruturado (Pino) em todas as APIs
- [ ] Criar shared modules (`backend/shared/`)

### Fase 2: Qualidade ✅
- [ ] Aumentar cobertura de testes para 80% (`/setup-comprehensive-testing`)
- [ ] Implementar API versioning (`/api/v1`, `/api/v2`)
- [ ] Adicionar inter-service authentication
- [ ] Contract tests entre APIs

### Fase 3: Resiliência ✅
- [ ] Circuit breakers em todas as APIs
- [ ] Rate limiting avançado (por tenant/user)
- [ ] Request/response validation (Zod)
- [ ] Retry policies com backoff exponencial

### Fase 4: Observabilidade ✅
- [ ] Distributed tracing (OpenTelemetry + Jaeger)
- [ ] Grafana dashboards padronizados
- [ ] Alerting rules (Prometheus Alertmanager)
- [ ] Log aggregation (ELK stack ou Loki)

### Fase 5: API Gateway ✅
- [ ] Deploy Kong API Gateway
- [ ] Centralizar authentication/authorization
- [ ] Unified rate limiting
- [ ] Request/response transformation
- [ ] API analytics e monitoring

---

## 🎯 Comandos Rápidos para Começar

### 1. Análise Inicial

```bash
# Health check completo
/project-health-check --30-days

# Architecture review
/architecture-review --scope modules --scope patterns --scope security

# Security audit
/security-audit --full
```

### 2. Documentação

```bash
# Gerar docs OpenAPI
/doc-api --service workspace --format openapi
/generate-api-documentation --format redoc --format postman

# Docs maintenance
/docs-maintenance --audit --update --validate
```

### 3. Testing

```bash
# Setup testing suite
/setup-comprehensive-testing --full-stack

# Load testing
/setup-load-testing --capacity --stress

# Generate test cases
/generate-test-cases --service workspace-api
```

### 4. Performance

```bash
# Optimize API
/optimize-api-performance workspace-api

# Performance profiling
npm run test:load -- tests/performance/workspace-api.k6.js
```

---

## 📊 Métricas de Sucesso

### Antes vs Depois

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| **OpenAPI Coverage** | 40% | 100% | 🎯 |
| **Test Coverage** | 30% | 80% | 🎯 |
| **Health Check Format** | Inconsistente | Padronizado | 🎯 |
| **API Versioning** | Nenhum | v1, v2 | 🎯 |
| **Response Time (p95)** | ~500ms | <200ms | 🎯 |
| **Error Rate** | 2% | <0.5% | 🎯 |
| **Uptime** | 98% | 99.9% | 🎯 |
| **MTTR** | 30min | <10min | 🎯 |

---

## 🔗 Recursos Adicionais

- **OpenAPI Spec:** https://swagger.io/specification/
- **Kong Gateway:** https://konghq.com/kong/
- **Opossum (Circuit Breaker):** https://nodeshift.dev/opossum/
- **Zod (Validation):** https://zod.dev/
- **k6 (Load Testing):** https://k6.io/docs/
- **OpenTelemetry:** https://opentelemetry.io/
- **Prometheus Best Practices:** https://prometheus.io/docs/practices/

---

## 📝 Próximos Passos

1. **Executar análise inicial:**
   ```bash
   /project-health-check --30-days
   /architecture-review --scope modules
   ```

2. **Começar Fase 1 (Fundação):**
   ```bash
   /doc-api --service workspace
   /doc-api --service tp-capital
   ```

3. **Implementar health checks padronizados**
   - Criar `backend/shared/health/`
   - Atualizar todas as APIs

4. **Revisar e aprovar plano**
   - Validar prioridades
   - Ajustar timeline
   - Alocar recursos

---

**Status:** 📋 Aguardando aprovação para iniciar implementação
**Owner:** Tech Lead
**Timeline:** 10-14 semanas (5 fases)
**Effort:** ~320 horas de desenvolvimento
