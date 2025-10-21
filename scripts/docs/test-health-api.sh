#!/bin/bash
# Test Health API endpoints

echo "============================================"
echo "Testing Health API Endpoints"
echo "============================================"
echo ""

BASE_URL="http://localhost:3400"

# Test 1: Main health endpoint
echo "1️⃣ Testing main health endpoint..."
echo "   GET $BASE_URL/health"
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || echo "❌ Failed"
echo ""

# Test 2: Health summary
echo "2️⃣ Testing health summary endpoint..."
echo "   GET $BASE_URL/api/v1/docs/health/summary"
curl -s "$BASE_URL/api/v1/docs/health/summary" | jq '.' 2>/dev/null || echo "❌ Failed or no audit data"
echo ""

# Test 3: Prometheus metrics
echo "3️⃣ Testing Prometheus metrics endpoint..."
echo "   GET $BASE_URL/metrics (showing docs_* metrics only)"
curl -s "$BASE_URL/metrics" | grep "^docs_" | head -20 || echo "❌ Failed or no metrics"
echo ""

# Test 4: Health metrics
echo "4️⃣ Testing health metrics endpoint..."
echo "   GET $BASE_URL/api/v1/docs/health/metrics"
curl -s "$BASE_URL/api/v1/docs/health/metrics" | jq '.' 2>/dev/null || echo "❌ Failed"
echo ""

# Test 5: Trends
echo "5️⃣ Testing trends endpoint..."
echo "   GET $BASE_URL/api/v1/docs/health/trends?days=7"
curl -s "$BASE_URL/api/v1/docs/health/trends?days=7" | jq '.' 2>/dev/null || echo "❌ Failed"
echo ""

echo "============================================"
echo "API Test Complete"
echo "============================================"
