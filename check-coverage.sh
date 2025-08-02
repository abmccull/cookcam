#!/bin/bash
# Quick coverage check script

echo "📊 Checking Backend Coverage..."
cd backend/api && npm run coverage 2>/dev/null | grep -A 3 "Coverage summary"

echo -e "\n📊 Checking Mobile Coverage..."
cd ../../mobile/CookCam && npm run coverage 2>/dev/null | grep -A 3 "Coverage summary"

echo -e "\n📈 Coverage Trends:"
cat ../../coverage-tracking.json | grep -A 2 "overall"
