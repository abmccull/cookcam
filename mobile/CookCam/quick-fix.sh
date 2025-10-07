#!/bin/bash

# Quick Fix Script - Automatically fixes common issues
echo "🔧 Auto-fixing common code issues..."

echo "1. Fixing Prettier formatting..."
npx prettier --write src/**/*.{ts,tsx,js,jsx} --log-level warn

echo "2. Fixing auto-fixable ESLint issues..."
npx eslint src/**/*.{ts,tsx} --fix --format=compact

echo "3. Checking remaining issues..."
./check-syntax.sh 