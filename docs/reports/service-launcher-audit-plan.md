---
title: Service Launcher - Plano de Auditoria e Correção Completo
date: 2025-10-18
author: AI Assistant
tags: [service-launcher, audit, planning, refactoring]
status: draft
sidebar_position: 1
domain: shared
type: reference
summary: Documentation
last_review: 2025-10-22
---

# 🔍 Service Launcher - Plano de Auditoria e Correção Completo

## 📋 Sumário Executivo

Este documento apresenta um plano completo para identificar, categorizar e corrigir todos os problemas, inconsistências e oportunidades de melhoria no **Service Launcher** do TradingSystem.

### 🎯 Objetivos
1. ✅ Identificar todos os problemas existentes
2. ✅ Categorizar por severidade e impacto
3. ✅ Mapear dependências e integrações
4. ✅ Propor soluções estruturadas
5. ✅ Definir ordem de execução e prioridades

---

## 🚨 PROBLEMAS CRÍTICOS (Prioridade P0)

### 1. **Conflito de Portas: 9999 vs 3500**

**Severidade:** 🔴 CRÍTICA  
**Impacto:** Sistema não funciona corretamente

#### Descrição
- **Código atual** (server.js:9): `PORT = 9999` (default)
- **Documentação oficial**: Porta `3500` em +25 arquivos
- **Dashboard** (vite.config.ts:58): Proxy configurado para `3500`
- **Scripts startup**: Suportam ambas (3500 e 9999 como fallback)

#### Arquivos Afetados
```
✅ Corretos (esperam 3500):
- frontend/apps/dashboard/vite.config.ts:58
- frontend/apps/dashboard/src/components/pages/URLsPage.tsx:62
- docs/context/ops/ENVIRONMENT-CONFIGURATION.md:159
- scripts/startup/start-service-launcher.sh:37
- scripts/startup/start-service-launcher.ps1:57

❌ Incorretos (usam 9999):
- frontend/apps/service-launcher/server.js:9
- frontend/apps/service-launcher/README.md (múltiplas referências)
- docs/context/backend/api/service-launcher/README.md:106
- docs/context/ops/development/CURSOR-LINUX-SETUP.md:122
```

#### Solução Proposta
```javascript
// server.js - ANTES
const PORT = Number(process.env.PORT || process.env.SERVICE_LAUNCHER_PORT || 9999);

// server.js - DEPOIS
const PORT = Number(process.env.SERVICE_LAUNCHER_PORT || process.env.PORT || 3500);
```

#### Checklist de Correção
- [ ] Alterar default de 9999 para 3500 no server.js
- [ ] Atualizar README.md do serviço
- [ ] Atualizar documentação em docs/context/backend/api/service-launcher/
- [ ] Remover referências a 9999 ou marcar como "legacy"
- [ ] Adicionar nota de migração se necessário
- [ ] Testar integração com Dashboard

---

### 2. **Violação Crítica: Carregamento de .env Local**

**Severidade:** 🔴 CRÍTICA  
**Impacto:** Variáveis de ambiente não carregadas corretamente

#### Descrição
```javascript
// ❌ ERRADO - Arquivo atual (server.js:1)
require('dotenv').config();

// ✅ CORRETO - Conforme CLAUDE.md
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
```

#### Impacto
- Serviço não lê variáveis `SERVICE_LAUNCHER_*` do .env central
- Usa apenas defaults hardcoded
- Viola padrão estabelecido do projeto
- Dificulta configuração e debugging

#### Solução Proposta
```javascript
// server.js - INÍCIO DO ARQUIVO
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const express = require('express');
const cors = require('cors');
// ... resto das importações
```

#### Checklist de Correção
- [ ] Corrigir carregamento de dotenv para apontar para root
- [ ] Validar que variáveis SERVICE_LAUNCHER_* são carregadas
- [ ] Adicionar log de debug mostrando porta e configurações carregadas
- [ ] Documentar mudança no README
- [ ] Adicionar teste para validar carregamento correto

---

### 3. **Configuração Incorreta de Portas dos Serviços**

**Severidade:** 🔴 CRÍTICA  
**Impacto:** Health checks falham, dashboard mostra status incorreto

#### Problemas Identificados

