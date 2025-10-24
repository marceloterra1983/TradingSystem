#!/bin/bash
# LangGraph Studio Proxy
# Expõe o servidor local para o LangSmith Studio via SSH reverse tunnel

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎨 LangGraph Studio Proxy${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Check if server is running
if ! curl -s http://localhost:8112/health >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  LangGraph dev server not running${NC}"
    echo -e "${BLUE}Starting...${NC}"
    bash scripts/langgraph/start-dev.sh
fi

echo -e "${GREEN}✓ LangGraph server is running${NC}"
echo ""

echo -e "${BLUE}📝 Studio Access Options:${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
echo ""

echo -e "${GREEN}Option 1: Use Tracing Projects (Recommended)${NC}"
echo "  1. Execute workflows via API:"
echo "     curl -X POST http://localhost:8112/workflows/docs/review \\"
echo "       -H \"Content-Type: application/json\" \\"
echo "       -d '{\"markdown\":\"# Test\",\"operation\":\"review\"}'"
echo ""
echo "  2. View traces in browser:"
echo "     https://smith.langchain.com/projects"
echo ""
echo "  3. Click on 'langgraph-dev' project"
echo ""

echo -e "${GREEN}Option 2: Use localhost Tunnel (Advanced)${NC}"
echo "  If you need interactive Studio:"
echo "  1. Install: npm install -g localtunnel"
echo "  2. Run: lt --port 8112"
echo "  3. Use the provided URL in Studio connection"
echo ""

echo -e "${GREEN}Option 3: Direct API Access${NC}"
echo "  Your server is accessible at:"
echo "  http://localhost:8112"
echo ""
echo "  Available endpoints:"
echo "  - GET  http://localhost:8112/health"
echo "  - GET  http://localhost:8112/"
echo "  - POST http://localhost:8112/workflows/docs/review"
echo "  - POST http://localhost:8112/workflows/trading/execute"
echo "  - GET  http://localhost:8112/metrics"
echo ""

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Server ready for Studio access!${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
