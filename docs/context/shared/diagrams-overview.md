---
title: Architecture Diagrams Overview
sidebar_position: 10
tags: [diagrams, architecture, visual-documentation, plantuml, shared]
domain: shared
type: reference
summary: Visual documentation suite with PlantUML diagrams covering system architecture, data flows, state machines, and deployment topology
status: active
last_review: 2025-10-17
---

# Architecture Diagrams Overview

This page provides a comprehensive overview of all visual documentation for the TradingSystem project. All diagrams are maintained as **PlantUML** source files, making them version-controlled, maintainable, and easy to render.

:::tip PlantUML Auto-Rendering Enabled! 🎉
**Good news**: PlantUML diagrams are now automatically rendered in Docusaurus! Simply embed `.puml` code in markdown using code blocks with `plantuml` syntax.

**See it in action**: [PlantUML Rendering Guide](./diagrams/plantuml-guide.md)

**Traditional rendering methods still available**:
- **VSCode**: PlantUML extension for live preview
- **Export**: `plantuml -tsvg filename.puml` to generate SVG files
- **Online**: [PlantText](https://www.planttext.com/) or [PlantUML Web Server](http://www.plantuml.com/plantuml/)
:::

---

## 📊 Diagram Catalog

### 1. System Architecture

**File**: [`diagrams/system-architecture.puml`](./diagrams/system-architecture.puml)


**Purpose**: High-level overview of the entire TradingSystem architecture showing services, dependencies, and deployment topology.

**What it shows**:
- **Core Trading Services** (Native Windows - NO DOCKER)
  - Data Capture (.NET 8 + ProfitDLL)
  - Order Manager (.NET 8 + Risk Engine)
- **Backend Services** (Docker Allowed for Auxiliary)
  - API Gateway (FastAPI)
  - Idea Bank API (Node.js + Express)
  - Documentation API (Node.js + Express)
- **Frontend** (React 18 Dashboard)
- **Data Storage** (Parquet, LowDB, Logs, ML Models)
- **External Systems** (Nelogica Broker via ProfitDLL)

**Docker Policy Clarification**:
- ✅ Core trading services MUST run natively on Windows (latency requirement &lt;500ms)
- ✅ Auxiliary services (APIs, monitoring) CAN use Docker
- ✅ Clear notes explaining WHY (ProfitDLL native DLL, latency, I/O performance)

**Use Cases**:
- Onboarding new developers
- Explaining overall system design
- Architecture presentations
- Documenting Docker deployment policy

---

10. Dashboard real-time update (WebSocket)

**Timing Constraints**:
- Total latency target: **&lt;500ms P95**
- ProfitDLL callback: &lt;50ms
- WebSocket transmission: &lt;100ms
- ML inference: &lt;200ms
- Order execution: &lt;150ms

**Validation Gates**:
- Data validation (symbol format, price sanity)
- Feature engineering quality checks
- Risk engine checks (5 validations)
- Order parameter validation

**Use Cases**:
- Understanding trading system flow
- Debugging latency issues
- Performance optimization discussions
- Explaining ML integration

---

### 3. Component Architecture - Frontend

**File**: [`../frontend/architecture/diagrams/component-architecture.puml`](../frontend/architecture/diagrams/component-architecture.puml)


**Purpose**: Frontend component hierarchy showing presentation layer, state management, service layer, and routing.

**4 Layers**:
1. **Presentation Layer** (UI Components)
   - Pages: Dashboard, Connections, BancoIdeias, Escopo, TPCapitalSignals
   - Layout: Layout, Sidebar, Header, PageContent
   - UI Components (shadcn/ui): Button, Card, Dialog, Input, Table, Badge, CollapsibleCard
   - Feature Components: TelegramBotTableCard, TelegramChannelTableCard, IdeaKanbanBoard, SignalTable

2. **State Management** (Zustand)
   - useLayoutStore: sidebar, theme, layout preferences (persisted)
   - useUserStore: user data
   - useNotificationStore: toast notifications

3. **Service Layer**
   - ideaBankService → Idea Bank API (`http://localhost:3200`)
   - telegramService → Telegram API (future)
   - signalsService → API Gateway (`http://localhost:8000`)
   - localStorage: MVP storage (telegram.bots, telegram.channels, layout-storage)

4. **Utilities & Hooks**
   - useApi: fetch wrapper
   - useWebSocket: WebSocket client
   - cn: classnames utility
   - formatters: date, currency, number

**Routing**: React Router v6 with nested routes and code splitting (React.lazy + Suspense)

**Related ADRs**:
- [ADR-0001: Use Zustand for State Management](../frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md)
- [ADR-0002: Use shadcn/ui + Radix UI](../frontend/architecture/decisions/2025-10-11-adr-0002-use-shadcn-ui-for-design-system.md)
- [ADR-0003: Use localStorage for MVP](../frontend/architecture/decisions/2025-10-11-adr-0003-use-localstorage-for-mvp.md)
- [ADR-0004: Use React Router v6](../frontend/architecture/decisions/2025-10-11-adr-0004-use-react-router-v6-for-navigation.md)

**Use Cases**:
- Understanding frontend architecture
- Adding new pages or features
- Refactoring component hierarchy
- Explaining state management strategy

---

### 4. Sequence - Telegram Bot Configuration

**File**: [`diagrams/sequence-telegram-bot-configuration.puml`](./diagrams/sequence-telegram-bot-configuration.puml)


**Purpose**: User journey diagram showing CRUD operations for Telegram bot configuration with localStorage persistence.

**User Flows**:
1. **Initial Load** - Load existing bots from localStorage (`telegram.bots`)
2. **Add New Bot** - Open dialog, validate (username + token required), save to localStorage, update state
3. **Verify Connection** - Mock status check (future: real API), display color-coded badge (connected/degraded/disconnected)
4. **Edit Bot** - Pre-fill form with existing data, modify fields, save changes
5. **Delete Bot** - Confirm, filter from array, save to localStorage, remove from state
6. **View Description** - Open read-only modal with full description

**Data Model**:
```typescript
type BotRecord = {
  localId: string;           // UUID
  username: string;          // @BotUsername
  token: string;             // Bot API token
  description?: string;      // Optional notes
  type: 'Forwarder' | 'Sender';
};
```

**Validation**:
- username.trim() must not be empty
- token.trim() must not be empty
- localId auto-generated (UUID)

**Storage**: localStorage with keys: `telegram.bots`, `telegram.channels`, `layout-storage`

**Related Documentation**:
- PRD: [TP Capital Telegram Connections PRD](./product/prd/tp-capital-telegram-connections-prd.md)
- Technical Spec: [Feature: Telegram Connections](../frontend/features/feature-telegram-connections.md)

**Use Cases**:
- Understanding Telegram bot configuration flow
- Debugging form validation issues
- Explaining localStorage persistence strategy
- Planning API migration (Q1 2026)

---

### 5. State Machine - Order Lifecycle

**File**: [`diagrams/state-machine-order-lifecycle.puml`](./diagrams/state-machine-order-lifecycle.puml)


**Purpose**: Complete order lifecycle with all states and transitions.

**11 States**:
- **Draft** (Initial) - User creates order, basic field validation
- **Validating** - Risk engine checks (6 validations)
- **Validated** - All checks pass, ready for execution
- **Submitting** - Calling ProfitDLL `SendOrder()`, awaiting broker confirmation
- **Submitted** - Order in broker's book, working status
- **PartiallyFilled** - Partial execution, remaining quantity active
- **Filled** (Terminal - Success) - Complete execution, position updated
- **Rejected** (Terminal - Failure) - Risk or broker rejection
- **Canceled** (Terminal - User Action) - User or system cancellation
- **Failed** (Retry) - Network/system error, max 3 retry attempts
- **Expired** (Terminal) - Time-in-force expiration

**Key Transitions**:
- `Draft → Validating` - User submits order
- `Validating → Validated` - All risk checks pass (6 checks)
- `Validated → Submitting` - Execute order via ProfitDLL
- `Submitting → Submitted` - Broker accepts order
- `Submitting → Rejected` - Broker rejects (invalid params)
- `Submitting → Failed` - Network error (retry possible, max 3x)
- `Submitted → PartiallyFilled` - Partial execution
- `PartiallyFilled → Filled` - Remaining quantity filled
- `Failed → Submitting` - Retry (max 3 attempts)
- `Failed → Rejected` - Max retries exceeded

**Risk Validation Checks** (6 checks):
1. Global kill switch not active
2. Daily loss limit not exceeded
3. Max position size respected
4. Trading hours valid (9:00-18:00 default)
5. Signal confidence adequate (>60%)
6. ProfitDLL connection active

**Color Coding**:
- Blue (#E5F5FF) - Normal operational states
- Green (#E5FFE5) - Success states (Filled)
- Yellow (#FFF5E5) - Warning states (Submitting, PartiallyFilled)
- Red (#FFE5E5) - Error states (Rejected, Failed)

**Use Cases**:
- Understanding order lifecycle
- Debugging order state issues
- Explaining risk management flow
- Implementing order status UI

---

### 6. State Machine - Connection States

**File**: [`diagrams/state-machine-connection-states.puml`](./diagrams/state-machine-connection-states.puml)


**Purpose**: ProfitDLL connection lifecycle and health monitoring.

**14 States**:
- **Disconnected** (Initial/Error) - No connection to ProfitDLL
- **Initializing** - Loading DLL, preparing credentials
- **Authenticating** - Sending credentials, validating with broker
- **InvalidCredentials** (Error) - Authentication failed (invalid user or wrong password)
- **BrokerConnecting** - Establishing broker connection
- **BrokerConnected** - Broker connection successful (State 1 = 2)
- **BrokerHCSConnected** - High-speed broker connection (State 1 = 5)
- **MarketConnecting** - Establishing market data connection
- **MarketNotLogged** (Error) - Market login failed (State 2 = 3)
- **FullyConnected** - Broker + Market both online, ready to subscribe
- **SubscribingTickers** - Subscribing to assets (WINZ25, WDOZ25, etc.)
- **Active** (Operational) - System trading live, receiving data, sending orders
- **Degraded** (Warning) - Performance issues (high latency >1s, missed callbacks)

**StateCallback Events**:
- **State 0 (Login):** 0 = OK, 1 = Invalid user, 2 = Wrong password
- **State 1 (Broker):** 0 = Disconnected, 2 = Connected, 5 = HCS Connected
- **State 2 (Market):** 3 = Not Logged, 4 = Connected
- **State 3 (Activation):** 0 = Valid, else Invalid

**Key Transitions**:
- `Disconnected → Initializing` - DLLInitialize() called
- `Authenticating → BrokerConnecting` - Auth OK (State 0 = 0)
- `Authenticating → InvalidCredentials` - Auth failed (State 0 = 1/2)
- `BrokerConnecting → BrokerConnected` - State 1 = 2 (normal)
- `BrokerConnecting → BrokerHCSConnected` - State 1 = 5 (high-speed)
- `MarketConnecting → FullyConnected` - State 2 = 4 (success)
- `FullyConnected → SubscribingTickers` - Subscribe to tickers
- `SubscribingTickers → Active` - Subscriptions successful
- `Active → Degraded` - High latency (>1s) or missed heartbeats
- `Degraded → Active` - Recovery successful
- `Degraded → Disconnected` - Degradation persists (>60s)

**Monitored Metrics** (Active State):
- Latency P95 < 500ms
- Callback success rate > 99.9%
- Heartbeat every 1s
- Order execution time < 200ms

**Auto-Recovery**:
- Disconnected → Retry connection every 5s (max 3 attempts)
- InvalidCredentials → Manual intervention required
- Degraded → Auto-recovery attempt, if fails >60s → Disconnect

**Related Documentation**:
- ProfitDLL Manual: `docs/integrations/profitdll/Manual - ProfitDLL pt_br.pdf`
- Code: `backend/services/data-capture/Infrastructure/ProfitDLL/`

**Use Cases**:
- Understanding ProfitDLL connection lifecycle
- Debugging connection issues
- Implementing connection monitoring UI
- Explaining callback events

---

### 7. Deployment Architecture

**File**: [`diagrams/deployment-architecture.puml`](./diagrams/deployment-architecture.puml)


**Purpose**: Physical deployment topology on Windows native.

**Deployment Units**:

**Core Trading Services (Native Windows Services)**:
- DataCapture Service (.NET 8.0 x64)
  - Service Name: `TradingSystem-DataCapture`
  - Port: 5050
  - Dependencies: ProfitDLL.dll
  - Auto-start: Yes, Recovery: Restart on failure

- Order Manager Service (.NET 8.0 x64)
  - Service Name: `TradingSystem-OrderManager`
  - Port: 5055
  - Dependencies: ProfitDLL.dll
  - Auto-start: Yes, Recovery: Restart on failure

  - Port: 9001 (WebSocket)
  - Runtime: Native Windows Python 3.11
  - Auto-start: Yes

- API Gateway (FastAPI)
  - Port: 8000
  - Runtime: Native Windows Python 3.11

**Auxiliary Services (Docker Allowed)**:
- Idea Bank API (Node.js + Express)
  - Image: node:18-alpine (optional Docker)
  - Port: 3200, Volume: ./data/idea-bank
  - Can also run natively

- Documentation API (Node.js + Express)
  - Port: 3300

- Prometheus (Metrics Collector)
  - Image: prom/prometheus
  - Port: 9090, Volume: ./config/prometheus

- Grafana (Dashboards)
  - Image: grafana/grafana
  - Port: 3000

**Frontend (Static Files)**:
- React Dashboard (Build Output)
  - Built with: `npm run build`
  - Output: `frontend/dashboard/dist`
  - Served by: IIS or nginx
  - Port: 80/443 (HTTPS)

**Data Storage**:
- Parquet Files: `C:\TradingSystem\data\parquet\{asset}\{date}\trades.parquet` (90-day retention)
- LowDB JSON: `C:\TradingSystem\data\lowdb\` (Migration: Q1 2026 → PostgreSQL)
- Logs: `C:\TradingSystem\data\logs\` (JSONL format)
- ML Models: `C:\TradingSystem\data\models\` (Pickle files)

**Hardware Requirements**:
- CPU: Intel/AMD x64, 8+ cores
- RAM: 16GB minimum, 32GB recommended
- Disk: NVMe SSD (low latency required)
- OS: Windows 10/11 or Server 2019/2022
- Network: 1 Gbps, &lt;10ms latency to broker

**Why Windows Native for Core Services**:
1. ProfitDLL is Windows-only 64-bit DLL
2. Latency requirement &lt;500ms P95
3. Direct NVMe I/O for Parquet (30% faster than Docker)
4. 100% CPU/RAM allocation to trading (Docker Desktop uses 1-2GB overhead)
5. Production stability (24/7 operation)

**Deployment Process**:
1. Install .NET 8.0 x64 Runtime
2. Install Python 3.11 (native Windows)
3. Copy ProfitDLL.dll to `C:\ProfitDLL\Win64\`
4. Install core services as Windows Services (`sc.exe create`)
5. (Optional) Start auxiliary services in Docker
6. Build frontend (`npm run build`)
7. Deploy to IIS/nginx

**Service Management**:
- Start: `.\infrastructure\scripts\start-all-services.ps1`
- Stop: `.\infrastructure\scripts\stop-all-services.ps1`
- Status: `Get-Service TradingSystem-*`

**Use Cases**:
- Planning production deployment
- Understanding service dependencies
- Explaining Docker policy (allowed for auxiliary, not core)
- Infrastructure capacity planning
- Disaster recovery planning

---

## 🛠️ How to Render Diagrams

### Local Rendering

```bash
# Install PlantUML (requires Java)
npm install -g node-plantuml

# Render diagram to PNG
plantuml system-architecture.puml

# Render to SVG (scalable)
plantuml -tsvg system-architecture.puml
```

### VSCode Extensions

- **[PlantUML](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)** - Live preview, export to PNG/SVG
- **[PlantUML Visualizer](https://marketplace.visualstudio.com/items?itemName=UEQT.plantuml-visualizer)** - Alternative viewer

### Online Rendering

- **[PlantText](https://www.planttext.com/)** - Paste code, instant render
- **[PlantUML Web Server](http://www.plantuml.com/plantuml/uml/)** - Official online editor

### Docusaurus Integration

Diagrams can be embedded in Markdown using `plantuml` code blocks or by exporting to SVG and embedding with `![alt](diagram.svg)`.

---

## 📝 Diagram Conventions

### Color Coding

- **Blue (#E5F5FF)** - Normal operational states
- **Green (#E5FFE5)** - Success states (Filled, Active)
- **Yellow (#FFF5E5)** - Warning states (Degraded, Submitting)
- **Red (#FFE5E5)** - Error states (Rejected, Disconnected)

### Component Naming

- **Services**: `ServiceName` (PascalCase)
- **Components**: `[ComponentName]` (brackets)
- **States**: `StateName` (PascalCase)
- **Actions**: `actionName()` (camelCase with parentheses)
- **Events**: `EventName` (PascalCase)

### Notes

- Use `note right of`, `note left of`, `note top of`, `note bottom of` for context
- Include key metrics, constraints, and business rules in notes
- Reference related code files and documentation

---

## 🔄 Maintenance

### When to Update Diagrams

- **Architecture Changes**: New services, components, or dependencies added/removed
- **Flow Changes**: Trading pipeline, order lifecycle, or connection flow modified
- **State Changes**: New states or transitions added to state machines
- **Deployment Changes**: Infrastructure topology or service distribution changed

### Review Schedule

- **Quarterly**: Review all diagrams for accuracy (Q1, Q2, Q3, Q4)
- **On Major Release**: Update diagrams if architecture changed
- **On PRD Implementation**: Create new diagrams for new features

### Version Control

- All diagrams are version-controlled in Git
- Use conventional commits for diagram changes:
  - `docs: update system architecture diagram for new service`
  - `docs: add state machine for risk validation`
  - `fix: correct component relationships in frontend diagram`

---

## 📚 Related Documentation

- **[Architecture Decision Records (ADRs)](../frontend/architecture/decisions/README.md)** - Frontend architectural decisions
- **[Product Requirements Documents (PRDs)](./product/prd/README.md)** - Product requirements
- **[Testing Strategy](./testing-strategy.md)** - Comprehensive testing guidelines
- **[API Documentation](../backend/api/README.md)** - Backend API documentation

---

## 🎯 Quick Reference

| Diagram | Purpose | Stakeholders | Update Frequency |
|---------|---------|--------------|------------------|
| System Architecture | High-level overview | All roles | Quarterly |
| Data Flow | Trading pipeline | Developers, DevOps | On flow changes |
| Component Architecture | Frontend structure | Frontend developers | On component changes |
| Telegram Bot Sequence | Bot configuration | Product, Frontend | On feature changes |
| Order Lifecycle | Order states | Backend developers | On order logic changes |
| Connection States | ProfitDLL health | DevOps, Monitoring | On integration changes |
| Deployment Architecture | Infrastructure | DevOps, Architects | On deployment changes |

---

**Need to create a new diagram?**

1. Choose appropriate diagram type (sequence, state machine, component, deployment)
2. Use PlantUML syntax
3. Follow color coding and naming conventions
4. Add comprehensive notes with context
5. Reference related code and documentation
6. Update this overview with new entry
7. Commit with descriptive message

**Questions or suggestions?** Open an issue or discussion in the repository.

---

**Last Updated**: 2025-10-11
**Maintainer**: Architecture Team
**Review Frequency**: Quarterly
