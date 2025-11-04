# Infrastructure Capability: Database Port Management

**Capability**: `infrastructure/database-port-management`  
**Type**: Delta Spec (for change: protect-database-ports)  

---

## ADDED Requirements

### Requirement: Protected Database Port Range

The system SHALL reserve ports 7000-7999 exclusively for database and data-related services to prevent port conflicts and ensure service stability.

#### Scenario: Database service uses protected port

- **GIVEN** a database service (TimescaleDB, QuestDB, Qdrant, Redis)
- **WHEN** the service is configured in docker-compose
- **THEN** it MUST use a port in the range 7000-7999
- **AND** the port MUST be documented in PORTS-CONVENTION.md

#### Scenario: Non-database service attempts to use protected port

- **GIVEN** an application or monitoring service
- **WHEN** the service is configured in docker-compose
- **THEN** it MUST NOT use any port in the range 7000-7999
- **AND** port conflict detection MUST alert if violation detected

#### Scenario: Port allocation follows sub-range convention

- **GIVEN** a new database service needs to be added
- **WHEN** assigning a port
- **THEN** it MUST follow the sub-range convention:
  - 7000-7099: Primary databases
  - 7100-7199: Database UIs
  - 7200-7299: Exporters
  - 7300-7999: Reserved

---

### Requirement: Database Port Mapping Convention

The system SHALL use environment variables for all database port configurations to enable centralized management and prevent hardcoded values.

#### Scenario: TimescaleDB port configuration

- **GIVEN** TimescaleDB service in docker-compose.database.yml
- **WHEN** defining port mapping
- **THEN** it SHALL use `${TIMESCALEDB_PORT:-7000}:5432` format
- **AND** TIMESCALEDB_PORT SHALL have default value 7000
- **AND** internal port SHALL remain 5432 (PostgreSQL standard)

#### Scenario: Application connects to database

- **GIVEN** an application service (Workspace, TP Capital, etc.)
- **WHEN** configuring database connection
- **THEN** it SHALL read TIMESCALEDB_PORT from centralized .env
- **AND** it SHALL NOT hardcode port numbers
- **AND** connection MUST succeed on port 7000

#### Scenario: Multiple database instances

- **GIVEN** primary and backup database instances
- **WHEN** assigning ports
- **THEN** primary SHALL use base port (e.g., 7000)
- **AND** backup SHALL use base port + 1 (e.g., 7001)
- **AND** ports SHALL be sequential for same service type

---

### Requirement: Data Persistence with Named Volumes

The system SHALL use Docker named volumes for all database data storage to ensure data persists across container recreations and port changes.

#### Scenario: Database container is recreated due to port change

- **GIVEN** a database container using named volume
- **WHEN** the container is stopped and recreated with new port mapping
- **THEN** all data MUST be preserved
- **AND** data MUST be immediately accessible in new container
- **AND** no data loss SHALL occur

#### Scenario: Volume verification before migration

- **GIVEN** a database migration is planned
- **WHEN** pre-migration checks are executed
- **THEN** all required named volumes MUST exist
- **AND** volumes MUST be healthy
- **AND** volume sizes MUST match expected data size

#### Scenario: Accidental volume deletion prevention

- **GIVEN** database volumes contain critical data
- **WHEN** executing cleanup commands
- **THEN** volumes MUST have persistent naming (e.g., `data-timescale-data`)
- **AND** volumes MUST NOT be pruned automatically
- **AND** deletion MUST require explicit confirmation

---

### Requirement: Automated Port Conflict Detection

The system SHALL provide automated tooling to detect port conflicts and unauthorized usage of the protected database port range.

#### Scenario: Port conflict detected before startup

- **GIVEN** a service attempts to start on a database-reserved port
- **WHEN** port conflict detection runs
- **THEN** it SHALL identify the conflict
- **AND** it SHALL report which service is causing the conflict
- **AND** it SHALL suggest available alternative ports

#### Scenario: Unauthorized port usage in protected range

- **GIVEN** the protected range 7000-7999 is reserved for databases
- **WHEN** a non-database service uses a port in this range
- **THEN** validation SHALL fail
- **AND** an alert SHALL be raised
- **AND** the service SHALL be prevented from starting

