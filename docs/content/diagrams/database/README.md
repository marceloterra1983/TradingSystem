---
title: "Workspace - Neon PostgreSQL Architecture Diagrams"
slug: /diagrams/database/README
description: "PlantUML diagrams documenting the Workspace stack after the Neon PostgreSQL migration."
tags: [database, documentation, diagrams, plantuml]
domain: database
type: guide
summary: "PlantUML architecture diagrams for Workspace application after Neon PostgreSQL migration"
status: active
owner: ArchitectureGuild
last_review: "2025-11-08"
lastReviewed: '2025-11-08'
---
---

# Workspace - Neon PostgreSQL Architecture Diagrams

**Status**: ✅ Complete  
**Last Updated**: 2025-11-03  
**Diagrams**: 3 PlantUML files

---

## Overview

This directory contains PlantUML diagrams documenting the Workspace application architecture after migration to Neon PostgreSQL.

### Diagrams Available

1. **[workspace-neon-architecture.puml](workspace-neon-architecture.puml)** - Full system architecture (C4 Model)
2. **[workspace-neon-data-flow.puml](workspace-neon-data-flow.puml)** - Request/response sequence diagram
3. **[workspace-neon-database-schema.puml](workspace-neon-database-schema.puml)** - Complete database schema (ER diagram)

---

## 1. Architecture Diagram

**File**: `workspace-neon-architecture.puml`

**Shows**:
- Workspace API components (routes, validators, middleware, client)
- Neon cluster (compute, pageserver, safekeeper)
- Storage layer (Docker volumes)
- Client applications (Dashboard)
- Fallback database (TimescaleDB)
- All relationships and protocols

**Key Components**:
- **Neon Compute**: PostgreSQL 17 endpoint (port 5433)
- **Neon Pageserver**: Storage layer (ports 6400, 9898)
- **Neon Safekeeper**: WAL service (ports 5454, 7676)
- **NeonClient**: Connection pooling and query execution
- **Database Factory**: Strategy pattern for switching databases

**Render Command**:
```bash
plantuml workspace-neon-architecture.puml
```

---

## 2. Data Flow Diagram

**File**: `workspace-neon-data-flow.puml`

**Shows**:
- Complete request flow for `POST /api/items` (Create Item)
- Validation pipeline (input validation, category check)
- Neon write path (Compute → Safekeeper → Pageserver → Storage)
- Response mapping (snake_case → camelCase)
- Performance breakdown (~85ms total)

**Request Steps**:
1. Developer creates item via Dashboard
2. Dashboard sends POST request to API
3. Middleware applies security/rate limiting
4. Validators check input fields and category
5. NeonClient inserts into database
6. Neon Compute writes to Safekeeper (durability)
7. Neon Pageserver stores page to disk
8. Response mapped and returned
9. Dashboard updates UI (table + Kanban)

**Render Command**:
```bash
plantuml workspace-neon-data-flow.puml
```

---

## 3. Database Schema Diagram

**File**: `workspace-neon-database-schema.puml`

**Shows**:
- Complete ER diagram with all tables, columns, and types
- Foreign key relationships (workspace_items → workspace_categories)
- Indexes (B-tree and GIN for arrays/JSONB)
- Triggers (auto-update updated_at)
- Views (aggregations and filtered views)
- Sample data and metadata examples

**Tables**:
- **workspace_items**: Main table (~10k rows expected)
  - Primary Key: `id` (SERIAL)
  - Foreign Key: `category` → workspace_categories(name)
  - Arrays: `tags` (TEXT[])
  - JSONB: `metadata` (flexible data)
  
- **workspace_categories**: Lookup table (6 fixed rows)
  - Primary Key: `name` (VARCHAR)
  - Unique: `display_name`
  - Seeded with 6 default categories

**Views**:
- `v_active_items_by_category`: Aggregates items per category
- `v_high_priority_items`: Filters high/critical priority items

**Render Command**:
```bash
plantuml workspace-neon-database-schema.puml
```

---

## Viewing the Diagrams

### Option 1: VSCode Extension

1. Install **PlantUML** extension (jebbs.plantuml)
2. Open any `.puml` file
3. Press `Alt+D` to preview

### Option 2: Command Line

