---
title: "Política de Infraestrutura de Containers, Redes e Comunicação"
id: POL-0003
owner: PlatformEngineering
lastReviewed: "2025-11-05"
reviewCycleDays: 90
status: active
appliesTo:
  - AllContainerizedServices
  - DockerCompose
  - Networking
  - PortManagement
  - StackArchitecture
related:
  - POL-0002
  - PORT-GOVERNANCE-2025-11-05
tags:
  - infrastructure
  - containers
  - networking
  - docker
  - ports
  - security
  - architecture
---

# Política de Infraestrutura de Containers, Redes e Comunicação

**ID:** POL-0003  
**Owner:** PlatformEngineering  
**Status:** Active  
**Last Reviewed:** 2025-11-05  
**Next Review:** 2026-02-03 (90 days)

## 1. Objetivo

Estabelecer diretrizes obrigatórias para arquitetura de containers, redes Docker, gerenciamento de portas e comunicação inter-serviços no TradingSystem, garantindo isolamento, segurança, escalabilidade e manutenibilidade.

## 2. Escopo

Esta política aplica-se a:

- **Docker Compose Stacks:** Todos os arquivos `docker-compose*.yml`
- **Containers:** Todos os serviços containerizados (APIs, databases, cache, monitoring)
- **Redes Docker:** Criação, configuração e uso de redes bridge
- **Portas:** Alocação, registry e validação de portas
- **Comunicação:** Protocolos, DNS interno, proxies e APIs
- **Desenvolvedores/DevOps:** Todos os contribuidores que criam ou modificam infraestrutura

## 3. Princípios Fundamentais

### 3.1 Isolamento por Stack (Zero Trust Network)

**PRINCÍPIO:**
> Cada stack (Telegram, TP Capital, Workspace) DEVE ter sua própria rede privada isolada. Databases, caches e message queues NUNCA devem estar em redes compartilhadas.

**JUSTIFICATIVA:**
- ✅ Segurança (Zero Trust Architecture)
- ✅ Isolamento de falhas (blast radius reduzido)
- ✅ Compliance (PCI-DSS, LGPD, SOC2)
- ✅ Escalabilidade (stacks independentes)
- ✅ Multi-tenancy (futuro)

**OBRIGATÓRIO:**
```yaml
# ✅ CORRETO - Database isolado
services:
  telegram-timescale:
    networks:
      - telegram_backend  # SOMENTE rede privada da stack
```

**PROIBIDO:**
```yaml
# ❌ ERRADO - Database em rede compartilhada
services:
  telegram-timescale:
    networks:
      - telegram_backend
      - tradingsystem_backend  # ❌ EXPÕE DATABASE!
```

### 3.2 Comunicação Controlada via Hub Network

**PRINCÍPIO:**
> Serviços que precisam se comunicar entre stacks DEVEM usar uma rede hub dedicada (`tradingsystem_backend`). APIs são "pontes" entre a rede privada e o hub.

**PADRÃO:**
```yaml
# API que expõe serviços
services:
  telegram-gateway-api:
    networks:
      - telegram_backend        # Acessa database/cache (privado)
      - tradingsystem_backend   # Expõe API para outros serviços (hub)
```

**RAZÃO:**
- ✅ Controle granular de comunicação
- ✅ Auditoria de tráfego cross-stack
- ✅ Preparação para service mesh (Istio/Linkerd)

### 3.3 Frontend Isolation

**PRINCÍPIO:**
> Frontend (Dashboard) DEVE estar isolado em sua própria rede. Acesso a backends DEVE ser via proxy (Vite, NGINX) ou hub network, NUNCA direto a databases.

**OBRIGATÓRIO:**
```yaml
services:
  dashboard-ui:
    networks:
      - tradingsystem_frontend  # Rede de UI
      - tradingsystem_backend   # Acesso a APIs (formalizado no compose)
```

**PROIBIDO:**
- ❌ Frontend acessando databases diretamente
- ❌ Conexões manuais via `docker network connect` (deve estar no compose)
- ❌ Hardcoded IPs em frontend (usar DNS interno)

## 4. Taxonomia de Redes

### 4.1 Estrutura de Redes (Atual)

| Rede | Tipo | Propósito | Containers | Status |
|------|------|-----------|------------|--------|
| `telegram_backend` | Privada | Stack Telegram isolada | MTProto, Gateway API, TimescaleDB, Redis, RabbitMQ, Monitoring | ✅ Ativa |
| `tp_capital_backend` | Privada | Stack TP Capital isolada | TP Capital API, TimescaleDB, PgBouncer, Redis | ✅ Ativa |
| `tradingsystem_backend` | Hub | Comunicação cross-stack controlada | Workspace API, Telegram Gateway API, TP Capital API, MTProto | ✅ Ativa |
| `tradingsystem_frontend` | UI | Frontend isolado | Dashboard UI | ✅ Ativa |

**Nomenclatura:**
- `{stack}_backend` → Rede privada de stack (ex: `telegram_backend`)
- `tradingsystem_backend` → Hub para comunicação cross-stack
- `tradingsystem_frontend` → Rede de UI

### 4.2 Regras de Conexão por Tipo de Serviço

#### Database / Cache / Message Queue (1 Rede)

**SEMPRE:** Somente rede privada da stack

```yaml
services:
  telegram-timescale:
    networks: [telegram_backend]
  
  telegram-redis-master:
    networks: [telegram_backend]
  
  telegram-rabbitmq:
    networks: [telegram_backend]
```

**Razão:** Zero exposição externa, segurança máxima.

#### API que Expõe Serviços (2 Redes)

**PADRÃO:** Rede privada + Hub

```yaml
services:
  telegram-gateway-api:
    networks:
      - telegram_backend        # Acessa DB/cache
      - tradingsystem_backend   # Expõe API
```

**Razão:** API é "ponte segura" entre privado e público.

#### API que Consome Outros Serviços (3+ Redes)

**PADRÃO:** Rede privada + Redes consumidas + Hub

```yaml
services:
  tp-capital-api:
    networks:
      - tp_capital_backend      # Acessa seu DB
      - telegram_backend        # Consome mensagens do Telegram
      - tradingsystem_backend   # Expõe API para Dashboard
```

**Razão:** Múltiplas conexões necessárias, todas explícitas.

#### Frontend (2 Redes)

**PADRÃO:** Rede UI + Hub (para proxy)

```yaml
services:
  dashboard-ui:
    networks:
      - tradingsystem_frontend  # UI layer
      - tradingsystem_backend   # APIs (via Vite proxy)
```

**Razão:** Isolamento + acesso controlado via proxy.

## 5. Gerenciamento de Portas

### 5.1 Port Registry (Fonte de Verdade)

**OBRIGATÓRIO:**
- Todas as portas DEVEM estar registradas em: `config/ports/registry.yaml`
- Port Registry é a **única fonte de verdade**
- Geradores automáticos (`npm run ports:sync`) atualizam composes a partir do registry

**Formato do Registry:**
```yaml
services:
  - name: telegram-gateway-api
    port: 4010
    protocol: http
    stack: telegram
    networks:
      - telegram_backend
      - tradingsystem_backend
    healthcheck: /health
    description: "Telegram Gateway REST API"
    
  - name: telegram-timescale
    port: 5434
    protocol: postgresql
    stack: telegram
    networks:
      - telegram_backend
    internal: true  # Não expor para host
    description: "TimescaleDB dedicado para Telegram"
```

### 5.2 Regras de Alocação de Portas

**Ranges Reservados:**

| Range | Propósito | Exemplos |
|-------|-----------|----------|
| `3000-3999` | Frontend e UIs | Dashboard (3103), Grafana (3100) |
| `4000-4999` | Backend APIs | Telegram Gateway (4010), TP Capital (4008), MTProto (4007) |
| `5000-5999` | Databases | Postgres (5432), TimescaleDB (5434, 5435) |
| `6000-6999` | Cache/Queue | Redis (6379-6387), PgBouncer (6434-6435), RabbitMQ (5672) |
| `8000-8999` | Tooling/Utilities | RAG System (8202) |
| `9000-9999` | Monitoring/Metrics | Prometheus (9193), Exporters (9121, 9188) |

**PROIBIDO:**
- ❌ Alterar portas sem atualizar registry
- ❌ Usar portas fora dos ranges definidos sem aprovação
- ❌ Conflitos de portas (validação automática em CI)
- ❌ Portas hardcoded em código (usar env vars)

### 5.3 Validação Automática

**CI/CD DEVE bloquear build se:**
```bash
npm run ports:validate  # Executa:
  # 1. Detecta conflitos de portas
  # 2. Verifica ranges
  # 3. Valida registry.yaml schema
  # 4. Compara registry vs composes (sync)
```

## 6. Comunicação Inter-Serviços

### 6.1 Protocolos Permitidos

| Protocolo | Uso | Exemplo |
|-----------|-----|---------|
| **HTTP/REST** | APIs síncronas | Dashboard ↔ Telegram Gateway API |
| **WebSocket** | Real-time, streaming | MTProto ↔ Telegram Servers |
| **PostgreSQL Wire** | Database queries | API ↔ TimescaleDB (via PgBouncer) |
| **Redis Protocol** | Cache, pub/sub | API ↔ Redis Master |
| **AMQP** | Message queue | Async jobs ↔ RabbitMQ |

**PROIBIDO:**
- ❌ gRPC (não padronizado no projeto ainda)
- ❌ SSH/Telnet (usar Docker exec)
- ❌ Protocolos proprietários sem documentação

### 6.2 DNS Interno (Container Name Resolution)

**OBRIGATÓRIO:**
- Usar **nomes de container** como hostname (não IPs)
- DNS automático do Docker resolve nomes na mesma rede

**Exemplo:**
```javascript
// ✅ CORRETO - DNS interno
const dbUrl = 'postgresql://user:pass@telegram-pgbouncer:6432/telegram';
const redisUrl = 'redis://telegram-redis-master:6379';
const apiUrl = 'http://telegram-gateway-api:4010';

// ❌ ERRADO - IPs hardcoded
const dbUrl = 'postgresql://user:pass@192.168.48.10:6432/telegram';
```

**Benefícios:**
- ✅ Resiliente a mudanças de IP
- ✅ Funciona em dev, staging, prod
- ✅ Facilita multi-host deployment

### 6.3 Proxy e Load Balancing

**Frontend Proxy (Vite Dev Server):**
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/telegram-gateway': {
        target: 'http://telegram-gateway-api:4010',
        changeOrigin: true,
      },
      '/api/tp-capital': {
        target: 'http://tp-capital-api:4008',
        changeOrigin: true,
      },
    },
  },
});
```

**Produção (NGINX/Traefik):**
- Usar API Gateway (Kong/Traefik) como entry point único
- Rate limiting, auth, SSL termination no gateway
- Service mesh (Istio) para mTLS (futuro)

## 7. Docker Compose Best Practices

### 7.1 Estrutura de Arquivos

**OBRIGATÓRIO:**
```
tools/compose/
├── docker-compose.telegram.yml      # Stack Telegram completa
├── docker-compose.tp-capital.yml    # Stack TP Capital completa
├── docker-compose.dashboard.yml     # Frontend UI
├── docker-compose.workspace.yml     # Workspace API + DB
├── docker-compose.docs.yml          # Documentation Hub + API
└── docker-compose.monitoring.yml    # Prometheus/Grafana (cross-stack)
```

**Cada arquivo DEVE:**
1. Definir suas próprias networks
2. Usar variáveis de ambiente (`${VARNAME:-default}`)
3. Ter healthchecks obrigatórios
4. Seguir nomenclatura: `{stack}-{service}`

### 7.2 Nomenclatura de Containers

**PADRÃO:**
```yaml
services:
  telegram-mtproto:
    container_name: telegram-mtproto
    # ...
  
  telegram-gateway-api:
    container_name: telegram-gateway-api
    # ...
  
  telegram-timescale:
    container_name: telegram-timescale
    # ...
```

**Formato:** `{stack}-{service}-{role}` (sem sufixo numérico para single instance)

**Exemplos:**
- `telegram-redis-master` (OK)
- `telegram-redis-replica-1` (OK - múltiplas instâncias)
- `telegram-api-v2` (❌ ERRADO - versionamento no nome)

### 7.3 Networks Definition

**OBRIGATÓRIO:**
```yaml
networks:
  telegram_backend:
    name: telegram_backend
    driver: bridge
    # Opcional: configurações avançadas
    driver_opts:
      com.docker.network.bridge.name: br-telegram
    ipam:
      config:
        - subnet: 192.168.48.0/24
```

**External Networks (quando consumir rede de outro stack):**
```yaml
networks:
  tradingsystem_backend:
    external: true  # Criada por outro compose
```

### 7.4 Healthchecks Obrigatórios

**TODOS os containers DEVEM ter healthcheck:**

```yaml
services:
  telegram-gateway-api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4010/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  telegram-timescale:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U telegram"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Razão:**
- ✅ Orquestração correta (depends_on com condition: service_healthy)
- ✅ Monitoring automático
- ✅ Restart policies efetivos

## 8. Segurança

### 8.1 Princípio de Menor Privilégio

**OBRIGATÓRIO:**
- Databases NUNCA em redes compartilhadas
- APIs expõem endpoints específicos, não DB raw
- Frontend acessa APIs via proxy, não direto

**Matriz de Conectividade (Zero Trust):**

| De ↓ / Para → | Telegram DB | Telegram API | TP Capital DB | TP Capital API | Dashboard |
|---------------|-------------|--------------|---------------|----------------|-----------|
| Dashboard     | ❌          | ✅           | ❌            | ✅             | -         |
| Telegram API  | ✅          | -            | ❌            | ❌             | ❌        |
| TP Capital API| ❌          | ✅           | ✅            | -              | ❌        |

**Regra:** Se não está na matriz, não pode acessar.

### 8.2 Secrets em Containers

**OBRIGATÓRIO:**
- Seguir POL-0002 (Secrets Policy)
- Usar `env_file` apontando para `.env` raiz
- NUNCA hardcoded em compose

```yaml
services:
  telegram-gateway-api:
    env_file:
      - ../../.env  # Root .env (única fonte)
    environment:
      - NODE_ENV=production
      - PORT=4010
      # Segredos vêm do .env
```

### 8.3 User Namespaces

**RECOMENDADO:**
```yaml
services:
  telegram-timescale:
    user: "999:999"  # postgres user
    security_opt:
      - no-new-privileges:true
```

**Razão:** Containers não rodam como root (segurança).

## 9. Monitoramento e Observabilidade

### 9.1 Logging Estruturado

**OBRIGATÓRIO:**
```yaml
services:
  telegram-gateway-api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        labels: "stack,service,environment"
```

### 9.2 Metrics Export

**OBRIGATÓRIO:**
- Todos os serviços DEVEM expor métricas Prometheus
- Endpoint padrão: `/metrics`
- Registrar no Prometheus via service discovery

### 9.3 Distributed Tracing (Futuro)

**PLANEJADO:**
- OpenTelemetry SDK em todas as APIs
- Jaeger/Zipkin para tracing
- Correlação de requests via `X-Request-ID`

## 10. Escalabilidade

### 10.1 Stateless Services

**OBRIGATÓRIO:**
- APIs DEVEM ser stateless (sessão em Redis)
- Permitir horizontal scaling (`docker-compose up --scale api=3`)

### 10.2 Read Replicas

**RECOMENDADO:**
```yaml
services:
  telegram-timescale-replica:
    image: timescale/timescaledb:latest-pg15
    networks: [telegram_backend]
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: telegram-timescale
```

### 10.3 Multi-Host Deployment (Futuro)

**PREPARAÇÃO:**
- Networks devem suportar overlay driver (Swarm/Kubernetes)
- Volumes devem usar NFS/Ceph (não bind mounts locais)

## 11. Validação e Compliance

### 11.1 CI/CD Checks

**OBRIGATÓRIO:**
```bash
npm run infrastructure:validate  # Executa:
  # 1. docker-compose config --quiet (syntax)
  # 2. validate-ports.mjs (conflitos)
  # 3. validate-networks.mjs (isolamento)
  # 4. validate-healthchecks.mjs (cobertura)
```

**Build BLOQUEADO se:**
- Sintaxe YAML inválida
- Conflito de portas detectado
- Database em rede compartilhada
- Healthcheck faltando em serviço crítico

### 11.2 Auditoria Manual

**FREQUÊNCIA:** Trimestral (a cada 90 dias)

**Checklist:**
- [ ] Todas as redes seguem padrão de isolamento
- [ ] Port Registry sincronizado com composes
- [ ] Healthchecks funcionando (não apenas sintaxe)
- [ ] Logs estruturados configurados
- [ ] Secrets seguem POL-0002
- [ ] Documentação atualizada

**Evidência:** `governance/evidence/audits/infrastructure-YYYY-MM-DD.md`

## 12. Responsabilidades

### Platform Engineering (Owner)
- Revisar política a cada 90 dias
- Aprovar mudanças em arquitetura de redes
- Manter Port Registry atualizado
- Conduzir auditorias trimestrais

### Desenvolvedores
- Seguir padrões de nomenclatura
- Registrar novas portas no registry
- Nunca criar redes compartilhadas para databases
- Testar healthchecks localmente

### DevOps/SRE
- Automatizar validações em CI/CD
- Monitorar conectividade entre stacks
- Implementar service mesh (futuro)
- Manter documentação de topologia

## 13. Exceções

Exceções devem ser:
1. Solicitadas via issue no repositório
2. Aprovadas por Platform Engineering
3. Documentadas em `governance/evidence/audits/exceptions/EXC-YYYY-MM-DD-{id}.md`
4. Revisadas a cada 30 dias

**Exemplo de exceção válida:**
- Stack legacy que não pode migrar para nova arquitetura imediatamente (com plano de migração)

## 14. Roadmap Técnico

### Curto Prazo (Q1 2026)
- [x] Remover redes não utilizadas (`tradingsystem_data`, `tradingsystem_infra`)
- [ ] Formalizar Dashboard multi-rede no compose (remover conexão manual)
- [ ] Integrar Port Governance com geração automática de composes
- [ ] Criar diagrama PlantUML de topologia de redes

### Médio Prazo (Q2 2026)
- [ ] Implementar API Gateway (Kong/Traefik) como entry point único
- [ ] Service mesh POC (Istio/Linkerd) para mTLS
- [ ] Read replicas para TimescaleDB (HA)
- [ ] Padronizar nomenclatura de redes (sufixo `-net`)

### Longo Prazo (Q3-Q4 2026)
- [ ] Migração para Kubernetes (manifests gerados do Port Registry)
- [ ] Multi-region deployment
- [ ] Circuit breakers (Resilience4j/Polly)
- [ ] Distributed tracing completo (OpenTelemetry)

## 15. Referências

### Documentação Interna
- **Port Governance:** [tools/openspec/changes/port-governance-2025-11-05/](https://github.com/marceloterra1983/TradingSystem/tree/main/tools/openspec/changes/port-governance-2025-11-05)
- **Arquitetura de Redes:** `tools/openspec/changes/port-governance-2025-11-05/DOCKER-NETWORKS-ARCHITECTURE-2025-11-05.md`
- **Esquema Atual:** `tools/openspec/changes/port-governance-2025-11-05/DOCKER-NETWORKS-SCHEMA-ATUAL.md`
- **Análise Comparativa:** `tools/openspec/changes/port-governance-2025-11-05/DOCKER-NETWORKS-SINGLE-VS-MULTIPLE-ANALYSIS.md`
- **Secrets Policy:** [POL-0002](/governance/policies/secrets-env-policy)

### Padrões Externos
- [Docker Networking Best Practices](https://docs.docker.com/network/)
- [NIST Zero Trust Architecture](https://www.nist.gov/publications/zero-trust-architecture)
- [12-Factor App - Port Binding](https://12factor.net/port-binding)
- [Microservices Patterns - Network Segmentation](https://microservices.io/patterns/deployment/service-deployment-platform.html)

## 16. Histórico de Revisões

| Data       | Versão | Autor               | Mudanças                          |
|------------|--------|---------------------|-----------------------------------|
| 2025-11-05 | 1.0    | PlatformEngineering | Criação inicial da política POL-0003 |
| 2025-11-05 | 1.0    | PlatformEngineering | Remoção de redes não utilizadas (tradingsystem_data, tradingsystem_infra) |

---

**Próxima Revisão:** 2026-02-03  
**Contato:** platform-engineering@tradingsystem.local

## Anexo A: Matriz de Conectividade Completa

```
═══════════════════════════════════════════════════════════════════════
                     MATRIZ DE CONECTIVIDADE
═══════════════════════════════════════════════════════════════════════

De ↓ / Para →           │ Telegram │ Telegram │ TP Cap  │ TP Cap │ Work  │ Dash
                        │ DB       │ API      │ DB      │ API    │ API   │ board
────────────────────────┼──────────┼──────────┼─────────┼────────┼───────┼──────
Dashboard UI            │    ❌    │    ✅    │   ❌    │   ✅   │  ✅   │   -
Telegram Gateway API    │    ✅    │    -     │   ❌    │   ❌   │  ❌   │  ❌
Telegram MTProto        │    ✅    │    ❌    │   ❌    │   ❌   │  ❌   │  ❌
TP Capital API          │    ❌    │    ✅    │   ✅    │   -    │  ❌   │  ❌
Workspace API           │    ❌    │    ❌    │   ❌    │   ❌   │   -   │  ❌
Monitoring (Grafana)    │    ✅    │    ✅    │   ✅    │   ✅   │  ✅   │  ❌

Legenda:
✅ = Permitido (mesma rede ou via hub)
❌ = Bloqueado (isolado)
-  = N/A (próprio serviço)

═══════════════════════════════════════════════════════════════════════
```

## Anexo B: Diagrama de Fluxo de Comunicação

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO FINAL                               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTPS (Produção: Kong Gateway)
                                 │ HTTP (Dev: direto)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND (tradingsystem_frontend)                         │
│                                                                      │
│    Dashboard UI ──┐                                                 │
│                   │ Vite Proxy                                      │
│                   │ /api/telegram-gateway/* → telegram-gateway-api  │
│                   │ /api/tp-capital/* → tp-capital-api              │
│                   └ /api/workspace/* → workspace-api                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP (DNS interno)
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: BACKEND HUB (tradingsystem_backend)                       │
│                                                                      │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                │
│  │ Workspace  │    │ Telegram   │    │ TP Capital │                │
│  │ API        │    │ Gateway    │    │ API        │                │
│  └────┬───────┘    └────┬───────┘    └────┬───────┘                │
│       │                 │                  │                        │
└───────┼─────────────────┼──────────────────┼────────────────────────┘
        │                 │                  │
        │                 │                  │
        ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Workspace    │  │ Telegram     │  │ TP Capital   │
│ Network      │  │ Network      │  │ Network      │
│ (futuro)     │  │ (isolada)    │  │ (isolada)    │
├──────────────┤  ├──────────────┤  ├──────────────┤
│              │  │ MTProto ◄────┼──┼─ Internet    │
│ Workspace DB │  │      ▼       │  │ (Telegram)   │
│              │  │ Gateway API  │  │              │
│              │  │      ▼       │  │ TP Cap API   │
│              │  │ PgBouncer    │  │      ▼       │
│              │  │      ▼       │  │ PgBouncer    │
│              │  │ TimescaleDB  │  │      ▼       │
│              │  │              │  │ TimescaleDB  │
│              │  │ Redis ◄──────┼──┼ Pub/Sub      │
│              │  │              │  │              │
│              │  │ RabbitMQ     │  │ Redis        │
│              │  │ (async jobs) │  │              │
└──────────────┘  └──────────────┘  └──────────────┘

Protocolo: HTTP/REST (síncron), WebSocket (real-time), AMQP (async)
DNS: Nomes de container (telegram-timescale, tp-capital-api, etc.)
```

## Anexo C: Checklist de Revisão de PR

**Ao criar/modificar infraestrutura, validar:**

- [ ] Todas as portas registradas em `config/ports/registry.yaml`
- [ ] Databases SOMENTE em rede privada da stack
- [ ] APIs com 2+ redes (privada + hub) se necessário
- [ ] Nomenclatura seguindo padrão `{stack}-{service}`
- [ ] Networks definidas com `name:` explícito
- [ ] Healthchecks obrigatórios em todos os serviços
- [ ] `env_file` aponta para `.env` raiz (não local)
- [ ] Secrets seguem POL-0002 (não hardcoded)
- [ ] `docker-compose config --quiet` passa
- [ ] `npm run ports:validate` passa
- [ ] Documentação atualizada (se nova stack)

---

**FIM DA POLÍTICA POL-0003**