#### Scenario: Periodic port usage audit

- **GIVEN** the system is running with multiple services
- **WHEN** periodic port audit executes (daily via cron)
- **THEN** it SHALL verify all ports in 7000-7999 are used only by databases
- **AND** it SHALL report any violations
- **AND** results SHALL be logged for review

---

### Requirement: Migration Safety with Comprehensive Backups

The system SHALL create comprehensive backups of all database data and configuration before executing port migration to enable safe rollback.

#### Scenario: Pre-migration backup creation

- **GIVEN** port migration is about to execute
- **WHEN** backup phase runs
- **THEN** all database dumps SHALL be created (pg_dumpall, tar archives)
- **AND** all Docker volumes SHALL be backed up
- **AND** all configuration files SHALL be backed up (.env, docker-compose)
- **AND** backup location SHALL be timestamped and logged

#### Scenario: Backup verification

- **GIVEN** backups have been created
- **WHEN** backup verification runs
- **THEN** each backup file SHALL be validated (non-zero size, valid format)
- **AND** checksums SHALL be computed and stored
- **AND** backup metadata SHALL be logged (size, timestamp, location)

#### Scenario: Rollback from backup

- **GIVEN** migration has failed or needs to be reverted
- **WHEN** rollback procedure executes
- **THEN** previous configuration SHALL be restored from backup
- **AND** containers SHALL restart with old ports
- **AND** all services SHALL be accessible on original ports
- **AND** rollback SHALL complete in < 5 minutes

---

### Requirement: Claude Agent Integration for Database Port Protection

The system SHALL provide Claude AI agents with capabilities to monitor, validate, and protect the database port range.

#### Scenario: Docker health optimizer validates database ports

- **GIVEN** docker-health-optimizer agent is invoked
- **WHEN** checking Docker health
- **THEN** it SHALL validate all database containers use ports 7000-7999
- **AND** it SHALL report any port conflicts
- **AND** it SHALL suggest corrective actions

#### Scenario: Database port guardian detects unauthorized usage

- **GIVEN** database-port-guardian agent monitors port usage
- **WHEN** a non-database service uses port in 7000-7999
- **THEN** it SHALL raise an alert
- **AND** it SHALL identify the violating service
- **AND** it SHALL provide remediation steps

#### Scenario: Migration assistance via custom command

- **GIVEN** user invokes `/protect-databases` command
- **WHEN** command executes
- **THEN** it SHALL show current database status
- **AND** it SHALL create backups
- **AND** it SHALL display migration plan
- **AND** it SHALL optionally execute migration with confirmation

---

## MODIFIED Requirements

### Requirement: Docker Compose Database Stack Configuration

The database stack docker-compose file SHALL use environment-variable-based port mapping for all external port assignments.

#### Scenario: Port configured via environment variable

- **GIVEN** database service defined in docker-compose.database.yml
- **WHEN** port mapping is specified
- **THEN** it SHALL use format `${SERVICE_PORT:-default}:internal-port`
- **AND** environment variable SHALL be defined in root .env
- **AND** default value SHALL be in protected range 7000-7999

#### Scenario: Internal port remains unchanged

- **GIVEN** a database service has standard internal port (e.g., PostgreSQL 5432)
- **WHEN** remapping external port
- **THEN** internal port SHALL remain unchanged
- **AND** only external port SHALL be in 7000-7999 range
- **AND** container-to-container communication SHALL use service names

---

### Requirement: Centralized Environment Configuration

All database connection configurations SHALL reference the centralized .env file to ensure consistency and prevent configuration drift.

#### Scenario: Application loads database configuration

- **GIVEN** an application service needs to connect to a database
- **WHEN** loading configuration
- **THEN** it SHALL import from centralized .env (project root)
- **AND** it SHALL use `backend/shared/config/load-env.js` helper
- **AND** it SHALL NOT create local .env files
- **AND** port value SHALL match database service external port

---

## REMOVED Requirements

None. This change is additive and modifies existing requirements without removing functionality.

---

**Spec Version**: 1.0  
**Created**: 2025-11-03  
**Status**: Delta (pending merge to specs/)  

