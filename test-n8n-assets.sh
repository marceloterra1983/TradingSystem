#!/bin/bash
# Test n8n asset loading via Traefik gateway

echo "Testing n8n asset routing..."
echo ""

echo "1. Testing main n8n page:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}\n" \
  -H "Authorization: Basic YXV0b21hdGlvbjpNYXJjZWxvMTIzQA==" \
  http://localhost:9082/n8n/

echo ""
echo "2. Testing polyfills asset:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}\n" \
  -H "Authorization: Basic YXV0b21hdGlvbjpNYXJjZWxvMTIzQA==" \
  http://localhost:9082/n8nassets/polyfills--OXZxfeX.js

echo ""
echo "3. Testing rest API:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}\n" \
  -H "Authorization: Basic YXV0b21hdGlvbjpNYXJjZWxvMTIzQA==" \
  http://localhost:9082/n8nrest/settings

echo ""
echo "4. Testing static files:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{url_effective}\n" \
  -H "Authorization: Basic YXV0b21hdGlvbjpNYXJjZWxvMTIzQA==" \
  http://localhost:9082/n8nstatic/prefers-color-scheme.css

echo ""
echo "5. Checking Traefik router configuration:"
curl -s http://localhost:9083/api/http/routers | \
  jq -r '.[] | select(.name | contains("n8n")) | {name, rule, status}' 2>/dev/null || \
  echo "jq not available - install with: sudo apt-get install jq"

echo ""
echo "Done!"
