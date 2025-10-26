---
title: "ADR-0003: Use localStorage for Client-Side Data Persistence (MVP)"
sidebar_position: 30
tags: [frontend, architecture, storage, localstorage, mvp, adr]
domain: frontend
type: adr
summary: Decision to use localStorage for client-side data persistence in MVP phase, with planned migration to backend APIs
status: active
last_review: "2025-10-17"
---

# ADR-0003: Use localStorage for Client-Side Data Persistence (MVP)

## Status
**Accepted** - 2025-10-11
**Phase**: MVP (Minimum Viable Product)
**Migration Planned**: Q1 2026 (Backend API integration)

## Context

The TradingSystem Dashboard requires persistent storage for:
- **Telegram Bot Configurations** (username, token, type, description)
- **Telegram Channel Configurations** (label, channelId, type, description)
- **User Preferences** (theme, sidebar state, layout configurations)
- **Draft Data** (unsaved form states, temporary filters)

### MVP Requirements
1. **Zero Backend Dependency**: Frontend should work independently during development
2. **Quick Iteration**: Enable rapid prototyping without API setup
3. **Client-Side Persistence**: Data survives page refreshes
4. **Simple Migration Path**: Easy to move to backend later
5. **Acceptable for Development**: Suitable for local development and testing

### Storage Options for MVP

| Storage Method | Capacity | Persistence | Security | Complexity | Backend Needed |
|----------------|----------|-------------|----------|------------|----------------|
| **localStorage** | 5-10 MB | Permanent | ⚠️ Low | Minimal | ❌ No |
| sessionStorage | 5-10 MB | Session | ⚠️ Low | Minimal | ❌ No |
| IndexedDB | ~1 GB | Permanent | ⚠️ Low | High | ❌ No |
| Backend API | Unlimited | Permanent | ✅ High | Medium | ✅ Yes |
| Zustand + Persist | 5-10 MB | Permanent | ⚠️ Low | Minimal | ❌ No |

## Decision

We will use **localStorage** for client-side data persistence in the **MVP phase**, with a planned migration to backend APIs in **Phase 2** (Q1 2026).

### Rationale

1. **Zero Backend Dependency**
   - Frontend team can iterate independently
   - No API setup or authentication needed
   - Faster development cycles

2. **Simplicity**
   - Native browser API, no libraries needed
   - Synchronous read/write operations
   - Easy to understand and debug

3. **Sufficient Capacity**
   - 5-10 MB per origin (browser-dependent)
   - Adequate for ~500-1000 bot/channel records
   - Current usage: ~1 KB per bot/channel record

4. **Clear Migration Path**
   - Data models already defined (BotRecord, ChannelRecord)
   - Easy to swap localStorage calls with API calls
   - Migration can be gradual (feature by feature)

5. **Development Velocity**
   - Unblocks frontend development immediately
   - Allows design iteration without backend changes
   - Simplifies local development setup

## Implementation

### Storage Keys Convention
```typescript
// localStorage keys namespaced to prevent conflicts
const LS_KEYS = {
  bots: 'telegram.bots',               // Array<BotRecord>
  channels: 'telegram.channels',       // Array<ChannelRecord>
  layout: 'layout-storage',            // LayoutState (Zustand persist)
  theme: 'theme-preference',           // 'light' | 'dark' | 'system'
} as const;
```

### Data Models
```typescript
type BotRecord = {
  localId: string;           // UUID for local identification
  username: string;          // @BotUsername
  token: string;             // Bot API token (⚠️ plain text in MVP)
  description?: string;      // Optional notes
  type: 'Forwarder' | 'Sender';
};

type ChannelRecord = {
  localId: string;           // UUID for local identification
  label: string;             // Human-readable name
  channelId: number;         // Telegram numeric ID
  type: 'source' | 'destination';
  description?: string;      // Filtering rules, notes
};
```

### Storage Abstraction Layer
```typescript
// lib/storage.ts
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`[localStorage] Failed to load ${key}:`, error);
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[localStorage] Failed to save ${key}:`, error);
  }
}

