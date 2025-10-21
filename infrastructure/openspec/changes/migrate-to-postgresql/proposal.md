# Migrate to PostgreSQL with Prisma ORM

## Why

The current system uses LowDB (JSON file-based storage) for Idea Bank and Documentation data, which has several limitations:
- No concurrent access support
- Limited querying capabilities
- No schema validation
- Poor scalability
- No backup/restore functionality
- No transaction support

Additionally, QuestDB is currently used as the primary storage for TP Capital signals, but we need better reporting capabilities and integration with other data sources.

Key problems to solve:
- **Data Integrity**: LowDB lacks proper data validation and constraints
- **Concurrency**: Multiple users can't safely access/modify data simultaneously
- **Performance**: JSON file operations become slow with growing datasets
- **Integration**: Difficult to combine data from different sources (QuestDB, LowDB)
- **Maintenance**: No proper backup/restore procedures
- **Development**: No type safety or ORM features

## What Changes

- **Migrate Data Storage**
  - Move Idea Bank data from LowDB to PostgreSQL
  - Move Documentation data from LowDB to PostgreSQL
  - Configure QuestDB → PostgreSQL nightly exports
  - Set up Prisma ORM for both Node.js APIs

- **Implement Database Features**
  - Add proper schemas with constraints
  - Configure indexes for performance
  - Set up audit logging
  - Implement backup/restore procedures
  - Configure monitoring and alerts

- **Update APIs**
  - Integrate Prisma ORM in Node.js services
  - Add transaction support
  - Implement proper error handling
  - Add data validation
  - Update API documentation

- **Add Integration Features**
  - Configure QuestDB export job
  - Set up data synchronization
  - Implement reporting views
  - Add monitoring dashboards

## Impact

- **Affected specs**: Creates new `data-migration` capability
- **Affected code**:
  - `backend/api/idea-bank/` - Complete storage layer rewrite
  - `backend/api/documentation-api/` - Storage layer update
  - `backend/data/` - New PostgreSQL schemas and migrations
  - `backend/services/` - QuestDB export service
  - `infrastructure/` - Database configurations
  - CI/CD pipelines - Database deployment

- **Database Changes**:
  - New PostgreSQL schemas
  - Prisma migrations
  - Data transfer scripts
  - Integration configurations

- **Breaking changes**: None (transparent to API consumers)
- **Migration path**:
  1. Deploy PostgreSQL
  2. Run migrations
  3. Transfer data
  4. Switch APIs
  5. Verify functionality

- **Dependencies**:
  - PostgreSQL 15+
  - Prisma ORM
  - pg_dump/pg_restore
  - node-postgres
  - TimescaleDB extension

- **Operations Impact**:
  - New backup procedures
  - Additional monitoring
  - Database maintenance tasks
  - Performance tuning needed

## Rollback Plan

1. **Preparation**:
   - Keep LowDB files until migration is verified
   - Maintain dual-write capability for 24h
   - Back up all PostgreSQL data

2. **Rollback Steps**:
   - Switch APIs back to LowDB
   - Verify data consistency
   - Clean up PostgreSQL data
   - Remove Prisma configuration

3. **Verification**:
   - Run API tests
   - Check data integrity
   - Verify application functionality