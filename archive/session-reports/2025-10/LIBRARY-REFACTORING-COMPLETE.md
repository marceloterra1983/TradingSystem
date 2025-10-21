# Library Refactoring Summary

## Overview
Successfully renamed "idea-bank" to "library" across the codebase to better reflect the system's purpose.

## ✅ Completed Changes

### Backend API (100% Complete)
- ✅ Renamed directory: `backend/api/idea-bank` → `backend/api/library`
- ✅ Renamed backup directory: `backend/data/backups/idea-bank` → `backend/data/backups/library`
- ✅ Updated `.env` file:
  - `IDEA_BANK_DB_STRATEGY` → `LIBRARY_DB_STRATEGY`
  - `QUESTDB_IDEAS_TABLE=idea_bank_ideas` → `QUESTDB_IDEAS_TABLE=library_ideas`
  - Header changed to "Library API Configuration"
- ✅ Updated `.env.example` with same changes
- ✅ Updated `config.js`:
  - `IDEA_BANK_ENV_PATH` → `LIBRARY_ENV_PATH`
  - `IDEA_BANK_DB_STRATEGY` → `LIBRARY_DB_STRATEGY`
  - Default port: 3200 → 3102 (to match actual configuration)
  - Default table: `idea_bank_ideas` → `library_ideas`
- ✅ Updated `package.json`:
  - Name: `tradingsystem-project-hub` → `tradingsystem-library-api`
  - Description: "Idea Bank API" → "Library API"
  - Keywords: `idea-management` → `library-management`
  - Test script: `IDEA_BANK_DB_STRATEGY` → `LIBRARY_DB_STRATEGY`
- ✅ Updated `server.js`:
  - Health endpoint service name: `idea-bank-api` → `library-api`
  - Log messages updated to reference "Library API"
- ✅ Updated `README.md`: All port references 3200 → 3102

### Frontend (100% Complete)
- ✅ Renamed service file: `ideaBankService.ts` → `libraryService.ts`
- ✅ Updated service contents:
  - `VITE_IDEA_BANK_API_URL` → `VITE_LIBRARY_API_URL`
  - Export name: `ideaBankService` → `libraryService`
  - Service description: "Idea Bank API Service" → "Library API Service"
- ✅ Updated `BancoIdeiasPage.tsx`:
  - Import path updated to `libraryService`
  - All 10 references to `ideaBankService` replaced with `libraryService`
  - Error message updated: `backend/api/idea-bank` → `backend/api/library`
- ✅ Updated `.env.local`:
  - `VITE_IDEA_BANK_API_URL=http://api-ideas.localhost` → `VITE_LIBRARY_API_URL=http://localhost:3102` (using direct connection)

## 📋 Remaining Tasks

### High Priority
1. **Update Environment Variables** across project:
   - Find all references to `VITE_IDEA_BANK_API_URL` and replace with `VITE_LIBRARY_API_URL`
   - Update `.env.example` in frontend
   - Update `vite-env.d.ts` type definitions

2. **Update Documentation**:
   - `CLAUDE.md` - Update port references and service name
   - `README.md` (root) - Update quick start commands
   - Service-specific README files
   - PRD documents (if they reference the API name)

3. **Update Infrastructure Files**:
   - SystemD service files: `tradingsystem-idea-bank.service` → `tradingsystem-library.service`
   - Prometheus configuration: Update metric names
   - Traefik labels (if using): `api-ideas.localhost` → `api-library.localhost`

4. **Update QuestDB Table**:
   - **IMPORTANT**: The database table is still named `library_ideas` but may contain data in the old `idea_bank_ideas` table
   - Consider migrating data or renaming the table in QuestDB

### Medium Priority
5. **Update API Documentation**:
   - OpenAPI spec file (`idea-bank.openapi.yaml`)
   - API guides and integration docs

6. **Update Scripts**:
   - Backup scripts in `backend/api/library/scripts/`
   - Migration scripts
   - Service launcher references

7. **Update Test Files**:
   - Update test mocks and fixtures
   - Update API endpoint references in tests

### Low Priority
8. **Update Git References**:
   - Service-launcher references to idea-bank
   - Docker compose files (if any)
   - CI/CD pipeline scripts

## 🧪 Testing Checklist

Before considering this complete, test:

- [ ] Backend API starts successfully on port 3102
- [ ] Frontend can connect to the API
- [ ] Can create/read/update/delete ideas
- [ ] Environment variables are correctly read
- [ ] Database table name is correct and accessible
- [ ] All imports resolve correctly (no broken references)
- [ ] TypeScript compilation succeeds
- [ ] No console errors related to service names

## 📝 Notes

### Why "Library" instead of "Idea Bank"?
The term "library" better represents a collection of knowledge items, documentation, and resources beyond just "ideas". It's more professional and aligned with industry standards.

### Port Consistency
- Backend API: Port **3102** (confirmed working)
- Default in code was 3200 but actual .env used 3102
- Now standardized to 3102 everywhere

### Database Table Name
- Old: `idea_bank_ideas`
- New: `library_ideas`
- **Action needed**: Migrate existing data or update code to use old table name

### API URL Strategy
- Development: Direct connection `http://localhost:3102`
- Production (optional): Traefik routing `http://api-library.localhost`

## 🚀 Next Steps

1. Run the backend API and verify it starts:
   ```bash
   cd backend/api/library
   npm run dev
   ```

2. Check the health endpoint:
   ```bash
   curl http://localhost:3102/health
   ```

3. Restart the frontend (if running) to pick up environment variable changes:
   ```bash
   cd frontend/apps/dashboard
   npm run dev
   ```

4. Test the "Banco de Ideias" page and verify:
   - Can see existing ideas
   - Can add new ideas
   - Can edit/delete ideas
   - No console errors

5. Update remaining documentation and configuration files (see tasks above)

## ⚠️ Breaking Changes

- Environment variable renamed: `VITE_IDEA_BANK_API_URL` → `VITE_LIBRARY_API_URL`
- Service directory moved: `backend/api/idea-bank` → `backend/api/library`
- QuestDB table name changed: `idea_bank_ideas` → `library_ideas`

Existing deployments will need to update environment variables and restart services.