##### library-api (workspace)
```javascript
// ❌ ERRADO - server.js:86-93
createServiceTarget({
  id: 'library-api',
  name: 'Workspace',
  defaultPort: 3102,  // ❌ INCORRETO
  portEnv: 'SERVICE_LAUNCHER_WORKSPACE_PORT',
  urlEnv: 'SERVICE_LAUNCHER_WORKSPACE_URL',
}),

// ✅ CORRETO - Conforme documentação
defaultPort: 3200,  // Backend API Workspace está na porta 3200
```

**Evidências:**
- `backend/api/workspace/README.md:654`: `PORT=3102` (desatualizado)
- Documentação oficial: Workspace API = 3200
- `docs/context/backend/README.md:66`: Lista porta 3200
- Scripts de startup: Iniciam na porta 3200

##### Outros Serviços - Status
```javascript
SERVICE_TARGETS = [
  ✅ tp-capital-signals-api: 3200 (CORRETO)
  ✅ b3-market-data-api: 3302 (CORRETO)
  ✅ firecrawl-proxy: 3600 (CORRETO)
  ✅ documentation-api: 3400 (CORRETO)
  ✅ dashboard-ui: 3101 (CORRETO)
  ✅ docusaurus: 3004 (CORRETO)
  ✅ prometheus: 9090 (CORRETO)
  ✅ grafana: 3000 (CORRETO)
  ✅ questdb-http: 9000 (CORRETO)
  ❌ service-launcher: 9999 (INCORRETO - deveria ser 3500)
]
```

#### Solução Proposta
```javascript
// Atualizar configurações conforme portas reais do sistema
{
  id: 'library-api',
  name: 'Workspace API',
  description: 'Trading library and ideas management',
  category: 'api',
  defaultPort: 3200,  // Corrigido
  portEnv: 'SERVICE_LAUNCHER_WORKSPACE_PORT',
  urlEnv: 'SERVICE_LAUNCHER_WORKSPACE_URL',
}
```

#### Checklist de Correção
- [ ] Corrigir library-api de 3102 para 3200
- [ ] Atualizar self-reference de 9999 para 3500
- [ ] Validar portas de todos os serviços contra documentação oficial
- [ ] Atualizar tabela de SERVICE_TARGETS no README
- [ ] Testar health checks após correção

---

## ⚠️ PROBLEMAS GRAVES (Prioridade P1)

### 4. **Typo Generalizado: "Laucher" vs "Launcher"**

**Severidade:** 🟡 ALTA  
**Impacto:** Inconsistência profissional, confusão em buscas

#### Estatísticas
```bash
Arquivos com "Laucher" (typo):   ~90 arquivos
Arquivos com "Launcher" (correto): ~15 arquivos

Locais mais críticos:
- ✅ frontend/apps/service-launcher/ (nome da pasta CORRETO)
- ❌ server.js - Logs e mensagens: "Laucher"
- ❌ README.md do serviço: "Laucher API"
- ❌ docs/context/backend/api/service-launcher/README.md: "Laucher"
- ❌ Scripts PS1/SH: Comentários e mensagens com "Laucher"
- ❌ Documentação geral: Mistura de ambos
```

#### Locais do Typo

**Código-fonte:**
- `frontend/apps/service-launcher/server.js`: Todos os logs (`console.log`)
- `frontend/apps/service-launcher/README.md`: Título e texto
- `frontend/apps/service-launcher/package.json:2`: "name": "service-launcher-api" (OK)

**Documentação:**
- `docs/context/backend/api/service-launcher/README.md`: Título "Laucher API"
- `docs/context/ops/`: Múltiplas referências
- `CLAUDE.md`: Referências mistas

**Scripts:**
- `scripts/startup/start-service-launcher.sh`: Comentários e mensagens
- `scripts/startup/start-service-launcher.ps1`: Comentários e mensagens

#### Opções de Solução

**Opção A: Correção Total (RECOMENDADO)**
- Corrigir TODOS os "Laucher" para "Launcher"
- Manter apenas versão correta
- Mais profissional e consistente
- Esforço: ~2-3 horas
- Breaking changes: Nenhum (apenas texto)

**Opção B: Manter Typo por Consistência**
- Manter "Laucher" em todo o projeto
- Justificar como "nome interno"
- Menos profissional
- Não recomendado

**Opção C: Correção Gradual**
- Corrigir código primeiro
- Documentação depois
- Manter ambos temporariamente
- Mais confuso

