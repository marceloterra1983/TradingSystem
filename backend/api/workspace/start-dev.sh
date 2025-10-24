#!/bin/bash
# Start Workspace API in development mode with TimescaleDB

export LIBRARY_DB_STRATEGY=timescaledb
export PORT=3200
export LOG_LEVEL=info
export TIMESCALEDB_PORT=5433
export TIMESCALEDB_HOST=localhost
export WORKSPACE_DATABASE=APPS-WORKSPACE
export TIMESCALEDB_USER=timescale
export TIMESCALEDB_PASSWORD=changeme
export WORKSPACE_DATABASE_SCHEMA=workspace
export WORKSPACE_TABLE_NAME=workspace_items

echo "Starting Workspace API..."
echo "  Strategy: $LIBRARY_DB_STRATEGY"
echo "  Port: $PORT"
echo "  Database: TimescaleDB (localhost:5433/APPS-WORKSPACE)"
echo "  Schema: workspace"
echo ""

node --watch src/server.js

