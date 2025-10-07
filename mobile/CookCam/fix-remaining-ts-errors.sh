#!/bin/bash

echo "🔧 Fixing remaining TypeScript errors..."

# Fix 1: Cast navigation prop in App.tsx
sed -i '' 's/({ navigation }: { navigation: unknown })/({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList, "Favorites"> })/g' src/App.tsx

# Fix 2: Fix test setup globalThis
sed -i '' 's/(globalThis as any)/(globalThis as Record<string, unknown>)/g' src/__tests__/setup.ts

echo "✅ Done - running final verification..."

