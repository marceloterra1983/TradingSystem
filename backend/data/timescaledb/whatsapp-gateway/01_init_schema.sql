-- ==============================================================================
-- WhatsApp Gateway - Schema Initialization
-- ==============================================================================
-- Database: whatsapp_gateway
-- Purpose: Complete message storage similar to Telegram stack
-- Features: Messages, Contacts, Groups, Media, Sync tracking
-- ==============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS whatsapp_gateway;

-- Set search path
SET search_path TO whatsapp_gateway, public;

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON SCHEMA whatsapp_gateway IS 'WhatsApp Gateway message storage and sync tracking';

