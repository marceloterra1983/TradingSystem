---
title: Idea Bank API Guide
sidebar_position: 50
tags: [idea-bank, express, lowdb, backend]
domain: backend
type: guide
summary: Installation, configuration, and endpoint guide for the Idea Bank API
status: active
last_review: "2025-10-18"
---

# Idea Bank API Guide

## 1. Overview

Node 18 + Express REST API that powers the TradingSystem Idea Bank (ideas, categories, priorities, status, tags). Uses LowDB as file-based persistence and pino for structured logging.

### 1.1 Architecture Diagrams

**Component Architecture - Source**

Download: [`idea-bank-component-architecture.puml`](../../shared/diagrams/idea-bank-component-architecture.puml)

**Component Architecture - Rendered**

```plantuml
@startuml
title Idea Bank - Component Architecture

!define RECTANGLE class

skinparam component {
  BackgroundColor<<Interface>> LightBlue
  BackgroundColor<<Application>> LightGreen
  BackgroundColor<<Infrastructure>> LightGray
  BackgroundColor<<External>> LightYellow
}

package "Idea Bank API :3200" {
  package "Interfaces Layer" <<Interface>> {
    component "Express Routes" as Routes {
      [GET /api/items]
      [POST /api/items]
      [PUT /api/items/:id]
      [DELETE /api/items/:id]
      [GET /health]
    }
  }

  package "Application Layer" <<Application>> {
    component "Validation Middleware" as Validation {
      [express-validator]
      [Category enum check]
      [Priority enum check]
      [Status enum check]
      [Required fields]
    }

    component "DTOs" as DTOs {
      [IdeaCreateDTO]
      [IdeaUpdateDTO]
      [IdeaResponseDTO]
    }
  }

  package "Domain Layer" {
    component "Idea Entity" as IdeaEntity {
      [id: string]
      [title: string]
      [description: string]
      [category: Category]
      [priority: Priority]
      [status: Status]
      [tags: string[]]
      [createdAt: Date]
      [updatedAt: Date]
    }

    component "Value Objects" as ValueObjects {
      [Category enum]
      [Priority enum]
      [Status enum]
    }
  }

  package "Infrastructure Layer" <<Infrastructure>> {
    component "LowDB Adapter" as LowDBAdapter {
      [db.data.ideas]
      [Atomic read/write]
      [Auto-create file]
    }

    component "Pino Logger" as Logger {
      [Structured logging]
      [JSON format]
      [Request middleware]
    }

    component "Prometheus Metrics" as Metrics {
      [ideas_created_total]
      [ideas_updated_total]
      [ideas_deleted_total]
      [/metrics endpoint]
    }
  }
}

package "External Services" <<External>> {
  component "Dashboard UI\n:3103" as Dashboard
  database "LowDB File\nideas.json" as LowDBFile
  component "Prometheus\n:9090" as Prometheus
  component "Future: PostgreSQL\n:5432" as PostgreSQL [dotted]
}

' Connections
Dashboard --> Routes : HTTP REST (GET/POST/PUT/DELETE)
Routes ..> Validation : validates
Routes ..> DTOs : uses
Routes ..> IdeaEntity : creates/updates
Validation ..> ValueObjects : enforces enums
IdeaEntity ..> ValueObjects : uses

Routes --> LowDBAdapter : Read/Write
LowDBAdapter --> LowDBFile : Atomic operations
Routes --> Logger : Log events
Routes --> Metrics : Export metrics
Metrics --> Prometheus : Scrape /metrics

' Future migration
LowDBAdapter .right.> PostgreSQL : Migration planned

note right of LowDBAdapter
  **MVP Solution**
  LowDB provides file-based persistence.
  Migration to PostgreSQL/TimescaleDB
  planned for production.
end note

note right of Validation
  **Validation Rules**
  - Category: feature|bugfix|improvement|refactor
  - Priority: low|medium|high|critical
  - Status: new|review|in-progress|completed|rejected
  - Title: required, max 200 chars
end note

note bottom of Routes
  **Performance Target**
  < 200ms p95 for CRUD operations
  Measured via Prometheus metrics
end note

note right of Dashboard
  **Features**
  - Kanban board (@dnd-kit)
  - Filter by category/priority/status
  - Search by title/tags
  - React Query caching
end note

@enduml
```

Shows API layers (Express routes, validation, LowDB), dashboard integration, and future PostgreSQL migration.

**Create Idea Flow - Source**

Download: [`idea-bank-create-sequence.puml`](../../shared/diagrams/idea-bank-create-sequence.puml)

**Create Idea Flow - Rendered**

See diagram source: [`idea-bank-create-sequence.puml`](../../shared/diagrams/idea-bank-create-sequence.puml)

Documents create idea flow with validation, persistence, and error handling (target: `<200ms` p95).

**Kanban Workflow - Source**

Download: [`idea-bank-kanban-state.puml`](../../shared/diagrams/idea-bank-kanban-state.puml)

**Kanban Workflow - Rendered**

See diagram source: [`idea-bank-kanban-state.puml`](../../shared/diagrams/idea-bank-kanban-state.puml)

State machine for status transitions (New → Review → In-Progress → Completed/Rejected) with @dnd-kit integration.

## 2. Setup

```powershell
cd backend/api/workspace
npm install
npm start      # default port 3200
```

