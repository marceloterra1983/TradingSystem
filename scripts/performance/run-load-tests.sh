#!/bin/bash

#
# Load Test Runner
#
# OPT-010: Run K6 load tests for all APIs
#
# Usage:
#   bash scripts/performance/run-load-tests.sh [test-name]
#   bash scripts/performance/run-load-tests.sh workspace
#   bash scripts/performance/run-load-tests.sh all
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
  echo -e "${YELLOW}K6 not installed. Installing...${NC}"

  # Install K6 (Linux)
  if [ "$(uname)" == "Linux" ]; then
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
  fi

  # Install K6 (macOS)
  if [ "$(uname)" == "Darwin" ]; then
    brew install k6
  fi
fi

# Test selection
TEST=$1

run_workspace_test() {
  print_header "Load Test: Workspace API"
  k6 run \
    --vus 100 \
    --duration 5m \
    --out json=tests/performance/results/workspace-$(date +%Y%m%d-%H%M%S).json \
    tests/performance/workspace-api.k6.js
}

run_rag_test() {
  print_header "Load Test: RAG API"
  k6 run \
    --vus 20 \
    --duration 5m \
    --out json=tests/performance/results/rag-$(date +%Y%m%d-%H%M%S).json \
    tests/performance/rag-api.k6.js
}

run_all_tests() {
  print_header "Running All Load Tests"

  mkdir -p tests/performance/results

  run_workspace_test
  run_rag_test

  print_header "All Tests Complete"
  echo -e "${GREEN}Results saved to: tests/performance/results/${NC}"
}

# Main
case "$TEST" in
  workspace)
    run_workspace_test
    ;;
  rag)
    run_rag_test
    ;;
  all|"")
    run_all_tests
    ;;
  *)
    echo "Unknown test: $TEST"
    echo "Usage: bash scripts/performance/run-load-tests.sh [workspace|rag|all]"
    exit 1
    ;;
esac
