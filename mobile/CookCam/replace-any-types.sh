#!/bin/bash
# Systematic replacement of 'any' types with proper types

echo "🔧 Replacing 'any' types with proper types..."

# Pattern 1: error: any → error: unknown (catch blocks)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/catch (error: any)/catch (error: unknown)/g' \
  -e 's/} catch (error: any)/} catch (error: unknown)/g' \
  {} \;

# Pattern 2: response: any → response: JsonValue
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/response: any/response: unknown/g' \
  -e 's/data: any/data: unknown/g' \
  -e 's/result: any/result: unknown/g' \
  -e 's/payload: any/payload: unknown/g' \
  {} \;

# Pattern 3: props: any → props: Record<string, unknown>
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/props: any/props: Record<string, unknown>/g' \
  -e 's/params: any/params: Record<string, unknown>/g' \
  -e 's/options: any/options: Record<string, unknown>/g' \
  {} \;

# Pattern 4: Array<any> → Array<unknown>
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/Array<any>/Array<unknown>/g' \
  -e 's/any\[\]/unknown\[\]/g' \
  {} \;

# Pattern 5: metadata: any → metadata?: Record<string, unknown>
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's/metadata: any/metadata: Record<string, unknown>/g' \
  -e 's/metadata?: any/metadata?: Record<string, unknown>/g' \
  {} \;

echo "✅ Completed bulk replacement of common 'any' patterns"
echo "Running lint check to see remaining..."

