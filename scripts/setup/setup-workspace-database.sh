#!/usr/bin/env bash
set -euo pipefail

echo "🗄️  Workspace API - Database Setup"
echo "==================================="
echo ""

# Check if container is running
if ! docker ps | grep -q "data-frontend-apps"; then
    echo "❌ Database container 'data-frontend-apps' is not running!"
    echo "   Start it with: docker compose -f tools/compose/docker-compose.frontend-apps.yml up -d"
    exit 1
fi

echo "📝 Creating database user and schema..."
echo ""

# SQL script
cat << 'EOF' | docker exec -i data-frontend-apps psql -U frontend_admin -d frontend_apps
-- Create workspace user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_workspace') THEN
        CREATE ROLE app_workspace WITH LOGIN PASSWORD 'app_workspace_dev_password';
        RAISE NOTICE 'Created role app_workspace';
    ELSE
        RAISE NOTICE 'Role app_workspace already exists';
    END IF;
END
$$;

-- Create workspace schema
CREATE SCHEMA IF NOT EXISTS workspace;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA workspace TO app_workspace;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workspace TO app_workspace;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workspace TO app_workspace;
ALTER DEFAULT PRIVILEGES IN SCHEMA workspace GRANT ALL ON TABLES TO app_workspace;
ALTER DEFAULT PRIVILEGES IN SCHEMA workspace GRANT ALL ON SEQUENCES TO app_workspace;

-- Verify
SELECT 'User created/verified: ' || rolname FROM pg_catalog.pg_roles WHERE rolname = 'app_workspace';
SELECT 'Schema exists: ' || schema_name FROM information_schema.schemata WHERE schema_name = 'workspace';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "📊 Connection details:"
    echo "   User:     app_workspace"
    echo "   Password: app_workspace_dev_password"
    echo "   Database: frontend_apps"
    echo "   Schema:   workspace"
    echo "   Port:     5444"
    echo ""
    echo "🔗 Connection string:"
    echo "   postgresql://app_workspace:app_workspace_dev_password@localhost:5444/frontend_apps?schema=workspace"
    echo ""
else
    echo ""
    echo "❌ Database setup failed!"
    exit 1
fi
