#!/bin/bash

# Phase 2 Testing Script
# Tests Stripe webhook verification and IAP validation hardening

set -e

echo "🧪 Phase 2 Testing - Payments and Subscriptions"
echo "================================================"
echo ""

# Colors for output
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

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null; then
  pass "Server is running"
else
  fail "Server is not running. Start with: npm start"
  exit 1
fi

echo ""

# Test 2: Check if new service exists
echo "2. Checking if IAPValidationService exists..."
if [ -f "src/services/iapValidationService.ts" ]; then
  pass "IAPValidationService file exists"
else
  fail "IAPValidationService file not found"
fi

echo ""

# Test 3: Check if migrations exist
echo "3. Checking if database migrations exist..."
if [ -f "../supabase/migrations/20251007000001_create_stripe_webhook_events.sql" ]; then
  pass "Stripe webhook events migration exists"
else
  fail "Stripe webhook events migration not found"
fi

if [ -f "../supabase/migrations/20251007000002_create_iap_validation_history.sql" ]; then
  pass "IAP validation history migration exists"
else
  fail "IAP validation history migration not found"
fi

echo ""

# Test 4: Check TypeScript compilation
echo "4. Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  pass "TypeScript compiles without errors"
else
  fail "TypeScript compilation failed"
fi

echo ""

# Test 5: Test webhook endpoint (without signature - should fail)
echo "5. Testing webhook signature verification (should reject invalid signature)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST http://localhost:3000/api/v1/subscription/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid_signature" \
  -d '{"type":"test","data":{}}')

if [ "$RESPONSE" = "400" ]; then
  pass "Webhook rejects invalid signature (400)"
else
  fail "Webhook did not reject invalid signature (got $RESPONSE)"
fi

echo ""

# Test 6: Test IAP validation endpoint (requires auth - should return 401)
echo "6. Testing IAP validation authentication (should require auth)..."
RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null -X POST http://localhost:3000/api/v1/iap/validate-receipt \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","productId":"test","receipt":"test"}')

if [ "$RESPONSE" = "401" ]; then
  pass "IAP validation requires authentication (401)"
else
  fail "IAP validation did not require auth (got $RESPONSE)"
fi

echo ""

# Test 7: Check if documentation exists
echo "7. Checking documentation..."
if [ -f "TEST_PHASE_2.md" ]; then
  pass "Test documentation exists"
else
  warn "Test documentation not found (recommended)"
fi

if [ -f "../../PHASE_2_SUMMARY.md" ]; then
  pass "Phase 2 summary exists"
else
  warn "Phase 2 summary not found (recommended)"
fi

echo ""

# Test 8: Lint check
echo "8. Running linter on new files..."
if npm run lint -- src/services/iapValidationService.ts src/routes/iap-validation.ts > /dev/null 2>&1; then
  pass "Linter passed on new files"
else
  warn "Linter issues found (review manually)"
fi

echo ""

# Summary
echo "================================================"
echo "Test Results Summary"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Phase 2 implementation is ready.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run manual tests from TEST_PHASE_2.md"
  echo "2. Deploy to staging environment"
  echo "3. Run integration tests"
  echo "4. Deploy to production"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please fix the issues above.${NC}"
  exit 1
fi

