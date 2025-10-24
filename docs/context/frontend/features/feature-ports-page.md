---
title: Ports Page - Service Monitoring Dashboard
sidebar_position: 50
tags: [frontend, monitoring, ports, infrastructure, health-check]
domain: frontend
type: reference
summary: Comprehensive service monitoring page with real-time health checks, categorized services, and quick access dashboard
status: active
last_review: 2025-10-17
---

# Ports Page - Service Monitoring Dashboard

## Overview

The **Ports Page** provides centralized monitoring and management of all system services running across the TradingSystem infrastructure. It displays 16 services across 4 categories with real-time health checking, auto-refresh capabilities, and quick access shortcuts.

**Location**: `/ports`
**Component**: `PortsPage.tsx` (`frontend/dashboard/src/components/pages/PortsPage.tsx`)
**Route**: Accessible from main navigation → "Configurações" (Settings) section

## Features

### 1. Real-Time Health Monitoring

- **Health Check System**: Automated HTTP health checks for all services
- **Status Indicators**:
  - 🟢 Online (green) - Service responding
  - 🔴 Offline (red) - Service not responding
  - 🟡 Checking (yellow/animated) - Health check in progress
  - ⚪ Unknown (gray) - Non-HTTP services (PostgreSQL, TCP protocols)
- **Response Time**: Displays response time in milliseconds for HTTP services
- **Auto-Refresh**: Optional 30-second auto-refresh with manual refresh button
- **Last Updated**: Timestamp showing when checks were last performed

### 2. Service Categories (4 Groups)

Services are organized into 4 collapsible categories:

**UI Services** (2):
- Port 5173 - Dashboard (React)
- Port 3004 - Docusaurus (Documentation Hub)

**API Services** (2):
- Port 4005 - TP-Capital API (Telegram ingestion)
- Port 8082 - B3 Sistema (Market data)

**Monitoring Services** (3):
- Port 9090 - Prometheus (Metrics collection)
- Port 3000 - Grafana (Visualization - admin/admin)
- Port 9093 - Alertmanager (Alert routing)

**Infrastructure Services** (9):
- Port 9000 - QuestDB HTTP API (Time-series database)
- Port 9009 - QuestDB ILP (InfluxDB Line Protocol)
- Port 8812 - QuestDB PG Wire (PostgreSQL protocol)
- Port 5678 - n8n (Workflow automation)
- Port 3100 - Flowise (AI workflows)
- Port 3002 - Firecrawl (Web scraping)
- Port 8083 - Evolution API (WhatsApp integration)
- Port 9999 - Laucher API (Terminal launcher)

### 3. Quick Access Dashboard

Six prominently featured services with color-coded cards:
- **Dashboard** (cyan/blue gradient) - Port 5173
- **Grafana** (orange/red gradient) - Port 3000
- **n8n** (pink/rose gradient) - Port 5678
- **Flowise** (purple/indigo gradient) - Port 3100
- **Evolution API** (green/teal gradient) - Port 8083

Each card includes:
- Service icon
- Service name
- Port number
- One-click external link

### 4. Deployment Overview Panel

Statistics panel showing:
- **Total Ports**: 16 services
- **Categories**: 4 service groups
- **Native / Docker**: Deployment type breakdown (currently 0 native / 16 docker)
- **Online Status**: Number of services currently responding

### 5. Service Details Table

Comprehensive table for each category with columns:
- **Port**: Service port number (monospace font, cyan)
- **Name**: Service name
- **Deployment**: Badge showing "docker" or "native" with icon
- **Description**: Brief service description
- **Status**: Real-time health status with indicator
- **Last Updated**: Formatted timestamp (DD/MM/YYYY HH:mm)
- **Actions**:
  - **Open** button (cyan) - Opens service in new tab
  - **Run** button (green) - Launches service in terminal (native only)

## Architecture

### Component Structure

```typescript
interface ExtendedPortInfo {
  port: number;
  name: string;
  description: string;
  url: string;
  status: 'online' | 'offline' | 'unknown' | 'checking';
  lastUpdated: string;
  category: 'core' | 'api' | 'monitoring' | 'database' | 'ui' | 'automation' | 'infrastructure';
  deployment: 'native' | 'docker';
  responseTime?: number;
  runCommand?: string;
  workingDir?: string;
}
```

