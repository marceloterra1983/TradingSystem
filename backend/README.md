# Backend - TradingSystem

This directory contains all backend services, APIs, and configurations of TradingSystem.

## 📋 Service Manifest

The **`manifest.json`** file is the centralized registry of all project services.

### Purpose

- Defines services, ports, paths, and commands in a single place
- Used by automation scripts (`scripts/start-services.sh`)
- Consumed by CLI tools (`scripts/service-manifest.js`)
- Source of truth for CI/CD and dashboards

### Structure

```json
{
  "version": 1,
  "services": [
    {
      "id": "service-name",
      "type": "backend|frontend|docs|infra|external",
      "path": "relative/path/to/service",
      "start": "npm run dev",
      "build": "npm run build",
      "test": "npm test",
      "port": 3000,
      "env": ".env.example",
      "workspace": true,
      "managed": "internal|external"
    }
  ]
}
```

### Fields

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique service identifier | `tp-capital-signals` |
| `type` | Service type | `backend`, `frontend`, `docs`, `infra`, `external` |
| `path` | Relative path to service | `frontend/apps/tp-capital` |
| `start` | Command to start in dev mode | `npm run dev` |
| `build` | Build command (optional) | `npm run build` |
| `test` | Test command (optional) | `npm test` |
| `port` | Main port (if applicable) | `3200` |
| `env` | Environment variables template | `.env.example` |
| `workspace` | Included in npm workspace | `true` / `false` |
| `managed` | Management type | `internal` / `external` |

### Usage

**List all services:**

```bash
node scripts/service-manifest.js list
```

**Get information about a specific service:**

```bash
node scripts/service-manifest.js get tp-capital-signals
```

**Get a specific field:**

```bash
node scripts/service-manifest.js get tp-capital-signals --field port
```

**Start all services:**

```bash
bash scripts/start-services.sh start
```

## 📁 Backend Structure

```text
backend/
├── manifest.json          # Centralized service registry
├── api/                   # REST APIs (Node.js/Express)
│   ├── tp-capital-signals/
│   ├── b3-market-data/
│   ├── docs-api/
│   └── service-launcher/
├── data/                  # Data layer
│   ├── questdb/          # QuestDB schemas & migrations
│   └── warehouse/        # Data warehouse configs
├── services/              # Core microservices (future)
│   ├── data-capture/     # C# + ProfitDLL (planned)
│   └── order-manager/    # C# + Risk Engine (planned)
└── shared/               # Shared libraries
    ├── logger/           # Centralized logging
    └── metrics/          # Prometheus metrics
```

## 🔗 Related Documentation

- [Service Manifest Blueprint](../docs/context/ops/repository/service-manifest-blueprint.md)
- [JS Workspace Inventory](../docs/context/ops/repository/js-workspace-inventory.md)
- [DIRECTORY-STRUCTURE.md](../docs/DIRECTORY-STRUCTURE.md)
