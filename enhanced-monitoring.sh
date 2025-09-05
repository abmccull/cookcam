#!/bin/bash

# Enhanced Real-Time Test Coverage Monitoring Dashboard
# Orchestrator Tool - Updates every 30 seconds

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
BACKEND_DIR="./backend/api"
MOBILE_DIR="./mobile/CookCam"

echo "🔄 Starting Enhanced Monitoring Dashboard..."
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# Function to get test status from a directory
get_test_status() {
    local dir=$1
    local platform=$2
    
    if [ -d "$dir" ]; then
        cd "$dir"
        
        # Run tests and capture results
        echo "📊 $platform Test Status:"
        
        # Quick test run to get current status
        npm test -- --passWithNoTests --silent 2>/dev/null | grep -E "(Tests:|Suites:|Time:|✓|✗)" | tail -5
        
        # Coverage check
        if [ -f "package.json" ] && grep -q "coverage" package.json; then
            echo "📈 Coverage Check:"
            npm run test:coverage -- --silent 2>/dev/null | grep -E "(All files|Coverage)" | tail -3
        fi
        
        # Git status
        echo "🔀 Git Status:"
        git status --porcelain | wc -l | xargs -I {} echo "Modified files: {}"
        
        cd - > /dev/null
        echo "────────────────────────────────────────"
    else
        echo "❌ $platform directory not found: $dir"
        echo "────────────────────────────────────────"
    fi
}

# Function to check agent branch status
check_agent_branches() {
    echo "🌿 Agent Branch Status:"
    
    for branch in "test/backend-auth" "test/mobile-ui" "test/mobile-services" "test/integration"; do
        if git show-branch "$branch" 2>/dev/null; then
            commits=$(git rev-list --count main.."$branch" 2>/dev/null || echo "0")
            echo "  $branch: $commits commits ahead"
        else
            echo "  $branch: Not found"
        fi
    done
    echo "────────────────────────────────────────"
}

# Function to check for blockers
check_blockers() {
    echo "🚨 Blocker Detection:"
    
    # Check for failing tests
    backend_failures=$(cd "$BACKEND_DIR" && npm test -- --passWithNoTests --silent 2>/dev/null | grep -E "failed|✗" | wc -l)
    mobile_failures=$(cd "$MOBILE_DIR" && npm test -- --passWithNoTests --silent 2>/dev/null | grep -E "failed|✗" | wc -l)
    
    echo "  Backend failing tests: $backend_failures"
    echo "  Mobile failing tests: $mobile_failures"
    
    # Check for merge conflicts
    conflicts=$(git status --porcelain | grep -E "^UU|^AA" | wc -l)
    echo "  Merge conflicts: $conflicts"
    
    # Check for uncommitted changes
    uncommitted=$(git status --porcelain | wc -l)
    echo "  Uncommitted changes: $uncommitted files"
    
    echo "────────────────────────────────────────"
}

# Function to calculate overall progress
calculate_progress() {
    echo "📊 Overall Progress Metrics:"
    
    # Count test files
    total_tests=$(find . -name "*.test.ts*" -type f | wc -l)
    echo "  Total test files: $total_tests"
    
    # Estimate coverage progress
    backend_passing=$(cd "$BACKEND_DIR" && npm test -- --passWithNoTests --silent 2>/dev/null | grep -o "[0-9]* passing" | cut -d' ' -f1 || echo "0")
    echo "  Backend passing tests: $backend_passing"
    
    # Calculate estimated completion
    if [ "$total_tests" -gt 0 ]; then
        progress_pct=$((total_tests * 100 / 400))  # Assuming 400 total target
        echo "  Estimated completion: ${progress_pct}%"
    fi
    
    echo "────────────────────────────────────────"
}

# Main monitoring loop
while true; do
    clear
    echo "═══════════════════════════════════════════════════════════════"
    echo "           🎯 ENHANCED TEST COVERAGE ORCHESTRATOR               "
    echo "                    Real-Time Monitoring Dashboard              "
    echo "═══════════════════════════════════════════════════════════════"
    echo "⏰ Last Updated: $(date '+%H:%M:%S')"
    echo ""
    
    get_test_status "$BACKEND_DIR" "BACKEND"
    get_test_status "$MOBILE_DIR" "MOBILE"
    check_agent_branches
    check_blockers
    calculate_progress
    
    echo "🔄 Next update in 30 seconds... (Ctrl+C to stop)"
    echo "═══════════════════════════════════════════════════════════════"
    
    sleep 30
done