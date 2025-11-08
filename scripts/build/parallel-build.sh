#!/bin/bash

#
# Parallel Build Script - TradingSystem
#
# Builds documentation and dashboard simultaneously for faster builds
#
# Usage:
#   bash scripts/build/parallel-build.sh [--clean] [--measure]
#
# Options:
#   --clean    Clean build artifacts before building
#   --measure  Show detailed timing for each step
#

set -e  # Exit on error

CLEAN_BUILD=false
MEASURE_TIME=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    --measure)
      MEASURE_TIME=true
      shift
      ;;
    --help)
      echo "Usage: bash scripts/build/parallel-build.sh [--clean] [--measure]"
      echo ""
      echo "Options:"
      echo "  --clean    Clean build artifacts before building"
      echo "  --measure  Show detailed timing for each step"
      exit 0
      ;;
  esac
done

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timer function
start_timer() {
  START_TIME=$(date +%s.%N)
}

end_timer() {
  local label="$1"
  END_TIME=$(date +%s.%N)
  DURATION=$(echo "$END_TIME - $START_TIME" | bc)
  if [ "$MEASURE_TIME" = true ]; then
    printf "${BLUE}⏱️  %s: %.2fs${NC}\n" "$label" "$DURATION"
  fi
}

echo -e "${BLUE}🚀 Parallel Build - TradingSystem${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Clean build artifacts if requested
if [ "$CLEAN_BUILD" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"
  start_timer

  # Clean dashboard
  rm -rf "$PROJECT_ROOT/frontend/dashboard/dist"
  rm -f "$PROJECT_ROOT/frontend/dashboard/.tsbuildinfo"
  rm -f "$PROJECT_ROOT/frontend/dashboard/.agents-cache.json"

  # Clean docs
  rm -rf "$PROJECT_ROOT/docs/build"
  rm -f "$PROJECT_ROOT/docs/.tsbuildinfo"

  # Clean root
  rm -f "$PROJECT_ROOT/tsconfig.tsbuildinfo"

  end_timer "Clean"
  echo ""
fi

# Create log directory
LOG_DIR="$PROJECT_ROOT/.build-logs"
mkdir -p "$LOG_DIR"

DOCS_LOG="$LOG_DIR/docs-build.log"
DASHBOARD_LOG="$LOG_DIR/dashboard-build.log"

# Clear previous logs
> "$DOCS_LOG"
> "$DASHBOARD_LOG"

echo -e "${BLUE}📦 Building projects in parallel...${NC}"
echo ""

# Start overall timer
start_timer

# Build documentation in background
(
  echo -e "${YELLOW}📚 Building documentation...${NC}" | tee -a "$DOCS_LOG"
  cd "$PROJECT_ROOT/docs"

  if npm run docs:build >> "$DOCS_LOG" 2>&1; then
    echo -e "${GREEN}✅ Documentation build completed${NC}" | tee -a "$DOCS_LOG"
    exit 0
  else
    echo -e "${RED}❌ Documentation build failed${NC}" | tee -a "$DOCS_LOG"
    exit 1
  fi
) &
DOCS_PID=$!

# Build dashboard in background
(
  echo -e "${YELLOW}🎨 Building dashboard...${NC}" | tee -a "$DASHBOARD_LOG"
  cd "$PROJECT_ROOT/frontend/dashboard"

  if npm run build >> "$DASHBOARD_LOG" 2>&1; then
    echo -e "${GREEN}✅ Dashboard build completed${NC}" | tee -a "$DASHBOARD_LOG"
    exit 0
  else
    echo -e "${RED}❌ Dashboard build failed${NC}" | tee -a "$DASHBOARD_LOG"
    exit 1
  fi
) &
DASHBOARD_PID=$!

# Wait for both builds to complete
DOCS_EXIT=0
DASHBOARD_EXIT=0

wait $DOCS_PID || DOCS_EXIT=$?
wait $DASHBOARD_PID || DASHBOARD_EXIT=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check results
FAILED=false

if [ $DOCS_EXIT -ne 0 ]; then
  echo -e "${RED}❌ Documentation build failed (exit code: $DOCS_EXIT)${NC}"
  echo -e "${YELLOW}   See logs: $DOCS_LOG${NC}"
  FAILED=true
else
  echo -e "${GREEN}✅ Documentation build successful${NC}"
fi

if [ $DASHBOARD_EXIT -ne 0 ]; then
  echo -e "${RED}❌ Dashboard build failed (exit code: $DASHBOARD_EXIT)${NC}"
  echo -e "${YELLOW}   See logs: $DASHBOARD_LOG${NC}"
  FAILED=true
else
  echo -e "${GREEN}✅ Dashboard build successful${NC}"
fi

end_timer "Total parallel build time"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAILED" = true ]; then
  echo ""
  echo -e "${RED}⚠️  Some builds failed. Check logs above.${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}🎉 All builds completed successfully!${NC}"

  # Show build artifact sizes
  if [ "$MEASURE_TIME" = true ]; then
    echo ""
    echo -e "${BLUE}📊 Build Artifact Sizes:${NC}"

    if [ -d "$PROJECT_ROOT/docs/build" ]; then
      DOCS_SIZE=$(du -sh "$PROJECT_ROOT/docs/build" | cut -f1)
      echo -e "   📚 Documentation: ${YELLOW}$DOCS_SIZE${NC}"
    fi

    if [ -d "$PROJECT_ROOT/frontend/dashboard/dist" ]; then
      DASHBOARD_SIZE=$(du -sh "$PROJECT_ROOT/frontend/dashboard/dist" | cut -f1)
      echo -e "   🎨 Dashboard: ${YELLOW}$DASHBOARD_SIZE${NC}"
    fi
  fi

  exit 0
fi
