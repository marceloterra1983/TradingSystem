-- =============================================================================
-- TradingSystem - Order Management Schema
-- Database: APPS-ORDER-MANAGER
-- Schema: order_manager
-- Technology: TimescaleDB (PostgreSQL 14+)
-- Created: 2025-11-01
-- =============================================================================

-- Create database (run as superuser)
-- CREATE DATABASE "APPS-ORDER-MANAGER" WITH OWNER timescale ENCODING 'UTF8';

-- Connect to database
\c APPS-ORDER-MANAGER

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema
CREATE SCHEMA IF NOT EXISTS order_manager;

-- Set search path
SET search_path TO order_manager, public;

-- =============================================================================
-- TABLE: strategies
-- Purpose: Trading strategy definitions
-- =============================================================================

CREATE TABLE order_manager.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Strategy Details
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NULL,
  strategy_type VARCHAR(50) NOT NULL CHECK (
    strategy_type IN ('TREND_FOLLOWING', 'MEAN_REVERSION', 'ARBITRAGE', 'MANUAL')
  ),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (
    status IN ('ACTIVE', 'INACTIVE', 'PAUSED', 'TESTING')
  ),
  
  -- Parameters
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Risk Limits
  max_position_size DECIMAL(18,2) NULL,
  max_daily_loss DECIMAL(18,2) NULL,
  max_drawdown_pct DECIMAL(5,2) NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ownership
  created_by VARCHAR(100) NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE order_manager.strategies IS 'Trading strategy definitions with risk parameters';

CREATE INDEX idx_strategies_status ON order_manager.strategies (status);
CREATE INDEX idx_strategies_type ON order_manager.strategies (strategy_type);

-- =============================================================================
-- TABLE: orders (Hypertable)
-- Purpose: Order lifecycle tracking
-- =============================================================================

CREATE TABLE order_manager.orders (
  -- Identity
  id UUID DEFAULT gen_random_uuid(),
  order_ref VARCHAR(50) UNIQUE NOT NULL,
  
  -- Instrument
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  asset_class VARCHAR(20) NOT NULL CHECK (asset_class IN ('stock', 'future', 'fx', 'crypto')),
  
  -- Order Details
  side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT')),
  quantity DECIMAL(18,8) NOT NULL CHECK (quantity > 0),
  price DECIMAL(18,8) NULL,
  stop_price DECIMAL(18,8) NULL,
  
  -- Execution
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'SUBMITTED', 'PARTIAL_FILL', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED')
  ),
  filled_quantity DECIMAL(18,8) NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  avg_fill_price DECIMAL(18,8) NULL,
  
  -- Strategy & Risk
  strategy_id UUID NOT NULL,
  account_id UUID NOT NULL,
  position_type VARCHAR(20) NOT NULL CHECK (position_type IN ('DAY_TRADE', 'SWING', 'POSITION')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NULL,
  filled_at TIMESTAMPTZ NULL,
  canceled_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit
  created_by VARCHAR(100) NOT NULL,
  reason TEXT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (id, created_at)
);

COMMENT ON TABLE order_manager.orders IS 'Order lifecycle with time-series partitioning';