#### Checklist de Correção (Opção A)
- [ ] Buscar e substituir "Laucher" por "Launcher" em:
  - [ ] server.js (todos os console.log)
  - [ ] README.md do serviço
  - [ ] Documentação em docs/context/
  - [ ] Scripts PS1 e SH
  - [ ] CLAUDE.md e outros docs raiz
- [ ] Verificar se "Laucher" não é usado como identificador de código
- [ ] Atualizar variáveis de ambiente (se existirem com typo)
- [ ] Commit com mensagem clara sobre correção de typo

---

### 5. **Falta de Variáveis no .env Central**

**Severidade:** 🟡 ALTA  
**Impacto:** Configuração difícil, defaults não documentados

#### Situação Atual
```bash
# ❌ NÃO EXISTE no .env
SERVICE_LAUNCHER_PORT=3500
SERVICE_LAUNCHER_PROTOCOL=http
SERVICE_LAUNCHER_HOST=localhost
SERVICE_LAUNCHER_TIMEOUT_MS=2500
SERVICE_LAUNCHER_USE_WT=false

SERVICE_LAUNCHER_WORKSPACE_PORT=3200
SERVICE_LAUNCHER_TP_CAPITAL_PORT=3200
SERVICE_LAUNCHER_B3_PORT=3302
SERVICE_LAUNCHER_DOCS_PORT=3400
SERVICE_LAUNCHER_FIRECRAWL_PROXY_PORT=3600
SERVICE_LAUNCHER_DASHBOARD_PORT=3101
SERVICE_LAUNCHER_DOCUSAURUS_PORT=3004
SERVICE_LAUNCHER_PROMETHEUS_PORT=9090
SERVICE_LAUNCHER_GRAFANA_PORT=3000
SERVICE_LAUNCHER_QUESTDB_HTTP_PORT=9000

# CORS para Service Launcher
CORS_ORIGIN=http://localhost:3103,http://localhost:3004

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
```

#### Problemas
1. Usuário não sabe quais variáveis podem ser configuradas
2. Defaults só existem no código
3. Dificulta troubleshooting
4. .env.example também não tem essas variáveis

#### Solução Proposta

**1. Adicionar ao .env.example:**
```bash
# ========================================
# Service Launcher Configuration
# ========================================
# Service Launcher orchestrates local services and provides health checks

# Main configuration
SERVICE_LAUNCHER_PORT=3500
SERVICE_LAUNCHER_PROTOCOL=http
SERVICE_LAUNCHER_HOST=localhost
SERVICE_LAUNCHER_TIMEOUT_MS=2500
SERVICE_LAUNCHER_USE_WT=false  # Use Windows Terminal (true) or cmd (false)

# Service port overrides (optional - defaults to service's standard port)
SERVICE_LAUNCHER_WORKSPACE_PORT=3200
SERVICE_LAUNCHER_TP_CAPITAL_PORT=3200
SERVICE_LAUNCHER_B3_PORT=3302
SERVICE_LAUNCHER_DOCS_PORT=3400
SERVICE_LAUNCHER_FIRECRAWL_PROXY_PORT=3600
SERVICE_LAUNCHER_DASHBOARD_PORT=3101
SERVICE_LAUNCHER_DOCUSAURUS_PORT=3004
SERVICE_LAUNCHER_PROMETHEUS_PORT=9090
SERVICE_LAUNCHER_GRAFANA_PORT=3000
SERVICE_LAUNCHER_QUESTDB_HTTP_PORT=9000

# Service URL overrides (optional - overrides protocol/host/port combination)
# SERVICE_LAUNCHER_WORKSPACE_URL=http://custom-host:3200
# SERVICE_LAUNCHER_TP_CAPITAL_URL=http://custom-host:3200
# SERVICE_LAUNCHER_B3_URL=http://custom-host:3302
```

**2. Documentar no README do serviço**

#### Checklist de Correção
- [ ] Criar seção SERVICE_LAUNCHER no .env.example
- [ ] Documentar cada variável com comentário explicativo
- [ ] Atualizar README com tabela de variáveis
- [ ] Adicionar valores default no código com comentários
- [ ] Validar que defaults funcionam se variáveis não existirem

---

## ⚡ MELHORIAS IMPORTANTES (Prioridade P2)

### 6. **Logs Inconsistentes e Pouco Informativos**

**Severidade:** 🟢 MÉDIA  
**Impacto:** Dificuldade em debugging

