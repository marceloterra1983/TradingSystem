#!/bin/bash
###############################################################################
# Restart Docker Control Service
#
# Reinicia o service do Docker Control Server após mudanças de configuração
###############################################################################

echo "Restarting Docker Control Service..."
sudo systemctl restart docker-control

echo "Waiting for service to start..."
sleep 3

echo ""
echo "Service Status:"
sudo systemctl status docker-control --no-pager | head -10

echo ""
echo "Testing API..."
curl -s http://127.0.0.1:9876/health | jq .

echo ""
echo "✓ Service restarted successfully!"
echo ""
echo "Test with:"
echo "  tools/docker-launcher/docker-control-cli.sh list"
echo "  tools/docker-launcher/docker-control-cli.sh restart docs-hub"
