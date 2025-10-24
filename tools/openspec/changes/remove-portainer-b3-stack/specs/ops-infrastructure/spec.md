## ADDED Requirements

### Requirement: Auxiliary Services Managed Locally
The platform SHALL operate auxiliary services without relying on Portainer or other external container orchestrators.

#### Scenario: Local helper scripts start services
- **GIVEN** a developer runs the provided startup scripts
- **WHEN** the scripts complete
- **THEN** no Portainer endpoints, credentials, or stacks are required for auxiliary services to run.

### Requirement: Legacy B3 Stack Removed
The platform SHALL not include the legacy B3 System stack or its artifacts.

#### Scenario: Repository search for B3 System assets
- **WHEN** a team member searches the repository for the legacy B3 System compose files or scripts
- **THEN** no active configuration remains, and only archival references (if any) are left for historical context.
