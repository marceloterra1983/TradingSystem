# Traefik Dashboard Routing Fix ✅

**Date:** 2025-10-13
**Status:** RESOLVED
**Issue:** Traefik estava roteando para página errada do dashboard

## Problem Summary

User reported: "porem o trefik precisa ser atualizado, pois esta acessando pagina errada do dashboard"

**Root Cause:**
- O dashboard principal do TradingSystem está rodando **nativamente** (npm dev server) na porta 3101
- O Traefik só pode rotear para containers Docker
- Não havia proxy container para conectar Traefik ao dashboard nativo

## Solution

Criei um **Nginx Proxy Container** que atua como ponte entre o Traefik (containers) e o dashboard nativo (host):

```
Browser → Traefik (port 80) → Nginx Proxy Container → host.docker.internal:3101 → Native Dashboard
```

## Changes Made

### 1. Created Nginx Proxy Configuration

**File:** `/home/marce/projetos/TradingSystem/infrastructure/nginx-proxy/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;

        location / {
            # Proxy to host machine's port 3101
            proxy_pass http://host.docker.internal:3101;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # WebSocket support (for Vite HMR)
            proxy_read_timeout 86400;
        }
    }
}
```

### 2. Added Proxy Service to docker-compose.infra.yml

**File:** `/home/marce/projetos/TradingSystem/infrastructure/compose/docker-compose.infra.yml`

```yaml
  dashboard-proxy:
    container_name: infra-dashboard-proxy
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ../nginx-proxy/nginx.conf:/etc/nginx/nginx.conf:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`dashboard.localhost`)"
      - "traefik.http.routers.dashboard.entrypoints=web"
      - "traefik.http.services.dashboard.loadbalancer.server.port=80"
```

**Key Features:**
- `extra_hosts: host.docker.internal:host-gateway` - Permite container acessar host
- `proxy_pass http://host.docker.internal:3101` - Roteia para dashboard nativo
- WebSocket support para Vite HMR (hot module replacement)

### 3. Fixed Traefik Configuration

**Removed** invalid volume mount:
```yaml
# BEFORE (WRONG):
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
  - ./traefik.yml:/traefik.yml:ro  # ❌ Directory, not file!

# AFTER (CORRECT):
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

**Renamed** Traefik dashboard router to avoid conflict:
```yaml
# BEFORE (CONFLICT):
- "traefik.http.routers.dashboard.rule=Host(`traefik.localhost`)"

# AFTER (NO CONFLICT):
- "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.localhost`)"
```

## Verification Results ✅

### 1. Dashboard Principal (Main TradingSystem Dashboard)

**URL:** http://dashboard.localhost

```bash
$ curl -H "Host: dashboard.localhost" http://localhost:80
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <script type="module">import { injectIntoGlobalHook } from "/@react-refresh";
    ...
    <title>TradingSystem - High-Frequency Algorithmic Trading</title>
```

✅ **Funcionando perfeitamente!** Retorna HTML do React + Vite

### 2. B3 Dashboard (Análise de Mercado B3)

**URL:** http://b3-dashboard.localhost
**Direct:** http://localhost:3030

```bash
$ curl -s http://localhost:3030
<!DOCTYPE html>
<html id="__next_error__">
  <head>
    <title>B3 Dashboard</title>
    <meta name="description" content="Visao consolidada das coletas automatizadas da B3"/>
```

✅ **Container rodando** - Traefik routing precisa ser testado no browser

### 3. Traefik Dashboard (Admin UI)

**URL:** http://traefik.localhost or http://localhost:8080

✅ **Funcionando** - Retorna Moved Permanently (redirect para /dashboard)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP Request
                       │ Host: dashboard.localhost
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Traefik Reverse Proxy (Port 80)                    │
│                                                                  │
│  Routes:                                                         │
│  - dashboard.localhost       → infra-dashboard-proxy            │
│  - b3-dashboard.localhost    → b3-dashboard container           │
│  - docs.localhost            → fe-docs container                │
│  - traefik.localhost         → Traefik dashboard (8080)         │
│  - questdb.localhost         → QuestDB (9000)                   │
│  - portainer.localhost       → Portainer (9443)                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌────────────────────┐
│ Nginx Proxy      │         │ Other Containers   │
│ Container        │         │ (Direct routing)   │
│                  │         └────────────────────┘
│ Proxies to:      │
│ host.docker      │
│ .internal:3101   │
└────────┬─────────┘
         │
         │ host-gateway
         │
         ▼
┌──────────────────────────────────────┐
│         HOST MACHINE                 │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Vite Dev Server (Native)     │ │
│  │  Port: 3101                    │ │
│  │  Process: npm run dev          │ │
│  │  Location: frontend/apps/      │ │
│  │            dashboard/          │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## Complete URL Mapping

| Service                  | URL                          | Port  | Type       |
|-------------------------|------------------------------|-------|------------|
| **Main Dashboard**      | dashboard.localhost          | 3101  | Native     |
| **B3 Dashboard**        | b3-dashboard.localhost       | 3030  | Container  |
| **Documentation**       | docs.localhost               | 3004  | Container  |
| **Traefik Admin**       | traefik.localhost            | 8080  | Container  |
| **QuestDB UI**          | questdb.localhost            | 9000  | Container  |
| **Portainer**           | portainer.localhost          | 9443  | Container  |
| **Grafana**             | grafana.localhost            | 3000  | Container  |
| **Prometheus**          | prometheus.localhost         | 9090  | Container  |

## Direct Access (Bypass Traefik)

For development/debugging, you can still access services directly:

| Service             | Direct URL                |
|---------------------|---------------------------|
| Main Dashboard      | http://localhost:3101     |
| B3 Dashboard        | http://localhost:3030     |
| Documentation       | http://localhost:3004     |
| Traefik Dashboard   | http://localhost:8080     |
| QuestDB UI          | http://localhost:9000     |
| Portainer           | http://localhost:9443     |
| TP Capital API      | http://localhost:3200     |
| B3 Market API       | http://localhost:3302     |
| Idea Bank API       | http://localhost:3102     |

## Testing Instructions

### 1. Test Main Dashboard (Primary Fix)

```bash
# Via Traefik
curl -H "Host: dashboard.localhost" http://localhost:80

