#!/bin/bash
# Metro Bundler Optimization Aliases for CookCam
# Source this file in your shell profile: source .metro-aliases.sh

# Core Metro aliases
alias metro-start="npx react-native start --max-workers 12"
alias metro-fast="NODE_ENV=development npx react-native start --max-workers 12"
alias metro-reset="npx react-native start --reset-cache --max-workers 12"
alias metro-clean="rm -rf \$TMPDIR/metro-* && rm -rf \$TMPDIR/react-* && watchman watch-del-all"

# Bundle aliases
alias bundle-android="npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --bundle-type ram"
alias bundle-ios="npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle --bundle-type ram"

# Watchman aliases
alias watchman-reset="watchman watch-del '\$PWD' ; watchman watch-project '\$PWD'"
alias watchman-status="watchman watch-list"

# Development aliases
alias rn-start="metro-start"
alias rn-clean="metro-clean && metro-start"
alias rn-full-reset="metro-clean && watchman-reset && metro-start"

# Performance monitoring
alias metro-profile="echo 'Metro started. Press I in console for bundle profile'"
alias metro-workers="echo 'Using 12 CPU cores for Metro bundling'"

# Cache management
alias cache-info="du -sh \$TMPDIR/metro-* \$TMPDIR/react-* 2>/dev/null || echo 'No cache found'"
alias cache-size="du -sh \$(find \$TMPDIR -name 'metro-*' -o -name 'react-*' 2>/dev/null) 2>/dev/null || echo 'No cache found'"

# Project-specific shortcuts
alias cookcam-start="metro-start"
alias cookcam-build-android="bundle-android"
alias cookcam-build-ios="bundle-ios"

# Help
alias metro-help="echo 'Available Metro aliases:
metro-start     - Start optimized Metro (12 cores)
metro-fast      - Fast development mode
metro-reset     - Start with cache reset
metro-clean     - Clean all caches
bundle-android  - Create Android RAM bundle
bundle-ios      - Create iOS RAM bundle
watchman-reset  - Reset Watchman watching
rn-clean        - Clean and restart Metro
rn-full-reset   - Nuclear option: clean everything
metro-profile   - Instructions for profiling
cache-info      - Show cache sizes
'"

echo "🚀 Metro optimization aliases loaded!"
echo "📱 CookCam project detected - 12 CPU cores available"
echo "💡 Type 'metro-help' for available commands"
echo "⚡ Use 'metro-start' for optimized development" 