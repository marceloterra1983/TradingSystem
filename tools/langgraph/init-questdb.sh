#!/bin/bash
# Initialize QuestDB with LangGraph schemas

set -e

QUESTDB_URL="${QUESTDB_HOST:-localhost}:${QUESTDB_HTTP_PORT:-9000}"
SCHEMA_FILE="../../backend/data/questdb/schemas/langgraph_events.sql"

echo "🔄 Waiting for QuestDB to be ready..."
sleep 5

echo "📊 Creating LangGraph tables in QuestDB..."

# Read SQL file and execute each CREATE TABLE statement
while IFS= read -r line; do
    if [[ $line == CREATE\ TABLE* ]]; then
        # Start capturing SQL statement
        sql="$line"
        while IFS= read -r next_line; do
            sql="$sql $next_line"
            if [[ $next_line == *";"* ]]; then
                break
            fi
        done
        
        # Execute SQL
        echo "Executing: ${sql:0:50}..."
        curl -G "http://$QUESTDB_URL/exec" --data-urlencode "query=$sql" -s > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Table created successfully"
        else
            echo "⚠️ Failed to create table (might already exist)"
        fi
    fi
done < "$SCHEMA_FILE"

echo "✅ QuestDB initialization complete!"

