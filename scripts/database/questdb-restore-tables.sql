-- QuestDB Table Recovery Script
-- This script creates all necessary tables for the Trading System
-- Run date: 2025-10-12
--
-- Tables included:
-- 1. TP-Capital tables (tp_capital_signals, telegram_bots, telegram_channels)
-- 2. Trading Core tables (trades, positions - QuestDB versions)

-- ============================================================
-- TP CAPITAL SIGNALS TABLES
-- ============================================================

-- Main signals table
CREATE TABLE IF NOT EXISTS tp_capital_signals (
  ts TIMESTAMP,
  channel SYMBOL,
  signal_type SYMBOL,
  asset SYMBOL,
  buy_min DOUBLE,
  buy_max DOUBLE,
  target_1 DOUBLE,
  target_2 DOUBLE,
  target_final DOUBLE,
  stop DOUBLE,
  raw_message STRING,
  source SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- Soft deletion archive for signals
CREATE TABLE IF NOT EXISTS tp_capital_signals_deleted (
  ts TIMESTAMP,
  channel SYMBOL,
  signal_type SYMBOL,
  asset SYMBOL,
  buy_min DOUBLE,
  buy_max DOUBLE,
  target_1 DOUBLE,
  target_2 DOUBLE,
  target_final DOUBLE,
  stop DOUBLE,
  raw_message STRING,
  source SYMBOL,
  ingested_at TIMESTAMP,
  deleted_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- Telegram bots configuration
CREATE TABLE IF NOT EXISTS telegram_bots (
  id SYMBOL,
  username SYMBOL,
  token STRING,
  bot_type SYMBOL,
  description STRING,
  status SYMBOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) TIMESTAMP(updated_at) PARTITION BY DAY;

-- Telegram channels configuration
CREATE TABLE IF NOT EXISTS telegram_channels (
  id SYMBOL,
  label SYMBOL,
  channel_id LONG,
  channel_type SYMBOL,
  description STRING,
  status SYMBOL,
  signal_count LONG,
  last_signal TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) TIMESTAMP(updated_at) PARTITION BY DAY;

-- ============================================================
-- TRADING CORE TABLES (QuestDB versions)
-- ============================================================

-- Trades execution log
CREATE TABLE IF NOT EXISTS trades (
  ts TIMESTAMP,
  trade_id SYMBOL,
  symbol SYMBOL,
  side SYMBOL,
  quantity DOUBLE,
  price DOUBLE,
  strategy_id SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- Positions snapshot
CREATE TABLE IF NOT EXISTS positions (
  ts TIMESTAMP,
  position_id SYMBOL,
  symbol SYMBOL,
  quantity DOUBLE,
  avg_price DOUBLE,
  unrealized_pnl DOUBLE,
  strategy_id SYMBOL,
  updated_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- ============================================================
-- INGESTION LOGS TABLE
-- ============================================================

-- Ingestion logs for debugging and monitoring
CREATE TABLE IF NOT EXISTS ingestion_logs (
  ts TIMESTAMP,
  service SYMBOL,
  level SYMBOL,
  message STRING,
  metadata STRING,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;
