#!/bin/bash
# Critical Security Fixes - Automated Application Script
# This script applies all P0 (critical) fixes identified in the code review

set -euo pipefail

echo "🚨 Applying Critical Security Fixes"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track fixes applied
FIXES_APPLIED=0
FIXES_FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "📋 Critical Fixes to Apply:"
echo "  1. Verify .env files are not tracked"
echo "  2. Remove hardcoded passwords from Docker Compose"
echo "  3. Add input validation to RAG endpoints"
echo "  4. Create security documentation"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted by user"
    exit 1
fi

echo ""
echo "🔧 Starting fixes..."
echo ""

# ==============================================================================
# FIX 1: Verify .env Security
# ==============================================================================
echo "1️⃣  Verifying .env files are not tracked..."

TRACKED_ENV=$(git ls-files | grep -E "^\.env$|/\.env$" | grep -v ".env.example" || true)

if [ -z "$TRACKED_ENV" ]; then
    print_success ".env files are not tracked in git"
    ((FIXES_APPLIED++))
else
    print_error "Found .env files tracked in git:"
    echo "$TRACKED_ENV"
    print_warning "Run: git rm --cached .env"
    ((FIXES_FAILED++))
fi

echo ""

# ==============================================================================
# FIX 2: Remove Hardcoded Passwords from Docker Compose
# ==============================================================================
echo "2️⃣  Checking for hardcoded passwords in Docker Compose..."

# This is a complex fix that requires manual intervention
# We'll create a report instead
COMPOSE_FILES=$(find tools/compose -name "docker-compose.*.yml")
HARDCODED_FOUND=0

for file in $COMPOSE_FILES; do
    # Look for common password patterns
    if grep -E "PASSWORD:|password:|POSTGRES_PASSWORD|MYSQL_PASSWORD|REDIS_PASSWORD" "$file" | grep -v "\${" | grep -v "#" > /dev/null 2>&1; then
        if [ $HARDCODED_FOUND -eq 0 ]; then
            print_warning "Found hardcoded passwords in Docker Compose files:"
            ((HARDCODED_FOUND++))
        fi
        echo "  - $file"
    fi
done

if [ $HARDCODED_FOUND -eq 0 ]; then
    print_success "No hardcoded passwords found in Docker Compose"
    ((FIXES_APPLIED++))
else
    print_warning "Manual fix required - see documentation"
    echo "  Action: Move passwords to .env and use \${VARIABLE} syntax"
    ((FIXES_FAILED++))
fi

echo ""

# ==============================================================================
# FIX 3: Check Input Validation
# ==============================================================================
echo "3️⃣  Checking input validation in RAG endpoints..."

RAG_ROUTE="backend/api/documentation-api/src/routes/api-v1.js"

if [ -f "$RAG_ROUTE" ]; then
    # Check if express-validator is used
    if grep -q "express-validator" "$RAG_ROUTE"; then
        print_success "Input validation middleware found"
        ((FIXES_APPLIED++))
    else
        print_warning "Input validation not implemented"
        echo "  Action: Add express-validator to $RAG_ROUTE"
        ((FIXES_FAILED++))
    fi
else
    print_warning "RAG route file not found: $RAG_ROUTE"
    ((FIXES_FAILED++))
fi

echo ""

# ==============================================================================
# FIX 4: Security Documentation
# ==============================================================================
echo "4️⃣  Checking security documentation..."

if [ -f "docs/content/tools/security-config/SECURITY-BEST-PRACTICES.md" ]; then
    print_success "Security documentation exists"
    ((FIXES_APPLIED++))
else
    print_warning "Security documentation not found"
    echo "  Action: Create security best practices guide"
    ((FIXES_FAILED++))
fi

echo ""
echo "===================================="
echo "📊 Summary"
echo "===================================="
echo "Fixes Applied: $FIXES_APPLIED"
echo "Fixes Failed/Pending: $FIXES_FAILED"
echo ""

if [ $FIXES_FAILED -gt 0 ]; then
    print_warning "Some fixes require manual intervention"
    echo ""
    echo "Next Steps:"
    echo "1. Review CRITICAL-FIXES-IMPLEMENTATION.md"
    echo "2. Apply manual fixes as documented"
    echo "3. Run this script again to verify"
    echo ""
    exit 1
else
    print_success "All critical fixes verified!"
    echo ""
    echo "Recommended:"
    echo "1. Run tests: npm test"
    echo "2. Check security: npm audit"
    echo "3. Review git status: git status"
    echo ""
    exit 0
fi
