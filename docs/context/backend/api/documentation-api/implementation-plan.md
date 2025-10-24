---
title: Documentation API - Implementation Plan
sidebar_position: 20
tags: [backend, api, documentation, implementation, plan]
domain: backend
type: guide
summary: Detailed implementation plan for Documentation API with endpoints, data models, and integration steps
status: active
last_review: 2025-10-17
---

# Documentation API - Implementation Plan

**Created:** 2025-10-13
**Version:** 1.0.0
**Status:** Planning Phase
**Current State:** Placeholder (only health check)

---

## 📊 Executive Summary

### Purpose

The **Documentation API** is a centralized service for managing TradingSystem's internal documentation ecosystem, including:

- **Documentation Systems Registry**: Track all documentation services (Docusaurus, APIs, tools)
- **Ideas Management**: CRUD operations for documentation improvement ideas
- **File Attachments**: Upload and manage documentation artifacts (images, PDFs, diagrams)
- **Statistics & Analytics**: Aggregate metrics on documentation health

### Business Value

1. **Centralized Control**: Single source of truth for all documentation systems
2. **Collaboration**: Team members can submit and track documentation ideas
3. **Visibility**: Dashboard integration shows documentation status at a glance
4. **Efficiency**: Reduces time spent searching for documentation resources
5. **Quality**: Track and prioritize documentation improvements

### Current State

- Port: **3400**
- Implementation: **Placeholder only** (health check endpoint)
- OpenAPI Spec: ✅ Complete ([documentation-api.openapi.yaml](../specs/documentation-api.openapi.yaml))
- Database: ❌ Not implemented

### Target State

Fully functional REST API with:
- QuestDB persistence (primary)
- File uploads with S3-compatible storage
- Real-time statistics
- Dashboard integration
- OpenAPI documentation

---

## 🔍 Research Findings

### Industry Best Practices

Based on research of leading documentation platforms:

#### 1. **GitBook API Architecture**
- RESTful design with clear resource separation
- Built-in OpenAPI specification support
- Versioning strategy (v1, v2 paths)
- Comprehensive search capabilities
- Integration-first approach

#### 2. **Notion API Patterns**
- Block-based content model (flexible structure)
- Rich metadata support (tags, properties, relations)
- Pagination for large datasets
- Webhook support for real-time updates
- Rate limiting (3 requests/second)

#### 3. **FormKiQ Document Management**
- Layered architecture (API → Service → Storage)
- Multi-tenant support via namespacing
- Full-text search with metadata filtering
- S3-compatible storage abstraction
- AI/OCR integration ready

#### 4. **Knowledge Base Best Practices**
- **Taxonomy Management**: Categories, tags, hierarchies
- **Search-first Design**: Fast full-text search
- **Version Control**: Track changes, audit logs
- **Access Control**: Role-based permissions
- **Analytics**: Usage metrics, popular content

### Key Takeaways for TradingSystem

1. **Use QuestDB** for time-series metrics and audit logs
2. **Implement Pagination** early (limit/offset or cursor-based)
3. **Add Full-Text Search** via QuestDB FTS or external service
4. **File Storage**: Local filesystem (MVP) → S3-compatible (future)
5. **Versioning**: Start with v1 path prefix
6. **Rate Limiting**: Implement early to prevent abuse

---

## 🏗️ Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│          Dashboard (React)             │
│  ┌──────────────────────────────────────────┐  │
│  │  Documentation Management UI             │  │
│  │  - Systems Registry                      │  │
│  │  - Ideas Board (Kanban)                  │  │
│  │  - File Browser                          │  │
│  │  - Statistics Dashboard                  │  │
│  └──────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────┘
                    │ HTTP/REST (JSON)
                    ↓
┌─────────────────────────────────────────────────┐
│      Documentation API (Express + Node.js)      │
│  ┌──────────────────────────────────────────┐  │
│  │  API Layer (Express Middleware)          │  │
│  │  - CORS, Helmet, Rate Limiting           │  │
│  │  - Request Validation (express-validator)│  │
│  │  - Error Handling                        │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Service Layer (Business Logic)          │  │
│  │  - SystemsService                        │  │
│  │  - IdeasService                          │  │
│  │  - FilesService                          │  │
│  │  - StatsService                          │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Data Access Layer (Repositories)        │  │
│  │  - QuestDBClient                         │  │
│  │  - FileStorageClient                     │  │
│  └──────────────────────────────────────────┘  │
└───────────┬─────────────────┬───────────────────┘
            │                 │
            ↓                 ↓
    ┌──────────────┐  ┌──────────────┐
    │   QuestDB    │  │ File Storage │
    │  (Port 9000) │  │  (./uploads) │
    └──────────────┘  └──────────────┘
