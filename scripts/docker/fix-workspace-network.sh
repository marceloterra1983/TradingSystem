#!/usr/bin/env bash
#
# Fix Docker network isolation issue - Workspace stack
# Allows inter-container communication on workspace_network (172.25.0.0/16)
#

set -euo pipefail

echo "🔧 Corrigindo isolamento de rede Docker para workspace_network..."

# 1. Flush existing Docker isolation rules (if any)
echo "📋 Removendo regras antigas..."
sudo iptables -D DOCKER-ISOLATION-STAGE-2 -s 172.25.0.0/16 -d 172.25.0.0/16 -j DROP 2>/dev/null || true

# 2. Add explicit ACCEPT rule for workspace_network subnet
echo "✅ Adicionando regra ACCEPT para 172.25.0.0/16..."
sudo iptables -I DOCKER-ISOLATION-STAGE-2 -s 172.25.0.0/16 -d 172.25.0.0/16 -j ACCEPT

# 3. Verify rule was added
echo ""
echo "📊 Regras atuais:"
sudo iptables -L DOCKER-ISOLATION-STAGE-2 -n -v | head -10

echo ""
echo "✅ Correção aplicada!"
echo ""
echo "🔄 Agora reinicie os containers:"
echo "   docker compose -p workspace -f tools/compose/docker-compose.workspace-postgres.yml restart"

