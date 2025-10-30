#!/bin/bash
# Test MCP Filesystem Server

echo "=== Testing MCP Filesystem Server ==="
echo ""

echo "1. Checking Node.js version:"
node --version
echo ""

echo "2. Checking if server is installed:"
npm list @modelcontextprotocol/server-filesystem 2>/dev/null | grep filesystem
echo ""

echo "3. Testing server with project root:"
echo "Command: npx -y @modelcontextprotocol/server-filesystem /home/marce/Projetos/TradingSystem"
echo ""

echo "4. Server should start and wait for JSON-RPC messages via stdin"
echo "   Press Ctrl+C to exit after seeing server start"
echo ""

# Test server startup (will hang waiting for stdin - that's expected)
timeout 3s npx -y @modelcontextprotocol/server-filesystem /home/marce/Projetos/TradingSystem 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo ""
        echo "✅ Server started successfully (timed out waiting for stdin - expected behavior)"
        exit 0
    else
        echo ""
        echo "❌ Server failed to start (exit code: $EXIT_CODE)"
        exit 1
    fi
}