export function removeJSON(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[localStorage] Failed to remove ${key}:`, error);
  }
}
```

### Usage in Components
```typescript
// components/pages/ConnectionsPage.tsx
const [bots, setBots] = useState<BotRecord[]>(() => {
  return loadJSON<BotRecord[]>(LS_KEYS.bots, []);
});

const persistBots = (nextBots: BotRecord[]) => {
  setBots(nextBots);
  saveJSON(LS_KEYS.bots, nextBots);
};

const handleSubmit = () => {
  const newBot: BotRecord = { /* ... */ };
  persistBots([...bots, newBot]);
};
```

### Zustand + Persist Middleware
```typescript
// stores/useLayoutStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),
    }),
    { name: 'layout-storage' } // localStorage key
  )
);
```

## Security Considerations

### ⚠️ Known Limitations (MVP Phase)
1. **Plain Text Storage**
   - Bot tokens stored unencrypted in localStorage
   - Accessible via browser DevTools
   - **Risk Level**: MEDIUM (local development only)

2. **No Access Control**
   - Any JavaScript on the domain can access localStorage
   - XSS vulnerabilities could leak tokens
   - **Risk Level**: MEDIUM (no multi-user environment)

3. **Browser Storage Limits**
   - 5-10 MB quota per origin
   - Can be cleared by user or browser
   - **Risk Level**: LOW (acceptable for MVP)

### Mitigations (MVP Phase)
- 🔒 Token masking in UI (`maskToken()` function)
- 🔒 Password-type input fields
- 🔒 No tokens logged to console
- ⚠️ Clear disclaimer in UI: "Configurations stored locally"

### Security Roadmap (Phase 2)
- ✅ Migrate credentials to backend with encryption at rest
- ✅ Use secure HTTP-only cookies for session management
- ✅ Implement RBAC for credential access
- ✅ Add audit logging for credential changes
- ✅ Encrypt sensitive fields in transit (HTTPS)

## Migration Strategy (Phase 2)

### Backend API Endpoints (Planned)
```typescript
// Future API contracts
POST   /api/telegram/bots              // Create bot
GET    /api/telegram/bots              // List bots
PUT    /api/telegram/bots/:id          // Update bot
DELETE /api/telegram/bots/:id          // Delete bot
GET    /api/telegram/bots/:id/status   // Check connection status

POST   /api/telegram/channels          // Create channel
GET    /api/telegram/channels          // List channels
PUT    /api/telegram/channels/:id      // Update channel
DELETE /api/telegram/channels/:id      // Delete channel
```

### Migration Steps
1. **Phase 2.1**: Implement backend API (Express + PostgreSQL)
2. **Phase 2.2**: Create API client layer (`services/telegramApi.ts`)
3. **Phase 2.3**: Add feature flag (`USE_BACKEND_API`)
4. **Phase 2.4**: Swap localStorage calls with API calls
5. **Phase 2.5**: Migrate existing localStorage data to backend
6. **Phase 2.6**: Remove localStorage code, clean up

### Data Migration Script
```typescript
// scripts/migrate-telegram-config.ts
async function migrateToBackend() {
  const bots = loadJSON<BotRecord[]>(LS_KEYS.bots, []);
  const channels = loadJSON<ChannelRecord[]>(LS_KEYS.channels, []);

  // Upload to backend
  for (const bot of bots) {
    await fetch('/api/telegram/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bot),
    });
  }

  // Clear localStorage after successful migration
  removeJSON(LS_KEYS.bots);
  removeJSON(LS_KEYS.channels);
}
```

## Consequences

### Positive ✅
- ✅ **Zero Backend Setup**: Frontend can develop independently
- ✅ **Fast Iteration**: No API delays, instant persistence
- ✅ **Simple Implementation**: Native browser API, no libraries
- ✅ **Adequate Capacity**: 5-10 MB sufficient for MVP use case
- ✅ **Easy Testing**: No database setup for unit/integration tests
- ✅ **Clear Migration Path**: Well-defined Phase 2 plan

### Negative ⚠️
- ⚠️ **Security Risks**: Tokens in plain text (local development only)
- ⚠️ **No Multi-User**: Each browser instance has separate data
- ⚠️ **Browser Dependency**: Data lost if localStorage cleared
- ⚠️ **No Backup/Sync**: No automatic backups or cross-device sync
- ⚠️ **Migration Work**: Phase 2 requires frontend refactoring
- ⚠️ **Limited Capacity**: 5-10 MB quota (not scalable)

### Risk Mitigation
- 🔄 **Planned Migration**: Phase 2 backend integration scheduled for Q1 2026
- 📝 **Documentation**: Clear warnings in UI and code comments
- 🧪 **Testing**: Ensure abstraction layer simplifies migration
- 🔐 **Security Review**: Backend design includes encryption and RBAC

## Alternatives Considered

### IndexedDB
**Pros**: Larger capacity (~1 GB), async API, structured storage
**Cons**: Complex API, overkill for simple key-value data
**Verdict**: **Rejected** - Unnecessary complexity for MVP

### sessionStorage
**Pros**: Automatic cleanup on tab close
**Cons**: Data lost when tab closes (bad UX)
**Verdict**: **Rejected** - Need persistent storage

### Immediate Backend API
**Pros**: Production-ready, secure, scalable
**Cons**: Blocks frontend development, requires backend team bandwidth
**Verdict**: **Deferred to Phase 2** - Prioritize frontend velocity

### Zustand + Persist (Only)
**Pros**: Already using Zustand, middleware available
**Cons**: Same localStorage limitations, less explicit control
**Verdict**: **Partially Adopted** - Use for UI state, explicit localStorage for data

## Related Decisions
- [ADR-0001: Use Zustand for State Management](2025-10-11-adr-0001-use-zustand-for-state-management.md)
- Backend ADR (Future): Use PostgreSQL for production data storage

## References
- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Web Storage API Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage)
- [Feature: Telegram Connections Management](../../features/feature-telegram-connections.md)
- [PRD: Telegram Connections](../../../shared/product/prd/en/tp-capital-telegram-connections-prd.md)

---

**Decision Date**: 2025-10-11
**Decision Maker**: Frontend Team
**Implementation Status**: ✅ Implemented (Telegram Connections uses localStorage)
**Migration Scheduled**: Q1 2026 (Backend API + PostgreSQL)
**Review Date**: 2025-12-31 (Pre-migration review)
