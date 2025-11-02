# 🧪 Testing Guide - TP Capital

**Última atualização:** 2025-11-02

---

## 📋 Visão Geral

O TP Capital possui **3 tipos de testes**:

| Tipo | Arquivos | Quantidade | Requer Infraestrutura |
|------|----------|------------|----------------------|
| **Unit Tests** | `parseSignal.test.js`, `gatewayPollingWorker.test.js` | 57 testes | ❌ Não (usa mocks) |
| **Integration Tests** | `timescaleClient.test.js` | 15 testes | ✅ Sim (TimescaleDB) |
| **E2E Tests** | `api.test.js` | 25+ testes | ✅ Sim (Servidor + DB) |

---

## 🚀 Quick Start

### 1. Rodar Apenas Unit Tests (Recomendado para Dev)

**Não requer nenhuma infraestrutura!**

```bash
cd apps/tp-capital

# Rodar apenas unit tests
npm test -- --test-name-pattern="parseSignal|GatewayPollingWorker"
```

**Esperado:**
```
✔ parseSignal (45 testes)
✔ GatewayPollingWorker (12 testes)

✅ 57 testes passando em ~500ms
```

---

### 2. Rodar Integration Tests (Requer TimescaleDB)

**Requer:** TimescaleDB rodando

#### Opção A: Docker Compose (Recomendado)

```bash
# Terminal 1: Iniciar TimescaleDB
docker compose -f tools/compose/docker-compose.infra.yml up -d timescaledb

# Aguardar 5 segundos
sleep 5

# Terminal 2: Rodar testes
cd apps/tp-capital
npm test -- --test-name-pattern="TimescaleClient"
```

#### Opção B: Pular se DB não disponível

```bash
TEST_SKIP_INTEGRATION=1 npm test
```

**Esperado:**
```
✔ TimescaleClient (15 testes)

✅ 15 testes passando em ~2s
```

---

### 3. Rodar E2E Tests (Requer Servidor Rodando)

**Requer:** TP Capital server + TimescaleDB + Gateway DB

#### Setup Completo

```bash
# Terminal 1: Iniciar infraestrutura
docker compose -f tools/compose/docker-compose.infra.yml up -d

# Terminal 2: Iniciar TP Capital server
cd apps/tp-capital
npm run dev

# Aguardar servidor iniciar (~5s)
# Deve ver: "TP Capital API started successfully"

# Terminal 3: Rodar testes E2E
cd apps/tp-capital
npm test -- --test-name-pattern="E2E"
```

**Esperado:**
```
✔ E2E: TP Capital API
  ✔ Health Endpoints (3 testes)
  ✔ Metrics Endpoint (1 teste)
  ✔ Signals CRUD (5 testes)
  ✔ Forwarded Messages (2 testes)
  ✔ Telegram Channels CRUD (4 testes)
  ✔ Channels and Bots Info (3 testes)
  ✔ Logs Endpoint (2 testes)
  ✔ Error Handling (3 testes)

✅ 25+ testes passando em ~3s
```

#### Pular se Servidor não Disponível

```bash
TEST_SKIP_E2E=1 npm test
```

---

## 🎯 Comandos Úteis

### Rodar Todos os Testes (Exceto E2E)

```bash
# Apenas unit + integration (pula E2E)
TEST_SKIP_E2E=1 npm test
```

### Rodar com Coverage

```bash
# Coverage report
npm test -- --experimental-test-coverage

# Coverage HTML (abre no browser)
npm test -- --experimental-test-coverage --test-reporter=html > coverage.html
open coverage.html
```

### Watch Mode (Re-run ao modificar)

```bash
# Watch apenas unit tests
npm test -- --watch --test-name-pattern="parseSignal"

# Watch todos
npm test -- --watch
```

### Rodar Teste Específico

```bash
# Um arquivo específico
npm test src/__tests__/parseSignal.test.js

# Um teste específico por nome
npm test -- --test-name-pattern="should parse complete signal"
```

---

## 🐛 Troubleshooting

### Erro: "Server not running"

**Problema:** Testes E2E não encontram servidor

**Solução:**
```bash
# Verificar se servidor está rodando
curl http://localhost:4005/healthz

# Se não responder, iniciar servidor
cd apps/tp-capital
npm run dev

# Aguardar mensagem: "TP Capital API started successfully"
```

---

### Erro: "TimescaleDB connection failed"

**Problema:** Integration tests não encontram banco

**Solução:**
```bash
# Verificar se TimescaleDB está rodando
docker ps | grep timescaledb

# Se não estiver, iniciar
docker compose -f tools/compose/docker-compose.infra.yml up -d timescaledb

# Aguardar 5 segundos
sleep 5

# Testar conexão
psql -h localhost -p 5433 -U timescale -d APPS-TPCAPITAL -c "SELECT 1"
# Senha: pass_timescale
```

---

### Erro: "Cannot find module 'node-fetch'"

