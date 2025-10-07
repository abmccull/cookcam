#!/bin/bash

echo "🔧 Phase 2: Replacing specific 'any' patterns..."

# Pattern: Function return types
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/): any {/): unknown {/g' \
  -e 's/): Promise<any>/): Promise<unknown>/g' \
  -e 's/Promise<any>/Promise<unknown>/g' \
  {} \;

# Pattern: Type annotations  
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/: any;/: unknown;/g' \
  -e 's/: any,/: unknown,/g' \
  -e 's/: any)/: unknown)/g' \
  -e 's/: any =/: unknown =/g' \
  {} \;

# Pattern: Generic type parameters
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/<any>/<unknown>/g' \
  {} \;

# Pattern: Record types
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/Record<string, any>/Record<string, unknown>/g' \
  -e 's/Record<number, any>/Record<number, unknown>/g' \
  {} \;

echo "✅ Phase 2 complete"