### State Management

- **useState**: Manages port list, checking state, auto-refresh toggle
- **useEffect**: Initial health check on mount, 30s interval for auto-refresh
- **useCallback**: Optimized health check function to prevent re-renders
- **localStorage**: Persistent collapsible card state (via CollapsibleCard component)

### Health Check Implementation

```typescript
const checkPortHealth = async (url: string, timeout: number) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = Date.now();
    const response = await fetch(url, { signal: controller.signal });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeoutId);

    return {
      status: response.ok ? 'online' : 'offline',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'offline',
      lastChecked: new Date().toISOString()
    };
  }
};
```

### Laucher Integration

For native deployments, the page integrates with Laucher API (port 9999):

```typescript
const launchTerminal = async (port: ExtendedPortInfo) => {
  const response = await fetch('http://localhost:9999/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName: port.name,
      workingDir: port.workingDir,
      command: port.runCommand,
    }),
  });

  const result = await response.json();

  if (result.success) {
    alert(`✅ ${port.name} launched successfully!`);
  } else {
    // Fallback: copy command to clipboard + show manual instructions
    await navigator.clipboard.writeText(port.runCommand);
    alert(`⚠️ Laucher API not running. Command copied to clipboard.`);
  }
};
```

## UI Components

### CollapsibleCard

- **Component**: From `@/components/ui/collapsible-card`
- **Features**:
  - Expand/collapse with animated chevron icon
  - State persistence to localStorage per cardId
  - Color-coded category headers (gradient backgrounds)
  - Responsive padding and spacing

### Category Icons

- **UI**: Server icon (blue)
- **API**: Server icon (green)
- **Monitoring**: Server icon (orange)
- **Infrastructure**: Server icon (yellow)

### Status Colors

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'text-green-500';
    case 'offline': return 'text-red-500';
    case 'checking': return 'text-yellow-500 animate-pulse';
    default: return 'text-gray-500';
  }
};
```

## Implementation Timeline

**Phase 1** (Completed - 2025-10-11)
- ✅ Initial port list with 27 services
- ✅ Real-time health checking
- ✅ Quick Access dashboard
- ✅ Collapsible categories
- ✅ Auto-refresh functionality

**Phase 2** (Completed - 2025-10-12)
- ✅ Removed non-existent services (Traefik, non-existent APIs)
- ✅ Removed phantom Core Trading Services (not implemented)
- ✅ Consolidated Database + Automation into Infrastructure
- ✅ Removed Node Exporter (Linux-only, profile-based)
- ✅ Verified all 16 remaining services exist
- ✅ Updated service categories to 4 groups

**Phase 3** (Planned)
- [ ] WebSocket real-time updates (replace polling)
- [ ] Service start/stop controls (Docker commands)
- [ ] Log viewer integration (tail logs inline)
- [ ] Historical uptime metrics (24h/7d charts)
- [ ] Alert configuration (email/webhook on service down)
- [ ] Export service status report (JSON/CSV)

## User Workflows

### 1. Check Service Status

1. Navigate to `/ports`
2. View "Deployment Overview" panel for summary
3. Expand category cards to see detailed status
4. Look for green 🟢 (online) or red 🔴 (offline) indicators
5. Check response times for performance issues

### 2. Access Service Quickly

1. Scroll to "Quick Access" section
2. Click on service card (e.g., Grafana, n8n)
3. Service opens in new browser tab

### 3. Launch Native Service

1. Find service with "Run" button (green)
2. Click "Run" button
3. Laucher API opens new terminal window
4. If API unavailable, command is copied to clipboard

### 4. Monitor System Health

1. Enable "Auto-refresh (30s)" checkbox
2. Let page run in background
3. Page automatically checks all services every 30 seconds
4. Red indicators alert to offline services

## Configuration

### Adding New Service

1. Open `PortsPage.tsx`
2. Add to `initialPorts` array:

```typescript
{
  port: 8888,
  name: 'New Service',
  description: 'Service description (Docker)',
  url: 'http://localhost:8888',
  status: 'unknown',
  lastUpdated: '2025-10-12T10:30:00',
  category: 'infrastructure', // or api, monitoring, ui
  deployment: 'docker', // or native
}
```

3. For native services, add `runCommand` and `workingDir`:

```typescript
{
  runCommand: 'npm start',
  workingDir: '/path/to/service',
}
```

### Removing Service

1. Open `PortsPage.tsx`
2. Find service in `initialPorts` array
3. Remove entire service object
4. If in Quick Access, remove from Quick Access section

### Changing Categories

Update the `category` field to one of:
- `'ui'` - User interfaces
- `'api'` - REST/GraphQL APIs
- `'monitoring'` - Observability stack
- `'infrastructure'` - Databases, automation, core services

## Testing

### Manual Testing Checklist

- [ ] All 16 services display correctly
- [ ] Health checks complete within 3 seconds
- [ ] Online services show green indicator
- [ ] Offline services show red indicator
- [ ] Response times display for HTTP services
- [ ] Auto-refresh toggles correctly
- [ ] Manual refresh button works
- [ ] Quick Access cards open correct URLs
- [ ] Collapsible cards expand/collapse smoothly
- [ ] Deployment Overview shows correct counts
- [ ] Category colors match specification
- [ ] Mobile responsive (< 768px width)

### Health Check Testing

```bash
# Start specific services
docker-compose up -d prometheus grafana questdb

