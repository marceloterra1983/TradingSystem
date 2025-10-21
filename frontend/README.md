# 🎨 Frontend - TradingSystem

> **TradingSystem Frontend Applications** - Documentation, monitoring and trading dashboard
>
> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS  
> **Architecture:** Component-based, Clean Architecture  
> **Status:** ✅ Production Ready

---

## 📋 Overview

The TradingSystem frontend is organized in a modular structure with independent applications and shared assets.

```text
frontend/
├── apps/              # Frontend applications
│   └── dashboard/    # Main dashboard (current single app)
│
└── shared/            # Shared resources
    └── assets/       # Brand assets, icons, logos
```

---

## 🎯 Applications

### Dashboard (Port 3103)

**Main TradingSystem application** - Complete system for documentation, monitoring and trading management.

**URL:** <http://localhost:3103>  
**Version:** 1.2.0  
**Status:** ✅ Production Ready

**Features:**

- 📚 Documentation system with 41 pages
- 📊 B3 market data visualization
- 📡 TP Capital signals monitoring
- 🔌 Connection and service management
- 📈 Real-time analytics and metrics
- ⚙️ Settings and administrative tools

**Location:** `apps/dashboard/`  
**Documentation:** [apps/dashboard/README.md](apps/dashboard/README.md)

---

## 🏗️ Technology Stack

### Core Framework

```json
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.3.3",
  "buildTool": "Vite 7.1.10",
  "runtime": "Node.js 22+",
  "packageManager": "npm"
}
```

### UI & Styling

```json
{
  "styling": "Tailwind CSS 3.4.1",
  "components": "shadcn/ui + Radix UI",
  "typography": "@tailwindcss/typography 0.5.19",
  "icons": "Lucide React 0.309.0",
  "animations": "Framer Motion 12.23.22"
}
```

### State & Data

```json
{
  "stateManagement": "Zustand 4.4.7",
  "serverState": "@tanstack/react-query 5.17.19",
  "http": "Axios 1.6.5",
  "markdown": "react-markdown 10.1.0"
}
```

### Feature Libraries

```json
{
  "dragDrop": "@dnd-kit 6.3.1",
  "charts": "Recharts 2.10.3",
  "dates": "date-fns 3.0.6",
  "routing": "Custom implementation"
}
```

### Testing Stack

```json
{
  "unitTests": "Vitest 3.2.4",
  "testing": "@testing-library/react 14.1.2",
  "coverage": "@vitest/coverage-v8 3.2.4"
}
```

---

## 📱 Available Pages (41)

### 📊 Dashboard & Insights

- **DashboardPage** - System overview
- **OverviewPage** - General overview
- **MetricsPage** - System metrics
- **PerformancePage** - Performance and analysis

### 📚 Documentation

- **DocsPage** - Documentation hub
- **DocsSpecsPage** - Technical specifications
- **DocumentationPage** - Documentation system
- **DocumentationStatsPageSimple** - Documentation statistics
- **DocumentationSystemsPageSimple** - Documented systems
- **DocusaurusPage** - Docusaurus integration
- **PRDsPage** - Product Requirements Documents
- **ADRPage** - Architecture Decision Records
- **FeaturesPage** - Features and functionalities
- **RoadmapPage** - Project roadmap
- **MetadataPage** - Documentation metadata

### 💡 Idea Bank

- **BancoIdeiasPage** - Trading ideas management
- **BancoIdeiasPageNew** - New version with improvements
- **EscopoPage** - Scope and planning
- **EscopoPageNew** - New scope version

### 📡 Connections & Integrations

- **ConnectionsPage** - Connection management (Telegram bots)
- **ConnectionsPageNew** - New version
- **TelegramDataPage** - Telegram data
- **SubscriptionsPage** - Subscriptions and webhooks

### 📈 Trading & Market

