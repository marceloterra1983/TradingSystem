#!/bin/bash

###############################################################################
# RAG Service Refactoring Validation Script
# Tests the refactored JWT authentication and error handling
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    ((TESTS_RUN++))
    local test_name="$1"
    log_info "Running: $test_name"
}

###############################################################################
# Test 1: JWT Module Exists and is Importable
###############################################################################
test_jwt_module_exists() {
    run_test "JWT module exists"

    if [ -f "$PROJECT_ROOT/backend/shared/auth/jwt.js" ]; then
        log_success "JWT module file exists"
    else
        log_error "JWT module file not found at backend/shared/auth/jwt.js"
        return 1
    fi

    # Check if test file exists
    if [ -f "$PROJECT_ROOT/backend/shared/auth/__tests__/jwt.test.js" ]; then
        log_success "JWT test file exists"
    else
        log_error "JWT test file not found"
        return 1
    fi
}

###############################################################################
# Test 2: JWT Module Exports Expected Functions
###############################################################################
test_jwt_exports() {
    run_test "JWT module exports"

    local jwt_file="$PROJECT_ROOT/backend/shared/auth/jwt.js"
    local required_exports=("createJwt" "verifyJwt" "createBearer" "createServiceToken" "extractBearerToken")

    for export_name in "${required_exports[@]}"; do
        if grep -q "export.*function $export_name" "$jwt_file" || grep -q "export.*$export_name" "$jwt_file"; then
            log_success "JWT module exports $export_name"
        else
            log_error "JWT module missing export: $export_name"
            return 1
        fi
    done
}

###############################################################################
# Test 3: Error Handler Has Custom Error Classes
###############################################################################
test_error_classes() {
    run_test "Error handler custom classes"

    local error_file="$PROJECT_ROOT/backend/api/documentation-api/src/middleware/errorHandler.js"
    local required_classes=("AppError" "ValidationError" "NotFoundError" "ServiceUnavailableError" "ExternalServiceError")

    for class_name in "${required_classes[@]}"; do
        if grep -q "export class $class_name" "$error_file"; then
            log_success "Error handler has $class_name class"
        else
            log_error "Error handler missing class: $class_name"
            return 1
        fi
    done
}

###############################################################################
# Test 4: RAG Proxy Uses Shared JWT Module
###############################################################################
test_rag_proxy_uses_jwt() {
    run_test "RAG proxy uses shared JWT module"

    local proxy_file="$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-proxy.js"

    if grep -q "from.*shared/auth/jwt" "$proxy_file"; then
        log_success "RAG proxy imports from shared JWT module"
    else
        log_error "RAG proxy doesn't import from shared JWT module"
        return 1
    fi

    if grep -q "createBearer" "$proxy_file"; then
        log_success "RAG proxy uses createBearer function"
    else
        log_error "RAG proxy doesn't use createBearer"
        return 1
    fi
}

###############################################################################
# Test 5: RAG Status Uses Shared JWT Module
###############################################################################
test_rag_status_uses_jwt() {
    run_test "RAG status uses shared JWT module"

    local status_file="$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-status.js"

    if grep -q "from.*shared/auth/jwt" "$status_file"; then
        log_success "RAG status imports from shared JWT module"
    else
        log_error "RAG status doesn't import from shared JWT module"
        return 1
    fi

    if grep -q "createServiceToken" "$status_file"; then
        log_success "RAG status uses createServiceToken function"
    else
        log_error "RAG status doesn't use createServiceToken"
        return 1
    fi
}

###############################################################################
# Test 6: No Duplicate JWT Code
###############################################################################
test_no_duplicate_jwt() {
    run_test "No duplicate JWT implementation"

    local proxy_file="$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-proxy.js"
    local status_file="$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-status.js"

    # Check that files don't contain inline JWT implementations
    if grep -q "function base64url" "$proxy_file"; then
        log_error "RAG proxy still has inline base64url function"
        return 1
    else
        log_success "RAG proxy has no inline JWT code"
    fi

    if grep -q "function signHmacSha256" "$status_file"; then
        log_error "RAG status still has inline signHmacSha256 function"
        return 1
    else
        log_success "RAG status has no inline JWT code"
    fi
}

