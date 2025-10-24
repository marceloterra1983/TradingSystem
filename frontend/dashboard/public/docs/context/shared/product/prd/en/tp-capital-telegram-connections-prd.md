---
title: "PRD: Telegram Connections Management"
sidebar_position: 50
tags: [telegram, connections, bots, channels, data-ingestion, prd]
domain: shared
type: prd
summary: Product requirements for managing Telegram bot and channel configurations with connection monitoring
status: active
last_review: 2025-10-17
language: en
translated_from: ../pt/tp-capital-telegram-connections-prd.md
---

# PRD: Telegram Connections Management

## Executive Summary

The Telegram Connections Management feature enables users to configure and monitor Telegram bots and channels used for data ingestion from TP Capital signals. This feature provides a centralized interface to manage authentication credentials, monitor connection health, and track configuration status for the Telegram data pipeline.

## Problem Statement

Trading signal providers like TP Capital distribute their analysis and recommendations through Telegram channels. To capture and process these signals for algorithmic trading, the system needs:

1. **Secure credential management** for Telegram bot authentication
2. **Channel configuration** to specify source (signal providers) and destination channels
3. **Connection monitoring** to ensure data pipeline reliability
4. **Type classification** (Forwarder vs. Sender bots) for different data ingestion patterns

Without a centralized management interface, configuration becomes error-prone, credential management insecure, and troubleshooting connection issues difficult.

## Goals & Success Metrics

### Goals

-   ✅ Provide intuitive UI for managing Telegram bot credentials
-   ✅ Enable channel configuration with type classification (source/destination)
-   ✅ Display real-time connection status and health metrics
-   ✅ Persist configuration locally (localStorage) for user convenience
-   ✅ Support multiple bots and channels for scalability

### Success Metrics

| Metric               | Target                   | Measurement           |
| -------------------- | ------------------------ | --------------------- |
| Configuration Time   | < 2 min per bot/channel  | User timing studies   |
| Connection Uptime    | > 99.5%                  | Latency/status checks |
| Configuration Errors | < 1% validation failures | Error rate tracking   |
| User Satisfaction    | > 4.5/5 rating           | User surveys          |

### Non-Goals

-   ❌ Real-time message content display (handled by data ingestion service)
-   ❌ Message parsing/analysis (belongs in analytics pipeline)
-   ❌ Automated bot deployment (DevOps responsibility)
-   ❌ Telegram API integration (delegated to backend service)

## User Personas

### Primary: Trading System Operator

**Description**: Technical user responsible for configuring and monitoring the trading system.
**Needs**:

-   Quick bot credential setup
-   Visual connection status monitoring
-   Easy troubleshooting when connections fail
-   Audit trail of configuration changes

### Secondary: System Administrator

**Description**: IT/DevOps personnel managing system infrastructure.
**Needs**:

-   Secure credential storage
-   Configuration backup/restore
-   Multi-environment support (dev/staging/prod)

## User Stories

### Epic 1: Bot Management

**US-001**: As an operator, I want to add a new Telegram bot with username and token, so that I can authenticate with Telegram API.

**Acceptance Criteria**:

-   ✅ Form validates username format (@BotName)
-   ✅ Token input supports show/hide toggle
-   ✅ Bot type can be selected (Forwarder/Sender)
-   ✅ Optional description field for notes
-   ✅ Configuration persists to localStorage
-   ✅ Masked token display in table (e.g., `1234****5678`)

**US-002**: As an operator, I want to edit existing bot credentials, so that I can update tokens when they expire.

**Acceptance Criteria**:

-   ✅ Edit button opens pre-filled form
-   ✅ All fields editable except localId
-   ✅ Changes saved immediately to localStorage

**US-003**: As an operator, I want to delete a bot, so that I can remove unused configurations.

**Acceptance Criteria**:

-   ✅ Delete button removes bot from list
-   ✅ Associated status data cleaned up
-   ✅ No confirmation dialog (instant delete for simplicity)

**US-004**: As an operator, I want to verify bot connection status, so that I can confirm it's working.

**Acceptance Criteria**:

-   ✅ "Verificar" button triggers status check
-   ✅ Status badge updates (Connected/Degraded/Disconnected)
-   ✅ Latency displayed in milliseconds
-   ✅ Last checked timestamp shown

### Epic 2: Channel Management

**US-005**: As an operator, I want to register Telegram channels with their numeric IDs, so that the forwarder knows which channels to monitor.

**Acceptance Criteria**:

-   ✅ Label field for human-readable name
-   ✅ Channel ID field validates numeric input
-   ✅ Type selector (Source/Destination)
-   ✅ Optional description for filtering rules
-   ✅ Configuration persists to localStorage

**US-006**: As an operator, I want to distinguish between source and destination channels, so that I can configure the message flow correctly.