**Problema:** Dependência faltando

**Solução:**
```bash
cd apps/tp-capital
npm install
```

---

### Erro: Testes E2E Lentos (> 30s)

**Problema:** Servidor pode estar lento ou DB sobrecarregado

**Solução:**
```bash
# Reiniciar infraestrutura
docker compose -f tools/compose/docker-compose.infra.yml restart

# Limpar logs
rm -rf apps/tp-capital/logs/*

# Rodar testes novamente
npm test -- --test-name-pattern="E2E"
```

---

## 📊 Coverage Esperado

| Módulo | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| **parseSignal.js** | 95% | 90% | 100% | 95% |
| **timescaleClient.js** | 80% | 75% | 85% | 80% |
| **gatewayPollingWorker.js** | 70% | 65% | 75% | 70% |
| **server.js** | 60% | 55% | 65% | 60% |
| **Total** | **~75%** | **~70%** | **~80%** | **~75%** |

---

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente para Testes

```bash
# .env.test (criar se não existir)
NODE_ENV=test
LOG_LEVEL=error  # Menos logs durante testes

# TimescaleDB (test database)
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=APPS-TPCAPITAL-TEST
TIMESCALEDB_SCHEMA=tp_capital_test
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=pass_timescale

# Gateway DB (test database)
GATEWAY_DATABASE_NAME=APPS-TPCAPITAL-TEST
GATEWAY_DATABASE_SCHEMA=telegram_gateway_test

# TP Capital Config
PORT=4005
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
```

---

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/tp-capital-tests.yml
name: TP Capital Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      timescaledb:
        image: timescale/timescaledb:latest-pg14
        env:
          POSTGRES_PASSWORD: pass_timescale
          POSTGRES_DB: APPS-TPCAPITAL-TEST
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/tp-capital/package-lock.json
      
      - name: Install dependencies
        working-directory: apps/tp-capital
        run: npm ci
      
      - name: Run unit tests
        working-directory: apps/tp-capital
        run: npm test -- --test-name-pattern="parseSignal|GatewayPollingWorker"
      
      - name: Run integration tests
        working-directory: apps/tp-capital
        run: npm test -- --test-name-pattern="TimescaleClient"
        env:
          TIMESCALEDB_HOST: localhost
          TIMESCALEDB_PORT: 5433
          TIMESCALEDB_DATABASE: APPS-TPCAPITAL-TEST
      
      - name: Start server for E2E tests
        working-directory: apps/tp-capital
        run: |
          npm start &
          sleep 10
      
      - name: Run E2E tests
        working-directory: apps/tp-capital
        run: npm test -- --test-name-pattern="E2E"
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/tp-capital/coverage/coverage-final.json
```

---

## 📝 Writing New Tests

### Unit Test Template

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { myFunction } from '../myFunction.js';

describe('myFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid input');
    assert.strictEqual(result, 'expected output');
  });

  it('should throw on invalid input', () => {
    assert.throws(() => myFunction(null), {
      message: 'Invalid input'
    });
  });
});
```

### Integration Test Template

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const SKIP = process.env.TEST_SKIP_INTEGRATION === '1';

describe('MyIntegrationTest', { skip: SKIP }, () => {
  before(async () => {
    // Setup: conectar ao banco, criar schemas, etc.
  });

  after(async () => {
    // Cleanup: remover dados de teste, fechar conexões
  });

  it('should interact with database', async () => {
    const result = await dbClient.query('SELECT 1');
    assert.ok(result.rows);
  });
});
```

### E2E Test Template

```javascript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fetch from 'node-fetch';

const SKIP = process.env.TEST_SKIP_E2E === '1';
const BASE_URL = 'http://localhost:4005';

describe('E2E: My Endpoint', { skip: SKIP }, () => {
  before(async () => {
    // Verificar se servidor está rodando
    const response = await fetch(`${BASE_URL}/healthz`);
    if (!response.ok) {
      throw new Error('Server not running');
    }
  });

  it('should handle valid request', async () => {
    const response = await fetch(`${BASE_URL}/my-endpoint`);
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.success);
  });
});
```

---

## 🎯 Best Practices

1. **Unit tests primeiro** - Mais rápidos, sem dependências
2. **Use mocks** - Para isolar lógica de negócio
3. **Edge cases** - Sempre testar casos extremos
4. **Descritivo** - Nomes de testes devem ser claros
5. **Independentes** - Testes não devem depender uns dos outros
6. **Cleanup** - Sempre limpar dados de teste (after, afterEach)
7. **Skip wisely** - Use flags de ambiente para pular testes pesados

---

## 📚 Recursos

- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [Assert API](https://nodejs.org/api/assert.html)
- [Testing Guide (TradingSystem)](../../docs/content/frontend/engineering/testing.mdx)

---

**Autor:** Claude Code (AI Assistant)
**Data:** 2025-11-02
**Versão:** 1.0.0

