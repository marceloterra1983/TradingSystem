-- QuestDB Initialization Script for Documentation API
-- Run this script to create all required tables
-- Usage: Execute migrations in order or run this file directly
-- Created: 2025-10-13

-- Migration 001: documentation_systems
CREATE TABLE IF NOT EXISTS documentation_systems (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  name STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE,
  port INT,
  host STRING,
  url STRING,
  icon STRING,
  color STRING,
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY DAY;

-- Migration 002: documentation_ideas
CREATE TABLE IF NOT EXISTS documentation_ideas (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  title STRING,
  description STRING,
  status SYMBOL CAPACITY 16 CACHE INDEX,
  category SYMBOL CAPACITY 32 CACHE INDEX,
  priority SYMBOL CAPACITY 16 CACHE INDEX,
  tags SYMBOL CAPACITY 256 CACHE INDEX,
  created_by STRING,
  assigned_to STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;

-- Migration 003: documentation_files
CREATE TABLE IF NOT EXISTS documentation_files (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  idea_id SYMBOL CAPACITY 256 CACHE INDEX,
  original_name STRING,
  stored_name STRING,
  size LONG,
  mime_type STRING,
  storage_path STRING,
  checksum STRING,
  uploaded_by STRING,
  uploaded_at TIMESTAMP,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;

-- Migration 004: documentation_audit_log
CREATE TABLE IF NOT EXISTS documentation_audit_log (
  id SYMBOL CAPACITY 256 CACHE INDEX,
  entity_type SYMBOL CAPACITY 32 CACHE,
  entity_id STRING,
  action SYMBOL CAPACITY 16 CACHE,
  user_id STRING,
  changes STRING,
  ip_address STRING,
  user_agent STRING,
  ts TIMESTAMP
) timestamp(ts) PARTITION BY MONTH;
