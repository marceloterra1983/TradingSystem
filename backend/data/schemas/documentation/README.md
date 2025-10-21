# Documentation API Schemas

This directory contains QuestDB schema definitions for the Documentation API service.

## Schema Files

1. **01_documentation_systems.sql** - Systems registry and monitoring
2. **02_documentation_ideas.sql** - Kanban-style idea management
3. **03_documentation_files.sql** - File attachments management
4. **04_documentation_audit_log.sql** - Audit trail for all changes

## Table Relationships

- `documentation_ideas.system_id` → `documentation_systems.id` (optional)
- `documentation_files.idea_id` → `documentation_ideas.id` (optional)
- `documentation_files.system_id` → `documentation_systems.id` (optional)
- `documentation_audit_log.record_id` → Any table record ID

## Usage

Execute schemas in order:

```sql
-- Run each schema file in numerical order
\i 01_documentation_systems.sql
\i 02_documentation_ideas.sql
\i 03_documentation_files.sql
\i 04_documentation_audit_log.sql
```

## QuestDB Considerations

All tables include:
- `designated_timestamp` for time-series queries
- UUID primary keys with `random_uuid()` default
- Proper indexes for time-series performance
- JSON fields stored as VARCHAR for flexibility

## Data Types

- **UUID**: Primary keys and foreign keys
- **VARCHAR**: Text fields with length limits
- **TEXT**: Large text content
- **TIMESTAMP**: Dates and times
- **INTEGER**: Numeric values
- **BOOLEAN**: True/false flags