- **B3MarketPage** - B3 market data
- **MarketOverviewPage** - Market overview
- **SignalsPage** - Trading signals
- **TPCapitalOpcoesPage** - TP Capital options
- **LiveFeedPage** - Live feed
- **OrdersPage** - Order management
- **PositionsPage** - Open positions

### 🛡️ Risk & Control

- **RiskControlsPage** - Risk controls
- **RiskLimitsPage** - Risk limits

### 🤖 ML & AI

- **MLModelPage** - Machine Learning models
- **MCPControlPage** - Agent-MCP control
- **BacktestingPage** - Strategy backtesting

### 📊 Data & Logs

- **ParquetBrowserPage** - Parquet file browser
- **LogsColetaPage** - Data collection logs
- **LogsDashboardPage** - Logs dashboard

### ⚙️ System & Settings

- **SettingsPage** - System settings
- **AdminToolsPage** - Administrative tools
- **BackupRestorePage** - Backup and restore

---

## 🧩 UI Components

### Layout Components (`components/layout/`)

- `Layout.tsx` - Main layout with sidebar
- `LayoutHeader.tsx` - Header with navigation
- `LayoutSidebar.tsx` - Collapsible sidebar
- `PageContent.tsx` - Content container

### UI Library (`components/ui/`)

Complete component library based on shadcn/ui:

- Buttons (action-buttons, variants)
- Cards (collapsible, customizable)
- Forms (inputs, selects, textareas)
- Data Display (tables, charts, badges)
- Feedback (toasts, dialogs, tooltips)
- Navigation (tabs, command palette)

**Documentation:** [apps/dashboard/src/components/ui/README.md](apps/dashboard/src/components/ui/README.md)

### Trading Components (`components/trading/`)

- Specialized trading components
- Market data visualization
- Execution controls

---

## 🎨 Shared Assets

### Branding (`shared/assets/branding/`)

TradingSystem logos and visual identity:

- **`logo.svg`** - Complete logo (horizontal)
- **`logo-dark.svg`** - Logo for dark mode
- **`logo-compact.svg`** - Compact logo (square)
- **`logo-icon.svg`** - Icon only
- **`preview.html`** - Logo preview
- **`README.md`** - Brand usage guide

**Usage:**

```tsx
import logoUrl from '@/../../shared/assets/branding/logo.svg'
```

---

## 🚀 Development

### Prerequisites

- Node.js 22+ (recommended v22.20.0)
- npm 10+

### Initial Setup

```bash
# Clone repository (if not already done)
cd /home/marce/projetos/TradingSystem

# Install dashboard dependencies
cd frontend/apps/dashboard
npm install
```

### Run Development - Option 1 (Recommended)

Native Node.js development server:

```bash
cd frontend/apps/dashboard
npm run dev
```

Access: <http://localhost:3103>

### Run Development - Option 2

Docker deployment (optional, not recommended for development):

```bash
# Frontend runs locally for better DX (hot reload)
cd frontend/apps/dashboard
npm run dev
```

Access: <http://localhost:3103>

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
cd frontend/apps/dashboard

# Run tests
npm run test

# Watch mode (development)
npm run test:watch

# With coverage
npm run test:coverage
```

**Current coverage:** 80% (branches, functions, lines, statements)

---

---

> **📝 Note about E2E Testing:**
> E2E testing with Cypress was removed from this project (October 2025).
> Unit tests with Vitest remain available and provide comprehensive test coverage.
> For integration testing, consider using Vitest's browser mode or React Testing Library.

---

## 🔨 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm run dev` | Start dev server with hot reload |
| **Build** | `npm run build` | Optimized production build |
| **Preview** | `npm run preview` | Preview production build |
| **Copy Docs** | `npm run copy:docs` | Copy PRDs to public/ |
| **Watch Docs** | `npm run watch:docs` | Watch docs/ for auto-copy |
| **Lint** | `npm run lint` | Run ESLint |
| **Lint Fix** | `npm run lint:fix` | Fix ESLint issues |
| **Type Check** | `npm run type-check` | Check TypeScript types |
| **Test** | `npm run test` | Run unit tests |
| **Test Watch** | `npm run test:watch` | Tests in watch mode |
| **Coverage** | `npm run test:coverage` | Tests with coverage |

