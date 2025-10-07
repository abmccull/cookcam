#!/bin/bash
echo "🔧 Automating route file console.log cleanup..."

# Count console statements before
BEFORE=$(grep -r "console\." src/routes | wc -l)
echo "📊 Console statements in routes before: $BEFORE"

# Replace console statements in routes only
find src/routes -name "*.ts" -exec sed -i '' 's/console\.log(/logger.info(/g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's/console\.error(/logger.error(/g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's/console\.warn(/logger.warn(/g' {} \;

# Count after
AFTER=$(grep -r "console\." src/routes | wc -l)
echo "📊 Console statements in routes after: $AFTER"
echo "✅ Replaced $(($BEFORE - $AFTER)) console statements with logger calls!"

echo "🧪 Testing compilation..."
npm run build --silent && echo "✅ Compilation successful!" || echo "❌ Compilation failed"

echo ""
echo "🎯 Next steps:"
echo "1. Review the changes: git diff"
echo "2. Test the application: npm start"
echo "3. Commit if satisfied: git add . && git commit -m 'Replace console.log with structured logging in routes'" 