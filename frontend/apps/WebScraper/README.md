# WebScraper App

Standalone React + Vite application that delivers a full web scraping cockpit on top of Firecrawl. It mirrors the UX principles of the TradingSystem dashboard, but runs independently on port `3800`.

## ✨ Features

- Dedicated navigation (Home, Scraping, Templates, History, Schedules)
- Real-time health feedback for `firecrawl-proxy`
- Rich scraping form with support for crawls, filters, and Firecrawl options
- Template management (CRUD, duplicate, import/export, apply)
  - Live preview panel for template configuration
  - Bulk import with JSON validation and selective import
  - Enhanced validation with warnings and suggestions
  - CSS selector validation for content filters
  - URL pattern testing and common mistakes detection
  - Template duplicate and apply functionality
- Schedule automation with cron/interval/one-time support
  - Cron builder (presets, advanced editor, manual mode)
  - Status dashboard (enabled/disabled, upcoming, failure analysis)
  - Per-schedule actions (enable/disable, edit, history, delete)
- Execution history with filtering, pagination, rerun and delete actions
- Persisted state with Zustand + React Query
- Tailwind CSS + Radix UI component primitives

## 🧱 Stack

- React 18 + TypeScript
- Vite 7
- Tailwind CSS 3 + Radix UI + Lucide icons
- React Query 5 for data fetching
- Zustand for local state (scrape form + toasts)
- Firecrawl proxy integration (`http://localhost:3600`)
- WebScraper API integration (`http://localhost:3700`)

## 📁 Directory Structure

```
frontend/apps/WebScraper/
├── src/
│   ├── components/
│   │   ├── layout/        # Header, Sidebar, Layout shell
│   │   ├── pages/         # Home, Scraping, Templates, History, Schedules
│   │   ├── templates/     # Template management components
│   │   ├── schedules/     # Scheduler UI (editor, status, list, cron builder)
│   │   └── ui/            # Tailwind + Radix UI primitives
│   ├── contexts/          # Theme provider (light/dark/system)
│   ├── hooks/             # React Query wrappers for API usage
│   ├── services/          # Axios + fetch clients (WebScraper API & Firecrawl)
│   ├── store/             # Zustand stores (scrape form, toasts)
│   ├── types/             # Shared TypeScript definitions
│   ├── utils/             # Validation + browser safe helpers
│   ├── App.tsx            # Provider wiring (Theme + QueryClient)
│   └── main.tsx          # Vite entry
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

```bash
cd frontend/apps/WebScraper
npm install
npm run dev # -> http://localhost:3800
```

Environment variables live in the repository root `.env`. Relevant entries:

```ini
VITE_WEBSCRAPER_API_URL=http://localhost:3700
VITE_WEBSCRAPER_FIRECRAWL_URL=http://localhost:3600
```

Vite proxies these values during development (see `vite.config.ts`), so API calls use relative paths (`/api/webscraper`, `/api/firecrawl`).

## 🔌 Integrations

| Service            | Purpose                               | Local URL               |
| ------------------ | ------------------------------------- | ----------------------- |
| Firecrawl Proxy    | Firecrawl adapter, rate limiting      | `http://localhost:3600` |
| WebScraper API     | Job + template orchestration          | `http://localhost:3700` |
| TimescaleDB        | Persistence through Prisma/SQL        | `postgres://...`        |

## 🧠 State & Data Flow

- **React Query** caches `jobs`, `statistics`, `templates`
- **Zustand** keeps the scraping form sticky (URL, formats, template selection)
- **Toasts** run through a lightweight Zustand store (`useToastStore`)
- **Theme** persists per-user (localStorage key `webscraper-theme`)

## 📝 Template Management

The WebScraper app provides a comprehensive template management system for creating, organizing, and reusing scraping configurations. Templates eliminate repetitive form filling and ensure consistency across scraping jobs.

### Components

- **TemplateList**: Displays all templates with search functionality, actions (Edit, Duplicate, Delete, Apply), and responsive card layout with metadata badges
- **TemplateEditor**: Create/Edit dialog with live preview, form fields (name, description, URL pattern, formats, options), real-time validation, two-column layout
- **TemplatePreview**: Visual preview of template configuration, sections for basic info, formats, options, filters, validation status indicators
- **TemplateImport**: Bulk import from JSON file, drag-and-drop file upload, preview before import with validation, selective import, conflict resolution

### Features