---

## 🏗️ Dashboard Architecture

### Component Structure

```text
src/
├── components/
│   ├── layout/              # Layout components (Header, Sidebar, etc)
│   ├── pages/               # Page components (41 pages)
│   ├── trading/             # Trading-specific components
│   └── ui/                  # UI library (shadcn/ui based)
│
├── hooks/                   # Custom React hooks
├── services/                # API clients & integrations
├── store/                   # Zustand state management
├── utils/                   # Helper functions
└── App.tsx                  # App root
```

### Design Patterns

**Clean Architecture:**

- Clear separation between UI, logic and data
- Reusable and testable components
- Services for API integration

**Component Patterns:**

- Functional components with hooks
- TypeScript for type safety
- Well-defined props interfaces
- Composition over inheritance

**State Management:**

- Zustand for global state
- React Query for server state
- Local state with useState/useReducer

---

## 🎨 Design System

### Themes

- ✅ **Light Mode** - Default light theme
- ✅ **Dark Mode** - Full dark mode support
- 🎨 **Customizable** - Via Tailwind CSS

### Standardized Components

- **Buttons** - Action buttons with variants
- **Cards** - Customizable collapsible cards
- **Forms** - Inputs, selects, textareas
- **Toasts** - Notification system
- **Dialogs** - Modals and confirmations

**Style guides:**

- [Button Standards](apps/dashboard/src/components/ui/BUTTON-STANDARDS.md)
- [Toast Documentation](apps/dashboard/src/components/ui/TOAST-DOCUMENTATION.md)
- [Collapsible Cards](apps/dashboard/src/components/ui/collapsible-card-standardization.md)

---

## 📡 Backend Integrations

### Consumed APIs

| API | Port | Purpose |
|-----|------|---------|
| **Workspace** | 3102 | Idea Bank (QuestDB) |
| **TP-Capital** | 3200 | Telegram signals |
| **B3** | 3302 | B3 market data |
| **DocsAPI** | 3400 | Documentation CRUD |
| **Laucher** | 3500 | Status and orchestration |
| **Agent-MCP** | 8080 | Agent coordination |

### Services Layer

**Location:** `apps/dashboard/src/services/`

Implements clients for all backend APIs:

- `libraryService.ts` - Library/Idea Bank
- `tpCapitalService.ts` - TP Capital signals
- And others...

---

## 🔧 Environment Variables

> **⚠️ CRITICAL RULE - READ FIRST:**  
> **NEVER create a local `.env` file in `frontend/apps/dashboard/`!**  
> **ALWAYS use the centralized `.env` file from the project root.**  
> **Vite automatically loads `.env` from project root - no configuration needed!**

### Configuration Location

```bash
TradingSystem/
├── .env  ⭐ SINGLE SOURCE OF TRUTH (Vite loads automatically)
├── .env.example  ⭐ Template with all variables
└── frontend/apps/dashboard/
    ├── vite.config.ts
    └── src/
```

### Frontend Variables (from root `.env`)

All `VITE_*` prefixed variables are automatically available:

```bash
# From TradingSystem/.env (NOT local .env!)

# API Endpoints
VITE_API_URL=http://localhost:4010
VITE_WS_URL=ws://localhost:4010

# Data Sources
VITE_QUESTDB_URL=http://localhost:9000
VITE_PROMETHEUS_URL=http://localhost:9090

# Feature Flags
VITE_ENABLE_ML_FEATURES=true
VITE_ENABLE_PROFITDLL=false
```

### How It Works

**Vite's automatic behavior**:
1. Searches for `.env` in project root
2. Loads all `VITE_*` variables
3. Makes them available via `import.meta.env`

**No configuration needed!** ✨

### Usage in Code