#### Problemas
```javascript
// ❌ PROBLEMAS ATUAIS
console.log(`[Laucher] Launching ${serviceName}...`);  // Typo + pouca info
console.error('[Laucher] Failed to gather status:', error);  // Sem contexto
```

#### Solução Proposta
```javascript
// ✅ LOGS ESTRUTURADOS
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({
    level: 'info',
    service: 'service-launcher',
    timestamp: new Date().toISOString(),
    message: msg,
    ...meta
  })),
  error: (msg, error, meta = {}) => console.error(JSON.stringify({
    level: 'error',
    service: 'service-launcher',
    timestamp: new Date().toISOString(),
    message: msg,
    error: error.message,
    stack: error.stack,
    ...meta
  }))
};

// Uso
logger.info('Launching service', {
  serviceName,
  workingDir,
  command,
  method: windowsTerminalAvailable ? 'wt.exe' : 'cmd.exe'
});
```

#### Checklist de Implementação
- [ ] Criar módulo de logging estruturado
- [ ] Substituir todos os console.log
- [ ] Adicionar níveis: debug, info, warn, error
- [ ] Incluir timestamps e metadata
- [ ] Considerar integração com Pino (já usado em outros serviços)

---

### 7. **Falta de Testes Automatizados**

**Severidade:** 🟢 MÉDIA  
**Impacto:** Regressões não detectadas

#### Situação Atual
```
✅ Testes existentes:
- tests/status.test.js (básico)
- Cobre: evaluateService, summarizeStatuses, sortResultsBySeverity

❌ Faltam testes para:
- /launch endpoint
- /health endpoint
- Integração com Dashboard
- Configuração de variáveis de ambiente
- Tratamento de erros
- Timeouts
- CORS
- Rate limiting
```

#### Suíte de Testes Proposta

```javascript
// tests/endpoints.test.js
describe('Service Launcher Endpoints', () => {
  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'service-launcher-api'
    });
  });

  test('POST /launch validates required fields', async () => {
    const response = await request(app)
      .post('/launch')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  test('GET /api/status returns aggregated status', async () => {
    const response = await request(app).get('/api/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('overallStatus');
    expect(response.body).toHaveProperty('services');
    expect(Array.isArray(response.body.services)).toBe(true);
  });
});

// tests/config.test.js
describe('Environment Configuration', () => {
  test('loads PORT from SERVICE_LAUNCHER_PORT', () => {
    process.env.SERVICE_LAUNCHER_PORT = '4000';
    const { PORT } = require('../server');
    expect(PORT).toBe(4000);
  });

  test('uses default 3500 if not configured', () => {
    delete process.env.SERVICE_LAUNCHER_PORT;
    delete process.env.PORT;
    jest.resetModules();
    const { PORT } = require('../server');
    expect(PORT).toBe(3500);
  });
});

// tests/integration.test.js
describe('Dashboard Integration', () => {
  test('CORS allows dashboard origin', async () => {
    const response = await request(app)
      .get('/api/status')
      .set('Origin', 'http://localhost:3103');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
```

#### Checklist de Implementação
- [ ] Instalar dependências de teste faltantes
- [ ] Criar tests/endpoints.test.js
- [ ] Criar tests/config.test.js
- [ ] Criar tests/integration.test.js
- [ ] Adicionar npm script "test:coverage"
- [ ] Configurar CI para rodar testes
- [ ] Aim for 80%+ coverage

---

### 8. **Documentação Desatualizada e Fragmentada**

**Severidade:** 🟢 MÉDIA  
**Impacto:** Onboarding difícil, informações conflitantes

#### Problemas Identificados

**1. README.md do Serviço**
```markdown
❌ Problemas:
- Porta 9999 mencionada como default
- Não lista variáveis de ambiente disponíveis
- Falta exemplos de integração com Dashboard
- Não menciona suporte a Linux/WSL
- Exemplos de curl não testados
```