> **Important**: This service uses the **centralized `.env` file at the project root**. Do not create a local `.env` file. Update the root `.env` with required variables instead. See [Environment Configuration Guide](../../ops/ENVIRONMENT-CONFIGURATION.md) for details.

### Environment variables

These variables should be configured in the **root `.env` file**:

| Key | Description | Default |
|-----|-------------|---------|
| PORT | HTTP port. | 3200 |
| DB_PATH | LowDB file location (relative or absolute). | ../db/ideas.json |
| LOG_LEVEL | pino log level (info, debug, silent, ...). | info |

## 3. Project layout

```
src/
  server.js        Express app + routes
  db/ideas.json    Data store (auto-created)
tests/
  ideas.test.js    Jest + Supertest suite
```

## 4. Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/items | List ideas (sorted by createdAt desc). |
| POST | /api/items | Create idea (title, description, category, priority, tags). Default status: new. |
| PUT | /api/items/:id | Update idea fields (title/description/category/priority/status/tags). |
| DELETE | /api/items/:id | Delete idea. |
| GET | /health | Health check (status, timestamp, service id). |

Validation with express-validator blocks empty payloads and invalid enums (category, priority, status).

## 5. Logging

- Request middleware logs method + url at debug level.
- Domain events (Idea created/updated/deleted) logged at info with metadata.
- On SIGINT, service flushes LowDB and logs shutdown completion.

## 6. Testing

```bash
npm test
```

Runs Jest + Supertest with a temporary database (tests/tmp/ideas.test.json). Covers creation, updates, deletion, and validation failures.

## 7. Practical Code Examples

> **API Response Convention**: All endpoints return envelope responses with `{ success: boolean, data: T }` structure. See [workspace.openapi.yaml](../api/specs/workspace.openapi.yaml) for complete schema.

### 7.1 Consuming the API with Fetch

**GET all ideas with error handling:**

```typescript
// TypeScript types
interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'bugfix' | 'improvement' | 'refactor';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// API response envelope for list endpoint
interface ListItemsResponse {
  success: boolean;
  count: number;
  data: Idea[];
}

// Fetch with error handling
async function fetchIdeas(): Promise<Idea[]> {
  try {
    const response = await fetch('http://localhost:3200/api/items', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json: ListItemsResponse = await response.json();
    return json.data || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.error('Request timed out');
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Network error');
      throw new Error('Network error. Check your connection.');
    }
    console.error('Error fetching ideas:', error);
    throw error;
  }
}
```

**POST new idea with validation:**

```typescript
interface CreateIdeaPayload {
  title: string;
  description: string;
  category: Idea['category'];
  priority: Idea['priority'];
  tags?: string[];
}

// API response envelope for create/update endpoint
interface MutateItemResponse {
  success: boolean;
  message: string;
  data: Idea;
}

async function createIdea(payload: CreateIdeaPayload): Promise<Idea> {
  // Client-side validation
  if (!payload.title || payload.title.trim().length === 0) {
    throw new Error('Title is required');
  }
  if (payload.title.length > 200) {
    throw new Error('Title must be less than 200 characters');
  }

  try {
    const response = await fetch('http://localhost:3200/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const json: MutateItemResponse = await response.json();
    return json.data;
  } catch (error) {
    console.error('Error creating idea:', error);
    throw error;
  }
}
```

### 7.2 React Query Integration

**useQuery for fetching ideas list:**

```typescript
import { useQuery } from '@tanstack/react-query';

function useIdeas() {
  return useQuery<Idea[], Error>({
    queryKey: ['ideas'],
    queryFn: fetchIdeas,
    staleTime: 30000, // Consider data stale after 30 seconds
    cacheTime: 300000, // Keep unused data in cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 2, // Retry failed requests twice
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Usage in component
function IdeaList() {
  const { data: ideas, isLoading, isError, error, refetch } = useIdeas();

  if (isLoading) {
    return <div>Loading ideas...</div>;
  }

  if (isError) {
    return (
      <div>
        <p>Error loading ideas: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {ideas?.map(idea => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}
```

**useMutation for create/update/delete operations:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation<Idea, Error, CreateIdeaPayload>({
    mutationFn: createIdea,
    onSuccess: (newIdea) => {
      // Invalidate and refetch ideas list
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      console.log('Idea created:', newIdea.title);
    },
    onError: (error) => {
      console.error('Failed to create idea:', error);
      alert(`Failed to create idea: ${error.message}`);
    },
  });
}
```

For more examples, see sections 7.3 (Dashboard Integration) and 7.4 (Error Handling Patterns) in the full guide.

## 8. References

- [Component Architecture Diagram](../../shared/diagrams/idea-bank-component-architecture.puml)
- [Create Sequence Diagram](../../shared/diagrams/idea-bank-create-sequence.puml)
- [Kanban State Diagram](../../shared/diagrams/idea-bank-kanban-state.puml)
- [Frontend Feature Specification](../../frontend/features/feature-idea-bank.md)
- [OpenAPI Specification](../api/specs/workspace.openapi.yaml)

## 9. Roadmap

- Migrate persistence to PostgreSQL/Timescale (see backend/data/migrations).
- Add authentication/authorization.
- Implement pagination and server-side filtering.
- Stream structured logs into the observability stack.
- Keep `docs/context/backend/api/idea-bank.openapi.yaml` aligned with any contract change.