# Verify ports page detects them as online
# Navigate to http://localhost:5173/ports

# Stop a service
docker-compose stop grafana

# Verify ports page detects it as offline within 30s
```

## Performance Considerations

- **Parallel Checks**: All health checks run concurrently (Promise.all)
- **Timeout**: 3-second timeout per health check to prevent hanging
- **Skip Non-HTTP**: PostgreSQL/TCP services skip health checks (status: 'unknown')
- **Debounce**: Manual refresh button disabled during check
- **Memory**: Lightweight component, ~2KB state, no memory leaks

## Accessibility

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Readers**: Status announced as "online", "offline", "checking"
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
- **Focus Indicators**: Visible focus rings on buttons/links
- **ARIA Labels**: `aria-label` on icon-only buttons

## Security

- **No Credentials**: No authentication credentials stored
- **CORS**: Backend APIs must have CORS enabled for health checks
- **XSS Prevention**: All service names/descriptions sanitized
- **CSP Compliance**: External links use `rel="noopener noreferrer"`

## Troubleshooting

### Services Show as Offline But Are Running

**Cause**: CORS blocking health checks
**Solution**: Add CORS headers to service:

```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Auto-Refresh Not Working

**Cause**: Component unmounted or checkbox disabled
**Solution**:
1. Check "Auto-refresh (30s)" checkbox is enabled
2. Keep tab/window open (browser throttles background tabs)

### Laucher API Not Working

**Cause**: API not running on port 9999
**Solution**:

```bash
cd apps/service-launcher
npm install
npm start
```

### Health Checks Slow

**Cause**: Service responding slowly or timing out
**Solution**: Increase timeout in `checkPortHealth()` from 3000ms to 5000ms

## Related Documentation

- Laucher API reference: consulte `apps/service-launcher/README.md` no repositório.
- [Dados & integrações backend](../../backend/data/README.md)
- [Monitoramento com Prometheus/Grafana](../../ops/monitoring/prometheus-setup.md)
- [Playbook de deployment](../../ops/deployment/deployment.md)

## Metrics

- **Total Services**: 16
- **Categories**: 4
- **Deployment**: 100% Docker
- **Health Check Interval**: 30 seconds (auto-refresh)
- **Health Check Timeout**: 3 seconds per service
- **Component Size**: ~700 lines TypeScript
- **Dependencies**: react-query (future), lucide-react, shadcn/ui

## Changelog

**2025-10-12** - Major cleanup and consolidation
- Removed 11 non-existent/phantom services
- Consolidated Database + Automation into Infrastructure (9 services)
- Verified all 16 remaining services exist
- Updated categories to 4 groups (down from 7)
- Fixed port information (removed 5432, 3200, 80, 443, 8080, 9100)

**2025-10-11** - Initial implementation
- Created PortsPage with 27 services
- Implemented real-time health checking
- Added Quick Access dashboard
- Integrated CollapsibleCard system
- Added Laucher API integration

---

**Maintainer**: Frontend Team
**Next Review**: 2025-11-12
**Status**: ✅ Active and Verified