**2. Documentação em docs/context/backend/api/service-launcher/**
```markdown
❌ Problemas:
- Typo "Laucher" no título
- Tabela de variáveis incompleta
- Falta seção de troubleshooting
- Não tem diagramas arquiteturais
- Exemplos de resposta desatualizados
```

**3. Fragmentação**
```
Documentação espalhada em:
- frontend/apps/service-launcher/README.md
- docs/context/backend/api/service-launcher/README.md
- docs/context/ops/service-startup-guide.md
- CLAUDE.md
- scripts/startup/*.{sh,ps1} (comentários)
```

#### Solução Proposta

**Estrutura Consolidada:**
```
frontend/apps/service-launcher/
├── README.md (overview + quick start)
└── docs/
    ├── ARCHITECTURE.md (design decisions)
    ├── API.md (endpoints detalhados)
    ├── CONFIGURATION.md (variáveis de ambiente)
    └── TROUBLESHOOTING.md (problemas comuns)

docs/context/backend/api/service-launcher/
├── README.md (referência principal - link para docs acima)
└── diagrams/
    ├── service-health-flow.puml
    └── launch-sequence.puml
```

**Template do README Principal:**
```markdown
# Service Launcher

> **Porta oficial:** 3500  
> **Status:** Produção  
> **Última atualização:** 2025-10-18

## 📋 Visão Geral

Serviço de orquestração local que:
- Inicia serviços auxiliares em novos terminais
- Monitora health de todos os serviços
- Expõe status agregado para o Dashboard

## 🚀 Quick Start

\`\`\`bash
# 1. Configurar variáveis (opcional)
cp .env.example .env
# Editar SERVICE_LAUNCHER_PORT se necessário

# 2. Instalar dependências
cd frontend/apps/service-launcher
npm install

# 3. Iniciar serviço
npm start
# Disponível em http://localhost:3500

# 4. Testar
curl http://localhost:3500/health
curl http://localhost:3500/api/status
\`\`\`

## 📡 Endpoints

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | /health | Health check básico |
| GET | /api/status | Status agregado de todos os serviços |
| POST | /launch | Iniciar serviço em novo terminal |

Ver [docs/API.md](docs/API.md) para detalhes completos.

## ⚙️ Configuração

| Variável | Default | Descrição |
|----------|---------|-----------|
| SERVICE_LAUNCHER_PORT | 3500 | Porta HTTP |
| SERVICE_LAUNCHER_TIMEOUT_MS | 2500 | Timeout de health checks |
| SERVICE_LAUNCHER_HOST | localhost | Host para health URLs |

Ver [docs/CONFIGURATION.md](docs/CONFIGURATION.md) para lista completa.

## 🔗 Integrações

- **Dashboard**: ConnectionsPage usa /api/status
- **Scripts**: start-service-launcher.{sh,ps1}
- **Vite Proxy**: Dashboard proxy /api/launcher → :3500

## 🧪 Testes

\`\`\`bash
npm test              # Rodar todos os testes
npm run test:watch    # Modo watch
npm run test:coverage # Cobertura
\`\`\`

## 🐛 Troubleshooting

Ver [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## 📚 Documentação Adicional

- [Arquitetura](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Configuração Avançada](docs/CONFIGURATION.md)
```

#### Checklist de Implementação
- [ ] Criar estrutura docs/ dentro do serviço
- [ ] Reescrever README principal com novo template
- [ ] Criar ARCHITECTURE.md com decisões de design
- [ ] Criar API.md com todos os endpoints documentados
- [ ] Criar CONFIGURATION.md com todas as variáveis
- [ ] Criar TROUBLESHOOTING.md com problemas comuns
- [ ] Adicionar diagramas PlantUML
- [ ] Atualizar links em docs/context/backend/api/service-launcher/
- [ ] Testar todos os exemplos de código

---

## 🔧 MELHORIAS TÉCNICAS (Prioridade P3)

### 9. **Tratamento de Erros Limitado**

**Severidade:** 🔵 BAIXA  
**Impacto:** Experiência degradada em cenários de erro

#### Problemas
```javascript
// ❌ Erro genérico sem retry
app.get('/api/status', async (_req, res) => {
  try {
    const results = await gatherServiceStatuses(SERVICE_TARGETS);
    res.json(summary);
  } catch (error) {
    console.error('[Launcher] Failed to gather status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to gather service status',
      message: error.message,
    });
  }
});
```

#### Melhorias Propostas
1. **Circuit Breaker** para serviços que falham consistentemente
2. **Retry com backoff** para falhas temporárias
3. **Fallback values** para dados críticos
4. **Rate limiting por IP** (já existe global)
5. **Health check com degradação gradual**

#### Exemplo de Implementação
```javascript
// utils/circuit-breaker.js
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = new Map();
    this.threshold = threshold;
    this.timeout = timeout;
  }

  isOpen(serviceId) {
    const record = this.failures.get(serviceId);
    if (!record) return false;
    
    if (record.count >= this.threshold) {
      const elapsed = Date.now() - record.firstFailure;
      if (elapsed < this.timeout) {
        return true; // Circuit open
      }
      this.reset(serviceId); // Reset after timeout
    }
    return false;
  }

  recordFailure(serviceId) {
    const record = this.failures.get(serviceId) || { count: 0, firstFailure: Date.now() };
    record.count++;
    this.failures.set(serviceId, record);
  }

  reset(serviceId) {
    this.failures.delete(serviceId);
  }
}

// Uso no evaluateService
async function evaluateService(service, circuitBreaker) {
  if (circuitBreaker.isOpen(service.id)) {
    return {
      ...service,
      status: 'down',
      latencyMs: null,
      details: {
        error: 'Circuit breaker open - too many failures',
        healthUrl: service.healthUrl,
      }
    };
  }

  try {
    // ... lógica existente ...
    circuitBreaker.reset(service.id);
    return result;
  } catch (error) {
    circuitBreaker.recordFailure(service.id);
    throw error;
  }
}
```

#### Checklist de Implementação
- [ ] Implementar Circuit Breaker pattern
- [ ] Adicionar retry com backoff exponencial
- [ ] Melhorar mensagens de erro
- [ ] Adicionar fallback para dados críticos
- [ ] Documentar comportamento de erro

---

### 10. **Suporte Cross-Platform Pode Melhorar**

**Severidade:** 🔵 BAIXA  
**Impacto:** Funciona mas pode ser otimizado

#### Situação Atual

**Windows:**
```javascript
✅ Suporta Windows Terminal (wt.exe)
✅ Fallback para cmd.exe
✅ PowerShell script fornecido
⚠️  Hardcoded para PowerShell (não cmd direto)
```

**Linux/WSL:**
```javascript
✅ Bash script fornecido
❌ /launch endpoint não funciona (específico Windows)
❌ Não detecta terminal Linux (gnome-terminal, konsole, etc)
⚠️  Documentação não menciona limitações
```

#### Melhorias Propostas

**1. Detecção de Plataforma**
```javascript
const platform = require('os').platform();

function detectTerminal() {
  if (platform === 'win32') {
    return detectWindowsTerminal();
  } else if (platform === 'linux' || platform === 'darwin') {
    return detectUnixTerminal();
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function detectUnixTerminal() {
  const terminals = [
    'gnome-terminal',
    'konsole',
    'xfce4-terminal',
    'terminator',
    'tilix'
  ];
  
  for (const term of terminals) {
    try {
      execSync(`which ${term}`, { windowsHide: true });
      return term;
    } catch {
      continue;
    }
  }
  return null;
}
```

**2. Launch Cross-Platform**
```javascript
function launchService(serviceName, workingDir, command) {
  const platform = require('os').platform();
  
  if (platform === 'win32') {
    return launchWindows(serviceName, workingDir, command);
  } else if (platform === 'linux' || platform === 'darwin') {
    return launchUnix(serviceName, workingDir, command);
  }
  throw new Error(`Platform not supported: ${platform}`);
}

function launchUnix(serviceName, workingDir, command) {
  const terminal = detectUnixTerminal();
  if (!terminal) {
    throw new Error('No supported terminal found');
  }

  const args = {
    'gnome-terminal': ['--', 'bash', '-c', `cd "${workingDir}" && ${command}; exec bash`],
    'konsole': ['--workdir', workingDir, '-e', 'bash', '-c', command],
    'xfce4-terminal': ['--working-directory', workingDir, '-e', `bash -c "${command}"`],
  };

  const child = spawn(terminal, args[terminal], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}
```

#### Checklist de Implementação
- [ ] Adicionar detecção de plataforma
- [ ] Implementar launchUnix
- [ ] Testar em Linux/WSL
- [ ] Testar em macOS (se disponível)
- [ ] Documentar suporte por plataforma
- [ ] Atualizar README com limitações
- [ ] Adicionar flag --platform para override

---

### 11. **Métricas e Observabilidade**

**Severidade:** 🔵 BAIXA  
**Impacto:** Dificulta análise de performance

#### Situação Atual
```javascript
❌ Não expõe métricas Prometheus
❌ Não registra latência histórica
❌ Não tem alertas automáticos
✅ Calcula latencyMs em tempo real
✅ Conta degradedCount / downCount
```

#### Melhorias Propostas

**1. Endpoint /metrics (Prometheus)**
```javascript
const promClient = require('prom-client');

// Registrar métricas
const register = new promClient.Registry();

const healthCheckDuration = new promClient.Histogram({
  name: 'service_launcher_health_check_duration_seconds',
  help: 'Duration of health checks',
  labelNames: ['service_id', 'status'],
  registers: [register]
});

const healthCheckTotal = new promClient.Counter({
  name: 'service_launcher_health_check_total',
  help: 'Total health checks performed',
  labelNames: ['service_id', 'status'],
  registers: [register]
});

// No evaluateService
async function evaluateService(service) {
  const start = performance.now();
  
  try {
    // ... lógica existente ...
    const duration = (performance.now() - start) / 1000;
    healthCheckDuration.labels(service.id, result.status).observe(duration);
    healthCheckTotal.labels(service.id, result.status).inc();
    return result;
  } catch (error) {
    const duration = (performance.now() - start) / 1000;
    healthCheckDuration.labels(service.id, 'error').observe(duration);
    healthCheckTotal.labels(service.id, 'error').inc();
    throw error;
  }
}

// Endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

**2. Alertas Configuráveis**
```javascript
// config/alerts.js
module.exports = {
  rules: [
    {
      name: 'Service Down',
      condition: (service) => service.status === 'down',
      severity: 'critical',
      action: 'log' // ou 'webhook', 'email'
    },
    {
      name: 'High Latency',
      condition: (service) => service.latencyMs > 1000,
      severity: 'warning',
      action: 'log'
    },
    {
      name: 'Multiple Degraded',
      condition: (summary) => summary.degradedCount >= 3,
      severity: 'warning',
      action: 'log'
    }
  ]
};
```

#### Checklist de Implementação
- [ ] Instalar prom-client
- [ ] Adicionar endpoint /metrics
- [ ] Registrar métricas de health checks
- [ ] Adicionar métricas de launch operations
- [ ] Configurar alertas básicos
- [ ] Documentar integração com Prometheus
- [ ] Criar dashboard Grafana

---

## 📊 RESUMO DE PRIORIDADES

### 🔴 P0 - CRÍTICO (Fazer AGORA)
| # | Problema | Impacto | Esforço | Ordem |
|---|----------|---------|---------|-------|
| 1 | Conflito de portas 9999 vs 3500 | Sistema quebrado | 1h | 1️⃣ |
| 2 | Carregamento .env local | Config incorreta | 30min | 2️⃣ |
| 3 | Portas de serviços incorretas | Health checks falham | 1h | 3️⃣ |

**Total P0:** ~2.5 horas

### 🟡 P1 - ALTO (Fazer esta semana)
| # | Problema | Impacto | Esforço | Ordem |
|---|----------|---------|---------|-------|
| 4 | Typo "Laucher" | Profissionalismo | 2-3h | 4️⃣ |
| 5 | Falta variáveis .env | Configuração difícil | 1h | 5️⃣ |

**Total P1:** ~3-4 horas

### 🟢 P2 - MÉDIO (Fazer este mês)
| # | Problema | Impacto | Esforço | Ordem |
|---|----------|---------|---------|-------|
| 6 | Logs inconsistentes | Debugging difícil | 2h | 6️⃣ |
| 7 | Falta testes | Regressões | 4-6h | 7️⃣ |
| 8 | Documentação | Onboarding | 4-6h | 8️⃣ |

**Total P2:** ~10-14 horas

### 🔵 P3 - BAIXO (Backlog)
| # | Problema | Impacto | Esforço | Ordem |
|---|----------|---------|---------|-------|
| 9 | Tratamento de erros | UX | 3-4h | 9️⃣ |
| 10 | Suporte cross-platform | Funcionalidade | 4-6h | 🔟 |
| 11 | Métricas Prometheus | Observabilidade | 3-4h | 1️⃣1️⃣ |

**Total P3:** ~10-14 horas

---

## 🎯 PLANO DE EXECUÇÃO RECOMENDADO

### Sprint 1: Correções Críticas (1 dia)
```
Dia 1 - Manhã:
✅ 1. Corrigir porta default para 3500
✅ 2. Corrigir carregamento .env
✅ 3. Corrigir portas dos serviços monitorados

Dia 1 - Tarde:
✅ Testar integrações
✅ Validar Dashboard funcionando
✅ Deploy em ambiente de teste
```

### Sprint 2: Consistência (2-3 dias)
```
Dia 2-3:
✅ 4. Buscar e substituir "Laucher" → "Launcher"
✅ 5. Adicionar variáveis ao .env.example
✅ Atualizar documentação básica
✅ Commit e PR
```

### Sprint 3: Qualidade (1 semana)
```
Semana 1:
✅ 6. Implementar logging estruturado
✅ 7. Criar suíte de testes completa
✅ 8. Reescrever documentação
✅ Code review
```

### Sprint 4: Enhancements (Backlog)
```
Quando houver tempo:
⏰ 9. Circuit breaker e retry logic
⏰ 10. Suporte Linux terminal launch
⏰ 11. Métricas Prometheus
```

---

## 📝 CHECKLIST FINAL

### Antes de Começar
- [ ] Fazer backup do código atual
- [ ] Criar branch feature/service-launcher-fixes
- [ ] Ler este documento completo
- [ ] Priorizar conforme urgência do projeto

### Durante Implementação
- [ ] Seguir ordem de prioridades
- [ ] Escrever testes para cada correção
- [ ] Atualizar documentação junto com código
- [ ] Fazer commits atômicos e descritivos
- [ ] Testar em ambiente local antes de commit

### Após Implementação
- [ ] Rodar todos os testes
- [ ] Validar integração com Dashboard
- [ ] Atualizar CHANGELOG.md
- [ ] Criar PR com descrição detalhada
- [ ] Solicitar code review
- [ ] Atualizar este documento com status

### Deploy
- [ ] Deploy em ambiente de teste
- [ ] Validar health checks
- [ ] Validar launch de serviços
- [ ] Monitorar logs por 24h
- [ ] Deploy em produção
- [ ] Atualizar documentação de produção

---

## 🔗 Referências

### Documentação Relacionada
- [CLAUDE.md](../../CLAUDE.md) - Guia geral do projeto
- [docs/DOCUMENTATION-STANDARD.md](../DOCUMENTATION-STANDARD.md) - Padrão de documentação
- [docs/context/backend/api/service-launcher/README.md](../context/backend/api/service-launcher/README.md)
- [docs/context/ops/ENVIRONMENT-CONFIGURATION.md](../context/ops/ENVIRONMENT-CONFIGURATION.md)

### Arquivos-chave
- `frontend/apps/service-launcher/server.js` - Código principal
- `frontend/apps/service-launcher/README.md` - README do serviço
- `scripts/startup/start-service-launcher.{sh,ps1}` - Scripts de startup
- `frontend/apps/dashboard/src/components/pages/ConnectionsPage.tsx` - Integração Dashboard

### Ferramentas
- **Testes:** Jest + Supertest
- **Logs:** Console (migrar para Pino)
- **Métricas:** prom-client (futuro)
- **Docs:** Markdown + PlantUML

---

## 📅 Histórico de Revisões

| Data | Versão | Autor | Mudanças |
|------|--------|-------|----------|
| 2025-10-18 | 1.0 | AI Assistant | Versão inicial do plano de auditoria |

---

## 💡 Observações Finais

1. **Priorize P0 primeiro** - Sistema não funciona 100% sem essas correções
2. **P1 é importante** - Afeta credibilidade e manutenibilidade
3. **P2 adiciona qualidade** - Importante para crescimento
4. **P3 é opcional** - Nice to have, não bloqueia

5. **Estimativa total de esforço:**
   - P0: ~2.5h (CRÍTICO)
   - P1: ~3-4h (IMPORTANTE)
   - P2: ~10-14h (QUALIDADE)
   - P3: ~10-14h (OPCIONAL)
   - **Total: ~25-34 horas**

6. **MVP (Mínimo Viável):**
   - Apenas P0 + P1 = ~5.5-6.5 horas
   - Deixa o sistema funcionando e consistente
   - P2 e P3 podem ser feitos incrementalmente

---

**Status:** 📝 DRAFT - Aguardando aprovação para início da implementação

**Próximos Passos:**
1. ✅ Revisar este plano
2. ⏳ Aprovar prioridades
3. ⏳ Criar tasks no projeto
4. ⏳ Iniciar Sprint 1 (P0)