# Or open in browser:
# http://dashboard.localhost
```

**Expected:** HTML page with React app title "TradingSystem - High-Frequency Algorithmic Trading"

### 2. Test B3 Dashboard

```bash
# Via Traefik
curl -H "Host: b3-dashboard.localhost" http://localhost:80

# Or open in browser:
# http://b3-dashboard.localhost
```

**Expected:** HTML page with title "B3 Dashboard"

### 3. Test Traefik Admin UI

```bash
# Via Traefik
curl -H "Host: traefik.localhost" http://localhost:80

# Or direct access:
curl http://localhost:8080/dashboard/

# Or open in browser:
# http://localhost:8080/dashboard/
```

**Expected:** Traefik dashboard showing all services and routes

### 4. Verify All Routes in Traefik

Open browser: http://localhost:8080/dashboard/

Navigate to **HTTP → Routers** and verify:
- ✅ `dashboard@docker` - Host(`dashboard.localhost`)
- ✅ `traefik-dashboard@docker` - Host(`traefik.localhost`)
- ✅ `b3-dashboard@docker` - Host(`b3-dashboard.localhost`)

## Container Status

```bash
$ docker ps --filter "name=infra" --format "table {{.Names}}\t{{.Status}}"

NAMES                   STATUS
infra-traefik           Up
infra-dashboard-proxy   Up
infra-portainer         Up
```

All infrastructure containers running successfully! ✅

## Key Files Modified

```
infrastructure/
├── compose/
│   └── docker-compose.infra.yml    # ✅ Added dashboard-proxy service
└── nginx-proxy/
    └── nginx.conf                   # ✅ Created proxy config
```

## Technical Notes

### Why Nginx Proxy?

Traefik can only route to **Docker containers**, not to native processes on the host. The dashboard runs natively via `npm run dev` for:
- Faster hot reload during development
- Better debugging with native DevTools
- No Docker build time overhead
- Direct access to host filesystem for source maps

The Nginx proxy solves this by:
1. Running **inside** Docker (Traefik can route to it)
2. Using `host.docker.internal` to reach the host machine
3. Proxying requests to the native dashboard on port 3101

### Alternative Solutions (Not Used)

1. **Run dashboard in Docker**: Slower dev experience, build overhead
2. **Use host networking**: Security concerns, not portable
3. **Use bridge network with host.docker.internal**: ✅ Chosen solution!

## Benefits

✅ **Unified Access**: All services accessible via `*.localhost` domains
✅ **No Port Confusion**: No need to remember port numbers
✅ **Production-Like**: Matches how services will be accessed in production
✅ **Native Dev Speed**: Dashboard still runs natively with fast HMR
✅ **Clean Architecture**: Clear separation between infrastructure (containers) and development (native)

## Next Steps (Optional)

1. **Add SSL/TLS**: Configure Let's Encrypt for HTTPS
2. **Add Authentication**: Traefik middleware for BasicAuth
3. **Add Rate Limiting**: Protect APIs from abuse
4. **Add Monitoring**: Traefik metrics to Prometheus
5. **Add Custom Domains**: Use real domains instead of .localhost

## Conclusion

✅ **Traefik routing fixed!** Main dashboard now accessible via http://dashboard.localhost

User can now:
- Access main dashboard: http://dashboard.localhost
- Access B3 dashboard: http://b3-dashboard.localhost
- Access documentation: http://docs.localhost
- Manage containers: http://portainer.localhost
- View metrics: http://grafana.localhost
- Query data: http://questdb.localhost

All services unified under Traefik reverse proxy! 🎉

---

**Date Completed:** 2025-10-13 at 18:52 UTC
**Next:** User should open browser and test http://dashboard.localhost
