---
title: "Appendices"
sidebar_position: 7
description: "Reference diagrams, performance baselines, and security checklist supporting the architecture review."
---

## Appendix A · Architecture Diagrams

### A.1 Current System Architecture (C4 Context)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(trader, "Trader", "Monitors positions and executes orders")
System(tradingsystem, "TradingSystem", "Automated trading platform with ML-based signals")
System_Ext(nelogica, "Nelogica Profit", "Market data and order routing (ProfitDLL)")
System_Ext(broker, "Broker/Exchange", "Order execution and position management")

Rel(trader, tradingsystem, "Uses", "HTTPS/WebSocket")
Rel(tradingsystem, nelogica, "Subscribes to market data", "ProfitDLL Callbacks")
Rel(tradingsystem, broker, "Sends orders", "ProfitDLL API")
Rel(broker, tradingsystem, "Order fills", "Callbacks")

@enduml
```

### A.2 Microservices Architecture (C4 Container)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(trader, "Trader")

System_Boundary(frontend, "Frontend") {
  Container(dashboard, "Dashboard", "React + Vite", "Trading UI with real-time updates")
  Container(docshub, "Docs Hub", "Docusaurus", "Documentation portal")
}

System_Boundary(backend, "Backend Services") {
  Container(workspace, "Workspace API", "Node.js", "Ideas and documentation management")
  Container(tpcapital, "TP Capital", "Node.js", "Telegram signal ingestion")
  Container(docsapi, "Documentation API", "Node.js", "RAG proxy + search")
  Container(servicelauncher, "Service Launcher", "Node.js", "Health orchestration")
}

System_Boundary(rag, "RAG Stack") {
  Container(ollama, "Ollama", "LLM Server", "GPU-accelerated inference")
  Container(llamaindex, "LlamaIndex", "Python", "Ingestion + query services")
  Container(qdrant, "Qdrant", "Vector DB", "Semantic search")
}

System_Boundary(data, "Data Layer") {
  ContainerDb(timescale, "TimescaleDB", "PostgreSQL", "Time-series data")
  ContainerDb(redis, "Redis", "Cache", "RAG caching")
}

Rel(trader, dashboard, "Uses", "HTTPS")
Rel(dashboard, workspace, "API calls", "REST")
Rel(dashboard, docsapi, "RAG queries", "REST")
Rel(docsapi, llamaindex, "Proxy requests", "HTTP + JWT")
Rel(llamaindex, qdrant, "Vector search", "gRPC")
Rel(llamaindex, ollama, "LLM inference", "HTTP")
Rel(workspace, timescale, "Reads/Writes", "SQL")
Rel(docsapi, redis, "Cache queries", "Redis Protocol")

@enduml
```

## Appendix B · Performance Benchmarks

### B.1 API Response Times (Baseline)

| Endpoint | Method | Avg (ms) | P95 (ms) | P99 (ms) | Status |
|----------|--------|----------|----------|----------|--------|
| /api/items | GET | 45 | 120 | 250 | ✅ |
| /api/items | POST | 80 | 180 | 350 | ⚠️ |
| /api/v1/rag/query | POST | 3200 | 5000 | 8000 | ⚠️ |
| /api/v1/rag/search | GET | 150 | 300 | 500 | ✅ |
| /health | GET | 15 | 30 | 50 | ✅ |

### B.2 Database Query Performance

| Query Type | Avg (ms) | Optimization |
|------------|----------|--------------|
| SELECT * FROM items | 35 | Add index on category |
| INSERT INTO items | 50 | Batch inserts |
| SELECT with JOIN | 120 | Materialized view |

## Appendix C · Security Checklist

- [ ] **Authentication:** JWT with refresh tokens
- [ ] **Authorization:** Role-based access control (RBAC)
- [ ] **Input Validation:** Joi/Zod schemas for all endpoints
- [ ] **Output Encoding:** DOMPurify for markdown rendering
- [ ] **Rate Limiting:** Distributed (Redis-backed)
- [ ] **CORS:** Strict origin whitelist
- [ ] **CSP:** Custom directives for inline scripts
- [ ] **HTTPS:** Force TLS 1.2+ in production
- [ ] **Secrets Management:** Migrate to Vault/AWS Secrets Manager
- [ ] **Security Headers:** HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] **Dependency Scanning:** Snyk/Dependabot for CVE detection
- [ ] **Penetration Testing:** Annual third-party audit
- [ ] **Audit Logging:** SIEM integration (Splunk/ELK)
- [ ] **Data Encryption:** At-rest (DB), in-transit (TLS), field-level (PII)