-- Convert to hypertable with daily partitioning
SELECT create_hypertable('order_manager.orders', 'created_at',
  chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_orders_symbol ON order_manager.orders (symbol, created_at DESC);
CREATE INDEX idx_orders_status ON order_manager.orders (status, created_at DESC);
CREATE INDEX idx_orders_strategy ON order_manager.orders (strategy_id, created_at DESC);
CREATE INDEX idx_orders_account ON order_manager.orders (account_id, created_at DESC);
CREATE INDEX idx_orders_ref ON order_manager.orders (order_ref);
CREATE INDEX idx_orders_active ON order_manager.orders (created_at DESC) 
  WHERE status IN ('PENDING', 'SUBMITTED', 'PARTIAL_FILL');

-- =============================================================================
-- TABLE: trades (Hypertable)
-- Purpose: Executed trade fills
-- =============================================================================

CREATE TABLE order_manager.trades (
  -- Identity
  id UUID DEFAULT gen_random_uuid(),
  trade_ref VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL,
  
  -- Trade Details
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL(18,8) NOT NULL CHECK (quantity > 0),
  price DECIMAL(18,8) NOT NULL CHECK (price > 0),
  total_value DECIMAL(18,2) NOT NULL,
  
  -- Fees & Costs
  commission DECIMAL(18,2) DEFAULT 0,
  tax DECIMAL(18,2) DEFAULT 0,
  slippage DECIMAL(18,8) NULL,
  
  -- Timing
  executed_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source
  execution_venue VARCHAR(50) NULL,
  broker_account VARCHAR(50) NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (id, executed_at)
);

COMMENT ON TABLE order_manager.trades IS 'Trade executions with hourly partitioning for high volume';

-- Convert to hypertable with hourly partitioning
SELECT create_hypertable('order_manager.trades', 'executed_at',
  chunk_time_interval => INTERVAL '1 hour');

-- Indexes
CREATE INDEX idx_trades_order ON order_manager.trades (order_id, executed_at DESC);
CREATE INDEX idx_trades_symbol ON order_manager.trades (symbol, executed_at DESC);
CREATE INDEX idx_trades_account ON order_manager.trades (broker_account, executed_at DESC);

-- =============================================================================
-- TABLE: positions
-- Purpose: Current open positions
-- =============================================================================

CREATE TABLE order_manager.positions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Instrument
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  asset_class VARCHAR(20) NOT NULL,
  
  -- Position Details
  side VARCHAR(10) NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  quantity DECIMAL(18,8) NOT NULL CHECK (quantity > 0),
  avg_entry_price DECIMAL(18,2) NOT NULL,
  current_price DECIMAL(18,2) NULL,
  
  -- P&L
  unrealized_pnl DECIMAL(18,2) NULL,
  realized_pnl DECIMAL(18,2) DEFAULT 0,
  
  -- Strategy & Account
  strategy_id UUID NOT NULL,
  account_id UUID NOT NULL,
  position_type VARCHAR(20) NOT NULL,
  
  -- Timestamps
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'CLOSING', 'CLOSED')
  ),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one position per symbol/account/strategy
  UNIQUE (symbol, account_id, strategy_id, status)
);

COMMENT ON TABLE order_manager.positions IS 'Current positions with real-time P&L tracking';

CREATE INDEX idx_positions_symbol ON order_manager.positions (symbol);
CREATE INDEX idx_positions_account ON order_manager.positions (account_id);
CREATE INDEX idx_positions_strategy ON order_manager.positions (strategy_id);
CREATE INDEX idx_positions_active ON order_manager.positions (updated_at DESC) 
  WHERE status = 'OPEN';

-- =============================================================================
-- TABLE: position_history (Hypertable)
-- Purpose: Historical snapshots of positions
-- =============================================================================

CREATE TABLE order_manager.position_history (
  id UUID DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL,
  
  -- Snapshot Data
  quantity DECIMAL(18,8) NOT NULL,
  avg_entry_price DECIMAL(18,2) NOT NULL,
  current_price DECIMAL(18,2) NOT NULL,
  unrealized_pnl DECIMAL(18,2) NOT NULL,
  realized_pnl DECIMAL(18,2) NOT NULL,
  
  -- Timestamp
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Trigger reason
  reason VARCHAR(50) NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (id, snapshot_at)
);

COMMENT ON TABLE order_manager.position_history IS 'Position snapshots for P&L history';

SELECT create_hypertable('order_manager.position_history', 'snapshot_at',
  chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_position_history_position ON order_manager.position_history 
  (position_id, snapshot_at DESC);

-- =============================================================================
-- TABLE: risk_limits
-- Purpose: Risk control parameters
-- =============================================================================

CREATE TABLE order_manager.risk_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('ACCOUNT', 'STRATEGY', 'SYMBOL')),
  account_id UUID NULL,
  strategy_id UUID NULL,
  symbol VARCHAR(50) NULL,
  
  -- Limits
  max_order_value DECIMAL(18,2) NULL,
  max_position_size DECIMAL(18,8) NULL,
  max_daily_loss DECIMAL(18,2) NULL,
  max_daily_trades INTEGER NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure one limit per combination
  UNIQUE NULLS NOT DISTINCT (limit_type, account_id, strategy_id, symbol)
);

COMMENT ON TABLE order_manager.risk_limits IS 'Risk control limits per account/strategy/symbol';

CREATE INDEX idx_risk_limits_account ON order_manager.risk_limits (account_id);
CREATE INDEX idx_risk_limits_strategy ON order_manager.risk_limits (strategy_id);

-- =============================================================================
-- TABLE: order_audit_log (Hypertable)
-- Purpose: Audit trail for order changes
-- =============================================================================

