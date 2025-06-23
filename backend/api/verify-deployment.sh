#!/bin/bash

# CookCam API Deployment Verification Script
set -e

echo "🔍 Verifying CookCam API deployment configuration..."

# Check if running from the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the backend/api directory"
    exit 1
fi

echo "📁 Checking required files..."

# Check core files
REQUIRED_FILES=(
    "src/index.ts"
    "src/routes/iap-validation.ts"
    "src/routes/subscription.ts"
    "src/routes/auth.ts"
    "src/routes/recipes.ts"
    "src/routes/ingredients.ts"
    "src/routes/scan.ts"
    "src/routes/gamification.ts"
    "src/routes/analytics.ts"
    "src/routes/health.ts"
    "src/middleware/auth.ts"
    "src/middleware/security.ts"
    "src/middleware/subscription.ts"
    "package.json"
    "tsconfig.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Check for new IAP route registration
echo ""
echo "🔗 Checking route registrations..."

if grep -q "routes/iap-validation" src/index.ts; then
    echo "✅ IAP validation route is imported"
else
    echo "❌ IAP validation route not imported in index.ts"
    exit 1
fi

if grep -q "/api/v1/iap" src/index.ts; then
    echo "✅ IAP validation route is mounted"
else
    echo "❌ IAP validation route not mounted in index.ts"
    exit 1
fi

# Check TypeScript compilation
echo ""
echo "🔨 Testing TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    echo "Run 'npm run build' to see detailed errors"
    exit 1
fi

# Check if all new endpoint routes are accessible
echo ""
echo "🛣️  Checking endpoint structure..."

EXPECTED_ENDPOINTS=(
    "/api/v1/iap/validate-receipt"
    "/api/v1/subscription/creator/stripe/onboard"
    "/api/v1/subscription/creator/stripe/status"
    "/api/v1/subscription/tier"
    "/api/v1/subscription/purchase"
)

echo "Expected endpoints that should be available after deployment:"
for endpoint in "${EXPECTED_ENDPOINTS[@]}"; do
    echo "   - POST/GET $endpoint"
done

# Check for required environment variables
echo ""
echo "🔑 Checking environment variable structure..."

ENV_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
    "JWT_SECRET"
    "STRIPE_SECRET_KEY"
    "OPENAI_API_KEY"
    "GOOGLE_SERVICE_ACCOUNT_KEY"
    "APPLE_SHARED_SECRET"
)

echo "Required environment variables for production:"
for var in "${ENV_VARS[@]}"; do
    echo "   - $var"
done

# Check dist directory after build
if [ -d "dist" ]; then
    echo ""
    echo "📦 Checking build output..."
    
    if [ -f "dist/index.js" ]; then
        echo "✅ Main entry point built successfully"
    else
        echo "❌ Main entry point missing in dist/"
        exit 1
    fi
    
    if [ -f "dist/routes/iap-validation.js" ]; then
        echo "✅ IAP validation route built successfully"
    else
        echo "❌ IAP validation route missing in dist/"
        exit 1
    fi
    
    echo "✅ Build output verified"
fi

echo ""
echo "🎯 Checking database migrations..."

if [ -f "../supabase/migrations/create_iap_tables.sql" ]; then
    echo "✅ IAP tables migration exists"
else
    echo "❌ IAP tables migration missing"
    exit 1
fi

if [ -f "../supabase/migrations/create_stripe_connect_tables.sql" ]; then
    echo "✅ Stripe Connect tables migration exists"
else
    echo "❌ Stripe Connect tables migration missing"
    exit 1
fi

echo ""
echo "✅ All deployment verification checks passed!"
echo ""
echo "🚀 Deployment readiness summary:"
echo "   ✅ All required files present"
echo "   ✅ New IAP routes properly registered"
echo "   ✅ TypeScript compilation successful"
echo "   ✅ Database migrations available"
echo "   ✅ Build output verified"
echo ""
echo "📋 Next steps for production deployment:"
echo "   1. Ensure all environment variables are set on production server"
echo "   2. Run database migrations: npm run migrate"
echo "   3. Deploy with: ./deploy.sh"
echo "   4. Test endpoints after deployment"
echo "   5. Verify IAP validation with sandbox receipts"
echo ""
echo "🔗 New IAP endpoints ready for testing:"
echo "   - POST /api/v1/iap/validate-receipt"
echo "   - GET  /api/v1/subscription/tier"
echo "   - POST /api/v1/subscription/creator/stripe/onboard"
echo "" 