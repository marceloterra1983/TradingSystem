#!/bin/bash
# Kill orphaned docker-proxy processes on port 8111

echo "🔪 Matando docker-proxy órfãos na porta 8111..."
kill -9 5892 5899 2>/dev/null
echo "✅ Processos 5892 e 5899 encerrados"

