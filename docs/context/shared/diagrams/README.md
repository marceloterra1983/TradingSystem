---
title: Visual Documentation - Diagrams Index
sidebar_position: 1
tags: [diagrams, visual-documentation, plantuml, architecture]
domain: shared
type: reference
summary: Catalog of all PlantUML diagrams documenting TradingSystem architecture, flows, and components
status: active
last_review: 2025-10-18
---

# Visual Documentation - Diagrams Index

This directory contains PlantUML diagrams providing visual documentation for the TradingSystem project. All diagrams are version-controlled, maintainable, and can be rendered in Docusaurus or any PlantUML-compatible viewer.

## ⚙️ Rendering Options

- **Default (Online)**: Docusaurus renders diagrams via `https://www.plantuml.com/plantuml/svg`.
- **Offline / Custom Server**: Start a local PlantUML server (for example `docker run -p 18080:8080 plantuml/plantuml-server`) and export  
  `PLANTUML_BASE_URL=http://localhost:18080/svg` before running `npm run start` or `npm run build`.  
  Docusaurus reads this environment variable and forwards all diagram requests to the configured server.
- **Manual Rendering**: Use `plantuml.jar` or the VS Code PlantUML extension to preview `.puml` files without the docs site.

> When working fully offline, set the env var above or render diagrams manually to avoid external dependencies.

## 📊 Diagram Catalog

### 1. System Architecture

**File:** [system-architecture.puml](system-architecture.puml)

**Purpose:** High-level overview of the entire TradingSystem architecture, showing services, dependencies, and deployment topology.

**Key Elements:**
- Core Trading Services (Native Windows - NO DOCKER)
  - Data Capture (.NET 8 + ProfitDLL)
  - Order Manager (.NET 8 + Risk Engine)
- Backend Services (Docker Allowed for Auxiliary)
  - API Gateway (FastAPI)
  - Idea Bank API (Node.js + Express)
  - Documentation API (Node.js + Express)
- Frontend (React 18 Dashboard)
- Data Storage (Parquet, LowDB, Logs)
- External Systems (Nelogica Broker via ProfitDLL)

**When to Use:**
- Onboarding new developers
- Explaining overall system design
- Architecture presentations
- Documenting Docker deployment policy

**Last Updated:** 2025-10-11

---

### 2. Data Flow - Trading Pipeline

**File:** [data-flow-trading-pipeline.puml](data-flow-trading-pipeline.puml)

**Purpose:** End-to-end sequence diagram showing complete trading flow from market data ingestion to order execution.