```bash
# Install PlantUML (requires Java)
sudo apt-get install plantuml

# Render all diagrams
plantuml docs/content/diagrams/database/*.puml

# Output: PNG files in same directory
```

### Option 3: Online Editor

1. Copy `.puml` content
2. Paste into https://www.plantuml.com/plantuml/uml/
3. View rendered diagram instantly

### Option 4: Docusaurus Integration

PlantUML diagrams can be embedded in MDX files:

```mdx
import PlantUMLDiagram from '@site/src/components/PlantUMLDiagram';

<PlantUMLDiagram src="/diagrams/database/workspace-neon-architecture.puml" />
```

---

## Diagram Maintenance

### When to Update

- **Architecture Diagram**: When adding/removing Neon components or changing ports
- **Data Flow Diagram**: When modifying API logic or validation rules
- **Schema Diagram**: When changing database schema (tables, columns, indexes)

### How to Update

1. Edit the `.puml` file
2. Test rendering locally
3. Commit changes with clear message
4. Update this README if adding new diagrams

### Conventions

- Use **C4 Model** notation for architecture diagrams
- Use **UML Sequence** for data flow diagrams
- Use **ER Diagrams** for database schemas
- Include **notes** for complex logic
- Add **legends** for clarity
- Keep **colors consistent** across diagrams

---

## Diagram Exports

### Export to PNG (High Resolution)

```bash
# Export with 300 DPI for documentation
plantuml -tpng -SPLANTUML_LIMIT_SIZE=8192 workspace-neon-architecture.puml

# Export all diagrams
for f in *.puml; do
    plantuml -tpng "$f"
done
```

### Export to SVG (Vector Graphics)

```bash
# SVG for web integration
plantuml -tsvg workspace-neon-architecture.puml
```

### Export to PDF (Printable)

```bash
# PDF for design reviews
plantuml -tpdf workspace-neon-architecture.puml
```

---

## Related Documentation

- **Setup Guide**: `docs/content/database/neon-setup.mdx`
- **ADR**: `docs/content/reference/adrs/007-workspace-neon-migration.md`
- **Build Guide**: `tools/compose/NEON-BUILD.md`
- **Validation**: `docs/content/database/neon-validation.md`

---

## Diagram Legend

### Shapes

- **Container**: Service/application (rounded rectangle)
- **Component**: Internal module (rectangle)
- **Database**: Data storage (cylinder)
- **Person**: End user (stick figure)

### Colors

- **Blue (#667EEA)**: Workspace components
- **Teal (#00E5CC)**: Neon components
- **Green (#48BB78)**: Compute layer
- **Orange (#F6AD55)**: Storage layer
- **Gray**: External systems

### Arrows

- **Solid line**: Synchronous call
- **Dashed line**: Asynchronous/event
- **Thick line**: High-volume traffic
- **Bidirectional**: Two-way communication

---

## Examples

### Embedding in Documentation

```mdx
---
title: Workspace Architecture
---

## System Overview

The Workspace application uses Neon PostgreSQL for data persistence.

See the [architecture diagram source](workspace-neon-architecture.puml) for the complete system design.

### Key Components

- **Neon Compute**: Handles SQL queries (stateless)
- **Neon Pageserver**: Manages persistent storage
- **Neon Safekeeper**: Ensures durability via WAL

See the [complete architecture diagram](workspace-neon-architecture.puml) for details.
```

---

## Tools & Resources

- **PlantUML**: https://plantuml.com/
- **C4 Model**: https://c4model.com/
- **VSCode Extension**: https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml
- **Online Editor**: https://www.plantuml.com/plantuml/uml/

---

## Contributing

When updating diagrams:

1. Keep diagrams **DRY** (Don't Repeat Yourself) - extract common elements
2. Use **includes** for shared styles: `!include <C4/C4_Container>`
3. Add **notes** to explain complex relationships
4. Test rendering before committing
5. Export PNG/SVG for easy viewing

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-03 | Initial diagrams created | AI Agent |
| | | - Architecture (C4 Model) | |
| | | - Data flow (Sequence) | |
| | | - Database schema (ER) | |

---

**Maintained By**: TradingSystem Architecture Team  
**Review Frequency**: Quarterly or on major changes
