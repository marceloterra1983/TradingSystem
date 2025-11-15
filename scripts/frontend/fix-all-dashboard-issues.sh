#!/bin/bash

# fix-all-dashboard-issues.sh
# Master script to analyze and fix all dashboard console errors and warnings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DASHBOARD_DIR="$PROJECT_ROOT/frontend/dashboard"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     DASHBOARD CONSOLE ERRORS - COMPREHENSIVE FIX          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to show menu
show_menu() {
    echo ""
    echo -e "${BLUE}Select operation:${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC} Quick Analysis (Fast pattern check)"
    echo -e "  ${GREEN}2)${NC} Full Analysis (Comprehensive report)"
    echo -e "  ${GREEN}3)${NC} Auto-fix Issues (ESLint + Prettier)"
    echo -e "  ${GREEN}4)${NC} Complete Fix (Analysis + Auto-fix)"
    echo -e "  ${GREEN}5)${NC} Type Check Only"
    echo -e "  ${GREEN}6)${NC} Build Validation"
    echo -e "  ${GREEN}7)${NC} Show Reports"
    echo -e "  ${GREEN}0)${NC} Exit"
    echo ""
    echo -n "Enter choice [0-7]: "
}

# Function for quick analysis
quick_analysis() {
    echo -e "${YELLOW}Running quick analysis...${NC}"
    bash "$SCRIPT_DIR/check-browser-console.sh"
}

# Function for full analysis
full_analysis() {
    echo -e "${YELLOW}Running full comprehensive analysis...${NC}"
    bash "$SCRIPT_DIR/fix-console-errors.sh"

    # Show summary
    LATEST_REPORT=$(ls -t "$DASHBOARD_DIR/reports/COMPREHENSIVE-REPORT-"*.md | head -1)
    if [ -f "$LATEST_REPORT" ]; then
        echo ""
        echo -e "${GREEN}Report generated:${NC}"
        echo -e "  ${BLUE}$LATEST_REPORT${NC}"
        echo ""
        echo -e "${BLUE}View with: ${YELLOW}cat \"$LATEST_REPORT\"${NC}"
    fi
}

# Function for auto-fix
auto_fix() {
    echo -e "${YELLOW}Running auto-fix...${NC}"
    bash "$SCRIPT_DIR/auto-fix-issues.sh"
}

# Function for complete fix
complete_fix() {
    echo -e "${MAGENTA}Running complete fix process...${NC}"
    echo ""

    # Step 1: Analysis
    echo -e "${BLUE}[1/3] Running analysis...${NC}"
    quick_analysis

    echo ""
    echo -e "${BLUE}Continue with auto-fix? [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        # Step 2: Auto-fix
        echo ""
        echo -e "${BLUE}[2/3] Running auto-fix...${NC}"
        auto_fix

        # Step 3: Validation
        echo ""
        echo -e "${BLUE}[3/3] Running validation...${NC}"
        type_check
        build_validation

        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}✓ Complete fix process finished!${NC}"
        echo -e "${GREEN}========================================${NC}"
    else
        echo -e "${YELLOW}Auto-fix cancelled.${NC}"
    fi
}

# Function for type check
type_check() {
    echo -e "${YELLOW}Running TypeScript type check...${NC}"
    cd "$DASHBOARD_DIR"
    npm run type-check || {
        echo -e "${RED}✗ TypeScript errors found${NC}"
        return 1
    }
    echo -e "${GREEN}✓ No TypeScript errors${NC}"
}

# Function for build validation
build_validation() {
    echo -e "${YELLOW}Running build validation...${NC}"
    cd "$DASHBOARD_DIR"

    # Save current NODE_ENV
    OLD_NODE_ENV="${NODE_ENV:-}"

    # Build in production mode
    export NODE_ENV=production
    npm run build || {
        echo -e "${RED}✗ Build failed${NC}"
        export NODE_ENV="$OLD_NODE_ENV"
        return 1
    }

    # Restore NODE_ENV
    export NODE_ENV="$OLD_NODE_ENV"

    echo -e "${GREEN}✓ Build successful${NC}"

    # Show build stats
    if [ -d "$DASHBOARD_DIR/dist" ]; then
        echo ""
        echo -e "${BLUE}Build statistics:${NC}"
        du -sh "$DASHBOARD_DIR/dist"
        echo ""
        echo -e "${BLUE}Largest assets:${NC}"
        find "$DASHBOARD_DIR/dist" -type f -name "*.js" -exec du -h {} + | \
            sort -rh | head -10
    fi
}

# Function to show reports
show_reports() {
    REPORT_DIR="$DASHBOARD_DIR/reports"

    if [ ! -d "$REPORT_DIR" ]; then
        echo -e "${YELLOW}No reports directory found.${NC}"
        echo -e "${BLUE}Run analysis first (option 1 or 2).${NC}"
        return
    fi

    echo -e "${BLUE}Available reports:${NC}"
    echo ""

    # List comprehensive reports
    COMP_REPORTS=$(ls -t "$REPORT_DIR/COMPREHENSIVE-REPORT-"*.md 2>/dev/null || echo "")
    if [ -n "$COMP_REPORTS" ]; then
        echo -e "${GREEN}Comprehensive Reports:${NC}"
        echo "$COMP_REPORTS" | head -5
        echo ""
    fi

    # List ESLint reports
    ESLINT_REPORTS=$(ls -t "$REPORT_DIR/eslint-report-"*.txt 2>/dev/null || echo "")
    if [ -n "$ESLINT_REPORTS" ]; then
        echo -e "${GREEN}ESLint Reports:${NC}"
        echo "$ESLINT_REPORTS" | head -3
        echo ""
    fi

    echo -e "${BLUE}View a report:${NC}"
    echo -e "  ${YELLOW}cat \"$REPORT_DIR/<filename>\"${NC}"
    echo ""
    echo -e "${BLUE}Open reports directory:${NC}"
    echo -e "  ${YELLOW}cd \"$REPORT_DIR\"${NC}"
}

# Main loop
while true; do
    show_menu
    read -r choice

    case $choice in
        1)
            quick_analysis
            ;;
        2)
            full_analysis
            ;;
        3)
            auto_fix
            ;;
        4)
            complete_fix
            ;;
        5)
            type_check
            ;;
        6)
            build_validation
            ;;
        7)
            show_reports
            ;;
        0)
            echo -e "${GREEN}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            ;;
    esac

    echo ""
    echo -e "${BLUE}Press Enter to continue...${NC}"
    read -r
done
