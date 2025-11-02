---
title: "Scalability & Security Architecture"
sidebar_position: 4
description: "Performance bottlenecks, scalability posture, and security boundary analysis for TradingSystem."
---

## Scalability & Performance Architecture

### Current Bottlenecks

1. **Shared TimescaleDB (Port 5432)**
   - All services share a single instance.
   - **Risk:** Connection pool exhaustion and cascading failures.

2. **WebSocket Data Pipeline (Port 9001)**
   - 10,000 message FIFO buffer without backpressure.
   - **Risk:** Message loss during market spikes.

3. **RAG Query Latency (8202)**
   - Ollama inference takes 2–5 seconds per query.
   - **Risk:** Degraded user experience.

4. **Frontend Bundle Size**
   - No code splitting; estimated main bundle exceeds 800 KB.
   - **Risk:** Slow initial load times.

### Performance Metrics (Estimated)

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| API Response Time | 100–200 ms | < 100 ms | ⚠️ |
| WebSocket Latency | < 50 ms | < 20 ms | ⚠️ |
| RAG Query Time | 3–5 s | < 1 s | ⚠️ |
| Dashboard Load Time | 3–4 s | < 2 s | ⚠️ |
| DB Query Time | 50–100 ms | < 50 ms | ⚠️ |

### Scalability Assessment

#### Horizontal Scalability

| Service | Scalable? | Constraints | Recommendation |
|---------|-----------|-------------|----------------|
| dashboard | ✅ | Static build | Deploy via CDN |
| workspace-api | ⚠️ | Shared DB | Add read replicas |
| tp-capital | ⚠️ | Shared DB | Implement CQRS |
| documentation-api | ✅ | None | Add load balancing |
| llamaindex-query | ❌ | GPU dependency | Queue-based workers |
| ollama | ❌ | GPU memory | Multi-GPU or model sharding |

#### Vertical Scalability
- ✅ Docker resource limits configured.
- ⚠️ No auto-scaling policies bound to system metrics.
- ⚠️ Resource monitoring lacks alerting thresholds.

### Caching Strategy

1. **Redis (RAG System)**
   - TTL 30 s (status) / 600 s (collections); `allkeys-lru`.
   - **Assessment:** ✅ Well configured.

2. **API Response Caching**
   - Missing across most endpoints.
   - **Recommendation:** Introduce HTTP caching headers (ETag, Cache-Control).

3. **Frontend Caching**
   - No service worker or offline support.
   - **Recommendation:** Add Workbox for PWA-level caching.

## Security Architecture Review

### Trust Boundaries

```
┌─────────────────────────────────────────────┐
│ Internet (Untrusted)                        │
└──────────────┬──────────────────────────────┘
               │
         ┌─────▼─────┐
         │  Firewall │ (Future: Nginx/Traefik reverse proxy)
         └─────┬─────┘
               │
    ┌──────────▼──────────────┐
    │ Trust Boundary 1        │
    │ - Rate Limiting         │
    │ - CORS Validation       │
    │ - Helmet Security       │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Application Services    │
    │ - Dashboard (3103)      │
    │ - Documentation (3400)  │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Trust Boundary 2        │
    │ - JWT Authentication    │
    │ - Inter-Service Auth    │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Backend Services        │
    │ - workspace-api (3200)  │
    │ - tp-capital (4005)     │
    │ - documentation-api (3401) │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Trust Boundary 3        │
    │ - DB Connection Pool    │
    │ - Credential Encryption │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ Data Layer              │
    │ - TimescaleDB (5432)    │
    │ - Qdrant (6333)         │
    │ - Redis (6380)          │
    └─────────────────────────┘
```

### Authentication & Authorization

1. **JWT Authentication** (`backend/shared/auth/`)
   - ✅ Server-side JWT minting (RAG proxy).
   - ✅ HS256 algorithm usage.
   - ⚠️ Secrets stored in `.env`; production should leverage a secret manager.
   - ⚠️ Token rotation is absent; no refresh tokens.

2. **CORS Configuration**
   - ✅ Configurable origin via `CORS_ORIGIN`.
   - ✅ Centralized in `backend/shared/middleware/`.
   - ⚠️ Dev mode wildcard introduces security risk.

3. **Rate Limiting**
   - ✅ Express Rate Limit middleware with configurable settings.
   - ⚠️ In-memory store resets on restart.
   - ⚠️ Absence of distributed (Redis-backed) rate limiting.

4. **Helmet Security Headers**
   - ✅ CSP, HSTS, X-Frame-Options, X-Content-Type-Options enabled.
   - ⚠️ Custom CSP directives not tailored to TradingSystem needs.

### Security Gaps

- ❌ No API gateway for centralized auth and routing.
- ❌ Lateral movement unchecked due to missing inter-service authentication.
- ❌ Input validation gaps expose SQL injection risk.
- ❌ Output encoding missing for markdown rendering (XSS exposure).
- ❌ No security audit logging or SIEM integration.
- ⚠️ Secrets management relies solely on environment variables.
- ⚠️ Data-at-rest encryption still pending for TimescaleDB and Qdrant.
- ⚠️ Lack of data masking in logs.

### Risk Management Architecture (Planned)

- ✅ Global trading kill switch (`/api/v1/risk/kill-switch`).
- ✅ Daily loss limits and max position controls configured via `.env`.
- ✅ Trading hours enforced (09:00–18:00).
- ✅ Audit logging captures timestamp and operator justification.
- ⚠️ Automated circuit breakers (ML anomaly detection) not implemented.
- ⚠️ Pre-trade compliance checks absent for regulatory coverage.
