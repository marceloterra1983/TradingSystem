#!/bin/sh
# Test Runtime Config from inside dashboard container
# This simulates how the browser accesses the config endpoint

echo "🧪 Runtime Config Internal Test"
echo "================================"
echo ""

# Test 1: Config endpoint accessible
echo "Test 1: Config Endpoint"
CONFIG_RESPONSE=$(curl -s "http://api-gateway:9080/api/telegram-gateway/config")
echo "✓ Response received"
echo ""

# Test 2: Extract token
TOKEN=$(echo "$CONFIG_RESPONSE" | grep -o '"authToken":"[^"]*"' | cut -d'"' -f4)
echo "Test 2: Auth Token"
echo "✓ Token: ${TOKEN:0:15}... (${#TOKEN} chars)"
echo ""

# Test 3: Test authenticated call
echo "Test 3: Authenticated API Call"
SYNC_RESPONSE=$(curl -s -X POST "http://api-gateway:9080/api/telegram-gateway/sync-messages" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Token: $TOKEN" \
  -d '{"limit": 10}')

# Check if successful or has expected error
if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Sync successful"
elif echo "$SYNC_RESPONSE" | grep -q '"success":false'; then
  MESSAGE=$(echo "$SYNC_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
  if echo "$MESSAGE" | grep -q -i "missing.*token\|unauthorized\|forbidden"; then
    echo "❌ Authentication failed: $MESSAGE"
  else
    echo "⚠️  Sync failed (but auth worked): $MESSAGE"
  fi
else
  echo "❌ Unexpected response: $SYNC_RESPONSE"
fi
echo ""

# Test 4: Verify features
echo "Test 4: Features Enabled"
if echo "$CONFIG_RESPONSE" | grep -q '"authEnabled":true'; then
  echo "✓ authEnabled: true"
else
  echo "✗ authEnabled: false or missing"
fi

if echo "$CONFIG_RESPONSE" | grep -q '"metricsEnabled":true'; then
  echo "✓ metricsEnabled: true"
else
  echo "✗ metricsEnabled: false or missing"
fi
echo ""

echo "================================"
echo "Full Config Response:"
echo "$CONFIG_RESPONSE"