- ✅ **CRUD Operations**: Create, read, update, delete templates
- ✅ **Search & Filter**: Real-time search by name, description, URL pattern
- ✅ **Duplicate**: Clone existing templates for quick variations
- ✅ **Apply**: One-click apply template to scraping form
- ✅ **Import/Export**: Bulk operations via JSON files
- ✅ **Validation**: Comprehensive validation with warnings:
  - Name: Length, allowed characters
  - URL pattern: Regex validity, common mistakes
  - Formats: Performance warnings
  - Content filters: CSS selector validity
  - Wait/Timeout: Value ranges and relationships
- ✅ **Preview**: Live preview before save/import
- ✅ **Usage Tracking**: Track how many times each template is used

### Template Structure

```typescript
interface Template {
  id: string;
  name: string;
  description?: string;
  urlPattern?: string; // Regex for auto-matching URLs
  options: ScrapeOptions;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ScrapeOptions {
  url: string;
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  includeTags?: string[];
  excludeTags?: string[];
}
```

### Import/Export Format

Templates are exported as JSON array:

```json
[
  {
    "name": "GitHub Repository",
    "description": "Extract README and repo info",
    "urlPattern": "^https://github\\.com/[^/]+/[^/]+/?$",
    "options": {
      "url": "",
      "formats": ["markdown", "links"],
      "onlyMainContent": true,
      "waitFor": 0,
      "timeout": 15000,
      "includeTags": ["article.markdown-body"],
      "excludeTags": ["nav", "footer"]
    }
  }
]
```

## 📤 Data Export & Analytics

The Exports workspace adds a dedicated flow for downloading data in analyst-friendly formats.

### Components

- **ExportsPage** – orchestrator screen with search, pagination, and access to history.
- **ExportDialog** – three-step wizard (Configure → Preview → Confirm) with filter builder, live preview, and format estimator.
- **ExportHistory** – tabular view showing status, formats, expiration, and per-item actions (download/delete).
- **ExportPreview** – reusable preview block for dialog steps, showing sample rows and estimated sizes.

### Workflow

1. Open the dialog via Home quick action or History/Exports page.
2. Configure export type (`jobs`, `templates`, `schedules`, `results`), select formats (CSV/JSON/Parquet), and optional filters.
3. Preview sample data (first 10 rows) and estimated file sizes; adjust filters if required.
4. Confirm to create the export. Downloads become available once status = `completed`.
5. Export History streams file downloads directly from the API (React Query polls while jobs are processing).

### UX Notes

- Jobs export reuses the same filters as the History view (status, type, template, URL, date range).
- Multiple formats trigger automatic ZIP bundling (in addition to individual files).
- Per-item loading states ensure delete/download buttons show the correct spinner.
- Expiration countdown (24h by default) warns when downloads are about to be purged.

## 📆 Scheduler Automation

The Schedules workspace brings native automation to the WebScraper app through a first-class UI that mirrors backend scheduler capabilities.

### Components

- **SchedulesPage**: Orchestrates filters, dialogs, per-item loading, and navigation actions.
- **ScheduleList**: Card layout with inline enable/disable, edit, history, and delete actions (per-item spinners).
- **ScheduleEditor**: Dialog supporting cron, interval, and one-time schedules with validation, template binding, job mode selection, and preview tab.
- **ScheduleStatus**: At-a-glance health dashboard (totals, due soon, overdue, failure analysis, upcoming timeline).
- **CronBuilder**: Preset/advanced/manual editor with human-readable description and next-run preview.

### Workflow

1. **Create**: Pick template (optional), define URL, choose schedule type, configure cron/interval/one-time, and select output formats. Validation leverages shared utilities (`validateSchedule`, `validateScrapeOptions`).
2. **Manage**: Search, enable/disable, edit, delete, or inspect schedule history. React Query keeps data fresh with 30s polling.
3. **Monitor**: Toggle status dashboard to view health indicators, upcoming executions, and failure hotspots.

### Runtime Notes

- Requires WebScraper API to run with `WEBSCRAPER_SCHEDULER_ENABLED=true` (see `scripts/webscraper/start-scheduler.sh`).
- React Query invalidates caches after create/update/toggle/delete to keep UI consistent.
- Frontend mirrors backend metrics and status mapping (normalized job statuses).

## 🧪 Testing

Run Vitest locally:

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## 🔭 Roadmap

- ✅ ~~Template import wizard with validation feedback~~ (Completed)
- WebSocket bridge for real-time job updates
- Role-based permissions and audit logs
- Extended analytics (daily credits, failure causes, processing time)
- Embeddable mode inside dashboard (iframe + messaging)
- Template categories and sharing
- Template version control and history

---

For backend details see `backend/api/webscraper-api/README.md`. High-level architecture is captured under `docs/context/frontend/features/webscraper-app.md`.
