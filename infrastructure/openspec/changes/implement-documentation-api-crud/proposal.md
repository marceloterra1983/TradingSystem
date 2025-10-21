# Implement Documentation API CRUD

## Why

The Documentation API currently only provides placeholder health check and stub endpoints. The system needs a fully functional documentation management service to:
- Track all documentation systems (Docusaurus, APIs, tools) with status monitoring
- Manage documentation improvement ideas with Kanban workflow
- Handle file attachments for documentation artifacts
- Provide analytics and statistics on documentation health

This centralizes documentation governance and gives teams visibility into documentation coverage and quality.

## What Changes

- **Add QuestDB persistence** with 4 tables (systems, ideas, files, audit_log)
- **Add CRUD API endpoints** for systems, ideas, and files (`/api/v1/*`)
- **Add statistics endpoint** aggregating metrics by status, category, priority
- **Add file upload/download** with multer middleware and filesystem storage
- **Add validation** with express-validator for all inputs
- **Add frontend integration** with React components (Kanban, Systems Grid, File Browser, Statistics Dashboard)
- **Add comprehensive tests** (unit, integration, E2E)

## Impact

- **Affected specs**: Creates new `documentation-api` capability
- **Affected code**:
  - `backend/api/documentation-api/src/` - Complete rewrite with layered architecture
  - `frontend/apps/dashboard/src/components/documentation/` - New React components
  - `frontend/apps/dashboard/src/services/documentationService.ts` - New API client
  - `frontend/apps/dashboard/src/App.tsx` - Add `/documentation` route
  - QuestDB schemas - 4 new tables

- **Dependencies**:
  - Backend: `express-validator`, `multer` (new)
  - Frontend: `@hello-pangea/dnd`, `recharts`, `@tanstack/react-query` (existing)

- **Breaking changes**: None (entirely new functionality)
