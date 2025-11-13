#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🔧 TradingSystem - Fix Everything Automatically          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Stop devcontainer
echo "1️⃣ Stopping devcontainer..."
docker compose --project-name tradingsystem_devcontainer \
  -f .devcontainer/docker-compose.yml down 2>/dev/null || true
sleep 3
echo "   ✅ Stopped"
echo ""

# Step 2: Fix docker-compose.yml
echo "2️⃣ Fixing docker-compose.yml (adding group_add)..."
cd .devcontainer

# Backup
cp docker-compose.yml docker-compose.yml.backup-auto-$(date +%Y%m%d-%H%M%S)

# Add group_add if not exists
if ! grep -q "group_add:" docker-compose.yml; then
    sed -i '/privileged: true/a\    \n    group_add:\n      - "989"' docker-compose.yml
    echo "   ✅ Added group_add: 989"
else
    echo "   ℹ️  group_add already exists"
fi

cd ..
echo ""

# Step 3: Fix Docker socket permissions on host
echo "3️⃣ Fixing Docker socket permissions on host..."
sudo chmod 666 /var/run/docker.sock
echo "   ✅ Socket permissions fixed"
echo ""

# Step 4: Create missing networks
echo "4️⃣ Creating missing Docker networks..."
for network in telegram_backend n8n_backend waha_backend kestra_internal; do
    if docker network create $network 2>/dev/null; then
        echo "   ✅ Created: $network"
    else
        echo "   ℹ️  Exists: $network"
    fi
done
echo ""

# Step 5: Create prometheus config
echo "5️⃣ Creating prometheus config..."
mkdir -p tools/monitoring
cat > tools/monitoring/prometheus-rag.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'rag-services'
    static_configs:
      - targets: ['rag-service:3000', 'rag-ollama:11434']
EOF
echo "   ✅ Created prometheus-rag.yml"
echo ""

# Step 6: Create .env with missing variables
echo "6️⃣ Checking .env file..."
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || touch .env
fi

if ! grep -q "TELEGRAM_GATEWAY_API_TOKEN" .env 2>/dev/null; then
    cat >> .env << 'ENVVARS'

# Telegram Stack (add real values later)
TELEGRAM_GATEWAY_API_TOKEN=change-me
TELEGRAM_DB_PASSWORD=change-me
TELEGRAM_RABBITMQ_PASSWORD=change-me
ENVVARS
    echo "   ✅ Added telegram variables to .env"
else
    echo "   ℹ️  Variables already in .env"
fi
echo ""

# Step 7: Remove conflicting containers
echo "7️⃣ Removing conflicting containers..."
for container in evolution-redis rag-llamaindex-query docker-control-server; do
    if docker rm -f $container 2>/dev/null; then
        echo "   ✅ Removed: $container"
    else
        echo "   ℹ️  Not found: $container"
    fi
done
echo ""

# Step 8: Recreate devcontainer
echo "8️⃣ Recreating devcontainer..."
docker compose --project-name tradingsystem_devcontainer \
  -f .devcontainer/docker-compose.yml \
  up -d --force-recreate

echo "   ✅ Devcontainer recreated"
echo ""

# Step 9: Wait for initialization
echo "9️⃣ Waiting for devcontainer to initialize..."
for i in {1..30}; do
    if docker exec tradingsystem_devcontainer-app-1 docker ps >/dev/null 2>&1; then
        echo "   ✅ Docker access working inside container!"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""
echo ""

# Step 10: Start essential stacks
echo "🔟 Starting essential stacks..."
docker exec tradingsystem_devcontainer-app-1 bash -c "
    cd /workspace && \
    bash .devcontainer/scripts/post-start.sh 2>&1 | grep -E '(Starting|✅|⚠️|Error)' || true
"
echo ""

# Step 11: Show final status
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ FIX COMPLETED!                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -20

TOTAL=$(docker ps | wc -l)
echo ""
echo "📈 Summary:"
echo "  Total containers: $((TOTAL - 1))"
echo ""

echo "🎯 Next Steps:"
echo "  1. Open Cursor"
echo "  2. File → Open Folder → $(pwd)"
echo "  3. Click 'Reopen in Container'"
echo "  4. Test: docker ps (should work without chmod!)"
echo ""

echo "🌐 Access Services:"
echo "  Dashboard:      http://localhost:8090 (or check actual port)"
echo "  API Gateway:    http://localhost:9080"
echo "  Traefik UI:     http://localhost:9081"
echo ""

echo "✨ Done! Happy coding!"