```typescript
// Access environment variables
const apiUrl = import.meta.env.VITE_API_URL;
const wsUrl = import.meta.env.VITE_WS_URL;

// Type-safe with TypeScript
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENABLE_ML_FEATURES: string;
}
```

### Adding New Variables

1. **Add to root `.env.example`**:
   ```bash
   VITE_MY_NEW_FEATURE=true
   ```

2. **Add to root `.env`**:
   ```bash
   VITE_MY_NEW_FEATURE=true
   ```

3. **Use in code**:
   ```typescript
   const enabled = import.meta.env.VITE_MY_NEW_FEATURE === 'true';
   ```

4. **Validate**:
   ```bash
   bash scripts/env/validate-env.sh
   ```

### Migration Note

The old local `.env` file was migrated to:
- `frontend/apps/dashboard/.env.OLD.backup` (can be deleted)

See `frontend/apps/dashboard/ENV-MIGRATION-NOTE.md` for details.

---

## 📦 Build and Deploy

### Production Build

```bash
cd frontend/apps/dashboard

# Optimized build
npm run build

# Local preview
npm run preview
```

**Output:** `dist/` - Optimized and minified files

---

### Deploy Strategy

**Frontend runs locally for development (recommended):**

```bash
# Dashboard
cd frontend/apps/dashboard && npm run dev

# Docusaurus
cd docs/docusaurus && npm run start -- --port 3004
```

**Docker deployment (production only):**

- Dashboard: Use Dockerfile in `frontend/apps/dashboard/`
- Docusaurus: Use `docs/docusaurus/Dockerfile.prod`
- DocsAPI: Use `infrastructure/compose/docker-compose.docs.yml`

---

## 📚 Documentation Resources

### Technical Documentation

**Location:** `/docs/context/frontend/`

All frontend documentation has been consolidated in `/docs`:

#### Implementation Guides

- **Dark Mode:** `docs/context/frontend/guides/dark-mode.md`
- **Dark Mode Quick Reference:** `docs/context/frontend/guides/dark-mode-quick-reference.md`
- **Documentation Quick Start:** `docs/context/frontend/guides/documentation-quick-start.md`

#### Requirements

- **Collapsible Cards:** `docs/context/frontend/requirements/collapsible-cards.md`

#### Features

- Feature documentation in `docs/context/frontend/features/`

#### API Documentation

- Frontend-Backend API Hub: `docs/context/shared/integrations/frontend-backend-api-hub.md`

---

### Local Documentation (In Code)

**READMEs within code:**

- `apps/dashboard/README.md` - Complete dashboard documentation
- `apps/dashboard/src/components/ui/README.md` - UI library
- `apps/dashboard/src/components/ui/BUTTON-STANDARDS.md` - Button standards
- `apps/dashboard/src/components/ui/TOAST-DOCUMENTATION.md` - Toast system
- `apps/dashboard/src/components/layout/README.md` - Layout components

---

## 🎨 Brand Assets

### Available Logos

**Location:** `shared/assets/branding/`

| File | Usage |
|------|-------|
| `logo.svg` | Complete horizontal logo (preferred) |
| `logo-dark.svg` | Logo for dark mode |
| `logo-compact.svg` | Compact/square logo |
| `logo-icon.svg` | Icon only (favicon, etc) |

**Preview:** `shared/assets/branding/preview.html`

**Usage guide:** [shared/assets/branding/README.md](shared/assets/branding/README.md)

---

## 🔄 Development Workflow

### 1. Create New Page

```bash
cd frontend/apps/dashboard/src/components/pages

# Create file
touch MyNewPage.tsx
```

```tsx
// MyNewPage.tsx
import React from 'react';

export default function MyNewPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My New Page</h1>
      {/* Your content here */}
    </div>
  );
}
```

### 2. Add Route

Update navigation in `src/components/layout/LayoutSidebar.tsx` or routing system.

### 3. Create UI Component

