#!/bin/bash

# TypeScript-only syntax check (fastest option)
echo "⚡ Fast TypeScript Syntax Check"
echo "==============================="

# Use the tsconfig.json configuration
if [ $# -eq 0 ]; then
    echo "Checking all TypeScript files using tsconfig.json..."
    npx tsc --noEmit
else
    echo "Checking specific files: $@"
    npx tsc --noEmit "$@"
fi

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ No TypeScript syntax errors found!"
else
    echo "❌ TypeScript syntax errors found. Fix these before building."
fi

exit $EXIT_CODE 