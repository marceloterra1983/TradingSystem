---
title: "Data & Integration Flows"
sidebar_position: 3
description: "Real-time trading, state management, and RAG data flows with associated risks and bottlenecks."
---

## Real-Time Trading Data Flow (Planned)

```
ProfitDLL Callback (C#)
   ↓ (Validate & Serialize)
DataCapture Service
   ↓ (WebSocket Publish - Port 9001)
Internal Consumers (Gateway, OrderManager, Dashboard)
   ↓ (HTTP REST)
Gateway API
   ↓ (Risk Checks)
OrderManager Service
   ↓ (Execute via ProfitDLL)
Broker/Exchange
   ↓ (Order Callback)
Position Updates
   ↓ (WebSocket)
Dashboard Real-Time Update
```

**Assessment**
- ✅ Event-driven architecture supports low latency.
- ✅ Buffer management (10,000 messages FIFO) is in place.
- ⚠️ No backpressure handling—WebSocket overflow is possible.
- ⚠️ No message replay for missed events.
- ⚠️ No dead-letter queue for failed processing.

## State Management Flow (Current)

```
User Action (Dashboard)
   ↓
Zustand Action Creator
   ↓
State Update (Immutable)
   ↓
React Re-Render (Selective)
   ↓
API Call (TanStack Query)
   ↓
Backend Service (Express)
   ↓
Database (TimescaleDB)
   ↓
Response
   ↓
Update Zustand Store
   ↓
UI Reflects Change
```

**Assessment**
- ✅ Unidirectional flow keeps state transitions predictable.
- ✅ Optimized re-renders thanks to selectors.
- ⚠️ No optimistic updates—users wait for server confirmation.
- ⚠️ No offline support—state resets on reload.
- ⚠️ No conflict resolution for concurrent updates.

## RAG System Data Flow

```
User Query (Dashboard)
   ↓
Documentation API (JWT minted)
   ↓
RAG Proxy (/api/v1/rag/query)
   ↓
LlamaIndex Query Service (8202)
   ↓
Qdrant Vector Search (6333)
   ↓
Ollama LLM (11434 - GPU)
   ↓
Response Generation
   ↓
Dashboard Display
```

**Assessment**
- ✅ Server-side JWT minting enforces secure RAG access.
- ✅ Redis caching (30s status TTL) backs frequent queries.
- ✅ Automated ingestion pipeline maintains up-to-date knowledge.
- ⚠️ Single-point-of-failure risk with the current RAG deployment.
- ⚠️ Missing semantic cache or re-ranking for query optimization.
