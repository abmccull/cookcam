#!/bin/bash

###############################################################################
# Phase 1 Implementation Testing Script
# Run this to verify all Phase 1 changes are working correctly
###############################################################################

set -e  # Exit on error

echo "======================================================================"
echo "🧪 Phase 1 Implementation Tests"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

section() {
    echo ""
    echo "======================================================================"
    echo "📋 $1"
    echo "======================================================================"
}

###############################################################################
# Test 1: Environment Validation
###############################################################################
section "Test 1: Environment Validation"

# Test 1a: Missing required variable
echo "Test 1a: App should fail with missing OPENAI_API_KEY..."
ORIGINAL_KEY=$OPENAI_API_KEY
unset OPENAI_API_KEY

if npm run build > /dev/null 2>&1 && timeout 5 node dist/index.js > /tmp/test_output.log 2>&1; then
    fail "App started without OPENAI_API_KEY (should have failed)"
    cat /tmp/test_output.log
else
    if grep -q "OPENAI_API_KEY" /tmp/test_output.log 2>/dev/null; then
        pass "App correctly failed with clear error message"
    else
        warn "App failed but error message unclear"
    fi
fi

export OPENAI_API_KEY=$ORIGINAL_KEY

# Test 1b: Successful startup with all vars
echo ""
echo "Test 1b: App should start successfully with all required vars..."
if [ -f ".env" ]; then
    if npm run build > /dev/null 2>&1; then
        pass "Build succeeded"
        
        # Try to start (but kill after 3 seconds)
        timeout 3 node dist/index.js > /tmp/test_startup.log 2>&1 || true
        
        if grep -q "Environment validation successful" /tmp/test_startup.log; then
            pass "Environment validation successful"
        else
            fail "Environment validation message not found"
            echo "Log output:"
            cat /tmp/test_startup.log
        fi
        
        if grep -q "Supabase clients initialized" /tmp/test_startup.log; then
            pass "Supabase clients initialized"
        else
            fail "Supabase initialization message not found"
        fi
    else
        fail "Build failed"
    fi
else
    warn ".env file not found - skipping startup test"
fi

###############################################################################
# Test 2: TypeScript Compilation
###############################################################################
section "Test 2: TypeScript Type Checking"

echo "Running type check..."
if npm run type-check > /dev/null 2>&1; then
    pass "TypeScript compilation successful (no type errors)"
else
    fail "TypeScript compilation failed"
    echo "Run 'npm run type-check' to see errors"
fi

###############################################################################
# Test 3: Lint Check
###############################################################################
section "Test 3: ESLint"

echo "Running linter..."
if npm run lint > /dev/null 2>&1; then
    pass "No linting errors"
else
    warn "Linting errors found (run 'npm run lint' to see details)"
fi

###############################################################################
# Test 4: File Structure
###############################################################################
section "Test 4: File Structure"

# Check new files exist
FILES=(
    "src/config/env.ts"
    "src/config/env.schema.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done

# Check imports are correct
echo ""
echo "Checking imports..."
if grep -q "import { validateEnv" src/index.ts; then
    pass "index.ts imports validateEnv"
else
    fail "index.ts missing validateEnv import"
fi

if ! grep -q "import jwt from 'jsonwebtoken'" src/services/realTimeService.ts; then
    pass "realTimeService.ts removed jwt import"
else
    fail "realTimeService.ts still has jwt import (should be removed)"
fi

###############################################################################
# Test 5: Error Handler
###############################################################################
section "Test 5: Error Handler Changes"

# Check Mongoose references removed
if grep -iq "mongoose" src/middleware/errorHandler.ts; then
    fail "errorHandler.ts still contains Mongoose references"
else
    pass "Mongoose references removed from errorHandler.ts"
fi

# Check Postgres error codes added
if grep -q "23505" src/middleware/errorHandler.ts && \
   grep -q "PGRST116" src/middleware/errorHandler.ts; then
    pass "Postgres and Supabase error codes added"
else
    fail "Missing Postgres/Supabase error codes"
fi

###############################################################################
# Summary
###############################################################################
section "Test Summary"

TOTAL=$((PASSED + FAILED))
echo ""
echo "Tests run: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}======================================================================"
    echo "🎉 All tests passed! Phase 1 implementation looks good."
    echo "======================================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes: git diff"
    echo "  2. Test manually: npm start"
    echo "  3. Commit changes: git add . && git commit -m 'feat: Phase 1 production readiness'"
    echo "  4. Deploy to staging for integration testing"
    exit 0
else
    echo -e "${RED}======================================================================"
    echo "❌ Some tests failed. Please review the output above."
    echo "======================================================================${NC}"
    exit 1
fi

