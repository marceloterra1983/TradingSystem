#!/bin/bash
#
# Neon Workspace Initialization Script
# 
# This script initializes the Neon PostgreSQL database for the Workspace app.
# It creates the database, schema, tables, indexes, and seeds initial data.
#
# Usage:
#   bash scripts/database/init-neon-workspace.sh
#
# Requirements:
#   - Neon containers must be running (docker compose -f tools/compose/docker-compose.neon.yml up -d)
#   - psql client installed (or run via docker exec)
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NEON_CONTAINER="neon-compute"
NEON_USER="postgres"
NEON_DATABASE="workspace"
NEON_SCHEMA="workspace"

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Neon is running
check_neon_status() {
    log_info "Checking if Neon containers are running..."
    
    if ! docker ps | grep -q "$NEON_CONTAINER"; then
        log_error "Neon container '$NEON_CONTAINER' is not running!"
        log_info "Start Workspace stack with: bash scripts/docker/start-workspace-stack.sh"
        log_info "Or: docker compose -f tools/compose/docker-compose.workspace-stack.yml up -d"
        exit 1
    fi
    
    log_info "✓ Neon container is running"
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    log_info "Waiting for PostgreSQL to be ready..."
    
    for i in {1..30}; do
        if docker exec "$NEON_CONTAINER" pg_isready -U "$NEON_USER" -h localhost -p 55432 > /dev/null 2>&1; then
            log_info "✓ PostgreSQL is ready"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    log_error "PostgreSQL did not become ready in time"
    exit 1
}

# Create database
create_database() {
    log_info "Creating database '$NEON_DATABASE'..."
    
    # Check if database already exists
    DB_EXISTS=$(docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -tAc "SELECT 1 FROM pg_database WHERE datname='$NEON_DATABASE'" 2>/dev/null || echo "0")
    
    if [ "$DB_EXISTS" = "1" ]; then
        log_warn "Database '$NEON_DATABASE' already exists, skipping creation"
    else
        docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -c "CREATE DATABASE $NEON_DATABASE;"
        log_info "✓ Database '$NEON_DATABASE' created"
    fi
}

# Create schema
create_schema() {
    log_info "Creating schema '$NEON_SCHEMA'..."
    
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DATABASE" <<-EOSQL
        CREATE SCHEMA IF NOT EXISTS $NEON_SCHEMA;
EOSQL
    
    log_info "✓ Schema '$NEON_SCHEMA' created"
}

# Create tables
create_tables() {
    log_info "Creating tables..."
    
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DATABASE" <<-EOSQL
        -- Workspace Items Table
        CREATE TABLE IF NOT EXISTS $NEON_SCHEMA.workspace_items (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'review', 'in-progress', 'completed', 'rejected')),
            tags TEXT[] DEFAULT '{}',
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ,
            created_by VARCHAR(100),
            updated_by VARCHAR(100)
        );

        -- Workspace Categories Table
        CREATE TABLE IF NOT EXISTS $NEON_SCHEMA.workspace_categories (
            name VARCHAR(50) PRIMARY KEY,
            display_name VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
EOSQL
    
    log_info "✓ Tables created"
}

# Create indexes
create_indexes() {
    log_info "Creating indexes..."
    
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DATABASE" <<-EOSQL
        -- Indexes for workspace_items
        CREATE INDEX IF NOT EXISTS idx_items_category ON $NEON_SCHEMA.workspace_items(category);
        CREATE INDEX IF NOT EXISTS idx_items_status ON $NEON_SCHEMA.workspace_items(status);
        CREATE INDEX IF NOT EXISTS idx_items_priority ON $NEON_SCHEMA.workspace_items(priority);
        CREATE INDEX IF NOT EXISTS idx_items_created_at ON $NEON_SCHEMA.workspace_items(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_items_tags ON $NEON_SCHEMA.workspace_items USING GIN(tags);
        CREATE INDEX IF NOT EXISTS idx_items_metadata ON $NEON_SCHEMA.workspace_items USING GIN(metadata);
        
        -- Index for workspace_categories
        CREATE INDEX IF NOT EXISTS idx_categories_active ON $NEON_SCHEMA.workspace_categories(is_active) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON $NEON_SCHEMA.workspace_categories(sort_order);
EOSQL
    
    log_info "✓ Indexes created"
}

# Seed initial data
seed_data() {
    log_info "Seeding initial data..."
    
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DATABASE" <<-EOSQL
        -- Insert default categories
        INSERT INTO $NEON_SCHEMA.workspace_categories (name, display_name, description, sort_order) VALUES
            ('documentacao', 'Documentação', 'Documentação técnica e arquitetural', 1),
            ('coleta-dados', 'Coleta de Dados', 'Sistemas de captura e ingestão de dados', 2),
            ('banco-dados', 'Banco de Dados', 'Schemas, migrations e otimizações', 3),
            ('analise-dados', 'Análise de Dados', 'Pipelines de análise e ML', 4),
            ('gestao-riscos', 'Gestão de Riscos', 'Risk management e compliance', 5),
            ('dashboard', 'Dashboard', 'Interface e visualizações', 6)
        ON CONFLICT (name) DO NOTHING;
EOSQL
    
    log_info "✓ Initial data seeded"
}

# Grant permissions
grant_permissions() {
    log_info "Granting permissions..."
    
    docker exec "$NEON_CONTAINER" psql -U "$NEON_USER" -h localhost -p 55432 -d "$NEON_DATABASE" <<-EOSQL
        -- Grant schema usage
        GRANT USAGE ON SCHEMA $NEON_SCHEMA TO $NEON_USER;
        
        -- Grant table permissions
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $NEON_SCHEMA TO $NEON_USER;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA $NEON_SCHEMA TO $NEON_USER;
        
        -- Grant default privileges for future objects
        ALTER DEFAULT PRIVILEGES IN SCHEMA $NEON_SCHEMA GRANT ALL PRIVILEGES ON TABLES TO $NEON_USER;
        ALTER DEFAULT PRIVILEGES IN SCHEMA $NEON_SCHEMA GRANT ALL PRIVILEGES ON SEQUENCES TO $NEON_USER;
EOSQL
    
    log_info "✓ Permissions granted"
}

# Display connection info
display_connection_info() {
    echo ""
    log_info "=========================================="
    log_info "Neon Workspace Database Initialized!"
    log_info "=========================================="
    echo ""
    echo "Connection Details:"
    echo "  Host: localhost"
    echo "  Port: 5433"
    echo "  Database: $NEON_DATABASE"
    echo "  Schema: $NEON_SCHEMA"
    echo "  User: $NEON_USER"
    echo ""
    echo "Connection String:"
    echo "  postgresql://$NEON_USER:PASSWORD@localhost:5433/$NEON_DATABASE"
    echo ""
    echo "Test Connection:"
    echo "  psql -h localhost -p 5433 -U $NEON_USER -d $NEON_DATABASE"
    echo ""
    echo "Or via Docker:"
    echo "  docker exec -it $NEON_CONTAINER psql -U $NEON_USER -d $NEON_DATABASE"
    echo ""
    log_info "=========================================="
}

# Main execution
main() {
    log_info "Starting Neon Workspace initialization..."
    echo ""
    
    check_neon_status
    wait_for_postgres
    create_database
    create_schema
    create_tables
    create_indexes
    seed_data
    grant_permissions
    display_connection_info
    
    log_info "✓ Initialization complete!"
}

# Run main function
main "$@"