**Key Steps:**
1. ProfitDLL Market Callback (C# native)
2. DataCapture validates & serializes → JSON
3. WebSocket Publisher → API Gateway
4. Feature Engineering + ML (Cause-Effect Model)
5. Signal Generation (BUY/SELL/HOLD)
6. Gateway validates & routes → Order Manager
7. Risk Engine validation (kill switch, limits)
8. Order Execution via ProfitDLL
9. Order Callback updates positions
10. Dashboard real-time update (WebSocket)

**Timing Constraints:**
- Total latency target: `<500ms` P95
- ProfitDLL callback: `<50ms`
- WebSocket transmission: `<100ms`
- ML inference: `<200ms`
- Order execution: `<150ms`

**When to Use:**
- Understanding trading system flow
- Debugging latency issues
- Performance optimization discussions
- Explaining ML integration

**Last Updated:** 2025-10-11

---

### 3. Component Architecture - Frontend

**File:** [../frontend/architecture/diagrams/component-architecture.puml](../../frontend/architecture/diagrams/component-architecture.puml)

**Purpose:** Frontend component hierarchy showing presentation layer, state management, service layer, and routing.

**Key Layers:**
- **Presentation Layer**
  - Pages (Dashboard, Connections, BancoIdeias, Escopo, TPCapitalSignals)
  - Layout Components (Layout, Sidebar, Header, PageContent)
  - UI Components (shadcn/ui: Button, Card, Dialog, Input, Table, Badge, CollapsibleCard)
  - Feature Components (TelegramBotTableCard, TelegramChannelTableCard, IdeaKanbanBoard, SignalTable)

- **State Management (Zustand)**
  - useLayoutStore (sidebar, theme, layout preferences)
  - useUserStore (user data)
  - useNotificationStore (toast notifications)

- **Service Layer**
  - ideaBankService (Idea Bank API client)
  - telegramService (Telegram API client)
  - signalsService (Signals API client)
  - localStorage (MVP storage: telegram.bots, telegram.channels, layout-storage)

- **Utilities & Hooks**
  - useApi (fetch wrapper)
  - useWebSocket (WebSocket client)
  - cn (classnames utility)
  - formatters (date, currency, number)

**When to Use:**
- Understanding frontend architecture
- Adding new pages or features
- Refactoring component hierarchy
- Explaining state management strategy

**Related ADRs:**
- [ADR-0001: Use Zustand for State Management](../../frontend/architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md)
- [ADR-0002: Use shadcn/ui for Design System](../../frontend/architecture/decisions/2025-10-11-adr-0002-use-shadcn-ui-for-design-system.md)
- [ADR-0003: Use localStorage for MVP](../../frontend/architecture/decisions/2025-10-11-adr-0003-use-localstorage-for-mvp.md)
- [ADR-0004: Use React Router v6 for Navigation](../../frontend/architecture/decisions/2025-10-11-adr-0004-use-react-router-v6-for-navigation.md)

**Last Updated:** 2025-10-11

---

### 4. Sequence - Telegram Bot Configuration

**File:** [sequence-telegram-bot-configuration.puml](sequence-telegram-bot-configuration.puml)

**Purpose:** User journey diagram showing CRUD operations for Telegram bot configuration with localStorage persistence.

**User Flows:**
1. **Initial Load** - Render ConnectionsPage, load existing bots from localStorage
2. **Add New Bot** - Open dialog, fill form, validate, save to localStorage, update state
3. **Verify Connection** - Click "Verificar", mock status check (future: real API), display status badge
4. **Edit Bot** - Open dialog with pre-filled data, modify fields, save changes
5. **Delete Bot** - Confirm deletion, filter from array, save to localStorage, remove from state
6. **View Description** - Open read-only modal showing full description

**Data Model:**
```typescript
type BotRecord = {
  localId: string;           // UUID for local identification
  username: string;          // @BotUsername
  token: string;             // Bot API token
  description?: string;      // Optional notes
  type: 'Forwarder' | 'Sender';
};
```

**Validation Rules:**
- username.trim() must not be empty
- token.trim() must not be empty
- localId is auto-generated (UUID)

**When to Use:**
- Understanding Telegram bot configuration flow
- Debugging form validation issues
- Explaining localStorage persistence strategy
- Planning API migration (Q1 2026)

**Related PRD:**
- [TP Capital Telegram Connections PRD](../product/prd/en/tp-capital-telegram-connections-prd.md)

**Related Technical Spec:**
- [Feature: Telegram Connections](../../frontend/features/feature-telegram-connections.md)

**Last Updated:** 2025-10-11

---

### 5. State Machine - Order Lifecycle

**File:** [state-machine-order-lifecycle.puml](state-machine-order-lifecycle.puml)

**Purpose:** State machine diagram showing all possible states and transitions for orders in the trading system.

**States:**
- **Draft** (Initial) - User creates order, basic validation
- **Validating** - Risk engine checks (daily loss, position size, trading hours, signal confidence, connection health)
- **Validated** - All checks pass, order ready for execution
- **Submitting** - Calling ProfitDLL SendOrder(), awaiting broker confirmation
- **Submitted** - Order in broker's book, working status
- **PartiallyFilled** - Partial execution, remaining quantity active
- **Filled** (Terminal - Success) - Order completely executed, position updated
- **Rejected** (Terminal - Failure) - Validation or broker rejection
- **Canceled** (Terminal - User Action) - User or system cancellation
- **Failed** (Retry) - Network/system error, max 3 retry attempts
- **Expired** (Terminal) - Time-in-force expiration

**Transitions:**
- `Draft → Validating` - User submits order
- `Validating → Validated` - All risk checks pass
- `Validating → Rejected` - Risk check fails
- `Validated → Submitting` - Execute order via ProfitDLL
- `Submitting → Submitted` - Broker accepts order
- `Submitting → Rejected` - Broker rejects (invalid params)
- `Submitting → Failed` - Network error (retry possible)
- `Submitted → PartiallyFilled` - Partial execution
- `Submitted → Filled` - Complete execution
- `Submitted → Canceled` - User cancels working order
- `PartiallyFilled → Filled` - Remaining quantity filled
- `PartiallyFilled → Canceled` - User cancels remaining
- `Failed → Submitting` - Retry (max 3x)
- `Failed → Rejected` - Max retries exceeded

**Risk Validation Checks:**
1. Global kill switch not active
2. Daily loss limit not exceeded
3. Max position size respected
4. Trading hours valid (9:00-18:00 default)
5. Signal confidence adequate (>60%)
6. ProfitDLL connection active

**When to Use:**
- Understanding order lifecycle
- Debugging order state issues
- Explaining risk management flow
- Implementing order status UI

**Related Code:**
- `backend/services/order-manager/` - Order execution logic
- `backend/core/TradingSystem.Domain/Aggregates/OrderAggregate.cs` - Order domain model

**Last Updated:** 2025-10-11

---

### 6. State Machine - Connection States

**File:** [state-machine-connection-states.puml](state-machine-connection-states.puml)

**Purpose:** State machine diagram showing ProfitDLL connection states and health monitoring.

**States:**
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
- **Active** (Operational) - System is trading live, receiving data, sending orders
- **Degraded** (Warning) - Performance issues (high latency, missed callbacks)

**StateCallback Events:**
- **State 0 (Login):** 0 = OK, 1 = Invalid user, 2 = Wrong password
- **State 1 (Broker):** 0 = Disconnected, 2 = Connected, 5 = HCS Connected
- **State 2 (Market):** 3 = Not Logged, 4 = Connected
- **State 3 (Activation):** 0 = Valid, else Invalid

**Transitions:**
- `Disconnected → Initializing` - DLLInitialize() called
- `Initializing → Authenticating` - DLL loaded successfully
- `Authenticating → BrokerConnecting` - Auth OK (State 0 = 0)
- `Authenticating → InvalidCredentials` - Auth failed (State 0 = 1/2)
- `BrokerConnecting → BrokerConnected` - State 1 = 2
- `BrokerConnecting → BrokerHCSConnected` - State 1 = 5 (high-speed)
- `BrokerConnected → MarketConnecting` - Proceed to market connection
- `MarketConnecting → FullyConnected` - State 2 = 4 (success)
- `MarketConnecting → MarketNotLogged` - State 2 = 3 (failed)
- `FullyConnected → SubscribingTickers` - Subscribe to assets
- `SubscribingTickers → Active` - Subscriptions successful
- `Active → Degraded` - High latency (>1s) or missed heartbeats
- `Degraded → Active` - Recovery successful
- `Degraded → Disconnected` - Degradation persists (>60s)

**Monitored Metrics (Active State):**
- Latency P95 < 500ms
- Callback success rate > 99.9%
- Heartbeat every 1s
- Order execution time < 200ms

**Auto-Recovery:**
- Disconnected → Retry connection every 5s (max 3 attempts)
- InvalidCredentials → Manual intervention required
- Degraded → Auto-recovery attempt, if fails >60s → Disconnect

**When to Use:**
- Understanding ProfitDLL connection lifecycle
- Debugging connection issues
- Implementing connection monitoring UI
- Explaining callback events

**Related Code:**
- `backend/services/data-capture/Infrastructure/ProfitDLL/` - ProfitDLL integration
- `docs/integrations/profitdll/Manual - ProfitDLL pt_br.pdf` - Official manual

**Last Updated:** 2025-10-11

---

### 7. Deployment Architecture

**File:** [deployment-architecture.puml](deployment-architecture.puml)

**Purpose:** Physical deployment architecture showing services, dependencies, and infrastructure topology on Windows native.

**Deployment Units:**

**Core Trading Services (Native Windows Services):**
- DataCapture Service (.NET 8.0 x64)
  - Service Name: `TradingSystem-DataCapture`
  - Port: 5050
  - Dependencies: ProfitDLL.dll
  - Auto-start: Yes
  - Recovery: Restart on failure

- Order Manager Service (.NET 8.0 x64)
  - Service Name: `TradingSystem-OrderManager`
  - Port: 5055
  - Dependencies: ProfitDLL.dll
  - Auto-start: Yes
  - Recovery: Restart on failure

- API Gateway (FastAPI)
  - Port: 8000
  - Runtime: Python 3.11 (native Windows)

**Auxiliary Services (Docker Allowed):**
- Idea Bank API (Node.js + Express)
  - Image: node:18-alpine (optional Docker)
  - Port: 3200
  - Volume: ./data/idea-bank
  - Can also run natively

- Documentation API (Node.js + Express)
  - Port: 3300

- Prometheus (Metrics Collector)
  - Image: prom/prometheus
  - Port: 9090
  - Volume: ./config/prometheus
  - Scrapes: Core services

- Grafana (Dashboards)
  - Image: grafana/grafana
  - Port: 3000

**Frontend (Static Files):**
- React Dashboard (Build Output)
  - Built with: `npm run build`
  - Output: `frontend/dashboard/dist`
  - Served by: IIS or nginx
  - Port: 80/443 (HTTPS)

**Data Storage:**
- Parquet Files (Time-series)
  - Path: `C:\TradingSystem\data\parquet\`
  - Structure: `{asset}/{date}/trades.parquet`
  - Retention: 90 days

- LowDB JSON (MVP Storage)
  - Path: `C:\TradingSystem\data\lowdb\`
  - Files: `idea-bank/db.json`, `documentation/registry.json`
  - Migration: Q1 2026 → PostgreSQL

- Logs (JSONL)
  - Path: `C:\TradingSystem\data\logs\`
  - Format: Structured JSON Lines

- ML Models (Pickle)
  - Path: `C:\TradingSystem\data\models\`

**Hardware Requirements:**
- CPU: Intel/AMD x64, 8+ cores
- RAM: 16GB minimum, 32GB recommended
- Disk: NVMe SSD (low latency required)
- OS: Windows 10/11 or Server 2019/2022
- Network: 1 Gbps, `<10ms` latency to broker

**Why Windows Native for Core Services:**
1. ProfitDLL is Windows-only 64-bit DLL
2. Latency requirement `<500ms` P95
3. Direct NVMe I/O for Parquet (30% faster than Docker)
4. 100% CPU/RAM allocation to trading (Docker Desktop uses 1-2GB overhead)
5. Production stability (24/7 operation)

**Deployment Process:**
1. Install .NET 8.0 x64 Runtime
2. Install Python 3.11 (native Windows)
3. Copy ProfitDLL.dll to `C:\ProfitDLL\Win64\`
4. Install core services as Windows Services:
   ```powershell
   sc.exe create TradingSystem-DataCapture
   sc.exe create TradingSystem-OrderManager
   ```
5. (Optional) Start auxiliary services in Docker
6. Build frontend: `npm run build`
7. Deploy to IIS/nginx

**Service Management:**
- Start: `.\infrastructure\scripts\start-all-services.ps1`
- Stop: `.\infrastructure\scripts\stop-all-services.ps1`
- Status: `Get-Service TradingSystem-*`

**When to Use:**
- Planning production deployment
- Understanding service dependencies
- Explaining Docker policy (allowed for auxiliary, not core)
- Infrastructure capacity planning
- Disaster recovery planning

**Related Documentation:**
- [CLAUDE.md](https://github.com/marceloterra1983/TradingSystem/blob/main/CLAUDE.md) - Project overview with deployment requirements
- [CONTRIBUTING.md](https://github.com/marceloterra1983/TradingSystem/blob/main/CONTRIBUTING.md) - Development guidelines

**Last Updated:** 2025-10-11

---

### 8. Idea Bank - Component Architecture

**File:** [idea-bank-component-architecture.puml](idea-bank-component-architecture.puml)

**Purpose:** Component architecture showing Idea Bank API layers, LowDB persistence, and dashboard integration.

**Key Elements:**
- **Interfaces Layer:** Express routes (GET/POST/PUT/DELETE /api/items, GET /health)
- **Application Layer:** Validation middleware (express-validator), DTOs
- **Domain Layer:** Idea entity, Category/Priority/Status value objects
- **Infrastructure Layer:** LowDB adapter, Pino logger, Prometheus metrics
- **External Services:** Dashboard UI (React, port 3103), LowDB file, Prometheus
- **Future:** PostgreSQL/TimescaleDB migration planned

**When to Use:**
- Understanding Idea Bank architecture
- Implementing idea management features
- Planning PostgreSQL migration
- Explaining validation and persistence flow

**Last Updated:** 2025-10-18

---

### 9. Idea Bank - Create Idea Sequence

**File:** [idea-bank-create-sequence.puml](idea-bank-create-sequence.puml)

**Purpose:** Sequence diagram documenting idea creation flow with validation, persistence, and error handling.

**Flow Steps:**
1. Developer clicks "Add Idea" in dashboard
2. Fill form (title, description, category, priority, tags)
3. Client-side validation
4. POST /api/items with payload
5. express-validator checks (enums, required fields, length)
6. LowDB atomic write to ideas.json
7. Pino logger records event
8. Prometheus metrics incremented
9. 201 Created response with idea object
10. React Query cache updated

**Performance Target:** `<200ms` p95 for create operation

**Error Handling:**
- Validation errors (400 Bad Request with field-level errors)
- Server errors (500 Internal Server Error with generic message)
- Network errors (timeout, connection refused)

**When to Use:**
- Implementing idea creation UI
- Debugging validation issues
- Understanding error handling flow
- Performance optimization

**Last Updated:** 2025-10-18

---

### 10. Idea Bank - Kanban State Machine

**File:** [idea-bank-kanban-state.puml](idea-bank-kanban-state.puml)

**Purpose:** State machine for Kanban status workflow (New → Review → In-Progress → Completed/Rejected).

**States:**
- **New** (Initial) - Idea created, awaiting review
- **Review** - Being evaluated by team
- **In-Progress** - Implementation in progress
- **Completed** (Terminal) - Implementation finished
- **Rejected** (Terminal) - Not approved

**Transitions:**
- New → Review: Drag to Review column (`PUT /api/items/:id` with `status: "review"`)
- Review → In-Progress: Approved (`PUT` with `status: "in-progress"`)
- Review → Rejected: Not approved (`PUT` with `status: "rejected"`)
- In-Progress → Completed: Done (`PUT` with `status: "completed"`)
- In-Progress → New: Needs revision (`PUT` with `status: "new"`)

**Integration:**
- @dnd-kit/sortable for drag-and-drop
- React Query mutations for API calls
- Optimistic updates for instant feedback
- localStorage persistence of column positions

**Validation Rules:**
- Cannot transition directly from New to Completed
- Cannot transition from Completed back to any state
- All transitions logged with timestamp

**When to Use:**
- Implementing Kanban board UI
- Understanding status transitions
- Explaining workflow to stakeholders
- Planning validation rules

**Last Updated:** 2025-10-18

---

### 11. TP Capital - Component Architecture

**File:** [tp-capital-component-architecture.puml](tp-capital-component-architecture.puml)

**Purpose:** Component architecture showing Telegram ingestion, QuestDB storage, API layer, and signal consumption.

**Key Elements:**
- **Interfaces Layer:** Express routes (GET /signals, GET /logs, GET /telegram/bots, POST /webhook/telegram)
- **Application Layer:** Query builders, DTOs, validation
- **Infrastructure Layer:** QuestDB HTTP client (port 9000), QuestDB ILP client (port 9009), Telegram Bot API, message parser, Pino logger, Telegraf metrics
- **External Services:** Telegram Bot API, Telegram channels/groups, QuestDB (ports 9000, 9009)
- **Consumers:** Dashboard UI (port 3103), Agno Agents (port 8200)
- **Observability:** Prometheus (port 9090), Grafana (port 3000)

**Data Flow:**
1. Telegram channel posts signal
2. Telegram Bot API receives webhook
3. TP Capital API parses message (regex extraction)
4. Validation checks signal format
5. QuestDB ILP write (high throughput, `<10ms`)
6. Dashboard/agents consume via GET /signals

**Performance Targets:**
- Ingestion latency: `<500ms` p95
- Query latency: `<100ms` p95 (100 rows)
- Parse success rate: >95%
- QuestDB uptime: >99.9%

**When to Use:**
- Understanding TP Capital ingestion pipeline
- Implementing signal consumption features
- Planning QuestDB integration
- Explaining Agno Agents data sources

**Last Updated:** 2025-10-18

---

### 12. TP Capital - Telegram Ingestion Sequence

**File:** [tp-capital-ingestion-sequence.puml](tp-capital-ingestion-sequence.puml)

**Purpose:** Sequence diagram for Telegram signal ingestion flow (webhook → parser → validation → QuestDB).

**Flow Steps:**
1. Telegram channel posts signal message (text)
2. Telegram Bot API webhook POST /webhook/telegram
3. Extract message text and metadata
4. Message parser applies regex patterns (asset, signal_type, buy_min, buy_max, targets, stop)
5. Validation checks (required fields, numeric ranges, asset format)
6. QuestDB ILP write via TCP (port 9009, binary protocol)
7. QuestDB appends to tp_capital_signals table (partitioned by day)
8. Pino logger records "Signal ingested"
9. Telegraf increments tp_capital_signals_ingested_total
10. 200 OK response to Telegram (acknowledge webhook)

**Error Handling:**
- Validation failures: Log error, increment parse_errors_total, acknowledge webhook (200 OK, don't retry)
- QuestDB unavailable: Retry with exponential backoff (500ms, 1500ms, 3000ms), circuit breaker opens after 5 failures

**Performance Target:** `<500ms` p95 for ingestion

**ILP Protocol Advantages:**
- High throughput (>100k messages/sec)
- Low latency (`<10ms` write time)
- TCP connection pooling
- Binary protocol efficiency

**When to Use:**
- Implementing Telegram webhook handler
- Debugging ingestion issues
- Understanding QuestDB ILP integration
- Planning retry and error handling

**Last Updated:** 2025-10-18

---

### 13. TP Capital - Signal Consumption Sequence

**File:** [tp-capital-signal-consumption-sequence.puml](tp-capital-signal-consumption-sequence.puml)

**Purpose:** Sequence diagram showing dashboard and Agno Agents consuming signals in parallel with auto-refresh and filtering.

**Flow Steps (Dashboard):**
1. Trader navigates to TP Capital page
2. React Query initializes useQuery
3. GET /signals?limit=100&channel=all
4. API builds SQL query (ORDER BY ts DESC LIMIT 100)
5. QuestDB executes query on partitioned table
6. API formats response `{data: SignalRow[]}`
7. React Query stores in cache (staleTime: 10s)
8. Dashboard renders table
9. Auto-refresh every 15 seconds (refetchInterval)

**Flow Steps (Agno Agents - Parallel):**
- Agno Agents poll GET /signals periodically
- Fetch B3 market data (parallel)
- Fetch Workspace ideas (parallel)
- Correlate datasets (LLM/heuristics)
- Generate trading recommendations

**Filter Update:**
- Trader changes filter (channel, signal_type, search)
- Dashboard updates query parameters
- API executes filtered SQL query
- Dashboard re-renders with filtered results

**Error Handling:**
- API failure: React Query automatic retry (exponential backoff)
- Display error message but keep previous data visible
- Stale data better than no data

**Performance Targets:**
- Query latency: `<100ms` p95 (100 rows)
- React Query staleTime: 10 seconds
- Auto-refresh interval: 15 seconds
- QuestDB query execution: `<50ms`

**Future Enhancement:**
- WebSocket for real-time updates (eliminate polling)
- Instant signal delivery (`<100ms`)
- Reduced server load

**When to Use:**
- Implementing signal table UI
- Understanding React Query caching
- Planning real-time updates
- Explaining agent data correlation

**Last Updated:** 2025-10-18

---

### 14. Customizable Layout - Component Architecture

**File:** [customizable-layout-component-architecture.puml](customizable-layout-component-architecture.puml)

**Purpose:** Component architecture for customizable drag-and-drop layout system.

**Key Elements:**
- **Page Components:** EscopoPageNew (7 sections, 2 cols), BancoIdeiasPageNew (6 sections, 2 cols), SettingsPage (7 sections, 2 cols), ConnectionsPageNew (5 sections, 3 cols)
- **Layout System:** CustomizablePageLayout (wrapper, coordinates), DraggableGridLayout (drag-and-drop with @dnd-kit), LayoutControls (column selector 1-4, reset button), DragHandle (isolated vertical bar, 6px wide)
- **UI Components:** CollapsibleCard (with Header/Title/Content sub-components), PlaceholderSection (for WIP features)
- **State Management:** useCustomLayout hook (columns, componentLayout state), localStorage (`tradingSystem_layout_{pageId}` key format)
- **External Dependencies:** @dnd-kit/core (DndContext, PointerSensor), @dnd-kit/sortable (SortableContext, useSortable), lucide-react (icons)

**Features:**
- Drag-and-drop sections between columns
- Column count selector (1-4 columns)
- Reset to default layout
- Persistent user preferences (localStorage)
- Responsive breakpoints (mobile: 1 col, tablet: max 2 cols, desktop: user choice)
- Isolated interactions (drag handle vs card header)

**Performance:**
- React.memo for section components
- useMemo for expensive computations
- Minimal re-renders on drag
- Target: `<100ms` drag response

**When to Use:**
- Implementing new customizable pages
- Understanding layout system architecture
- Planning performance optimizations
- Explaining @dnd-kit integration

**Last Updated:** 2025-10-18

---

### 15. Customizable Layout - User Interaction Sequence

**File:** [customizable-layout-interaction-sequence.puml](customizable-layout-interaction-sequence.puml)

**Purpose:** Sequence diagram documenting 5 user interaction scenarios with customizable layout.

**Scenario 1: Initial Page Load**
- Navigate to page → Initialize useCustomLayout → Check localStorage
- If saved layout exists: Apply saved layout
- If no saved layout: Use defaultColumns and sequential distribution
- Render grid with cards

**Scenario 2: Drag and Drop**
- Mouse down on drag handle (8px movement threshold)
- onDragStart: Show visual feedback (opacity, drop zones)
- onDragOver: Highlight target drop zone
- onDragEnd: moveComponent(id, newColumnIndex) → Update state → Save to localStorage
- Re-render with new positions (target: `<100ms`)

**Scenario 3: Collapse/Expand Card**
- Click card header → Toggle collapsed state
- Save collapse state to localStorage (separate from layout)
- Animate collapse/expand (CSS transition: height 200ms)

**Scenario 4: Change Column Count**
- Click column button (1/2/3/4) → setColumns(n)
- Redistribute components across n columns (auto-balance)
- Save to localStorage → Re-render with n columns

**Scenario 5: Reset Layout**
- Click "Resetar" button → resetLayout()
- removeItem from localStorage
- Apply defaultColumns and default positions
- Re-render with defaults

**Performance Targets:**
- Drag response: `<100ms`
- Column change: `<200ms`
- localStorage write: `<10ms`
- No janky animations (60fps)

**Persistence:**
- All layout changes saved immediately
- Debouncing applied to reduce writes
- Survives page refresh and browser restart
- Per-page isolation (pageId as key)

**When to Use:**
- Implementing layout interactions
- Understanding event flow
- Debugging drag-and-drop issues
- Planning performance optimizations

**Last Updated:** 2025-10-18

---

### 16. Customizable Layout - State Management

**File:** [customizable-layout-state-diagram.puml](customizable-layout-state-diagram.puml)

**Purpose:** State machine diagram for layout state management (initialization, transitions, error recovery).

**States:**
- **Initializing** (Entry) - useCustomLayout hook initializes
- **LoadingFromStorage** - Check localStorage for saved layout
- **LayoutRestored** - Apply saved layout (if exists)
- **DefaultLayout** - Use defaults (if no saved layout or parse error)
- **Idle** - Layout rendered, user can interact
- **Dragging** - Active drag in progress (8px threshold)
- **UpdatingColumns** - Change column count (1/2/3/4)
- **Resetting** - Clear localStorage, apply defaults
- **TogglingCard** - Collapse/expand card (separate state)

**Transitions:**
- Initializing → LoadingFromStorage: Check localStorage
- LoadingFromStorage → LayoutRestored: Saved layout found
- LoadingFromStorage → DefaultLayout: No saved layout
- LayoutRestored/DefaultLayout → Idle: Ready for interaction
- Idle → Dragging: Mouse down + 8px movement
- Dragging → Idle: Mouse up (save to localStorage)
- Idle → UpdatingColumns: Click column button
- UpdatingColumns → Idle: Redistribute + save
- Idle → Resetting: Click reset button
- Resetting → DefaultLayout: Clear + apply defaults
- Idle → TogglingCard: Click card header
- TogglingCard → Idle: Toggle + save

**Persistence:**
- Every state change → localStorage write
- Debounced to avoid excessive writes
- Format: `{columns: number, componentLayout: Record<id, columnIndex>}`
- Per-page isolation via pageId

**Error Recovery:**
- Invalid localStorage data → Reset to default
- Missing componentLayout → Rebuild from componentIds
- Parse errors → Log warning and use defaults
- Graceful degradation

**Validation Rules:**
- columns must be 1, 2, 3, or 4
- componentLayout keys must match componentIds
- columnIndex must be < columns
- All sections must have column assignment

**When to Use:**
- Understanding state flow
- Implementing state management
- Debugging state issues
- Planning error handling

**Last Updated:** 2025-10-18

---

## 🛠️ Tools & Rendering

### PlantUML Rendering

**Local Rendering:**
```bash
# Install PlantUML (requires Java)
npm install -g node-plantuml

# Render diagram to PNG
plantuml system-architecture.puml

# Render to SVG (scalable)
plantuml -tsvg system-architecture.puml
```

**VSCode Extensions:**
- [PlantUML](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) - Live preview, export to PNG/SVG
- [PlantUML Visualizer](https://marketplace.visualstudio.com/items?itemName=UEQT.plantuml-visualizer) - Alternative viewer

**Online Rendering:**
- [PlantText](https://www.planttext.com/) - Paste code, instant render
- [PlantUML Web Server](http://www.plantuml.com/plantuml/uml/) - Official online editor

**Docusaurus Integration:**
- Diagrams can be embedded in Markdown using `plantuml` code blocks
- Install `@docusaurus/plugin-ideal-image` for optimized rendering
- Alternatively, export to SVG and embed with `![alt](diagram.svg)`

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

- [Architecture Decision Records (ADRs)](../../frontend/architecture/decisions/README.md)
- [Product Requirements Documents (PRDs)](../product/prd/en/)
- [Testing Strategy](../testing-strategy.md)
- [Backend API Overview](../../backend/api/README.md)

---

**Last Updated:** 2025-10-11
**Maintainer:** Architecture Team
**Review Frequency:** Quarterly

---

## 🎯 Quick Reference

| Diagram | Purpose | Stakeholders | Frequency |
|---------|---------|--------------|-----------|  
| System Architecture | High-level overview | All roles | Quarterly |
| Data Flow | Trading pipeline | Developers, DevOps | On flow changes |
| Component Architecture | Frontend structure | Frontend developers | On component changes |
| Telegram Bot Sequence | Bot configuration | Product, Frontend | On feature changes |
| Order Lifecycle | Order states | Backend developers | On order logic changes |
| Connection States | ProfitDLL health | DevOps, Monitoring | On integration changes |
| Deployment Architecture | Infrastructure | DevOps, Architects | On deployment changes |
| Idea Bank - Component | API architecture | Backend, Frontend | On API changes |
| Idea Bank - Create Sequence | Idea creation flow | Frontend, Backend | On workflow changes |
| Idea Bank - Kanban State | Status workflow | Frontend, Product | On status logic changes |
| TP Capital - Component | Ingestion architecture | Backend, DevOps | On pipeline changes |
| TP Capital - Ingestion | Telegram to QuestDB | Backend, DevOps | On ingestion changes |
| TP Capital - Consumption | Signal usage | Frontend, Agents | On consumer changes |
| Customizable Layout - Component | Layout system | Frontend | On layout changes |
| Customizable Layout - Interaction | User interactions | Frontend, UX | On interaction changes |
| Customizable Layout - State | State management | Frontend | On state logic changes |

---

**Need to create a new diagram?**

1. Choose appropriate diagram type (sequence, state machine, component, deployment)
2. Use PlantUML syntax
3. Follow color coding and naming conventions
4. Add comprehensive notes with context
5. Reference related code and documentation
6. Update this README with new entry
7. Commit with descriptive message

**Questions or suggestions?** Open an issue or discussion in the repository.
