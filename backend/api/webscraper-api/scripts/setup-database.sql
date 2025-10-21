-- ============================================================================
-- WebScraper API - Database Setup
-- ============================================================================
-- Creates user, schema, and grants for the webscraper-api service
-- 
-- Usage:
--   docker exec -i data-frontend-apps psql -U frontend_admin -d frontend_apps < setup-database.sql
--
-- Or via psql:
--   psql -U frontend_admin -d frontend_apps -f setup-database.sql
-- ============================================================================

-- Create app_webscraper user (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_webscraper') THEN
    CREATE ROLE app_webscraper WITH LOGIN PASSWORD 'app_webscraper_dev_password';
    RAISE NOTICE 'Created role: app_webscraper';
  ELSE
    RAISE NOTICE 'Role app_webscraper already exists';
  END IF;
END $$;

-- Create webscraper schema (if not exists)
CREATE SCHEMA IF NOT EXISTS webscraper;

-- Grant schema usage and creation privileges
GRANT USAGE, CREATE ON SCHEMA webscraper TO app_webscraper;

-- Grant all privileges on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA webscraper TO app_webscraper;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA webscraper TO app_webscraper;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA webscraper
  GRANT ALL PRIVILEGES ON TABLES TO app_webscraper;

ALTER DEFAULT PRIVILEGES IN SCHEMA webscraper
  GRANT ALL PRIVILEGES ON SEQUENCES TO app_webscraper;

-- Verify setup
SELECT 
  'User created' AS status,
  rolname AS username
FROM pg_roles 
WHERE rolname = 'app_webscraper';

SELECT 
  'Schema created' AS status,
  schema_name,
  schema_owner
FROM information_schema.schemata 
WHERE schema_name = 'webscraper';

-- Display granted privileges
SELECT 
  'Privileges granted' AS status,
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'app_webscraper' AND table_schema = 'webscraper'
LIMIT 5;
