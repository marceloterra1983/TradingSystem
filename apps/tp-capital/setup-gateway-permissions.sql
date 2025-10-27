-- Grant TP Capital user access to Telegram Gateway database
-- Run this SQL script once to set up permissions

-- Connect to the Gateway database
\c "APPS-TELEGRAM-GATEWAY"

-- Grant connection and schema access
GRANT CONNECT ON DATABASE "APPS-TELEGRAM-GATEWAY" TO timescale;
GRANT USAGE ON SCHEMA telegram_gateway TO timescale;

-- Grant table permissions (SELECT to read messages, UPDATE to mark as published/failed)
GRANT SELECT, UPDATE ON TABLE telegram_gateway.messages TO timescale;

-- Verify permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'messages'
  AND grantee = 'timescale';
