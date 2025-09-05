#!/bin/bash

# Automated Test Result Consolidation Pipeline
# Orchestrator Tool - Merges passing tests from all agent branches

set -e  # Exit on any error

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
CONSOLIDATION_BRANCH="test/consolidated-$TIMESTAMP"
AGENT_BRANCHES=("test/backend-auth" "test/mobile-ui" "test/mobile-services" "test/integration")

echo "🔄 Starting Test Result Consolidation Pipeline..."
echo "⏰ Timestamp: $TIMESTAMP"
echo "🌿 Consolidation branch: $CONSOLIDATION_BRANCH"
echo ""

# Function to check if branch exists
branch_exists() {
    git show-branch "$1" &>/dev/null
}

# Function to run tests and check status
check_test_status() {
    local directory=$1
    local test_cmd=$2
    
    echo "🧪 Testing in $directory..."
    
    if [ -d "$directory" ]; then
        cd "$directory"
        
        # Run tests with timeout
        timeout 120s $test_cmd --passWithNoTests --silent || {
            echo "❌ Tests failed or timed out in $directory"
            cd - > /dev/null
            return 1
        }
        
        cd - > /dev/null
        echo "✅ Tests passed in $directory"
        return 0
    else
        echo "❌ Directory not found: $directory"
        return 1
    fi
}

# Function to safely merge branch
safe_merge() {
    local branch=$1
    echo "🔀 Attempting to merge $branch..."
    
    # Check if branch exists
    if ! branch_exists "$branch"; then
        echo "⚠️  Branch $branch does not exist, skipping..."
        return 0
    fi
    
    # Attempt merge
    if git merge "$branch" --no-edit; then
        echo "✅ Successfully merged $branch"
        
        # Run tests after merge to ensure no regressions
        echo "🧪 Running post-merge tests..."
        
        # Test backend if it exists
        if [ -d "backend/api" ]; then
            if ! check_test_status "backend/api" "npm test"; then
                echo "❌ Backend tests failed after merging $branch"
                git reset --hard HEAD~1  # Revert merge
                return 1
            fi
        fi
        
        # Test mobile if it exists
        if [ -d "mobile/CookCam" ]; then
            if ! check_test_status "mobile/CookCam" "npm test"; then
                echo "❌ Mobile tests failed after merging $branch"
                git reset --hard HEAD~1  # Revert merge
                return 1
            fi
        fi
        
        return 0
    else
        echo "❌ Merge conflicts detected in $branch"
        git merge --abort
        return 1
    fi
}

# Function to create consolidation report
create_consolidation_report() {
    local report_file="CONSOLIDATION_REPORT_$TIMESTAMP.md"
    
    cat > "$report_file" << EOF
# Test Consolidation Report
Generated: $(date)
Consolidation Branch: $CONSOLIDATION_BRANCH

## Merge Status
EOF

    for branch in "${AGENT_BRANCHES[@]}"; do
        if branch_exists "$branch"; then
            commits=$(git rev-list --count main.."$branch" 2>/dev/null || echo "0")
            echo "- $branch: $commits commits" >> "$report_file"
        else
            echo "- $branch: Not found" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

## Test File Count
- Total test files: $(find . -name "*.test.ts*" -type f | wc -l)
- Backend test files: $(find backend -name "*.test.ts*" -type f 2>/dev/null | wc -l)
- Mobile test files: $(find mobile -name "*.test.ts*" -type f 2>/dev/null | wc -l)

## Coverage Status
EOF

    # Add coverage information if available
    if [ -d "backend/api" ]; then
        cd backend/api
        echo "### Backend Coverage" >> "../../$report_file"
        npm run test:coverage --silent 2>/dev/null | grep -E "(All files|Coverage)" | tail -3 >> "../../$report_file" || echo "Coverage data unavailable" >> "../../$report_file"
        cd - > /dev/null
    fi
    
    if [ -d "mobile/CookCam" ]; then
        cd mobile/CookCam
        echo "### Mobile Coverage" >> "../../$report_file"
        npm test -- --coverage --silent 2>/dev/null | grep -E "(All files|Coverage)" | tail -3 >> "../../$report_file" || echo "Coverage data unavailable" >> "../../$report_file"
        cd - > /dev/null
    fi
    
    echo "📊 Consolidation report created: $report_file"
}

# Main consolidation process
main() {
    echo "🚀 Starting consolidation process..."
    
    # Ensure we're on main branch
    git checkout main
    
    # Create consolidation branch
    git checkout -b "$CONSOLIDATION_BRANCH"
    
    successful_merges=0
    failed_merges=0
    
    # Attempt to merge each agent branch
    for branch in "${AGENT_BRANCHES[@]}"; do
        echo ""
        echo "🔄 Processing $branch..."
        
        if safe_merge "$branch"; then
            ((successful_merges++))
            echo "✅ $branch consolidated successfully"
        else
            ((failed_merges++))
            echo "❌ Failed to consolidate $branch"
        fi
    done
    
    echo ""
    echo "📊 Consolidation Summary:"
    echo "  ✅ Successful merges: $successful_merges"
    echo "  ❌ Failed merges: $failed_merges"
    echo "  🌿 Consolidation branch: $CONSOLIDATION_BRANCH"
    
    # Create detailed report
    create_consolidation_report
    
    # Final test run
    echo ""
    echo "🧪 Running final comprehensive test suite..."
    
    overall_success=true
    
    if [ -d "backend/api" ]; then
        if ! check_test_status "backend/api" "npm test"; then
            overall_success=false
        fi
    fi
    
    if [ -d "mobile/CookCam" ]; then
        if ! check_test_status "mobile/CookCam" "npm test"; then
            overall_success=false
        fi
    fi
    
    if [ "$overall_success" = true ]; then
        echo "🎉 Consolidation successful! All tests passing."
        echo "🔀 Ready to merge consolidation branch to main"
        
        # Optionally merge to main (commented out for safety)
        # git checkout main
        # git merge "$CONSOLIDATION_BRANCH" --no-edit
        
    else
        echo "❌ Consolidation has test failures. Manual review required."
    fi
    
    echo ""
    echo "📋 Next steps:"
    echo "  1. Review consolidation report: CONSOLIDATION_REPORT_$TIMESTAMP.md"
    echo "  2. If satisfied, merge $CONSOLIDATION_BRANCH to main"
    echo "  3. Delete temporary consolidation branch after merge"
}

# Run consolidation if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi