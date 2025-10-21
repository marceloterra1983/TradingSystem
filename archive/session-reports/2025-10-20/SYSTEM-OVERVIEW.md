# TradingSystem - Visão Geral Completa do Sistema

**Última atualização:** 2025-10-15
**Status:** Documentação Ativa
**Branch:** main

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Aplicações Frontend](#aplicações-frontend)
3. [Serviços Backend (APIs)](#serviços-backend-apis)
4. [Infraestrutura](#infraestrutura)
5. [Bancos de Dados](#bancos-de-dados)
6. [Arquitetura & Princípios](#arquitetura--princípios)
7. [Fluxo de Dados](#fluxo-de-dados)
8. [Integrações](#integrações)
9. [Segurança & Compliance](#segurança--compliance)
10. [Roadmap & Próximos Passos](#roadmap--próximos-passos)

---

## 🎯 Visão Geral do Sistema

### O que é o TradingSystem?

**Sistema de Trading Local Automatizado** que integra:
- **Captura de dados** via ProfitDLL (Nelogica)
- **Análise em tempo real** com ML (Causa-Efeito)
- **Gestão de risco** automatizada
- **Execução de ordens** com auditoria completa
- **Monitoramento** via Prometheus/Grafana

### Características Principais

- 🏠 **100% On-Premise** - Nenhuma dependência de cloud
- ⚡ **Baixa Latência** - Pipeline otimizado < 500ms
- 🤖 **ML Online** - Modelos adaptativos em tempo real
- 🛡️ **Risk-First** - Kill switch, limites, auditoria
- 📊 **Observabilidade** - Métricas, logs estruturados, dashboards

### Stack Tecnológico

```yaml
Core Trading:
  - Language: C# (.NET 8.0)
  - Platform: Native Windows x64
  - Integration: ProfitDLL (Nelogica)

Frontend:
  - Framework: React 18.2 + TypeScript 5.3
  - Build: Vite 5.0
  - UI: Tailwind CSS 3.4 + shadcn/ui
  - State: Zustand

Backend APIs:
  - Runtime: Node.js 18/20
  - Framework: Express.js
  - Storage: LowDB (MVP), QuestDB (time-series)

Infrastructure:
  - Containers: Docker + Docker Compose
  - Monitoring: Prometheus + Grafana
  - Reverse Proxy: Traefik
  - Time-Series DB: QuestDB

Documentation:
  - Framework: Docusaurus
  - Diagrams: PlantUML + Mermaid
  - Hosting: Local (Port 3004)
```

### Active Services & Ports

- **Dashboard**: http://localhost:3103 (React + Vite)
- **Docusaurus**: http://localhost:3004 (Docusaurus)
- **Idea Bank API**: http://localhost:3100 (Express)
- **TP-Capital**: http://localhost:3200 (Express)
- **B3**: http://localhost:3302 (Express)
- **DocsAPI**: http://localhost:3400 (Express)
- **Laucher**: http://localhost:3500 (Express)

### Estrutura do Projeto (v2.1)

```
TradingSystem/
├── backend/                        # Backend services
├── frontend/                       # Frontend applications
├── docs/                          # Documentation
└── infrastructure/                # Infrastructure & DevOps
```

---

## 🎨 Aplicações Frontend

### 1. Dashboard Principal (Port 3103)

**Localização:** `frontend/apps/dashboard/`
**URL:** http://localhost:3103
**Status:** ✅ Production Ready

#### Features Implementadas

- ✅ **Layout System**
  - Sidebar colapsável (w-64 ↔ w-20)
  - Header com logo e status
  - Content wrapper responsivo
  - Navegação com links ativos

- ✅ **Página Home/Overview**
  - Dashboard com métricas principais
  - Status dos serviços
  - Alertas e notificações

- ✅ **Banco de Ideias** ⭐ (Feature Referência)
  - CRUD completo com validação
  - Kanban board drag-and-drop
  - Filtros avançados (status, prioridade, categoria)
  - Auto-refresh com custom events
  - Integração com API (Port 3100)

- ✅ **Escopo Page**
  - Accordion com 7 seções
  - Documentação estruturada
  - Cards informativos

- ✅ **Conexões (TP Capital)**
  - Status de conexões Telegram
  - Gestão de bots
  - Logs de ingestão

- ✅ **TP Capital | Opções**
  - Visualização de sinais do Telegram
  - Dados do QuestDB
  - Filtros e pesquisa

- 🚧 **Trading Pages** (Planejadas)
  - Live Feed (market data real-time)
  - Orders (gerenciamento de ordens)
  - Positions (posições abertas)
  - Performance (métricas de trading)
  - Risk Controls (limites e kill switch)

#### Tecnologia

```json
{
  "framework": "React 18.2",
  "language": "TypeScript 5.3",
  "buildTool": "Vite 5.0",
  "styling": "Tailwind CSS 3.4",
  "uiComponents": "shadcn/ui + Radix UI",
  "dragDrop": "@dnd-kit 6.1",
  "routing": "React Router v6",
  "http": "Axios 1.6",
  "icons": "Lucide React",
  "state": "Zustand"
}
```

#### Como Executar

```bash
cd frontend/apps/dashboard
npm install
npm run dev
```

---

### 2. Docusaurus (Port 3004)

**Localização:** `docs/`
**URL:** http://localhost:3004
**Status:** ✅ Active

#### Estrutura de Documentação

```
docs/context/
├── backend/              # Backend services, APIs, data
│   ├── architecture/     # ADRs, service maps
│   ├── api/              # API documentation
│   └── data/             # Schemas, migrations
│
├── frontend/             # UI documentation
│   ├── features/         # Feature specs
│   ├── guides/           # Implementation guides
│   └── architecture/     # Frontend ADRs
│
├── shared/               # Cross-cutting concerns
│   ├── product/prd/      # Product Requirements (EN/PT)
│   ├── diagrams/         # PlantUML diagrams
│   └── tools/            # Templates, standards
│
└── ops/                  # Operations, infrastructure
    ├── runbooks/         # Operational procedures
    └── automation/       # Scripts and tools
```

#### Features

- ✅ Documentação versionada e organizada por domínio
- ✅ Templates padronizados (ADR, PRD, Guide, Runbook)
- ✅ Diagramas PlantUML embutidos
- ✅ Metadata YAML obrigatória
- ✅ Hot-reload durante desenvolvimento
- ✅ Sidebar navegável automática

#### Como Executar

```bash
cd docs
npm install
npm run start -- --port 3004 --host 0.0.0.0
```

---

## 🔌 Serviços Backend (APIs)

### 1. Idea Bank API (Port 3100)

**Localização:** `backend/api/idea-bank/`
**Tecnologia:** Node.js 18 + Express + LowDB
**Status:** ✅ Local Production

#### Funcionalidades

- CRUD completo de ideias de trading
- Categorização (documentação, coleta-dados, análise, etc.)
- Sistema de prioridades (low, medium, high, critical)
- Status workflow (new, review, in-progress, completed, rejected)
- Tags e metadados
- Logging estruturado

#### Endpoints

```
GET    /ideas          # List all ideas
GET    /ideas/:id      # Get single idea
POST   /ideas          # Create new idea
PUT    /ideas/:id      # Update idea
DELETE /ideas/:id      # Delete idea
```

#### Data Model

```typescript
interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'documentacao' | 'coleta-dados' | 'banco-dados' |
            'analise-dados' | 'gestao-riscos' | 'dashboard';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}
```

---

### 2. TP-Capital (Port 3200)

**Localização:** `frontend/apps/tp-capital/`
**Tecnologia:** Node.js 18 + Express + QuestDB
**Status:** ✅ Active

#### Funcionalidades

- **Telegram Bot Listener** (polling + webhook)
- **Signal Parser** - Extrai asset, buy range, targets, stop
- **QuestDB Writer** - Line protocol
- **Telegram Forwarder** - Encaminha mensagens entre bots
- **Log Store** - Histórico de logs em memória
- **Health Check** - `/health` endpoint
- **Prometheus Metrics** - `/metrics` endpoint

#### Componentes

1. **Telegram Ingestion** (`telegramIngestion.js`)
   - Conecta com Telegram via bot token
   - Processa mensagens em tempo real
   - Extrai sinais estruturados

2. **Signal Parser** (`parseSignal.js`)
   - Regex patterns para extrair dados
   - Normalização de formato
   - Validação de campos obrigatórios

3. **QuestDB Client** (`questdbClient.js`)
   - Connection pooling
   - Batch inserts
   - Error handling e retry

4. **Telegram Forwarder** (`telegramForwarder.js`)
   - Encaminha mensagens entre canais
   - Suporta múltiplos destinos
   - Rate limiting

#### Configuração

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=your_channel_id

# Telegram Forwarder
SOURCE_BOT_TOKEN=bot_token_1
TARGET_BOT_TOKEN=bot_token_2
FORWARD_CHANNEL_ID=channel_id
TARGET_CHANNEL_ID=target_id

# QuestDB
QUESTDB_HOST=localhost
QUESTDB_PORT=9009
QUESTDB_TABLE=tp_capital_signals

# Server
PORT=3200
NODE_ENV=production
```

---

### 3. B3 (Port 3302)

**Localização:** `frontend/apps/b3-market-data/`
**Tecnologia:** Node.js 20 + Express + QuestDB
**Status:** 🚧 In Progress

#### Funcionalidades (Planejadas)

- Serve dados de mercado B3 via QuestDB
- Snapshots (preço, volume, book)
- Indicadores calculados
- Níveis de Gamma (GammaLevels)
- Ajustes corporativos

#### Tabelas QuestDB (Propostas)

```sql
-- B3 Market Snapshots
CREATE TABLE b3_snapshots (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  last_price DOUBLE,
  volume LONG,
  bid DOUBLE,
  ask DOUBLE,
  high DOUBLE,
  low DOUBLE,
  open DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- B3 Indicators
CREATE TABLE b3_indicators (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  indicator_name SYMBOL,
  value DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- B3 Gamma Levels
CREATE TABLE b3_gamma_levels (
  timestamp TIMESTAMP,
  symbol SYMBOL,
  strike DOUBLE,
  gamma DOUBLE,
  delta DOUBLE,
  vega DOUBLE
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

---

### 4. DocsAPI (Port 3400)

**Localização:** `backend/api/docs-api/`
**Tecnologia:** Node.js 18 + Express + LowDB + Multer
**Status:** ✅ Local Production

#### Funcionalidades

- Registry de sistemas
- Gerenciamento de ideias de documentação
- Upload de arquivos (Multer)
- CRUD com validação
- Logging estruturado

---

### 5. Laucher (Port 3500)

**Localização:** `frontend/apps/service-launcher/`
**Tecnologia:** Node.js 18 + Express
**Status:** ✅ Active

#### Funcionalidades

- Health checks de todos os serviços
- Orchestração de startup
- Monitoramento de status
- Endpoint central: `GET /api/status`

---

### 6. Core Trading Services (Planejados - Native Windows)

#### Data Capture Service (C#)

**Localização:** `backend/services/data-capture/` (planned)
**Tecnologia:** .NET 8.0 + ProfitDLL
**Port:** 3100
**Status:** 🚧 MVP Planned

**Responsabilidades:**
- Conectar com ProfitDLL
- Callbacks de market data (trades, book, price depth)
- Validação e serialização → JSON
- WebSocket publisher → downstream consumers (gateway, dashboard)
- Parquet writer (local disk)

**Critical Requirements:**
- ⚠️ **MUST run natively on Windows x64**
- ⚠️ **ProfitDLL is 64-bit only DLL**
- ⚠️ **Cannot run in containers**
- ⚠️ **Direct NVMe/SSD access required**

---

#### Order Manager Service (C#)

**Localização:** `backend/services/order-manager/` (planned)
**Tecnologia:** .NET 8.0 + ProfitDLL
**Port:** 3205
**Status:** 🚧 MVP Planned

**Responsabilidades:**
- Receber sinais de estratégias externas/gateway
- Risk engine (daily limits, position size, kill switch)
- Executar ordens via ProfitDLL
- Order callbacks (confirmação, rejeição)
- Atualizar posições
- Auditoria completa

**Risk Management:**
- Global kill switch: `POST /api/v1/risk/kill-switch`
- Daily loss limit (configured in `.env`)
- Max position size per symbol
- Trading hours restriction (9:00-18:00 default)
- Auto-pause on connection errors/high latency

---

## 🏗️ Infraestrutura

### Deployment Model

```
┌─────────────────────────────────────────────────────────┐
│           HYBRID DEPLOYMENT ARCHITECTURE                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────┐            │
│  │  NATIVE WINDOWS (Trading Machine)       │            │
│  │  ─────────────────────────────────────  │            │
│  │                                          │            │
│  │  ✅ Data Capture (C# + ProfitDLL)      │            │
│  │  ✅ Order Manager (C# + Risk Engine)   │            │
│  │                                          │            │
│  │  Requirements:                           │            │
│  │  • Windows x64                           │            │
│  │  • Direct hardware access                │            │
│  │  • Low latency (< 500ms)                │            │
│  │  • NVMe/SSD for Parquet                 │            │
│  └─────────────────────────────────────────┘            │
│                        ↕                                  │
│              WebSocket + HTTP REST                       │
│                        ↕                                  │
│  ┌─────────────────────────────────────────┐            │
│  │  DOCKER-COMPOSE STACKS                  │            │
│  │  (Linux/WSL Host)                       │            │
│  │  ─────────────────────────────────────  │            │
│  │                                          │            │
│  │  ✅ QuestDB (time-series DB)           │            │
│  │  ✅ Dashboard (React)          │            │
│  │  ✅ Backend APIs (Node.js)              │            │
│  │  ✅ Docusaurus (Docusaurus)      │            │
│  │  ✅ Prometheus + Grafana                │            │
│  │  ✅ Traefik (reverse proxy)             │            │
│  │                                          │            │
│  └─────────────────────────────────────────┘            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Infraestrutura Atual

#### 1. Docker Compose Orchestration

**Localização:** `infrastructure/compose/`
**Status:** ✅ Active

**Funcionalidades:**
- Stacks organizados por domínio (infra, data, monitoring, frontend, ai-tools)
- Scripts auxiliares (`start-all-stacks.sh`, `stop-all-stacks.sh`)
- Suporte a execução local ou em host dedicado

---

#### 2. QuestDB (Ports 9000, 9009)

**Tecnologia:** QuestDB (time-series database)
**Localização:** `infrastructure/compose/docker-compose.data.yml`
**Status:** ✅ Active

**Interfaces:**
- HTTP: Port 9000 (Web UI + REST API)
- InfluxDB Line Protocol: Port 9009 (Ingestion)

**Tabelas Ativas:**

```sql
-- TP-Capital
CREATE TABLE tp_capital_signals (
  timestamp TIMESTAMP,
  signal_id SYMBOL,
  asset SYMBOL,
  action SYMBOL,
  buy_range_min DOUBLE,
  buy_range_max DOUBLE,
  target_1 DOUBLE,
  target_2 DOUBLE,
  target_3 DOUBLE,
  stop_loss DOUBLE,
  source SYMBOL,
  raw_message STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Telegram Bots Tracking
CREATE TABLE telegram_bots (
  timestamp TIMESTAMP,
  bot_name SYMBOL,
  event_type SYMBOL,
  chat_id LONG,
  message_id LONG,
  user_id LONG,
  text STRING
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

---

#### 3. Prometheus + Grafana

**Localização:** `infrastructure/monitoring/`
**Status:** 🚧 Planned

**Prometheus (Port 9090):**
- Metrics collection
- Scrape configs for all services
- Alert rules

**Grafana (Port 3000):**
- Dashboards
- Alerting
- Data source: Prometheus + QuestDB

**Métricas Planejadas:**
```yaml
Trading Metrics:
  - trades_total
  - orders_executed
  - positions_open
  - pnl_daily
  - latency_p99

System Metrics:
  - cpu_usage
  - memory_usage
  - disk_io
  - network_bandwidth

API Metrics:
  - http_requests_total
  - http_response_time
  - api_errors_total
```

---

#### 4. Traefik (Reverse Proxy)

**Localização:** `infrastructure/nginx-proxy/` (migration to Traefik)
**Status:** ✅ Active

**Funcionalidades:**
- Automatic service discovery
- SSL/TLS termination
- Load balancing
- Dashboard (Port 8080)

---

#### 5. Additional Infrastructure

**Firecrawl (Ports 3002, 8080):**
- Localização: `infrastructure/firecrawl/`
- Status: 🚧 Experimental
- Purpose: Web scraping for data collection

**Context7:**
- Localização: `infrastructure/context7/`
- Status: 🚧 Experimental
- Purpose: Context management for AI agents

**Exa:**
- Localização: `infrastructure/exa/`
- Status: 🚧 Experimental
- Purpose: Advanced search capabilities

---

## 💾 Bancos de Dados

### 1. QuestDB (Time-Series)

**Uso Principal:** Market data, signals, events

**Vantagens:**
- Alta performance para time-series
- SQL + InfluxDB Line Protocol
- Built-in downsampling
- Web UI intuitiva

**Tabelas Ativas:**
- `tp_capital_signals` - Sinais do Telegram
- `telegram_bots` - Tracking de bots

**Tabelas Planejadas:**
- `trading_core.trades` - Execuções
- `trading_core.positions` - Posições
- `b3_snapshots` - Dados B3
- `b3_indicators` - Indicadores calculados
- `b3_gamma_levels` - Níveis de Gamma

---

### 2. LowDB (JSON File-Based)

**Uso Atual:** MVP storage para APIs

**APIs usando LowDB:**
- Idea Bank API (Port 3100)
- DocsAPI (Port 3400)

**Plano de Migração:**
- MVP: LowDB (simples, rápido)
- Production: Migrar para PostgreSQL ou QuestDB

---

### 3. Parquet (Columnar Files)

**Uso:** Cold storage, backups, analytics

**Estrutura:**
```
/data/parquet/
├── {asset}/
│   └── {date}/
│       ├── trades.parquet
│       ├── book.parquet
│       └── indicators.parquet
```

**Vantagens:**
- Compressão excelente (~10x)
- Columnar (queries rápidas)
- Schema evolution
- Interop com Python (pandas, dask)

---

### 4. Future: PostgreSQL (Planned)

**Uso Planejado:**
- User management
- Configuration
- Audit logs
- Backoffice data

---

## 🎯 Arquitetura & Princípios

### Clean Architecture (Layered)

```
┌─────────────────────────────────────────┐
│         PRESENTATION LAYER              │
│  (Controllers, APIs, Dashboard UI)      │
├─────────────────────────────────────────┤
│         APPLICATION LAYER               │
│  (Use Cases, Commands, Queries)         │
├─────────────────────────────────────────┤
│         DOMAIN LAYER                    │
│  (Entities, Value Objects, Aggregates)  │
├─────────────────────────────────────────┤
│         INFRASTRUCTURE LAYER            │
│  (ProfitDLL, WebSocket, Parquet, HTTP)  │
└─────────────────────────────────────────┘
```

### Domain-Driven Design (DDD)

**Aggregates:**
- `OrderAggregate` - Ordem + Items + Eventos
- `TradeAggregate` - Trade + Execução + Fees
- `PositionAggregate` - Posição + P&L + Adjustments

**Value Objects:**
- `Price` - Valor monetário com validação
- `Symbol` - Ticker com exchange
- `Quantity` - Quantidade com unidade
- `Timestamp` - Data/hora com timezone

**Domain Events:**
- `OrderFilledEvent` - Ordem executada
- `SignalGeneratedEvent` - Sinal criado
- `PositionUpdatedEvent` - Posição alterada
- `RiskLimitBreachedEvent` - Limite violado

**Repositories:**
- `ITradeRepository` - Persistência de trades
- `IOrderRepository` - Gestão de ordens
- `ISignalRepository` - Histórico de sinais
- `IPositionRepository` - Posições abertas

**Ubiquitous Language:**
```
Trade       = Execução no mercado
Order       = Ordem enviada para execução
Signal      = Sinal gerado pelo modelo ML
Position    = Posição aberta (long/short)
Risk        = Gestão de risco
Execution   = Processo de execução
Book        = Order book (bid/ask)
Tick        = Preço individual
```

---

### Microservices Architecture

**Princípios:**
- Single Responsibility
- Independent Deployment
- Isolated Failures
- Technology Agnostic

**Communication:**
- WebSocket: Real-time market data
- HTTP REST: Commands and queries
- Events: Domain events (future: RabbitMQ/Kafka)

---

## 🔄 Fluxo de Dados

### Trading Pipeline

```
1. ProfitDLL Callback (C#)
   ↓ [Market Data Event]

2. DataCapture validates & serializes → JSON
   ↓ [Normalized JSON]

3. WebSocket Publisher → internal consumers (Gateway, Dashboard)
   ↓ [Real-time Stream]

4. Gateway receives trading commands (HTTP)
   ↓ [Validated Signal]

5. OrderManager: Risk checks → Execute via ProfitDLL
   ↓ [Order Execution]

6. OrderCallback updates positions
   ↓ [Position Update Event]

7. Dashboard real-time update (WebSocket)
   ↓ [UI Refresh]
```

---

### Signal Ingestion (TP Capital)

```
1. Telegram Message Received
   ↓ [Raw Text]

2. Parser extracts structured data
   ↓ [Parsed Signal]

3. Validation & Normalization
   ↓ [Normalized Signal]

4. Write to QuestDB (Line Protocol)
   ↓ [Persisted]

5. Forward to target channels (optional)
   ↓ [Distributed]

6. Dashboard displays (real-time query)
   ↓ [UI Display]
```

---

## 🔌 Integrações

### 1. ProfitDLL (Nelogica)

**Documentação:** `docs/ProfitDLL/Manual - ProfitDLL pt_br.pdf`
**Exemplos:** `docs/ProfitDLL/Exemplo C#/`, `Exemplo Python/`

**Critical Requirements:**
- ⚠️ **Must compile in x64 mode** - ProfitDLL is 64-bit only
- ⚠️ **Windows native DLL** - Cannot run in containers
- ⚠️ **Callback delegates must be static** - Prevent GC collection

**Authentication:**
```csharp
// Market data only
DLLInitializeMarketLogin(key, username, password);

// Market data + order routing
DLLInitializeLogin(key, username, password);
```

**Connection States (TStateCallback):**
```
State 0: Login    (0=OK, 1=Invalid, 2=Wrong Password)
State 1: Broker   (0=Disconnected, 2=Connected, 5=HCS Connected)
State 2: Market   (4=Connected, 3=Not Logged)
State 3: Activation (0=Valid, else Invalid)
```

**Key Callbacks:**
```csharp
TStateCallback              // Connection state
TConnectorTradeCallback     // Trade events
TOfferBookCallback          // Order book updates
TConnectorOrderCallback     // Order execution
TConnectorPriceDepthCallback // Aggregated book
```

**Subscription Pattern:**
```csharp
if (bMarketConnected && bAtivo) {
    // Subscribe: "ASSET:EXCHANGE"
    SubscribeTicker("WINZ25", "B");
    SubscribeOfferBook("PETR4", "B");
}
```

**Order Execution:**
```csharp
// Market order
Price = -1;

// Stop order
Price = 50000;
StopPrice = 49800;

// Position types
1 = DayTrade
2 = Consolidated

// Error codes
NL_OK = 0x00000000
Negative = Error
```

---

### 2. Telegram (TP Capital)

**API:** Telegram Bot API
**Libraries:** `node-telegram-bot-api`, `telegraf`

**Funcionalidades:**
- Polling mode (long polling)
- Webhook mode (HTTP POST)
- Message forwarding entre bots
- Error handling e retry

**Configuration:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=channel_id
```

---

### 3. B3 Integration (Planned)

**Data Sources:**
- B3 Feed (via ProfitDLL)
- Ajustes corporativos
- Gamma levels calculation

**Storage:**
- QuestDB (hot data)
- Parquet (cold storage)

---

## 🛡️ Segurança & Compliance

### Security Measures

1. **No Cloud Dependencies**
   - 100% on-premise
   - No external API calls
   - Local data storage only

2. **Credential Management**
   - Never commit `.env` files
   - Use `.env.example` as template
   - Encrypt in production: `ENCRYPT_CREDENTIALS=true`

3. **API Security**
   - Rate limiting
   - Input validation
   - CORS configuration
   - Error handling (no leaks)

4. **Audit Trail**
   - All orders logged with timestamp + reason
   - User actions tracked
   - System events recorded

---

### Risk Management

**Global Kill Switch:**
```bash
POST /api/v1/risk/kill-switch
```

**Risk Limits:**
```yaml
Daily Loss Limit: Configured in .env
Max Position Size: Per symbol
Trading Hours: 9:00-18:00 (configurable)
Connection Errors: Auto-pause
High Latency: Auto-pause (threshold: 500ms)
```

**Auditoria:**
```json
{
  "timestamp": "2025-10-13T10:30:00Z",
  "event": "ORDER_EXECUTED",
  "orderId": "ORD123",
  "symbol": "WINZ25",
  "quantity": 10,
  "price": 50000,
  "reason": "ML_SIGNAL_BUY",
  "userId": "system",
  "executionTimeMs": 245
}
```

---

## 📊 Roadmap & Próximos Passos

### Phase 1: Foundation (Current - MVP)

✅ **Completed:**
- [x] Project structure (Clean Architecture)
- [x] Documentation hub (Docusaurus)
- [x] Frontend dashboard (React + TypeScript)
- [x] Idea Bank (CRUD + Kanban)
- [x] TP Capital signals ingestion
- [x] QuestDB integration
- [x] Docker Compose stacks
- [x] Basic monitoring

🚧 **In Progress:**
- [ ] B3 API
- [ ] Laucher enhancements
- [ ] DocsAPI improvements

---

### Phase 2: Core Trading (Next)

**Priority: HIGH**

1. **Data Capture Service (C#)**
   - ProfitDLL integration
   - Market data callbacks
   - WebSocket publisher
   - Parquet writer

2. **Order Manager (C#)**
   - Risk engine
   - Order execution
   - Position management
   - Audit logging

3. **API Gateway (Python/FastAPI)**
   - Route signals to Order Manager
   - Validate requests
   - Rate limiting
   - OpenAPI docs

---

### Phase 3: Advanced Features (Future)

**Priority: MEDIUM**

1. **Backtesting Engine**
   - Replay historical data
   - Strategy simulation
   - Performance metrics
   - Report generation

2. **Advanced Insights**
   - Portfolio optimization
   - Risk attribution
   - Scenario analysis
   - Stress testing

3. **Enhanced Monitoring**
   - Custom Grafana dashboards
   - Alert rules (Prometheus)
   - Anomaly detection
   - Performance profiling

4. **Multi-Asset Support**
   - Stocks (B3)
   - Options
   - Futures
   - FX

---

### Phase 4: Scale & Optimize (Long-term)

**Priority: LOW**

1. **Performance Optimization**
   - Latency reduction (< 100ms)
   - Memory optimization
   - Disk I/O tuning
   - Network optimization

2. **High Availability**
   - Service redundancy
   - Automatic failover
   - Load balancing
   - Disaster recovery

3. **Advanced ML**
   - Deep learning models
   - Ensemble methods
   - AutoML
   - Model monitoring

---

## 📝 Documentação Relacionada

### Core Documentation

- [CLAUDE.md](CLAUDE.md) - Instruções principais para AI assistants
- [README.md](README.md) - Project README
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](CHANGELOG.md) - Version history

### Architecture

- [docs/context/backend/architecture/service-map.md](docs/context/backend/architecture/service-map.md)
- [docs/context/backend/architecture/decisions/](docs/context/backend/architecture/decisions/)

### Features

- [docs/context/frontend/features/feature-idea-bank.md](docs/context/frontend/features/feature-idea-bank.md)
- [docs/context/frontend/features/feature-dashboard-home.md](docs/context/frontend/features/feature-dashboard-home.md)

### Guides

- [docs/context/frontend/guides/guide-idea-bank-implementation.md](docs/context/frontend/guides/guide-idea-bank-implementation.md)
- [docs/context/ops/onboarding/START-SERVICES.md](docs/context/ops/onboarding/START-SERVICES.md)

### Product

- [docs/context/shared/product/prd/en/](docs/context/shared/product/prd/en/)

---

## 📞 Contato & Suporte

**Project Lead:** Marcelo Terra
**Repository:** github.com/marceloterra1983/TradingSystem
**Branch:** main

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Last updated:** 2025-10-13
**Document version:** 1.0.0
