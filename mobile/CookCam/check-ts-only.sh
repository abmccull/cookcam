#!/bin/bash

# TypeScript-only syntax check (fastest option)
echo "⚡ Fast TypeScript Syntax Check"
echo "==============================="

# Check specific files if provided, otherwise all
if [ $# -eq 0 ]; then
    echo "Checking all TypeScript files..."
    npx tsc --noEmit --jsx react-native src/**/*.tsx src/**/*.ts
else
    echo "Checking specific files: $@"
    npx tsc --noEmit --jsx react-native "$@"
fi

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ No TypeScript syntax errors found!"
else
    echo "❌ TypeScript syntax errors found. Fix these before building."
fi

exit $EXIT_CODE 