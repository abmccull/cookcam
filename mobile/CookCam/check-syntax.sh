#!/bin/bash

# CookCam Syntax and Error Checking Script
# This script systematically checks for issues without needing to build the full app

echo "🔍 CookCam Code Quality & Syntax Check"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track error counts
TOTAL_ERRORS=0
TOTAL_WARNINGS=0

echo ""
echo "${BLUE}1. TypeScript Syntax & Type Check${NC}"
echo "-----------------------------------"
npx tsc --noEmit --jsx react-native src/**/*.tsx src/**/*.ts
TS_EXIT_CODE=$?
if [ $TS_EXIT_CODE -ne 0 ]; then
    echo "${RED}❌ TypeScript errors found${NC}"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
else
    echo "${GREEN}✅ No TypeScript errors${NC}"
fi

echo ""
echo "${BLUE}2. ESLint Code Quality Check${NC}"
echo "-----------------------------"
npx eslint src/**/*.{ts,tsx} --format=compact --quiet
ESLINT_EXIT_CODE=$?
if [ $ESLINT_EXIT_CODE -ne 0 ]; then
    echo "${RED}❌ ESLint errors found${NC}"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
else
    echo "${GREEN}✅ No ESLint errors${NC}"
fi

echo ""
echo "${BLUE}3. ESLint Warnings Check${NC}"
echo "---------------------------"
npx eslint src/**/*.{ts,tsx} --format=compact
ESLINT_WARNINGS_EXIT_CODE=$?
if [ $ESLINT_WARNINGS_EXIT_CODE -ne 0 ]; then
    echo "${YELLOW}⚠️  ESLint warnings found${NC}"
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
fi

echo ""
echo "${BLUE}4. Prettier Formatting Check${NC}"
echo "------------------------------"
npx prettier --check src/**/*.{ts,tsx,js,jsx} 2>/dev/null
PRETTIER_EXIT_CODE=$?
if [ $PRETTIER_EXIT_CODE -ne 0 ]; then
    echo "${YELLOW}⚠️  Prettier formatting issues found${NC}"
    echo "Run: ${BLUE}npx prettier --write src/**/*.{ts,tsx,js,jsx}${NC} to fix"
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
else
    echo "${GREEN}✅ Code is properly formatted${NC}"
fi

echo ""
echo "${BLUE}5. Metro Bundle Syntax Check${NC}"
echo "------------------------------"
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/bundle.js --sourcemap-output /tmp/bundle.map --dry-run 2>/dev/null
METRO_EXIT_CODE=$?
if [ $METRO_EXIT_CODE -ne 0 ]; then
    echo "${RED}❌ Metro bundler found syntax errors${NC}"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
else
    echo "${GREEN}✅ Metro bundler validation passed${NC}"
fi

echo ""
echo "${BLUE}6. Package Dependencies Check${NC}"
echo "--------------------------------"
npm audit --audit-level=high 2>/dev/null
AUDIT_EXIT_CODE=$?
if [ $AUDIT_EXIT_CODE -ne 0 ]; then
    echo "${YELLOW}⚠️  High-severity vulnerabilities found${NC}"
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
else
    echo "${GREEN}✅ No high-severity vulnerabilities${NC}"
fi

echo ""
echo "${BLUE}7. JavaScript/JSX Syntax Check${NC}"
echo "--------------------------------"
# Check for common JSX syntax issues
find src -name "*.tsx" -o -name "*.jsx" | xargs grep -l "JSX element.*has no corresponding closing tag" 2>/dev/null
JSX_ISSUES=$?
if [ $JSX_ISSUES -eq 0 ]; then
    echo "${RED}❌ JSX syntax issues found${NC}"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
else
    echo "${GREEN}✅ No obvious JSX syntax issues${NC}"
fi

echo ""
echo "========================================="
echo "${BLUE}📊 SUMMARY${NC}"
echo "========================================="

if [ $TOTAL_ERRORS -eq 0 ] && [ $TOTAL_WARNINGS -eq 0 ]; then
    echo "${GREEN}🎉 All checks passed! Your code is ready.${NC}"
    exit 0
elif [ $TOTAL_ERRORS -eq 0 ]; then
    echo "${YELLOW}⚠️  ${TOTAL_WARNINGS} warning(s) found, but no critical errors.${NC}"
    echo "${GREEN}✅ Code should build successfully.${NC}"
    exit 0
else
    echo "${RED}❌ ${TOTAL_ERRORS} critical error(s) found.${NC}"
    if [ $TOTAL_WARNINGS -gt 0 ]; then
        echo "${YELLOW}⚠️  ${TOTAL_WARNINGS} warning(s) also found.${NC}"
    fi
    echo "${RED}🚫 Fix errors before attempting to build.${NC}"
    exit 1
fi 