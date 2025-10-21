-- QuestDB Table Recovery Script
-- This script creates all necessary tables for the Trading System
-- Run date: 2025-10-12
--
-- Tables included:
-- 1. TP-Capital tables (tp_capital_signals, telegram_bots, telegram_channels)
-- 2. B3 tables (b3_snapshots, b3_indicators, b3_vol_surface, etc.)
-- 3. Trading Core tables (trades, positions - QuestDB versions)

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
-- B3 MARKET DATA TABLES
-- ============================================================

-- B3 snapshots (daily settlement data)
CREATE TABLE IF NOT EXISTS b3_snapshots (
  ts TIMESTAMP,
  coleta_data DATE,
  coleta_hora STRING,
  instrument SYMBOL,
  contract_month SYMBOL,
  price_settlement DOUBLE,
  price_settlement_prev DOUBLE,
  status SYMBOL,
  source SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- B3 indicators (market indicators)
CREATE TABLE IF NOT EXISTS b3_indicators (
  ts TIMESTAMP,
  name SYMBOL,
  value DOUBLE,
  display_value STRING,
  updated_at DATE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- B3 volatility surface
CREATE TABLE IF NOT EXISTS b3_vol_surface (
  ts TIMESTAMP,
  contract_month SYMBOL,
  delta_bucket SYMBOL,
  volatility DOUBLE,
  updated_at DATE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;

-- B3 gamma levels (GEX levels)
CREATE TABLE IF NOT EXISTS b3_gamma_levels (
  ts TIMESTAMP,
  instrument SYMBOL,
  call_wall DOUBLE,
  put_wall DOUBLE,
  gamma_flip DOUBLE,
  raw_payload STRING,
  status SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY DAY;

-- B3 adjustments (settlement adjustments)
CREATE TABLE IF NOT EXISTS b3_adjustments (
  ts TIMESTAMP,
  instrument SYMBOL,
  contract_month SYMBOL,
  price_settlement DOUBLE,
  price_prev DOUBLE,
  status SYMBOL,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;

-- B3 daily indicators
CREATE TABLE IF NOT EXISTS b3_indicators_daily (
  ts TIMESTAMP,
  indicator SYMBOL,
  value DOUBLE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;

-- B3 DXY ticks (Dollar Index)
CREATE TABLE IF NOT EXISTS b3_dxy_ticks (
  ts TIMESTAMP,
  bucket SYMBOL,
  value DOUBLE,
  ingested_at TIMESTAMP
) TIMESTAMP(ts) PARTITION BY MONTH;

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