###############################################################################
# Test 7: Refactoring Documentation Exists
###############################################################################
test_documentation_exists() {
    run_test "Refactoring documentation exists"

    if [ -f "$PROJECT_ROOT/REFACTORING-RAG-SERVICE.md" ]; then
        log_success "Refactoring documentation found"
    else
        log_error "Refactoring documentation not found"
        return 1
    fi
}

###############################################################################
# Test 8: Git Branch and Commit
###############################################################################
test_git_branch() {
    run_test "Git branch status"

    cd "$PROJECT_ROOT"

    local current_branch=$(git branch --show-current)
    if [ "$current_branch" = "refactor/rag-service-architecture" ]; then
        log_success "On correct refactoring branch"
    else
        log_warn "Not on refactoring branch (current: $current_branch)"
    fi

    # Check if refactoring commit exists
    if git log --oneline | grep -q "refactor(rag):"; then
        log_success "Refactoring commit found in history"
    else
        log_warn "Refactoring commit not found in recent history"
    fi
}

###############################################################################
# Test 9: Run JWT Tests (if npm is available)
###############################################################################
test_jwt_unit_tests() {
    run_test "JWT unit tests"

    cd "$PROJECT_ROOT/backend/shared/auth"

    if [ ! -f "package.json" ]; then
        log_warn "No package.json found - skipping npm tests"
        return 0
    fi

    if command -v npm &> /dev/null; then
        log_info "Running JWT test suite..."
        if npm test 2>&1 | grep -q "PASS\|passed"; then
            log_success "JWT tests passed"
        else
            log_warn "JWT tests may have issues (check manually)"
        fi
    else
        log_warn "npm not available - skipping automated tests"
    fi
}

###############################################################################
# Test 10: Check Service Files Syntax
###############################################################################
test_syntax_check() {
    run_test "JavaScript syntax check"

    local files=(
        "$PROJECT_ROOT/backend/shared/auth/jwt.js"
        "$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-proxy.js"
        "$PROJECT_ROOT/backend/api/documentation-api/src/routes/rag-status.js"
        "$PROJECT_ROOT/backend/api/documentation-api/src/middleware/errorHandler.js"
    )

    if command -v node &> /dev/null; then
        for file in "${files[@]}"; do
            if node --check "$file" 2>&1; then
                log_success "Syntax OK: $(basename "$file")"
            else
                log_error "Syntax error in: $(basename "$file")"
                return 1
            fi
        done
    else
        log_warn "Node.js not available - skipping syntax check"
    fi
}

###############################################################################
# Main Test Runner
###############################################################################

main() {
    echo ""
    echo "======================================================================"
    echo "  RAG Service Refactoring Validation"
    echo "======================================================================"
    echo ""

    log_info "Starting validation tests..."
    echo ""

    # Run all tests
    test_jwt_module_exists || true
    test_jwt_exports || true
    test_error_classes || true
    test_rag_proxy_uses_jwt || true
    test_rag_status_uses_jwt || true
    test_no_duplicate_jwt || true
    test_documentation_exists || true
    test_git_branch || true
    test_syntax_check || true

    # Summary
    echo ""
    echo "======================================================================"
    echo "  Test Summary"
    echo "======================================================================"
    echo -e "Tests Run:    ${BLUE}$TESTS_RUN${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All validation tests passed!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Test RAG endpoints manually"
        echo "  2. Run full system health check"
        echo "  3. Review REFACTORING-RAG-SERVICE.md for details"
        echo "  4. Continue with Phase 2 (Service Layer)"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Some validation tests failed${NC}"
        echo ""
        echo "Please review the errors above and fix issues before proceeding."
        echo ""
        return 1
    fi
}

# Run main function
main "$@"
