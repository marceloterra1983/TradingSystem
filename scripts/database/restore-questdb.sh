#!/bin/bash
# QuestDB Table Restoration Script
# This script creates all necessary tables in QuestDB

QUESTDB_URL="http://localhost:9000/exec"

echo "Starting QuestDB table restoration..."

# Function to execute SQL
execute_sql() {
    local query="$1"
    local table_name="$2"
    echo "Creating table: $table_name"
    response=$(curl -s -G --data-urlencode "query=$query" "$QUESTDB_URL")
    echo "$response" | python3 -m json.tool
    sleep 0.5
}

# TP-Capital
execute_sql "CREATE TABLE IF NOT EXISTS tp_capital_signals (ts TIMESTAMP, channel SYMBOL, signal_type SYMBOL, asset SYMBOL, buy_min DOUBLE, buy_max DOUBLE, target_1 DOUBLE, target_2 DOUBLE, target_final DOUBLE, stop DOUBLE, raw_message STRING, source SYMBOL, ingested_at TIMESTAMP) TIMESTAMP(ts) PARTITION BY DAY;" "tp_capital_signals"

execute_sql "CREATE TABLE IF NOT EXISTS tp_capital_signals_deleted (ts TIMESTAMP, channel SYMBOL, signal_type SYMBOL, asset SYMBOL, buy_min DOUBLE, buy_max DOUBLE, target_1 DOUBLE, target_2 DOUBLE, target_final DOUBLE, stop DOUBLE, raw_message STRING, source SYMBOL, ingested_at TIMESTAMP, deleted_at TIMESTAMP) TIMESTAMP(ts) PARTITION BY DAY;" "tp_capital_signals_deleted"

execute_sql "CREATE TABLE IF NOT EXISTS telegram_bots (id SYMBOL, username SYMBOL, token STRING, bot_type SYMBOL, description STRING, status SYMBOL, created_at TIMESTAMP, updated_at TIMESTAMP) TIMESTAMP(updated_at) PARTITION BY DAY;" "telegram_bots"

execute_sql "CREATE TABLE IF NOT EXISTS telegram_channels (id SYMBOL, label SYMBOL, channel_id LONG, channel_type SYMBOL, description STRING, status SYMBOL, signal_count LONG, last_signal TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP) TIMESTAMP(updated_at) PARTITION BY DAY;" "telegram_channels"

# Trading Core
execute_sql "CREATE TABLE IF NOT EXISTS trades (ts TIMESTAMP, trade_id SYMBOL, symbol SYMBOL, side SYMBOL, quantity DOUBLE, price DOUBLE, strategy_id SYMBOL, ingested_at TIMESTAMP) TIMESTAMP(ts) PARTITION BY DAY;" "trades"

execute_sql "CREATE TABLE IF NOT EXISTS positions (ts TIMESTAMP, position_id SYMBOL, symbol SYMBOL, quantity DOUBLE, avg_price DOUBLE, unrealized_pnl DOUBLE, strategy_id SYMBOL, updated_at TIMESTAMP) TIMESTAMP(ts) PARTITION BY DAY;" "positions"

# Ingestion Logs
execute_sql "CREATE TABLE IF NOT EXISTS ingestion_logs (ts TIMESTAMP, service SYMBOL, level SYMBOL, message STRING, metadata STRING, ingested_at TIMESTAMP) TIMESTAMP(ts) PARTITION BY DAY;" "ingestion_logs"

echo ""
echo "Table restoration complete!"
echo "Verifying tables..."
curl -s -G --data-urlencode "query=SHOW TABLES" "$QUESTDB_URL" | python3 -m json.tool
