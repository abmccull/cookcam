#!/bin/bash

echo "🔧 Fixing remaining 'any' types..."

# Fix generic defaults in specific files
sed -i '' 's/<T = any>/<T = unknown>/g' src/services/cookCamApi.ts
sed -i '' 's/ as any/ as unknown/g' src/**/*.{ts,tsx}
sed -i '' 's/(any)/(unknown)/g' src/**/*.{ts,tsx}
sed -i '' 's/\[key: string\]: any/[key: string]: unknown/g' src/**/*.{ts,tsx}

echo "✅ Done"

