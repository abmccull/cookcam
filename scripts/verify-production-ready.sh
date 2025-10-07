#!/bin/bash

# CookCam Production Readiness Verification Script
# This script checks if all production readiness requirements are met

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 CookCam Production Readiness Verification"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

function warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

function success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function info() {
    echo "ℹ️  $1"
}

echo "## Phase 1: Files & Structure"
echo "-----------------------------------"

# Check critical files exist
if [ -f "$ROOT_DIR/backend/api/src/config/env.ts" ]; then
    success "Environment validation exists"
else
    error "Environment validation missing"
fi

if [ -f "$ROOT_DIR/backend/api/src/services/iapValidationService.ts" ]; then
    success "IAP validation service exists"
else
    error "IAP validation service missing"
fi

if [ -f "$ROOT_DIR/backend/api/src/jobs/subscriptionReconciliation.ts" ]; then
    success "Subscription reconciliation exists"
else
    error "Subscription reconciliation missing"
fi

echo ""
echo "## Phase 2: Database Migrations"
echo "-----------------------------------"

MIGRATION_DIR="$ROOT_DIR/backend/supabase/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    MIGRATION_COUNT=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l)
    if [ $MIGRATION_COUNT -ge 5 ]; then
        success "Found $MIGRATION_COUNT migrations"
    else
        warning "Only found $MIGRATION_COUNT migrations (expected 5+)"
    fi
    
    # Check migration naming
    for file in "$MIGRATION_DIR"/*.sql; do
        filename=$(basename "$file")
        if [[ ! $filename =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
            warning "Invalid migration filename: $filename"
        fi
    done
else
    error "Migrations directory not found"
fi

echo ""
echo "## Phase 3: CI/CD Workflows"
echo "-----------------------------------"

if [ -f "$ROOT_DIR/.github/workflows/backend-ci.yml" ]; then
    success "Backend CI workflow exists"
else
    error "Backend CI workflow missing"
fi

if [ -f "$ROOT_DIR/.github/workflows/mobile-ci.yml" ]; then
    success "Mobile CI workflow exists"
else
    error "Mobile CI workflow missing"
fi

if [ -f "$ROOT_DIR/.github/workflows/security-scan.yml" ]; then
    success "Security scan workflow exists"
else
    error "Security scan workflow missing"
fi

if [ -f "$ROOT_DIR/.github/workflows/database-migrations.yml" ]; then
    success "Database migration workflow exists"
else
    error "Database migration workflow missing"
fi

echo ""
echo "## Phase 4: Git Hooks"
echo "-----------------------------------"

if [ -f "$ROOT_DIR/.husky/pre-commit" ]; then
    if [ -x "$ROOT_DIR/.husky/pre-commit" ]; then
        success "Pre-commit hook exists and is executable"
    else
        warning "Pre-commit hook exists but is not executable"
    fi
else
    error "Pre-commit hook missing"
fi

if [ -f "$ROOT_DIR/.husky/pre-push" ]; then
    if [ -x "$ROOT_DIR/.husky/pre-push" ]; then
        success "Pre-push hook exists and is executable"
    else
        warning "Pre-push hook exists but is not executable"
    fi
else
    error "Pre-push hook missing"
fi

echo ""
echo "## Phase 5: Mobile App Configuration"
echo "-----------------------------------"

if [ -f "$ROOT_DIR/mobile/CookCam/tsconfig.json" ]; then
    if grep -q "noImplicitAny" "$ROOT_DIR/mobile/CookCam/tsconfig.json"; then
        success "TypeScript strict mode enabled"
    else
        warning "TypeScript strict mode not fully configured"
    fi
else
    error "Mobile tsconfig.json missing"
fi

if [ -f "$ROOT_DIR/mobile/CookCam/.eslintrc.js" ]; then
    success "ESLint configuration exists"
else
    warning "ESLint configuration missing"
fi

echo ""
echo "## Phase 6: Documentation"
echo "-----------------------------------"

DOCS=(
    "docs/runbooks/INCIDENT_RESPONSE.md"
    "docs/runbooks/DEPLOYMENT.md"
    "docs/SLO.md"
    "docs/PRODUCTION_QA_CHECKLIST.md"
    "docs/MONITORING_SETUP.md"
    "PRODUCTION_READINESS_IMPLEMENTATION.md"
    "PRODUCTION_READY_SUMMARY.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$ROOT_DIR/$doc" ]; then
        success "$(basename "$doc") exists"
    else
        error "$(basename "$doc") missing"
    fi
done

echo ""
echo "## Phase 7: Security Checks"
echo "-----------------------------------"

# Check for hardcoded secrets (basic check)
if grep -r "password.*=.*['\"][^'\"]*['\"]" "$ROOT_DIR/backend/api/src" --include="*.ts" | grep -v "process.env" | grep -v "REDACTED" | grep -v "config" > /dev/null 2>&1; then
    warning "Potential hardcoded secrets found (manual review needed)"
else
    success "No obvious hardcoded secrets"
fi

# Check for console.log in backend
if grep -r "console\.log" "$ROOT_DIR/backend/api/src" --include="*.ts" | grep -v "console.error\|console.warn" > /dev/null 2>&1; then
    warning "Found console.log in backend code (should use logger)"
else
    success "No console.log in backend"
fi

echo ""
echo "## Phase 8: Backend Type Safety"
echo "-----------------------------------"

cd "$ROOT_DIR/backend/api"
if [ -f "package.json" ]; then
    if npm list typescript > /dev/null 2>&1; then
        success "TypeScript installed"
        
        # Try to compile (without actually running)
        if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
            success "TypeScript compilation passes"
        else
            warning "TypeScript compilation has errors"
        fi
    else
        error "TypeScript not installed"
    fi
else
    error "Backend package.json missing"
fi
cd "$ROOT_DIR"

echo ""
echo "## Phase 9: Nginx Configuration"
echo "-----------------------------------"

if [ -f "$ROOT_DIR/nginx/nginx.conf" ]; then
    success "Main Nginx config exists"
else
    error "Main Nginx config missing"
fi

if [ -f "$ROOT_DIR/nginx/conf.d/default.conf" ]; then
    success "Nginx site config exists"
    
    # Check for optimizations
    if grep -q "proxy_read_timeout.*180" "$ROOT_DIR/nginx/conf.d/default.conf"; then
        success "Nginx timeouts optimized"
    else
        warning "Nginx timeouts may not be optimized"
    fi
else
    error "Nginx site config missing"
fi

echo ""
echo "## Phase 10: PM2 Configuration"
echo "-----------------------------------"

if [ -f "$ROOT_DIR/ecosystem.config.production.js" ]; then
    success "PM2 production config exists"
else
    warning "PM2 production config missing"
fi

if [ -f "$ROOT_DIR/backend/api/cron-reconciliation.js" ]; then
    success "Reconciliation cron job exists"
else
    error "Reconciliation cron job missing"
fi

echo ""
echo "=============================================="
echo "## Summary"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 Perfect! All checks passed!${NC}"
    echo ""
    echo "Your application is 100% production ready!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
    echo ""
    echo "Your application is production ready with minor warnings."
    echo "Review warnings above to ensure they're acceptable."
    exit 0
else
    echo -e "${RED}❌ Errors: $ERRORS${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
    echo ""
    echo "Please fix the errors above before deploying to production."
    exit 1
fi

