#!/bin/bash
# ==============================================================================
# Course Crawler Load Testing Runner
# ==============================================================================
# Runs k6 load tests against the Course Crawler API
# Usage: ./run-load-tests.sh [basic|stress|spike] [--api-url http://localhost:3601]
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TEST_TYPE=${1:-basic}
API_URL=${2:-http://localhost:3601}
TESTS_DIR="/home/marce/Projetos/TradingSystem/backend/api/course-crawler/tests/load"
RESULTS_DIR="/home/marce/Projetos/TradingSystem/backend/api/course-crawler/tests/load/results"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Course Crawler Load Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo -e "${RED}❌ k6 is not installed${NC}"
  echo ""
  echo -e "${YELLOW}Install k6:${NC}"
  echo "  sudo gpg -k"
  echo "  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
  echo "  echo \"deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list"
  echo "  sudo apt-get update"
  echo "  sudo apt-get install k6"
  exit 1
fi

# Check if API is reachable
echo -e "${YELLOW}🔍 Checking API availability...${NC}"
if ! curl -s -f "${API_URL}/health" > /dev/null; then
  echo -e "${RED}❌ API not reachable at ${API_URL}${NC}"
  echo -e "${YELLOW}💡 Make sure Course Crawler stack is running:${NC}"
  echo "   docker compose -f tools/compose/docker-compose.4-5-course-crawler-stack.yml up -d"
  exit 1
fi
echo -e "${GREEN}✅ API is reachable${NC}"
echo ""

# Create results directory
mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Select test file
case ${TEST_TYPE} in
  basic)
    TEST_FILE="${TESTS_DIR}/basic-load-test.js"
    RESULT_FILE="${RESULTS_DIR}/basic_${TIMESTAMP}.json"
    echo -e "${BLUE}📊 Running BASIC load test${NC}"
    ;;
  stress)
    TEST_FILE="${TESTS_DIR}/stress-test.js"
    RESULT_FILE="${RESULTS_DIR}/stress_${TIMESTAMP}.json"
    echo -e "${BLUE}🔥 Running STRESS test${NC}"
    ;;
  *)
    echo -e "${RED}❌ Unknown test type: ${TEST_TYPE}${NC}"
    echo "Available types: basic, stress"
    exit 1
    ;;
esac

echo -e "   Test file: ${TEST_FILE}"
echo -e "   API URL: ${API_URL}"
echo -e "   Results: ${RESULT_FILE}"
echo ""

# Run k6 test
echo -e "${YELLOW}🚀 Starting load test...${NC}"
echo ""

k6 run \
  --out json="${RESULT_FILE}" \
  --env API_URL="${API_URL}" \
  "${TEST_FILE}"

EXIT_CODE=$?

echo ""
if [ ${EXIT_CODE} -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ Load test PASSED${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}❌ Load test FAILED${NC}"
  echo -e "${RED}========================================${NC}"
fi

echo ""
echo -e "${BLUE}📝 Results saved to:${NC}"
echo "   ${RESULT_FILE}"
echo ""

exit ${EXIT_CODE}
