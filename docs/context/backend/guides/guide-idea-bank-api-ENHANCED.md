---
title: Idea Bank API Guide
sidebar_position: 50
tags: [idea-bank, express, lowdb, backend]
domain: backend
type: guide
summary: Installation, configuration, and endpoint guide for the Idea Bank API
status: active
last_review: 2025-10-18
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
!include ../../shared/diagrams/idea-bank-component-architecture.puml
@enduml
```

Shows API layers (Express routes, validation, LowDB), dashboard integration, and future PostgreSQL migration.

**Create Idea Flow - Source**

Download: [`idea-bank-create-sequence.puml`](../../shared/diagrams/idea-bank-create-sequence.puml)

**Create Idea Flow - Rendered**

```plantuml
@startuml
title Idea Bank - Create Idea Flow
!include ../../shared/diagrams/idea-bank-create-sequence.puml
@enduml
```

Documents create idea flow with validation, persistence, and error handling (target: `<200ms` p95).

**Kanban Workflow - Source**

Download: [`idea-bank-kanban-state.puml`](../../shared/diagrams/idea-bank-kanban-state.puml)

**Kanban Workflow - Rendered**

```plantuml
@startuml
title Idea Bank - Kanban Status Workflow
!include ../../shared/diagrams/idea-bank-kanban-state.puml
@enduml
```

State machine for status transitions (New → Review → In-Progress → Completed/Rejected) with @dnd-kit integration.

## 2. Setup

```powershell
cd backend/api/idea-bank
npm install
cp .env.example .env
npm start      # default port 3200
```

### Environment variables

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

interface IdeasResponse {
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

    const json: IdeasResponse = await response.json();
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
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const idea: Idea = await response.json();
    return idea;
  } catch (error) {
    console.error('Error creating idea:', error);
    throw error;
  }
}
```

**PUT update idea with optimistic updates:**

```typescript
async function updateIdea(id: string, updates: Partial<Idea>): Promise<Idea> {
  try {
    const response = await fetch(`http://localhost:3200/api/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedIdea: Idea = await response.json();
    return updatedIdea;
  } catch (error) {
    console.error('Error updating idea:', error);
    throw error;
  }
}
```

**DELETE idea with confirmation:**

```typescript
async function deleteIdea(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this idea?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3200/api/items/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Idea deleted successfully');
  } catch (error) {
    console.error('Error deleting idea:', error);
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

function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation<Idea, Error, { id: string; updates: Partial<Idea> }>({
    mutationFn: ({ id, updates }) => updateIdea(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['ideas'] });

      // Snapshot previous value
      const previousIdeas = queryClient.getQueryData<Idea[]>(['ideas']);

      // Optimistically update cache
      queryClient.setQueryData<Idea[]>(['ideas'], (old) =>
        old?.map(idea => idea.id === id ? { ...idea, ...updates } : idea)
      );

      return { previousIdeas };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousIdeas) {
        queryClient.setQueryData(['ideas'], context.previousIdeas);
      }
      alert(`Failed to update idea: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
}

function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
    onError: (error) => {
      alert(`Failed to delete idea: ${error.message}`);
    },
  });
}
```

### 7.3 Dashboard Integration

**IdeaCard component consuming API data:**

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useUpdateIdea, useDeleteIdea } from './hooks/useIdeas';

interface IdeaCardProps {
  idea: Idea;
}

function IdeaCard({ idea }: IdeaCardProps) {
  const updateMutation = useUpdateIdea();
  const deleteMutation = useDeleteIdea();

  const categoryColors = {
    feature: 'bg-blue-100 text-blue-800',
    bugfix: 'bg-red-100 text-red-800',
    improvement: 'bg-green-100 text-green-800',
    refactor: 'bg-purple-100 text-purple-800',
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  const handleStatusChange = (newStatus: Idea['status']) => {
    updateMutation.mutate({
      id: idea.id,
      updates: { status: newStatus },
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{idea.title}</CardTitle>
          <button
            onClick={() => deleteMutation.mutate(idea.id)}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{idea.description}</p>
        
        <div className="flex gap-2 mb-4">
          <Badge className={categoryColors[idea.category]}>
            {idea.category}
          </Badge>
          <Badge className={priorityColors[idea.priority]}>
            {idea.priority}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {idea.tags.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>

        <select
          value={idea.status}
          onChange={(e) => handleStatusChange(e.target.value as Idea['status'])}
          className="w-full p-2 border rounded"
        >
          <option value="new">New</option>
          <option value="review">Review</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </CardContent>
    </Card>
  );
}
```

**Filter/search implementation with debouncing:**

```typescript
import { useState, useMemo } from 'react';
import { useDebounce } from '../hooks/useDebounce';

function IdeaBankDashboard() {
  const { data: ideas, isLoading } = useIdeas();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Idea['category'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Idea['priority'] | 'all'>('all');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];

    return ideas.filter(idea => {
      const matchesSearch = idea.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           idea.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           idea.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || idea.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || idea.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [ideas, debouncedSearchTerm, categoryFilter, priorityFilter]);

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search ideas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="p-2 border rounded"
        >
          <option value="all">All Categories</option>
          <option value="feature">Feature</option>
          <option value="bugfix">Bugfix</option>
          <option value="improvement">Improvement</option>
          <option value="refactor">Refactor</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="p-2 border rounded"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 7.4 Error Handling Patterns

**Comprehensive error handling with retry logic:**

```typescript
class IdeaBankAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'IdeaBankAPIError';
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          throw new IdeaBankAPIError(
            errorData.error || `Client error: ${response.status}`,
            response.status
          );
        }

        // Retry server errors (5xx)
        throw new IdeaBankAPIError(
          `Server error: ${response.status}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry client errors
      if (error instanceof IdeaBankAPIError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Retrying request (attempt ${attempt + 2}/${maxRetries})...`);
      }
    }
  }

  throw new IdeaBankAPIError(
    `Failed after ${maxRetries} attempts: ${lastError?.message}`,
    undefined,
    lastError
  );
}

// Usage with user-friendly error messages
async function fetchIdeasWithErrorHandling(): Promise<Idea[]> {
  try {
    return await fetchWithRetry<IdeasResponse>('http://localhost:3200/api/items')
      .then(response => response.data || []);
  } catch (error) {
    if (error instanceof IdeaBankAPIError) {
      // User-friendly error messages
      if (error.statusCode === 404) {
        alert('Ideas not found. The service might be unavailable.');
      } else if (error.statusCode && error.statusCode >= 500) {
        alert('Server error. Please try again later.');
      } else {
        alert(`Error: ${error.message}`);
      }
    } else if (error instanceof TypeError) {
      alert('Network error. Please check your connection.');
    } else {
      alert('An unexpected error occurred.');
    }

    // Log to monitoring service
    console.error('[IdeaBank] Error fetching ideas:', error);

    // Return empty array as fallback
    return [];
  }
}
```

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
