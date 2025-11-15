---
title: "ADR-003: API Gateway Implementation"
slug: /reference/adrs/ADR-003-api-gateway-implementation
sidebar_position: 3
tags: [adr, architecture, api-gateway, traefik]
domain: architecture
type: adr
summary: "Implement Traefik as unified API Gateway for all backend services"
status: accepted
date: "2025-10-15"
last_review: "2025-11-13"
---

# ADR-003: API Gateway Implementation

## Status

**Accepted** - 2025-10-15

## Context

The TradingSystem has multiple backend services (Workspace API, TP Capital, Documentation API, Telegram Gateway) that need to be accessible from the frontend dashboard and external clients.

### Current Challenges

1. **Port Proliferation**: Each service exposes its own port (3200, 4005, 3400, 3201)
2. **CORS Complexity**: Each service manages its own CORS configuration
3. **No Centralized Security**: Authentication and rate limiting duplicated across services
4. **Service Discovery**: Clients must know all service endpoints
5. **No Request Routing**: Cannot version APIs or implement canary deployments

### Requirements

- Single entry point for all HTTP traffic
- Automatic service discovery
- Centralized authentication and rate limiting
- SSL/TLS termination
- Health checking and circuit breaking
- Minimal performance overhead (&lt;10ms)

## Decision

We will implement **Traefik v2.10+** as our API Gateway.

### Why Traefik?

**Advantages**:
- ✅ Native Docker integration (service discovery via labels)
- ✅ Dynamic configuration without restarts
- ✅ Built-in Let's Encrypt support
- ✅ Excellent performance (reverse proxy overhead &lt;5ms)
- ✅ Dashboard for monitoring
- ✅ Middleware system (auth, rate limiting, compression)

**Rejected Alternatives**:
- ❌ **Kong**: Too heavyweight, requires database
- ❌ **NGINX**: Static configuration, manual service discovery
- ❌ **Envoy**: Complex configuration, overkill for our scale

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Clients                        │
│         (Browser, Mobile, External APIs)         │
└────────────────────┬────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────┐
│            Traefik API Gateway                   │
│                (Port 9082)                       │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Middleware Chain                 │  │
│  │  - CORS                                  │  │
│  │  - Rate Limiting (100 req/min)           │  │
│  │  - Compression (gzip/brotli)             │  │
│  │  - Security Headers                      │  │
│  │  - Circuit Breaker (20% error threshold)│  │
│  └──────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┬─────────────┐
         │           │           │             │
         ▼           ▼           ▼             ▼
    ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
    │Workspace│  │TP Cap │  │ Docs   │  │Telegram  │
    │  :3200  │  │ :4005  │  │ :3400  │  │  :3201   │
    └────────┘  └────────┘  └────────┘  └──────────┘
```

### Routing Rules

| Path Pattern              | Target Service      | Priority |
|---------------------------|---------------------|----------|
| `/`                       | Dashboard (UI)      | 1        |
| `/docs/*`                 | Documentation Hub   | 90       |
| `/api/workspace/*`        | Workspace API       | 85       |
| `/api/tp-capital/*`       | TP Capital API      | 85       |
| `/api/telegram-gateway/*` | Telegram Gateway    | 85       |
| `/api/docs/*`             | Documentation API   | 85       |

### Configuration

**Static Config** (`tools/traefik/traefik.yml`):
- Entry points (HTTP:9082, Dashboard:9083)
- Provider configurations (Docker, File)
- Logging and metrics

**Dynamic Config** (`tools/traefik/dynamic/middlewares.yml`):
- Middleware definitions
- Headers, CORS, rate limiting

**Service Discovery** (Docker labels):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.workspace.rule=PathPrefix(`/api/workspace`)"
  - "traefik.http.routers.workspace.priority=85"
  - "traefik.http.services.workspace.loadbalancer.server.port=3200"
```

## Consequences

### Positive

✅ **Single Entry Point**: All traffic via `localhost:9082`  
✅ **Automatic Service Discovery**: No manual endpoint configuration  
✅ **Centralized Security**: CORS, rate limiting, auth in one place  
✅ **Performance**: &lt;5ms overhead per request  
✅ **Observability**: Metrics exported to Prometheus  
✅ **Easy Scaling**: Add services with just Docker labels  
✅ **Circuit Breaking**: Prevents cascading failures

### Negative

⚠️ **Single Point of Failure**: Gateway failure affects all services  
⚠️ **Learning Curve**: Team needs to learn Traefik configuration  
⚠️ **Debugging Complexity**: Additional layer to troubleshoot

### Mitigation

- **HA Setup**: Run multiple Traefik instances (future)
- **Documentation**: Comprehensive guides in `/docs/tools/gateway/`
- **Health Checks**: Monitor gateway uptime (target: 99.9%)
- **Fallback**: Services still accessible via direct ports in development

## Implementation

### Phase 1: Core Gateway (Week 1)
- [x] Setup Traefik container
- [x] Configure entry points
- [x] Implement service discovery

### Phase 2: Middleware (Week 2)
- [x] Add CORS middleware
- [x] Implement rate limiting
- [x] Add security headers
- [x] Setup compression

### Phase 3: Monitoring (Week 3)
- [x] Prometheus metrics integration
- [x] Grafana dashboards
- [x] Alerting rules

### Phase 4: Documentation (Week 4)
- [x] Migration guide
- [x] Troubleshooting runbook
- [x] Performance benchmarks

## Validation

```bash
# Test routing
curl http://localhost:9082/api/workspace/items

# Check metrics
curl http://localhost:9082/metrics

# View dashboard
open http://localhost:9083/dashboard/
```

## Related Decisions

- [ADR-0001: Architecture Decision Records](ADR-0001-architecture-decision-records.md)
- [ADR-007: TP Capital API Gateway Integration](007-tp-capital-api-gateway-integration.mdx)
- [ADR-008: HTTP Client Standardization](ADR-008-http-client-standardization.md)

## References

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [API Gateway Pattern - Microsoft](https://docs.microsoft.com/en-us/azure/architecture/microservices/design/gateway)
- [Governance Policy: API Gateway Policy](../../governance/policies/api-gateway-policy.md)

---

**Date Created**: 2025-10-15  
**Last Updated**: 2025-11-13  
**Status**: Accepted