```bash
cd frontend/apps/dashboard/src/components/ui

# Create file
touch my-component.tsx
```

Follow standards from:

- [BUTTON-STANDARDS.md](apps/dashboard/src/components/ui/BUTTON-STANDARDS.md)
- [UI README](apps/dashboard/src/components/ui/README.md)

---

## 🧪 Quality Assurance

### Linting

```bash
# Check code
npm run lint

# Auto-fix
npm run lint:fix

# Generate report
npm run lint:report
```

**Configuration:** `.eslintrc.json`  
**Rules:** React, TypeScript, Hooks

---

### Type Checking

```bash
# Check types
npm run type-check
```

**Configuration:** `tsconfig.json`  
**Strict mode:** Enabled

---

### Coverage Thresholds

**Required minimum:** 80%

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

**Configuration:** `vitest.config.ts` (in project root)

---

## 🔗 Useful Links

### Development URLs

- Dashboard: <http://localhost:3103>
- Workspace: <http://localhost:3102>
- TP Capital: <http://localhost:3200>
- B3 Data: <http://localhost:3302>
- DocsAPI: <http://localhost:3400>
- Laucher: <http://localhost:3500>

### Infrastructure URLs

- QuestDB UI: <http://localhost:9000>
- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3000>
- Agent-MCP: <http://localhost:8080>

---

## 📖 Related Documentation

### Technical References

- **[/docs/context/frontend/](/docs/context/frontend/)** - Complete frontend documentation
- **[/docs/context/shared/integrations/frontend-backend-api-hub.md](/docs/context/shared/integrations/frontend-backend-api-hub.md)** - API Hub

### Standards and Guidelines

- **[/docs/DOCUMENTATION-STANDARD.md](/docs/DOCUMENTATION-STANDARD.md)** - Documentation standard
- **[/.cursorrules-linux](/.cursorrules-linux)** - Project rules

### Project References

- **[/SYSTEM-OVERVIEW.md](/SYSTEM-OVERVIEW.md)** - System overview
- **[/docs/DIRECTORY-STRUCTURE.md](/docs/DIRECTORY-STRUCTURE.md)** - Directory structure
- **[/backend/manifest.json](/backend/manifest.json)** - Service registry

---

## 🔐 Security

### Environment Variables

- ❌ **Never commit** `.env` files
- ✅ **Use** `.env.example` as template
- ✅ **Keep** secrets in local `.env`

### CORS

- Configured in each backend API
- Allowed origins defined via environment variable

### Rate Limiting

- Implemented in backends
- Protection against API abuse

---

## 🎯 Next Steps

### Future Applications

Structure is prepared for multiple applications:

```text
frontend/apps/
├── dashboard/        # ✅ Current
├── trading-terminal/ # 🔮 Future - Trading terminal
├── analytics/        # 🔮 Legacy placeholder - reserved for future insights modules
└── mobile/           # 🔮 Future - Mobile app
```

### Planned Improvements

- 📱 Full mobile responsiveness
- 🎨 More customizable themes
- 🌐 Internationalization (i18n)
- ♿ Accessibility improvements (a11y)
- 📊 More data visualization components

---

## 🆘 Troubleshooting

### Port 3103 in use

```bash
# Find process
lsof -i :3103

# Kill process
kill -9 <PID>
```

### Corrupted node_modules

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build fails

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```


---

## 📞 Support

- **Documentation:** `/docs/context/frontend/`
- **Issues:** GitHub Issues (when available)
- **Guides:** `/docs/context/ops/onboarding/`

---

## 📊 Frontend Statistics

| Metric | Value |
|--------|-------|
| Applications | 1 (Dashboard) |
| Pages | 41 |
| UI Components | 30+ |
| TypeScript Lines | ~15,000+ |
| Coverage | 80%+ |
| Build Size | ~2 MB (minified) |

---

**Last updated:** 2025-10-15  
**Version:** 1.2.0  
**Maintained by:** TradingSystem Team
