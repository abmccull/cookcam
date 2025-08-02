#!/bin/bash

# CookCam Test Runner Script
# Usage: ./run-tests.sh [type] [options]
# Types: unit, integration, e2e, all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test type from argument
TEST_TYPE=${1:-all}

echo -e "${GREEN}🚀 CookCam Test Runner${NC}"
echo "========================="
echo ""

# Function to run backend unit tests
run_backend_tests() {
    echo -e "${YELLOW}Running Backend Unit Tests...${NC}"
    cd backend/api
    npm test
    cd ../..
    echo -e "${GREEN}✅ Backend tests complete${NC}\n"
}

# Function to run mobile unit tests
run_mobile_tests() {
    echo -e "${YELLOW}Running Mobile Unit Tests...${NC}"
    cd mobile/CookCam
    npm test
    cd ../..
    echo -e "${GREEN}✅ Mobile tests complete${NC}\n"
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${YELLOW}Running Integration Tests...${NC}"
    
    # Check if database is available
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start it first.${NC}"
        exit 1
    fi
    
    npm run test:integration
    echo -e "${GREEN}✅ Integration tests complete${NC}\n"
}

# Function to run E2E tests
run_e2e_tests() {
    echo -e "${YELLOW}Running E2E Tests...${NC}"
    
    # Check platform
    PLATFORM=${2:-ios}
    
    cd mobile/CookCam
    
    # Build the app for testing
    echo "Building app for E2E tests..."
    npx detox build --configuration ${PLATFORM}.sim.debug
    
    # Run tests
    echo "Running E2E tests..."
    npx detox test --configuration ${PLATFORM}.sim.debug --cleanup
    
    cd ../..
    echo -e "${GREEN}✅ E2E tests complete${NC}\n"
}

# Function to generate coverage report
generate_coverage_report() {
    echo -e "${YELLOW}Generating Coverage Report...${NC}"
    
    # Combine coverage reports
    npx nyc merge coverage coverage/combined.json
    npx nyc report --reporter=html --reporter=text
    
    echo -e "${GREEN}✅ Coverage report available at: coverage/index.html${NC}\n"
}

# Main execution
case $TEST_TYPE in
    unit)
        run_backend_tests
        run_mobile_tests
        ;;
    backend)
        run_backend_tests
        ;;
    mobile)
        run_mobile_tests
        ;;
    integration)
        run_integration_tests
        ;;
    e2e)
        run_e2e_tests $2
        ;;
    all)
        run_backend_tests
        run_mobile_tests
        run_integration_tests
        echo -e "${YELLOW}Note: Run E2E tests separately with: ./run-tests.sh e2e [ios|android]${NC}\n"
        generate_coverage_report
        ;;
    coverage)
        generate_coverage_report
        ;;
    *)
        echo -e "${RED}Invalid test type: $TEST_TYPE${NC}"
        echo "Usage: ./run-tests.sh [unit|backend|mobile|integration|e2e|all|coverage]"
        echo ""
        echo "Examples:"
        echo "  ./run-tests.sh unit         # Run all unit tests"
        echo "  ./run-tests.sh backend      # Run backend tests only"
        echo "  ./run-tests.sh mobile       # Run mobile tests only"
        echo "  ./run-tests.sh integration  # Run integration tests"
        echo "  ./run-tests.sh e2e ios      # Run iOS E2E tests"
        echo "  ./run-tests.sh e2e android  # Run Android E2E tests"
        echo "  ./run-tests.sh all          # Run all tests except E2E"
        echo "  ./run-tests.sh coverage     # Generate coverage report"
        exit 1
        ;;
esac

# Check if all tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✨ All tests passed successfully!${NC}"
    
    # Show coverage summary
    echo ""
    echo "Coverage Summary:"
    echo "================="
    cat coverage/coverage-summary.json 2>/dev/null | jq -r '.total | "Lines: \(.lines.pct)%\nStatements: \(.statements.pct)%\nFunctions: \(.functions.pct)%\nBranches: \(.branches.pct)%"' || echo "Run './run-tests.sh coverage' to generate coverage report"
else
    echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi