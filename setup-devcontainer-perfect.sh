#!/bin/bash
# ============================================================================
# TradingSystem - DevContainer Perfect Setup Script
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="/home/marce/Projetos/TradingSystem"
DEVCONTAINER_DIR="$PROJECT_ROOT/.devcontainer"
SCRIPTS_DIR="$DEVCONTAINER_DIR/scripts"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TradingSystem - DevContainer Perfect Setup                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Stop existing container
echo -e "${YELLOW}[1/10]${NC} Stopping existing devcontainer..."
cd "$PROJECT_ROOT"
docker compose --project-name tradingsystem_devcontainer \
    -f .devcontainer/docker-compose.yml down 2>/dev/null || true
echo -e "${GREEN}✓ Container stopped${NC}"
echo ""

# Step 2: Clean directories
echo -e "${YELLOW}[2/10]${NC} Cleaning directories with permission issues..."
# Linha que limpa venv - REMOVER "venv"
sudo rm -rf node_modules frontend/dashboard/node_modules docs/node_modules 2>/dev/null || true
mkdir -p node_modules frontend/dashboard/node_modules docs/node_modules
sudo chown -R $(id -u):$(id -g) node_modules frontend/dashboard/node_modules docs/node_modules
chmod -R 777 node_modules frontend/dashboard/node_modules docs/node_modules
echo -e "${GREEN}✓ Directories cleaned${NC}"
echo ""

# Step 3: Fix post-create.sh
echo -e "${YELLOW}[3/10]${NC} Fixing post-create.sh..."
cp "$SCRIPTS_DIR/post-create.sh" "$SCRIPTS_DIR/post-create.sh.backup-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
sed -i 's/npm ci /npm install /g' "$SCRIPTS_DIR/post-create.sh"
echo -e "${GREEN}✓ post-create.sh fixed${NC}"
echo ""

# Step 4: Update docker-compose.yml
echo -e "${YELLOW}[4/10]${NC} Updating docker-compose.yml..."
cp "$DEVCONTAINER_DIR/docker-compose.yml" "$DEVCONTAINER_DIR/docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)"
sed -i '/user: "1000:1000"/d' "$DEVCONTAINER_DIR/docker-compose.yml"
echo -e "${GREEN}✓ docker-compose.yml updated${NC}"
echo ""

# Step 5: Verify post-start.sh
echo -e "${YELLOW}[5/10]${NC} Verifying post-start.sh..."
chmod +x "$SCRIPTS_DIR/post-start.sh" 2>/dev/null || true
echo -e "${GREEN}✓ post-start.sh verified${NC}"
echo ""

# Step 6: Create .env.devcontainer
echo -e "${YELLOW}[6/10]${NC} Creating .env.devcontainer..."
cat > "$DEVCONTAINER_DIR/.env.devcontainer" << 'ENVFILE'
AUTOSTART_OPTIONAL_STACKS=false
AUTOSTART_MONITORING=true
ENVFILE
echo -e "${GREEN}✓ .env.devcontainer created${NC}"
echo ""

# Step 7: Recreate devcontainer
echo -e "${YELLOW}[7/10]${NC} Recreating devcontainer..."
cd "$PROJECT_ROOT"
docker compose --project-name tradingsystem_devcontainer \
    -f .devcontainer/docker-compose.yml \
    up -d --force-recreate --build
echo -e "${GREEN}✓ Container created${NC}"
echo ""
echo -e "${BLUE}⏳ Waiting 15 seconds...${NC}"
sleep 15

# Step 8: Execute post-create
echo -e "${YELLOW}[8/10]${NC} Running post-create setup (5-10 minutes)..."
docker exec tradingsystem_devcontainer-app-1 bash -c "
    cd /workspace && bash .devcontainer/scripts/post-create.sh
" || echo -e "${YELLOW}⚠️  post-create had issues${NC}"
echo -e "${GREEN}✓ post-create completed${NC}"
echo ""

# Step 9: Execute post-start
echo -e "${YELLOW}[9/10]${NC} Running post-start (starting stacks)..."
docker exec tradingsystem_devcontainer-app-1 bash -c "
    cd /workspace && bash .devcontainer/scripts/post-start.sh
" || echo -e "${YELLOW}⚠️  post-start had issues${NC}"
echo -e "${GREEN}✓ post-start completed${NC}"
echo ""

# Step 10: Verify
echo -e "${YELLOW}[10/10]${NC} Verifying installation..."
echo ""

docker ps --filter "name=tradingsystem_devcontainer-app-1" --format "{{.Names}}" | grep -q "tradingsystem_devcontainer-app-1" && echo -e "${GREEN}✓ Container running${NC}" || echo -e "${RED}✗ Container not running${NC}"

docker exec tradingsystem_devcontainer-app-1 test -d /workspace/node_modules && echo -e "${GREEN}✓ node_modules exist${NC}" || echo -e "${RED}✗ node_modules missing${NC}"

docker exec tradingsystem_devcontainer-app-1 docker ps >/dev/null 2>&1 && echo -e "${GREEN}✓ Docker access working${NC}" || echo -e "${RED}✗ Docker access failed${NC}"

STACKS=$(docker exec tradingsystem_devcontainer-app-1 docker ps --format "{{.Names}}" | wc -l)
echo -e "${GREEN}✓ Running $STACKS containers${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    SETUP COMPLETE! 🎉                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Open Cursor"
echo -e "  2. File → Open Folder → $PROJECT_ROOT"
echo -e "  3. Click 'Reopen in Container'"
echo -e "  4. Start coding! 🚀"
echo ""