```

### Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **API Framework** | Express.js | Already used in TP Capital & B3 APIs |
| **Language** | Node.js 18+ | Consistency with other services |
| **Database** | QuestDB | Time-series optimized, already integrated |
| **File Storage** | Local FS (MVP) | Simple start, S3-compatible later |
| **Validation** | express-validator | Industry standard, good DX |
| **Logging** | Pino | High performance, structured logs |
| **Documentation** | OpenAPI 3.0.3 | Already defined, auto-gen docs |
| **Testing** | Vitest + Supertest | Fast, modern test framework |

---

## 💾 Data Model

### QuestDB Schema Design

#### Table: `documentation_systems`

Tracks all documentation services in the ecosystem.

```sql
CREATE TABLE documentation_systems (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  name STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE,  -- 'online', 'offline', 'degraded'
  port INT,
  host STRING,
  url STRING,
  icon STRING,                       -- Icon identifier (lucide-react)
  color STRING,                      -- Hex color code
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY DAY;
```

**Indexes:**
- `id` (SYMBOL INDEX) - Fast lookups by system ID
- `tags` (SYMBOL INDEX) - Filter by tags

#### Table: `documentation_ideas`

Stores documentation improvement ideas.

```sql
CREATE TABLE documentation_ideas (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  title STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE INDEX,     -- 'backlog', 'in_progress', 'done', 'cancelled'
  category SYMBOL CAPACITY 32 CACHE INDEX,   -- 'api', 'guide', 'reference', 'tutorial'
  priority SYMBOL CAPACITY 16 CACHE INDEX,   -- 'low', 'medium', 'high', 'critical'
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_by STRING,                         -- User identifier (future auth)
  assigned_to STRING,                        -- Assignee (future)
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,                    -- When status changed to 'done'
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;
```

**Indexes:**
- `id` (SYMBOL INDEX) - Fast lookups
- `status` (SYMBOL INDEX) - Filter by status
- `category` (SYMBOL INDEX) - Group by category
- `priority` (SYMBOL INDEX) - Sort by priority
- `tags` (SYMBOL INDEX) - Tag-based search

#### Table: `documentation_files`

File attachments metadata (actual files stored on filesystem).

```sql
CREATE TABLE documentation_files (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  idea_id SYMBOL CAPACITY 256 CACHE INDEX,  -- Foreign key to ideas
  original_name STRING,
  stored_name STRING,                       -- Unique filename on disk
  size LONG,                                -- File size in bytes
  mime_type STRING,
  storage_path STRING,                      -- Relative path in filesystem
  checksum STRING,                          -- SHA-256 for integrity
  uploaded_by STRING,                       -- User identifier (future)
  uploaded_at TIMESTAMP,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;
```

**Indexes:**
- `id` (SYMBOL INDEX) - Fast lookups
- `idea_id` (SYMBOL INDEX) - Find all files for an idea

#### Table: `documentation_audit_log`

Audit trail for all changes.

```sql
CREATE TABLE documentation_audit_log (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  entity_type SYMBOL CAPACITY 32 CACHE,     -- 'system', 'idea', 'file'
  entity_id STRING,
  action SYMBOL CAPACITY 16 CACHE,          -- 'create', 'update', 'delete'
  user_id STRING,                           -- Who made the change
  changes STRING,                           -- JSON string of what changed
  ip_address STRING,
  user_agent STRING,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;
```

### Entity Relationships

```
documentation_systems (1) ──┐
                             │
documentation_ideas (N) ─────┼──> documentation_files (N)
                             │
                             └──> documentation_audit_log (N)
```

---

## 🗺️ Implementation Roadmap

### Phase 1: MVP - Core Functionality (2-3 weeks)

**Goal**: Basic CRUD operations with QuestDB persistence

#### Week 1: Foundation
- [ ] Setup project structure (src/routes, src/services, src/repositories)
- [ ] Install dependencies (express, pino, dotenv, express-validator)
- [ ] Create QuestDB schemas (run CREATE TABLE scripts)
- [ ] Implement QuestDBClient wrapper (connection pooling, error handling)
- [ ] Setup logging (pino with pretty printing)
- [ ] Configure CORS, Helmet, Rate Limiting

**Deliverables:**
- Basic Express server running on port 3400
- QuestDB tables created
- Health check endpoint functional
- Logging infrastructure in place

#### Week 2: Systems & Ideas CRUD
- [ ] Implement SystemsService + Repository
  - `GET /api/v1/systems` - List all systems
  - `POST /api/v1/systems` - Create system
  - `PUT /api/v1/systems/:id` - Update system
  - `DELETE /api/v1/systems/:id` - Delete system
- [ ] Implement IdeasService + Repository
  - `GET /api/v1/ideas` - List ideas (with filters)
  - `POST /api/v1/ideas` - Create idea
  - `PUT /api/v1/ideas/:id` - Update idea
  - `DELETE /api/v1/ideas/:id` - Delete idea
- [ ] Add validation middleware (express-validator)
- [ ] Write unit tests (Vitest)

**Deliverables:**
- Systems & Ideas CRUD complete
- Input validation working
- 80%+ test coverage

#### Week 3: Statistics & Integration
- [ ] Implement StatsService
  - `GET /api/v1/stats` - Aggregate statistics
  - Ideas by status, category, priority
  - Systems by status
  - File storage metrics
- [ ] Create integration tests (Supertest)
- [ ] Update frontend to consume new API
- [ ] Deploy to development environment

**Deliverables:**
- Statistics endpoint working
- Integration tests passing
- Frontend showing real data
- Documentation updated

### Phase 2: File Uploads (1-2 weeks)

**Goal**: Handle file attachments for ideas

#### Tasks
- [ ] Setup multer middleware (file size limits, type filtering)
- [ ] Create uploads directory structure
- [ ] Implement FilesService + Repository
  - `POST /api/v1/ideas/:id/files` - Upload file
  - `GET /api/v1/ideas/:id/files` - List files
  - `DELETE /api/v1/files/:id` - Delete file
- [ ] Add file metadata to QuestDB
- [ ] Implement file cleanup (orphaned files)
- [ ] Add thumbnail generation (images only)

**Deliverables:**
- File upload/download working
- Proper error handling (file too large, invalid type)
- Auto-cleanup of deleted files

### Phase 3: Search & Filtering (1 week)

**Goal**: Advanced querying capabilities

#### Tasks
- [ ] Implement full-text search (QuestDB FTS)
- [ ] Add pagination (limit/offset)
- [ ] Support filtering by multiple fields
- [ ] Add sorting options
- [ ] Optimize queries with proper indexes

**Query Examples:**
- `GET /api/v1/ideas?status=backlog&priority=high&limit=20`
- `GET /api/v1/ideas?search=authentication&category=api`
- `GET /api/v1/systems?status=online&tags=production`

**Deliverables:**
- Search working across all entities
- Pagination implemented
- Performance optimized

### Phase 4: Audit & Analytics (1 week)

**Goal**: Track changes and provide insights

#### Tasks
- [ ] Implement audit logging (all mutations)
- [ ] Create AuditService
  - `GET /api/v1/audit` - Query audit logs
- [ ] Add analytics dashboard data
  - Ideas created/completed over time
  - Most active contributors
  - Popular categories/tags
- [ ] Setup cron jobs for metrics aggregation

**Deliverables:**
- Complete audit trail
- Analytics dashboard data
- Scheduled jobs running

### Phase 5: Advanced Features (Future)

#### Authentication & Authorization
- [ ] JWT-based authentication
- [ ] Role-based access control (RBAC)
- [ ] User management (via existing auth service)

#### Webhooks & Notifications
- [ ] Webhook support for idea status changes
- [ ] Email notifications (optional)
- [ ] Slack integration (optional)

#### Versioning & History
- [ ] Version control for ideas (track changes)
- [ ] Restore previous versions
- [ ] Compare versions (diff view)

#### AI Integration
- [ ] Auto-categorize ideas (ML model)
- [ ] Suggest related documentation
- [ ] Generate summaries (OpenAI API)

---

## 📝 Technical Specification

### API Endpoints (v1)

#### Health Check
```
GET /health
Response: { status: 'ok', service: 'documentation-api', timestamp: '2025-10-13T...' }
```

#### Systems Management

**List Systems**
```
GET /api/v1/systems
Query Params: ?status=online&limit=50&offset=0
Response: {
  success: true,
  count: 10,
  data: [
    {
      id: 'sys-123',
      name: 'Docusaurus',
      description: 'Technical documentation site',
      status: 'online',
      port: 3004,
      host: 'localhost',
      url: 'http://localhost:3004',
      icon: 'FileText',
      color: '#10b981',
      tags: ['docs', 'production'],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-10-13T20:00:00Z'
    }
  ]
}
```

**Create System**
```
POST /api/v1/systems
Body: {
  name: 'API Reference',
  description: 'OpenAPI documentation',
  status: 'online',
  port: 8080,
  host: 'localhost',
  url: 'http://localhost:8080',
  icon: 'Code',
  color: '#3b82f6',
  tags: ['api', 'reference']
}
Response: { success: true, data: { id: 'sys-456', ... } }
```

**Update System**
```
PUT /api/v1/systems/:id
Body: { status: 'degraded', description: 'Experiencing slowness' }
Response: { success: true, data: { ... } }
```

**Delete System**
```
DELETE /api/v1/systems/:id
Response: { success: true, message: 'System deleted' }
```

#### Ideas Management

**List Ideas**
```
GET /api/v1/ideas
Query Params: ?status=backlog&category=guide&priority=high&limit=20&offset=0
Response: {
  success: true,
  count: 15,
  data: [
    {
      id: 'idea-789',
      title: 'Add authentication guide',
      description: 'Document JWT implementation',
      status: 'backlog',
      category: 'guide',
      priority: 'high',
      tags: ['authentication', 'security'],
      files: [],
      createdAt: '2025-10-01T10:00:00Z',
      updatedAt: '2025-10-13T15:30:00Z'
    }
  ]
}
```

**Create Idea**
```
POST /api/v1/ideas
Body: {
  title: 'Document QuestDB integration',
  description: 'Add guide for QuestDB setup',
  category: 'guide',
  priority: 'medium',
  tags: ['database', 'questdb']
}
Response: { success: true, data: { id: 'idea-101', ... } }
```

**Update Idea**
```
PUT /api/v1/ideas/:id
Body: { status: 'in_progress', assignedTo: 'user-123' }
Response: { success: true, data: { ... } }
```

**Delete Idea**
```
DELETE /api/v1/ideas/:id
Response: { success: true, message: 'Idea deleted' }
```

#### File Management

**Upload File**
```
POST /api/v1/ideas/:id/files
Content-Type: multipart/form-data
Body: FormData with 'file' field
Response: {
  success: true,
  data: {
    id: 'file-321',
    ideaId: 'idea-789',
    originalName: 'diagram.png',
    storedName: '1697234567890-abc123-diagram.png',
    size: 245678,
    mimeType: 'image/png',
    url: '/uploads/ideas/idea-789/1697234567890-abc123-diagram.png',
    uploadedAt: '2025-10-13T16:00:00Z'
  }
}
```

**Delete File**
```
DELETE /api/v1/files/:id
Response: { success: true, message: 'File deleted' }
```

#### Statistics

**Get Stats**
```
GET /api/v1/stats
Response: {
  success: true,
  data: {
    ideas: {
      total: 45,
      byStatus: { backlog: 20, in_progress: 15, done: 10 },
      byCategory: { api: 12, guide: 18, reference: 10, tutorial: 5 },
      byPriority: { low: 10, medium: 20, high: 12, critical: 3 }
    },
    systems: {
      total: 10,
      byStatus: { online: 8, degraded: 1, offline: 1 }
    },
    files: {
      total: 23,
      totalSize: 45678901,
      byMimeType: { 'image/png': 15, 'application/pdf': 8 }
    }
  }
}
```

### Error Handling

**Standard Error Response**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    { "msg": "Title is required", "param": "title", "location": "body" }
  ]
}
```

**HTTP Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate ID)
- `413` - Payload Too Large (file size)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Rate Limiting

```javascript
// Default: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
```

### File Upload Limits

```javascript
const upload = multer({
  storage: diskStorage({
    destination: './uploads/ideas/',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/markdown'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});
```

---

## 🔗 Integration Points

### Dashboard

**Components to Update:**

1. **ConnectionsPage.tsx**
   - Add "Documentation Health" section
   - Show systems status from `/api/v1/systems`
   - Link to detail pages

2. **New: DocumentationPage.tsx**
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { getDocumentationSystems, getDocumentationIdeas } from '../services/documentationService';

   export function DocumentationPage() {
     const { data: systems } = useQuery(['doc-systems'], getDocumentationSystems);
     const { data: ideas } = useQuery(['doc-ideas'], getDocumentationIdeas);

     return (
       <div className="space-y-6">
         <SystemsGrid systems={systems} />
         <IdeasKanban ideas={ideas} />
       </div>
     );
   }
   ```

3. **New: services/documentationService.ts**
   ```typescript
   const API_URL = import.meta.env.VITE_DOCUMENTATION_API_URL || 'http://localhost:3400';

   export async function getDocumentationSystems() {
     const res = await fetch(`${API_URL}/api/v1/systems`);
     return res.json();
   }

   export async function getDocumentationIdeas(filters = {}) {
     const params = new URLSearchParams(filters);
     const res = await fetch(`${API_URL}/api/v1/ideas?${params}`);
     return res.json();
   }

   export async function createIdea(data) {
     const res = await fetch(`${API_URL}/api/v1/ideas`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
     });
     return res.json();
   }
   ```

### Laucher Integration

**Update service-launcher/server.js:**

```javascript
createServiceTarget({
  id: 'documentation-api',
  name: 'Documentation API',
  description: 'Central documentation management hub',
  category: 'api',
  defaultPort: 3400,
  portEnv: 'SERVICE_LAUNCHER_DOCS_PORT',
  urlEnv: 'SERVICE_LAUNCHER_DOCS_URL',
  path: '/health'
}),
```

### Docusaurus Integration

**Add link to Documentation API:**

```markdown
// docs/context/backend/api/README.md

- [Documentation API](http://localhost:3400/api/v1/stats) - Live statistics
```

---

## 🎨 Frontend UI Specification

**Yes, the implementation includes a comprehensive frontend!** This section details the React components, user workflows, and UI/UX for interacting with the Documentation API.

### Component Architecture

```
DocumentationPage (Main Container)
├── DocumentationHeader (Title, actions, filters)
├── TabNavigation (Systems, Ideas, Files, Statistics)
├── SystemsTab
│   ├── SystemsGrid (Card view)
│   │   └── SystemCard (individual system)
│   │       ├── StatusIndicator
│   │       ├── SystemInfo
│   │       └── ActionButtons (view, edit, delete)
│   └── CreateSystemModal
├── IdeasTab
│   ├── IdeasFilters (status, category, priority, search)
│   ├── IdeasKanban (drag-and-drop board)
│   │   ├── KanbanColumn (Backlog, In Progress, Done, Cancelled)
│   │   │   └── IdeaCard
│   │   │       ├── IdeaHeader (title, priority badge)
│   │   │       ├── IdeaBody (description, tags)
│   │   │       ├── FileAttachments (preview count)
│   │   │       └── IdeaFooter (dates, actions)
│   ├── IdeasTableView (alternative view)
│   └── CreateIdeaModal
│       ├── IdeaForm
│       ├── FileUploadZone
│       └── TagsInput
├── FilesTab
│   ├── FileBrowser (grid/list toggle)
│   │   └── FileCard
│   │       ├── FileThumbnail (image preview or icon)
│   │       ├── FileInfo (name, size, type)
│   │       └── FileActions (download, delete)
│   └── FileUploadModal
└── StatisticsTab
    ├── StatsOverview (key metrics cards)
    ├── IdeasChart (status distribution)
    ├── CategoryChart (pie chart)
    ├── PriorityChart (bar chart)
    └── TrendChart (ideas over time)
```

### Page Layout: DocumentationPage.tsx

**Location:** `frontend/dashboard/src/components/pages/DocumentationPage.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { SystemsGrid } from '@/components/documentation/SystemsGrid';
import { IdeasKanban } from '@/components/documentation/IdeasKanban';
import { FileBrowser } from '@/components/documentation/FileBrowser';
import { StatisticsDashboard } from '@/components/documentation/StatisticsDashboard';
import { CreateSystemModal } from '@/components/documentation/CreateSystemModal';
import { CreateIdeaModal } from '@/components/documentation/CreateIdeaModal';
import { documentationService } from '@/services/documentationService';

export function DocumentationPage() {
  const [activeTab, setActiveTab] = useState('ideas');
  const [showCreateSystem, setShowCreateSystem] = useState(false);
  const [showCreateIdea, setShowCreateIdea] = useState(false);
  const queryClient = useQueryClient();

  const { data: systems, isLoading: loadingSystems, refetch: refetchSystems } = useQuery({
    queryKey: ['doc-systems'],
    queryFn: documentationService.getSystems
  });

  const { data: ideas, isLoading: loadingIdeas, refetch: refetchIdeas } = useQuery({
    queryKey: ['doc-ideas'],
    queryFn: documentationService.getIdeas
  });

  const { data: stats } = useQuery({
    queryKey: ['doc-stats'],
    queryFn: documentationService.getStats,
    refetchInterval: 60000 // Refresh every minute
  });

  const handleRefresh = () => {
    refetchSystems();
    refetchIdeas();
    queryClient.invalidateQueries(['doc-stats']);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Documentation Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage documentation systems, ideas, and resources
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {activeTab === 'systems' && (
            <Button size="sm" onClick={() => setShowCreateSystem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New System
            </Button>
          )}
          {activeTab === 'ideas' && (
            <Button size="sm" onClick={() => setShowCreateIdea(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Idea
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ideas">Ideas Board</TabsTrigger>
          <TabsTrigger value="systems">Systems Registry</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas" className="space-y-4">
          <IdeasKanban ideas={ideas?.data || []} isLoading={loadingIdeas} />
        </TabsContent>

        <TabsContent value="systems" className="space-y-4">
          <SystemsGrid systems={systems?.data || []} isLoading={loadingSystems} />
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <FileBrowser />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <StatisticsDashboard stats={stats?.data} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateSystemModal open={showCreateSystem} onClose={() => setShowCreateSystem(false)} />
      <CreateIdeaModal open={showCreateIdea} onClose={() => setShowCreateIdea(false)} />
    </div>
  );
}
```

### Systems Registry UI

**Component:** `SystemsGrid.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit, Trash2, Server } from 'lucide-react';

interface System {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'degraded';
  port: number;
  url: string;
  icon: string;
  color: string;
  tags: string[];
}

export function SystemsGrid({ systems, isLoading }) {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500'
  };

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="h-24 bg-gray-200 dark:bg-gray-700" />
          <CardContent className="h-32 bg-gray-100 dark:bg-gray-800" />
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {systems.map((system) => (
        <Card key={system.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: system.color + '20' }}
                >
                  <Server className="h-5 w-5" style={{ color: system.color }} />
                </div>
                <div>
                  <CardTitle className="text-lg">{system.name}</CardTitle>
                  <p className="text-xs text-gray-500">Port {system.port}</p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${statusColors[system.status]}`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {system.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {system.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => window.open(system.url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
              <Button size="sm" variant="ghost">
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Ideas Board (Kanban)

**Component:** `IdeasKanban.tsx`

```typescript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Clock, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentationService } from '@/services/documentationService';

const columns = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-200' },
  { id: 'done', label: 'Done', color: 'bg-green-200' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-200' }
];

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

export function IdeasKanban({ ideas, isLoading }) {
  const queryClient = useQueryClient();

  const updateIdeaMutation = useMutation({
    mutationFn: ({ id, status }) => documentationService.updateIdea(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['doc-ideas']);
      queryClient.invalidateQueries(['doc-stats']);
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    updateIdeaMutation.mutate({ id: draggableId, status: destination.droppableId });
  };

  const groupedIdeas = ideas.reduce((acc, idea) => {
    acc[idea.status] = acc[idea.status] || [];
    acc[idea.status].push(idea);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-3">
            {/* Column Header */}
            <div className={`${column.color} rounded-lg p-3`}>
              <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                {column.label}
                <Badge variant="secondary">{groupedIdeas[column.id]?.length || 0}</Badge>
              </h3>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {(groupedIdeas[column.id] || []).map((idea, index) => (
                    <Draggable key={idea.id} draggableId={idea.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-move hover:shadow-md transition-shadow ${
                            snapshot.isDragging ? 'shadow-xl' : ''
                          }`}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Priority Badge */}
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm line-clamp-2">{idea.title}</h4>
                              <span className={`w-2 h-2 rounded-full ${priorityColors[idea.priority]}`} />
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {idea.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {idea.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(idea.updatedAt).toLocaleDateString()}
                              </span>
                              {idea.files?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  {idea.files.length}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
```

### File Browser UI

**Component:** `FileBrowser.tsx`

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid, List, Search, Download, Trash2, FileText, Image, File } from 'lucide-react';
import { documentationService } from '@/services/documentationService';

export function FileBrowser() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: files, isLoading } = useQuery({
    queryKey: ['doc-files'],
    queryFn: documentationService.getAllFiles
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const filteredFiles = files?.data.filter((file) =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles?.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-3 space-y-2">
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  {file.mimeType.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400">
                      {getFileIcon(file.mimeType)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div>
                  <p className="text-xs font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="flex-1">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredFiles?.map((file) => (
            <Card key={file.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-4">
                <div className="text-gray-400">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Statistics Dashboard

**Component:** `StatisticsDashboard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function StatisticsDashboard({ stats }) {
  if (!stats) return <div>Loading statistics...</div>;

  const statusData = Object.entries(stats.ideas.byStatus).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(stats.ideas.byCategory).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.ideas.byPriority).map(([name, value]) => ({ name, value }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Ideas</p>
                <p className="text-3xl font-bold">{stats.ideas.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold">{stats.ideas.byStatus.done || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-3xl font-bold">{stats.ideas.byStatus.in_progress || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Backlog</p>
                <p className="text-3xl font-bold">{stats.ideas.byStatus.backlog || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <Bar dataKey="value" fill="#3b82f6" />
                <Tooltip />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### State Management (Zustand)

**Store:** `documentationStore.ts`

```typescript
import { create } from 'zustand';
import { documentationService } from '@/services/documentationService';

interface DocumentationState {
  systems: any[];
  ideas: any[];
  files: any[];
  stats: any;
  filters: {
    status: string[];
    category: string[];
    priority: string[];
    search: string;
  };
  setFilters: (filters: Partial<DocumentationState['filters']>) => void;
  fetchSystems: () => Promise<void>;
  fetchIdeas: () => Promise<void>;
  createIdea: (data: any) => Promise<void>;
  updateIdea: (id: string, data: any) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
}

export const useDocumentationStore = create<DocumentationState>((set) => ({
  systems: [],
  ideas: [],
  files: [],
  stats: null,
  filters: {
    status: [],
    category: [],
    priority: [],
    search: ''
  },
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  fetchSystems: async () => {
    const data = await documentationService.getSystems();
    set({ systems: data.data });
  },
  fetchIdeas: async () => {
    const data = await documentationService.getIdeas();
    set({ ideas: data.data });
  },
  createIdea: async (ideaData) => {
    await documentationService.createIdea(ideaData);
  },
  updateIdea: async (id, ideaData) => {
    await documentationService.updateIdea(id, ideaData);
  },
  deleteIdea: async (id) => {
    await documentationService.deleteIdea(id);
  }
}));
```

### Routing Integration

**Update:** `frontend/dashboard/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DocumentationPage } from './components/pages/DocumentationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes ... */}
        <Route path="/documentation" element={<DocumentationPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Update Navigation:** `frontend/dashboard/src/data/navigation.tsx`

```typescript
export const navigationGroups = [
  // ... existing groups ...
  {
    label: 'Documentation',
    items: [
      {
        label: 'Documentation Hub',
        path: '/documentation',
        icon: <FileText className="h-5 w-5" />,
        description: 'Manage documentation systems and ideas'
      }
    ]
  }
];
```

### Responsive Design

**Breakpoints:**
- Mobile: `< 768px` - Single column, simplified views
- Tablet: `768px - 1024px` - 2 columns, collapsible sidebars
- Desktop: `> 1024px` - Full multi-column layout

**Mobile Optimizations:**
- Kanban board becomes scrollable horizontal
- Statistics use simplified charts
- File browser defaults to list view
- Actions move to bottom sheets

### Loading & Error States

```typescript
// Skeleton Loader Example
export function IdeaCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Error Boundary Example
export function ErrorFallback({ error }) {
  return (
    <Card className="border-red-500">
      <CardContent className="p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <h3 className="font-semibold text-red-900">Something went wrong</h3>
        <p className="text-sm text-red-700">{error.message}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </CardContent>
    </Card>
  );
}
```

### UI Component Library

**Dependencies:**
- **Radix UI**: Accessible primitives (Dialog, Dropdown, Tabs, etc.)
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React DnD**: Drag-and-drop for Kanban
- **Recharts**: Data visualization
- **React Query**: Server state management
- **React Hook Form**: Form handling with validation

### User Workflows

**1. Creating a Documentation Idea:**
1. Click "New Idea" button
2. Fill form (title, description, category, priority, tags)
3. Optionally upload files
4. Submit → Appears in "Backlog" column
5. Drag to "In Progress" when starting work
6. Drag to "Done" when completed

**2. Managing Systems:**
1. Navigate to "Systems Registry" tab
2. View all documentation systems with status
3. Click "Open" to access system directly
4. Edit metadata or delete obsolete systems

**3. Browsing Files:**
1. Navigate to "Files" tab
2. Search by filename
3. Toggle between grid/list view
4. Download or delete files
5. View file metadata (size, upload date, linked ideas)

---

## 🔒 Security & Performance

### Security Measures

1. **Input Validation**
   - Use `express-validator` for all inputs
   - Sanitize SQL inputs (QuestDB parameterized queries)
   - Validate file uploads (type, size, content)

2. **Rate Limiting**
   - Per-IP rate limiting (express-rate-limit)
   - Per-user rate limiting (future, with auth)
   - Health check exemption (but monitor)

3. **CORS Configuration**
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3101'],
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

4. **Helmet Security Headers**
   ```javascript
   app.use(helmet({
     crossOriginResourcePolicy: { policy: 'cross-origin' },
     contentSecurityPolicy: false // Allow dashboard embeds
   }));
   ```

5. **File Upload Security**
   - Validate MIME types
   - Scan for malware (future: ClamAV)
   - Store outside webroot
   - Generate unique filenames

### Performance Optimizations

1. **Database Queries**
   - Use QuestDB SYMBOL type for low-cardinality fields
   - Create indexes on frequently queried columns
   - Implement query result caching (Redis future)
   - Use `LATEST ON` for most recent records

2. **Pagination**
   - Default: 20 items per page
   - Max: 100 items per page
   - Use cursor-based pagination for large datasets

3. **Response Compression**
   ```javascript
   app.use(compression());
   ```

4. **Caching Strategy**
   - ETag support for GET requests
   - Cache-Control headers
   - In-memory cache for stats (refresh every 5 minutes)

5. **Connection Pooling**
   - QuestDB connection pool (max 10 connections)
   - Reuse HTTP clients (keep-alive)

---

## ✅ Testing Strategy

### Unit Tests (Vitest)

**Coverage Target: 80%+**

```javascript
// tests/unit/services/ideasService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IdeasService } from '../../../src/services/ideasService.js';
import { QuestDBClient } from '../../../src/clients/questdbClient.js';

vi.mock('../../../src/clients/questdbClient.js');

describe('IdeasService', () => {
  let service;
  let mockQuestDB;

  beforeEach(() => {
    mockQuestDB = {
      query: vi.fn(),
      insert: vi.fn()
    };
    QuestDBClient.mockImplementation(() => mockQuestDB);
    service = new IdeasService();
  });

  it('should create idea with valid data', async () => {
    const idea = {
      title: 'Test Idea',
      description: 'Test Description',
      category: 'guide'
    };

    mockQuestDB.insert.mockResolvedValue({ id: 'idea-123' });

    const result = await service.createIdea(idea);

    expect(result).toHaveProperty('id');
    expect(result.title).toBe('Test Idea');
    expect(mockQuestDB.insert).toHaveBeenCalledWith(
      'documentation_ideas',
      expect.objectContaining(idea)
    );
  });

  it('should throw error for missing title', async () => {
    const idea = { description: 'No title' };

    await expect(service.createIdea(idea)).rejects.toThrow('Title is required');
  });
});
```

### Integration Tests (Supertest)

```javascript
// tests/integration/api/items.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/server.js';
import { setupTestDB, teardownTestDB } from '../../helpers/db.js';

describe('Ideas API Integration', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/v1/ideas', () => {
    it('should create idea and return 201', async () => {
      const idea = {
        title: 'Integration Test Idea',
        description: 'Test description',
        category: 'api',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/v1/ideas')
        .send(idea)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(idea.title);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/ideas')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/ideas', () => {
    it('should list ideas with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/ideas?limit=10&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### E2E Tests

```javascript
// tests/e2e/documentation-workflow.test.js
describe('Documentation Workflow E2E', () => {
  it('should complete full documentation lifecycle', async () => {
    // 1. Create system
    const system = await createSystem({
      name: 'Test System',
      status: 'online',
      port: 9999
    });

    // 2. Create idea linked to system
    const idea = await createIdea({
      title: 'Document Test System',
      category: 'api'
    });

    // 3. Upload file to idea
    const file = await uploadFile(idea.id, './test-diagram.png');

    // 4. Update idea status
    await updateIdea(idea.id, { status: 'in_progress' });

    // 5. Complete idea
    await updateIdea(idea.id, { status: 'done' });

    // 6. Verify stats updated
    const stats = await getStats();
    expect(stats.data.ideas.byStatus.done).toBeGreaterThan(0);

    // 7. Cleanup
    await deleteFile(file.id);
    await deleteIdea(idea.id);
    await deleteSystem(system.id);
  });
});
```

---

## 🚀 Deployment Plan

### Development Environment

```bash
# 1. Install dependencies
cd backend/api/documentation-api
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with local configuration

# 3. Initialize database
npm run db:init  # Runs QuestDB schema creation

# 4. Start development server
npm run dev  # Watches for changes

# 5. Run tests
npm test
```

### Production Deployment (Windows Native)

```powershell
# 1. Build application (if needed)
npm run build  # Transpile if using TypeScript

# 2. Install PM2 (process manager)
npm install -g pm2

# 3. Start service with PM2
pm2 start src/server.js --name documentation-api

# 4. Configure PM2 startup
pm2 startup
pm2 save

# 5. Monitor logs
pm2 logs documentation-api

# 6. Check status
pm2 status
```

### Environment Variables

```bash
# .env.production
PORT=3400
NODE_ENV=production
LOG_LEVEL=info

# Database
QUESTDB_HTTP_URL=http://localhost:9000
QUESTDB_TIMEOUT_MS=5000

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Security
CORS_ORIGIN=http://localhost:3101,http://production-domain.com
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9091
```

### Health Checks

```bash
# Health check endpoint
curl http://localhost:3400/health

# Expected response
{
  "status": "ok",
  "service": "documentation-api",
  "timestamp": "2025-10-13T20:00:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "storage": "accessible"
}
```

### Monitoring Integration

**Prometheus Metrics:**
```javascript
// src/metrics.js
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const ideasTotal = new client.Gauge({
  name: 'documentation_ideas_total',
  help: 'Total number of documentation ideas',
  labelNames: ['status', 'category']
});

// Update metrics periodically
setInterval(async () => {
  const stats = await getStats();
  Object.entries(stats.ideas.byStatus).forEach(([status, count]) => {
    ideasTotal.set({ status, category: 'all' }, count);
  });
}, 60000); // Every minute
```

---

## 📊 Success Metrics

### KPIs

1. **Adoption**
   - Number of ideas created per week
   - Number of active users
   - File uploads per month

2. **Performance**
   - API response time (p95 < 200ms)
   - Database query time (p95 < 50ms)
   - Uptime (> 99.9%)

3. **Quality**
   - Test coverage (> 80%)
   - Bug reports per release (< 5)
   - API error rate (< 1%)

### Milestones

- ✅ **Phase 1 Complete**: Core CRUD operational
- ✅ **Phase 2 Complete**: File uploads working
- ✅ **Phase 3 Complete**: Search & filtering implemented
- ✅ **Phase 4 Complete**: Audit & analytics live
- ✅ **Production Ready**: All tests passing, docs updated

---

## 📚 References

### External Resources

1. [Microsoft Azure - API Design Best Practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
2. [GitBook API Documentation](https://www.gitbook.com/blog/whereby-and-gitbook-api-docs)
3. [FormKiQ Document Management System](https://formkiq.com/)
4. [OpenAPI Specification 3.0.3](https://spec.openapis.org/oas/v3.0.3)
5. [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
6. [QuestDB Documentation](https://questdb.io/docs/)

### Internal Documentation

- [documentation-api.openapi.yaml](../specs/documentation-api.openapi.yaml) - API Contract (comprehensive spec with all endpoints, schemas, validation)
- [workspace.openapi.yaml](../specs/workspace.openapi.yaml) - Workspace API Spec (Idea Bank CRUD)
- [guide-documentation-api.md](../../guides/guide-documentation-api.md) - Implementation Guide
- [Workspace README](https://github.com/marceloterra/TradingSystem/blob/main/backend/api/workspace/README.md) - Reference Implementation
- [API Contracts Overview](../README.md) - Complete API catalog

---

## 🔄 Next Steps

1. **Review & Approve**: Team review of this plan
2. **Resource Allocation**: Assign developer(s) to Phase 1
3. **Sprint Planning**: Break Phase 1 into weekly sprints
4. **Kickoff Meeting**: Align on architecture and priorities
5. **Begin Implementation**: Start with Week 1 foundation tasks

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-13
**Status:** ✅ Ready for Review
**Next Review:** Before Phase 1 kickoff
