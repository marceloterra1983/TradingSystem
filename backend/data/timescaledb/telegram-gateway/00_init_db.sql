-- =====================================================
-- 00_init_db.sql - Ensure database and user exist
-- =====================================================
-- This script ensures the telegram_gateway database
-- and telegram user exist before other scripts run.
-- Scripts run in alphabetical order (00_ runs first).
-- =====================================================

-- Create user if doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'telegram'
   ) THEN
      CREATE ROLE telegram WITH LOGIN PASSWORD 'test_password';
   END IF;
END
$do$;

-- Grant necessary privileges
GRANT ALL PRIVILEGES ON DATABASE telegram_gateway TO telegram;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO telegram;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO telegram;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO telegram;

-- Ensure telegram user can create schemas
ALTER ROLE telegram CREATEDB;
ALTER DATABASE telegram_gateway OWNER TO telegram;