**Acceptance Criteria**:

-   ✅ Type dropdown with "Origem" and "Destino" options
-   ✅ Type displayed in table
-   ✅ Type used by backend for routing logic

**US-007**: As an operator, I want to view channel descriptions, so that I can understand filtering rules without editing.

**Acceptance Criteria**:

-   ✅ Eye icon button in description column
-   ✅ Modal displays full description text
-   ✅ Close button to dismiss modal

### Epic 3: Connection Monitoring

**US-008**: As an operator, I want to see real-time connection status for bots and channels, so that I can identify issues quickly.

**Acceptance Criteria**:

-   ✅ Status badge with color coding:
    -   🟢 Green: Connected
    -   🟡 Amber: Degraded
    -   🔴 Red: Disconnected
-   ✅ Latency displayed in milliseconds
-   ✅ Last verification timestamp
-   ✅ Auto-refresh status (future enhancement)

**US-009**: As an operator, I want to manually verify connection health, so that I can troubleshoot issues.

**Acceptance Criteria**:

-   ✅ "Verificar" button per bot/channel
-   ✅ Status updates immediately after check
-   ✅ Visual feedback during check (loading state)

## Technical Architecture

### Frontend Components

```typescript
// Component Hierarchy
ConnectionsPage
├── WebSocketStatusSection (System status)
├── ProfitDLLStatusSection (Trading integration status)
├── ServiceHealthSection (Backend services)
└── TelegramManagementSection
    ├── TelegramBotTableCard
    │   ├── Bot table with CRUD
    │   ├── Bot form dialog
    │   └── Description preview modal
    └── TelegramChannelTableCard
        ├── Channel table with CRUD
        ├── Channel form dialog
        └── Description preview modal
```

### Data Models

```typescript
// Bot Record
type BotRecord = {
    localId: string; // UUID for local identification
    username: string; // @BotUsername
    token: string; // Bot API token
    description?: string; // Optional notes
    type: "Forwarder" | "Sender"; // Bot purpose
};

// Channel Record
type ChannelRecord = {
    localId: string; // UUID for local identification
    label: string; // Human-readable name
    channelId: number; // Telegram numeric ID
    type: "source" | "destination"; // Channel role
    description?: string; // Filtering rules, notes
};

// Connection Status
type ItemStatus = {
    status: "connected" | "degraded" | "disconnected";
    checkedAt: Date | null;
    latencyMs?: number;
};
```

### Storage Strategy

**localStorage Keys**:

-   `telegram.bots` - Serialized array of BotRecord
-   `telegram.channels` - Serialized array of ChannelRecord

**Rationale**: localStorage chosen for simplicity in MVP. Future enhancement: migrate to backend API with encryption.

### Security Considerations

**Current Implementation**:

-   ⚠️ Tokens stored in plain text in localStorage (browser-level security)
-   🔒 Tokens masked in UI (`maskToken()` function)
-   🔒 Password-type input for token entry

**Future Enhancements**:

-   ✅ Migrate credentials to backend with encryption at rest
-   ✅ Use secure token storage (environment variables, secrets manager)
-   ✅ Implement RBAC for credential access
-   ✅ Audit log for credential changes

## UI/UX Specifications

### Bot Table Layout

| Column             | Width | Description                             |
| ------------------ | ----- | --------------------------------------- |
| Username           | 15%   | @BotName                                |
| Type               | 10%   | Forwarder/Sender                        |
| Token              | 15%   | Masked (1234\*\*\*\*5678)               |
| Descrição          | 10%   | Eye icon if present                     |
| Status             | 12%   | Badge (Connected/Degraded/Disconnected) |
| Latência           | 10%   | Milliseconds                            |
| Última verificação | 15%   | Formatted datetime                      |
| Ações              | 13%   | Edit/Delete/Verify buttons              |

### Channel Table Layout

| Column             | Width | Description                 |
| ------------------ | ----- | --------------------------- |
| Rótulo             | 15%   | Human-readable name         |
| Channel ID         | 15%   | Numeric ID (-1001234567890) |
| Tipo               | 10%   | Origem/Destino              |
| Descrição          | 10%   | Eye icon if present         |
| Status             | 12%   | Badge                       |
| Latência           | 10%   | Milliseconds                |
| Última verificação | 15%   | Formatted datetime          |
| Ações              | 13%   | Edit/Delete/Verify buttons  |

### Form Validation Rules

| Field         | Rules                       | Error Message                   |
| ------------- | --------------------------- | ------------------------------- |
| Bot Username  | Required, trim whitespace   | "Informe o username do bot."    |
| Bot Token     | Required, trim whitespace   | "Informe o token do bot."       |
| Channel Label | Required, trim whitespace   | "Informe o rótulo do canal."    |
| Channel ID    | Required, numeric, non-zero | "Informe um Channel ID válido." |

