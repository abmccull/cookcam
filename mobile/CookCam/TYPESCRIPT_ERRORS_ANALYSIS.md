# TypeScript Errors Analysis and Fix Plan

## Summary
The project has TypeScript compilation errors, not Gradle build errors. The errors come from incompatible type definitions in node_modules.

## Error Categories

### 1. React Import Errors (Most Common)
```
error TS1259: Module '.../react/index' can only be default-imported using the 'esModuleInterop' flag
```
- **Count**: ~20+ occurrences
- **Affected packages**: 
  - expo-modules-core
  - expo-status-bar
  - lottie-react-native
  - react-native-gesture-handler
  - react-native-iap
  - react-native-reanimated
  - react-native-screens
  - react-native-svg

### 2. Missing Type Dependencies
```
error TS2307: Cannot find module '@solana/wallet-standard-features'
error TS2307: Cannot find module '@jeremybarbet/apple-api-types'
error TS2307: Cannot find module 'react-test-renderer'
```
- **Packages with missing deps**:
  - @supabase/auth-js
  - react-native-iap
  - react-native-reanimated

### 3. React Navigation Type Conflicts
```
error TS2315: Type 'StaticParamList' is not generic
error TS2344: Type does not satisfy constraint 'NavigationProp'
```
- **Package**: @react-navigation/core

### 4. Global Type Conflicts
```
error TS6200: Definitions conflict with those in another file
error TS2403: Subsequent variable declarations must have the same type
```
- **Conflicting types**: Blob, Request, Response, URL, WebSocket
- **Package**: react-native/src/types/globals.d.ts

## Root Causes

1. **esModuleInterop already enabled** but some packages aren't respecting it
2. **Missing peer dependencies** that provide type definitions
3. **Version mismatches** between React Native, React, and related packages
4. **Duplicate type definitions** between DOM and React Native

## Fix Plan

### Step 1: Update tsconfig.json
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "react-native",
    "lib": ["es2017"],  // Remove "dom" to avoid conflicts
    "moduleResolution": "bundler",
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,  // This should skip node_modules errors
    "target": "es2017",
    "downlevelIteration": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["react-native"]  // Explicitly use RN types
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "*.ts",
    "*.tsx"
  ],
  "exclude": [
    "node_modules",
    "babel.config.js",
    "metro.config.js",
    "jest.config.js"
  ]
}
```

### Step 2: Install Missing Type Dependencies
```bash
npm install --save-dev @types/react-test-renderer
```

### Step 3: Check Package Versions
Ensure compatible versions:
- React Native: 0.73.x
- React: 18.2.x
- React Navigation: 6.x
- TypeScript: 5.x

### Step 4: Create Type Override File
Create `types/fixes.d.ts`:
```typescript
// Override problematic type definitions
declare module '@solana/wallet-standard-features' {
  export const SolanaSignIn: any;
}

declare module '@jeremybarbet/apple-api-types' {
  export interface ProductResponseBody {
    [key: string]: any;
  }
}
```

### Step 5: Update Package.json Scripts
Add a less strict type check for CI:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit --skipLibCheck",
    "type-check:strict": "tsc --noEmit"
  }
}
```

## Immediate Actions

1. **skipLibCheck is already true** but seems to not be working
2. Check if there's a separate TypeScript config being used by the check script
3. Consider using patch-package to fix problematic node_modules types
4. May need to downgrade or upgrade certain packages for compatibility

## Alternative Solutions

### If errors persist:
1. **Use yarn resolutions** or npm overrides to force compatible versions
2. **Create a separate tsconfig for type checking** that's more lenient
3. **Ignore node_modules in type checking** completely
4. **Use Expo SDK 50** which may have better type compatibility

## Verification
After applying fixes, run:
```bash
# Clear cache
npm run clean
rm -rf node_modules
npm install

# Test type checking
npx tsc --noEmit --skipLibCheck
```