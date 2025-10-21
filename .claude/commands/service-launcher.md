# Service Launcher - TradingSystem

Custom command for starting, stopping, and managing local services.

## Usage

```bash
/service-launcher <action> [service]
```

## Actions

### `start` - Start service
Starts a specific service or all services.

**Examples:**
```bash
/service-launcher start dashboard
/service-launcher start all
```

**Available services:**
- `dashboard` - Main React dashboard (port 3103)
- `docusaurus` - Documentation site (port 3004)
- `workspace-api` - Library API (port 3200)
- `tp-capital` - TP Capital ingestion (port 3200)
- `b3-market-data` - B3 market data (port 3302)
- `documentation-api` - Documentation API (port 3400)
- `service-launcher` - Service orchestration (port 3500)
- `firecrawl-proxy` - Firecrawl proxy (port 3600)

### `stop` - Stop service
Stops a specific service or all services.

**Examples:**
```bash
/service-launcher stop dashboard
/service-launcher stop all
```

### `restart` - Restart service
Restarts a specific service.

**Example:**
```bash
/service-launcher restart dashboard
```

### `status` - Check service status
Shows status of all services.

**Example:**
```bash
/service-launcher status
```

**Shows:**
- Service name and description
- Port number
- Status (running/stopped)
- PID (if running)
- Memory usage
- Uptime

### `logs` - View service logs
Shows logs for a specific service.

**Example:**
```bash
/service-launcher logs dashboard
```

**Options:**
- Follow logs in real-time: `logs dashboard --follow`
- Show last N lines: `logs dashboard --tail 50`

### `ports` - Check port usage
Shows which ports are in use and by which services.

**Example:**
```bash
/service-launcher ports
```

**Output:**
```
Port 3103: dashboard (PID: 12345)
Port 3004: docusaurus (PID: 12346)
Port 3200: workspace-api (PID: 12347)
Port 3302: b3-market-data (PID: 12348)
...
```

### `kill-port` - Kill process on port
Forcefully stops process using a specific port.

**Example:**
```bash
/service-launcher kill-port 3103
```

**⚠️ Warning:** Use with caution. Kills process without graceful shutdown.

## Service Commands

Each service has specific commands for development:

### Dashboard (React + Vite)
```bash
cd frontend/apps/dashboard
npm install
npm run dev        # Start development server (port 3103)
npm run build      # Build for production
npm run preview    # Preview production build
npm test           # Run tests
```

### Docusaurus
```bash
cd docs/docusaurus
npm install
npm run start -- --port 3004    # Start development server
npm run build                   # Build static site
npm run serve                   # Serve production build
```

### Backend APIs (Express)
```bash
cd backend/api/<service-name>
npm install
npm run dev        # Start development server
npm test           # Run tests
npm run lint       # Run linter
```

## Environment Management

### Check environment variables
```bash
/service-launcher env-check
```

Validates required environment variables for all services.

### Reload environment
```bash
/service-launcher env-reload
```

Reloads `.env` file and restarts services that depend on changed variables.

## Troubleshooting

### Service won't start
1. **Check port availability:**
   ```bash
   /service-launcher ports
   ```

2. **Kill process on port:**
   ```bash
   /service-launcher kill-port <port>
   ```

3. **Check logs:**
   ```bash
   /service-launcher logs <service>
   ```

4. **Verify environment:**
   ```bash
   /service-launcher env-check
   ```

### Service crashes on startup
1. **Check dependencies:**
   ```bash
   cd <service-path>
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be v18+
   ```

3. **Clear cache:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Port already in use
```bash
# Find process using port
lsof -i :<port>

# Kill process
kill -9 <PID>

# Or use helper command
/service-launcher kill-port <port>
```

## Service Launcher API

The Service Launcher service provides HTTP API for orchestration:

**Base URL:** `http://localhost:3500`

**Endpoints:**
- `GET /api/status` - Service health checks
- `GET /api/health/full` - Comprehensive health status (cached 30s)
- `POST /api/start/:service` - Start service
- `POST /api/stop/:service` - Stop service
- `POST /api/restart/:service` - Restart service
- `GET /api/ports` - List port usage

## See Also

- [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)
- [Environment Configuration](../../docs/context/ops/ENVIRONMENT-CONFIGURATION.md)
- [Health Monitoring](../../docs/context/ops/health-monitoring.md)