### Color Scheme

| Status       | Badge Class    | Hex Color |
| ------------ | -------------- | --------- |
| Connected    | `bg-green-600` | #059669   |
| Degraded     | `bg-amber-500` | #F59E0B   |
| Disconnected | `bg-red-600`   | #DC2626   |

## Integration Points

### Backend Services

| Service            | Endpoint                   | Purpose                           |
| ------------------ | -------------------------- | --------------------------------- |
| Telegram Collector | `POST /api/telegram/bots`  | Sync bot config (future)          |
| Telegram Collector | `GET /api/telegram/health` | Check connection status           |
| API Gateway        | WebSocket `/ws/telegram`   | Real-time status updates (future) |

### Future Backend Integration

Currently, the frontend operates independently with localStorage persistence. Future enhancement will sync configuration to backend:

```typescript
// Proposed API Contract
POST /api/telegram/bots
{
  "username": "@TPCapitalBot",
  "token": "1234567890:ABC...",
  "type": "Forwarder",
  "description": "Main TP Capital signals"
}

GET /api/telegram/bots/{botId}/status
Response: {
  "status": "connected",
  "latencyMs": 156,
  "lastCheck": "2025-10-11T14:30:00Z"
}
```

## Testing Strategy

### Unit Tests

-   ✅ Form validation logic
-   ✅ Token masking function
-   ✅ LocalStorage serialization/deserialization
-   ✅ Status color mapping

### Integration Tests

-   ✅ CRUD operations persist to localStorage
-   ✅ Form submission creates/updates records
-   ✅ Delete removes both record and status

### E2E Tests

-   ✅ User can add bot → verify → edit → delete
-   ✅ User can add channel → verify → edit → delete
-   ✅ Description modal opens and closes correctly
-   ✅ Token show/hide toggle works

### Manual Testing Checklist

-   [ ] Test with real Telegram bot credentials
-   [ ] Verify masked tokens in table
-   [ ] Confirm status checks return accurate latency
-   [ ] Validate channel ID numeric parsing
-   [ ] Check dark mode compatibility

## Deployment Plan

### Phase 1: Frontend Only (Current)

-   ✅ Deploy ConnectionsPage with localStorage persistence
-   ✅ Manual status verification (mock implementation)
-   ✅ No backend dependency

### Phase 2: Backend Integration (Q1 2025)

-   🔲 Implement Telegram Collector API endpoints
-   🔲 Migrate credentials from localStorage to backend
-   🔲 Real connection health checks
-   🔲 WebSocket status updates

### Phase 3: Advanced Features (Q2 2025)

-   🔲 Auto-reconnect on connection failures
-   🔲 Configuration import/export (JSON)
-   🔲 Multi-user support with RBAC
-   🔲 Audit logging for compliance

## Risks & Mitigations

| Risk                             | Probability | Impact   | Mitigation                                      |
| -------------------------------- | ----------- | -------- | ----------------------------------------------- |
| Token exposure in localStorage   | High        | Critical | Migrate to encrypted backend storage in Phase 2 |
| Browser storage limits           | Low         | Medium   | Monitor usage, implement pagination             |
| Connection check false positives | Medium      | Low      | Implement retry logic with exponential backoff  |
| User confusion about bot types   | Medium      | Low      | Add tooltips and documentation links            |

## Open Questions

1. **Q**: Should we support bot token rotation without service restart?
   **A**: Yes, Phase 2 will include hot-reload via backend API.

2. **Q**: What happens if multiple tabs/windows edit the same bot?
   **A**: Last write wins (localStorage limitation). Phase 2 backend will handle conflict resolution.

3. **Q**: Should we validate Telegram token format (regex)?
   **A**: Yes, add regex validation: `/^\d+:[A-Za-z0-9_-]{35}$/`

4. **Q**: How to handle channel ID discovery (users may not know numeric ID)?
   **A**: Phase 2: Add "Discover" button that queries Telegram API for channel list.

## Related Documents

-   [Feature Specification: Telegram Connections](../../../../frontend/features/feature-telegram-connections.md)
-   [Backend API: Telegram Collector](https://github.com/marceloterra1983/TradingSystem/tree/main/backend/api/telegram-collector)
-   [ADR: LocalStorage for MVP](../../../../backend/architecture/decisions/2025-10-09-adr-0001-use-lowdb.md)

## Changelog

| Date       | Version | Changes              | Author      |
| ---------- | ------- | -------------------- | ----------- |
| 2025-10-11 | 1.0     | Initial PRD creation | Claude Code |

---

**Approval Status**: ✅ Approved for Phase 1 implementation
**Next Review Date**: 2025-11-01
**Stakeholders**: Trading Operations, Backend Team, Frontend Team