CREATE TABLE order_manager.order_audit_log (
  id UUID DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  
  -- Change Details
  action VARCHAR(50) NOT NULL CHECK (
    action IN ('CREATED', 'SUBMITTED', 'FILLED', 'PARTIAL_FILL', 'CANCELED', 'REJECTED', 'MODIFIED')
  ),
  old_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NOT NULL,
  
  -- Audit
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NULL,
  
  -- Change Delta
  changes JSONB NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (id, changed_at)
);

COMMENT ON TABLE order_manager.order_audit_log IS 'Complete audit trail for compliance';

SELECT create_hypertable('order_manager.order_audit_log', 'changed_at',
  chunk_time_interval => INTERVAL '1 day');

CREATE INDEX idx_order_audit_order ON order_manager.order_audit_log (order_id, changed_at DESC);
CREATE INDEX idx_order_audit_action ON order_manager.order_audit_log (action, changed_at DESC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION order_manager.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION order_manager.update_timestamp() IS 'Auto-update updated_at on row modification';

CREATE TRIGGER trg_orders_update_timestamp
  BEFORE UPDATE ON order_manager.orders
  FOR EACH ROW EXECUTE FUNCTION order_manager.update_timestamp();

CREATE TRIGGER trg_positions_update_timestamp
  BEFORE UPDATE ON order_manager.positions
  FOR EACH ROW EXECUTE FUNCTION order_manager.update_timestamp();

CREATE TRIGGER trg_strategies_update_timestamp
  BEFORE UPDATE ON order_manager.strategies
  FOR EACH ROW EXECUTE FUNCTION order_manager.update_timestamp();

-- Auto-audit order changes
CREATE OR REPLACE FUNCTION order_manager.audit_order_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_manager.order_audit_log (order_id, action, new_status, changed_by, reason)
    VALUES (NEW.id, 'CREATED', NEW.status, NEW.created_by, NEW.reason);
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    INSERT INTO order_manager.order_audit_log (
      order_id, action, old_status, new_status, changed_by, reason, changes
    ) VALUES (
      NEW.id, 
      CASE 
        WHEN NEW.status = 'FILLED' THEN 'FILLED'
        WHEN NEW.status = 'CANCELED' THEN 'CANCELED'
        WHEN NEW.status = 'REJECTED' THEN 'REJECTED'
        ELSE 'STATUS_CHANGE'
      END,
      OLD.status, 
      NEW.status, 
      COALESCE(CURRENT_USER, 'system'),
      NEW.reason,
      jsonb_build_object(
        'filled_quantity_old', OLD.filled_quantity,
        'filled_quantity_new', NEW.filled_quantity,
        'avg_fill_price_old', OLD.avg_fill_price,
        'avg_fill_price_new', NEW.avg_fill_price
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION order_manager.audit_order_change() IS 'Automatic audit logging for order changes';

CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE ON order_manager.orders
  FOR EACH ROW EXECUTE FUNCTION order_manager.audit_order_change();

-- =============================================================================
-- MATERIALIZED VIEWS
-- =============================================================================

-- Daily trade summary
CREATE MATERIALIZED VIEW order_manager.mv_daily_trade_summary
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', executed_at) as trade_date,
  symbol,
  side,
  COUNT(*) as trade_count,
  SUM(quantity) as total_volume,
  AVG(price) as avg_price,
  SUM(total_value) as total_value,
  SUM(commission) as total_commission
FROM order_manager.trades
GROUP BY trade_date, symbol, side
WITH NO DATA;

COMMENT ON MATERIALIZED VIEW order_manager.mv_daily_trade_summary IS 'Daily aggregated trade statistics';

-- Refresh policy: every 5 minutes
SELECT add_continuous_aggregate_policy('mv_daily_trade_summary',
  start_offset => INTERVAL '1 month',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '5 minutes');

-- =============================================================================
-- COMPRESSION & RETENTION POLICIES
-- =============================================================================

-- Enable compression on orders after 7 days
ALTER TABLE order_manager.orders SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol,status',
  timescaledb.compress_orderby = 'created_at DESC'
);

SELECT add_compression_policy('order_manager.orders', INTERVAL '7 days');

-- Enable compression on trades after 1 day
ALTER TABLE order_manager.trades SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol,broker_account',
  timescaledb.compress_orderby = 'executed_at DESC'
);

SELECT add_compression_policy('order_manager.trades', INTERVAL '1 day');

-- Retention policy: keep audit log for 7 years (regulatory requirement)
SELECT add_retention_policy('order_manager.order_audit_log', INTERVAL '7 years');

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA order_manager TO timescale;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA order_manager TO timescale;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA order_manager TO timescale;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================















