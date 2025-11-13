---
title: "STD-020: HTTP Client Standard"
sidebar_position: 20
tags: [governance, standards, http, frontend]
domain: governance
type: standard
summary: "Standard for HTTP client implementation in frontend applications"
status: active
last_review: "2025-11-13"
---

# STD-020: HTTP Client Standard

## Overview

This standard defines requirements for HTTP client implementation across all frontend applications to ensure reliability, security, and maintainability.

## Requirements

### REQ-HTTP-001: Use Standardized HTTP Client

All frontend applications MUST use the standardized HTTP client library.

**Implementation**: `frontend/dashboard/src/lib/http-client.ts`

### REQ-HTTP-002: Implement Circuit Breaker

All HTTP clients MUST implement circuit breaker pattern for fault tolerance.

**Implementation**: `frontend/dashboard/src/lib/circuit-breaker.ts`

### REQ-HTTP-003: Timeout Configuration

All requests MUST have explicit timeout configuration:
- Default: 30 seconds
- Long-running operations: Up to 120 seconds

### REQ-HTTP-004: Retry Logic

Failed requests MUST implement exponential backoff retry logic:
- Initial delay: 1 second
- Max retries: 3
- Exponential factor: 2

### REQ-HTTP-005: Error Handling

All errors MUST be categorized and handled appropriately:
- Network errors
- Timeout errors
- Server errors (5xx)
- Client errors (4xx)

### REQ-HTTP-006: Request Queue Management

HTTP clients MUST implement request queue to prevent connection pool exhaustion.

### REQ-HTTP-007: Security Headers

All requests MUST include appropriate security headers:
- `Content-Type: application/json`
- `Accept: application/json`
- CSRF token when applicable

### REQ-HTTP-008: Logging

All requests MUST be logged with:
- Request URL
- Method
- Status code
- Duration
- Error details (if failed)

### REQ-HTTP-009: Metrics

HTTP clients MUST expose Prometheus-compatible metrics:
- Request count by endpoint
- Request duration histogram
- Error rate by type

### REQ-HTTP-010: Testing

All HTTP client implementations MUST have:
- Unit tests (>80% coverage)
- Integration tests with mock servers
- Circuit breaker behavior tests

## Manual Checklist

Before deploying HTTP client changes:

- [ ] All 10 requirements implemented
- [ ] Circuit breaker configured and tested
- [ ] Timeout values reviewed and appropriate
- [ ] Retry logic tested with mock failures
- [ ] Error handling covers all edge cases
- [ ] Request queue limits configured
- [ ] Security headers present
- [ ] Logging configured and verified
- [ ] Metrics exposed and tested
- [ ] Test coverage >80%

## Compliance Timeline

All frontend applications MUST comply with this standard by:

- **Phase 1** (Week 1-2): Implement core HTTP client
- **Phase 2** (Week 3-4): Add circuit breaker and retry logic
- **Phase 3** (Week 5-6): Complete testing and metrics
- **Phase 4** (Week 7-8): Full compliance audit

## Validation

Use the validation script to check compliance:

```bash
bash scripts/governance/validate-http-client-standard.sh
```

## See Also

- [ADR-008: HTTP Client Standardization](/docs/reference/adrs/ADR-008-http-client-standardization)
- [HTTP Client Implementation Guide](/docs/frontend/engineering/http-client-implementation-guide)
- [Proxy Best Practices](/docs/frontend/engineering/PROXY-BEST-PRACTICES)

---

**Last Updated**: 2025-11-13  
**Status**: Active
