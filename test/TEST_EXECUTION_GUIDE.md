# CookCam Test Execution & Monitoring Guide

## Overview

This guide provides comprehensive instructions for executing, monitoring, and maintaining the CookCam test infrastructure.

---

## Quick Start

### Run All Tests
```bash
# Complete test suite (recommended for CI/CD)
./run-tests.sh all

# Individual test types
./run-tests.sh unit         # Backend + Mobile unit tests
./run-tests.sh integration  # Backend integration tests
./run-tests.sh e2e ios      # iOS E2E tests
./run-tests.sh e2e android  # Android E2E tests
```

### Development Workflow
```bash
# During development - run related tests
npm run test:integration:watch  # Watch mode for integration tests
npm run test:mobile:watch       # Watch mode for mobile tests

# Before committing
npm run test:all                # Full test suite
npm run lint                    # Code quality
npm run typecheck               # Type checking
```

---

## Test Execution Matrix

### Local Development
| Test Type | Command | Duration | When to Run |
|-----------|---------|----------|-------------|
| Backend Unit | `cd backend/api && npm test` | 30s | After backend changes |
| Mobile Unit | `cd mobile/CookCam && npm test` | 45s | After mobile changes |
| Integration | `npm run test:integration` | 2min | Before PR creation |
| E2E | `npm run test:e2e` | 15min | Weekly/before release |

### CI/CD Pipeline
| Stage | Tests | Duration | Trigger |
|-------|-------|----------|---------|
| PR Check | Unit + Integration | 3min | Every PR |
| Merge Check | All tests | 20min | Merge to main |
| Release | Full suite + E2E | 25min | Release tags |
| Nightly | All + Performance | 45min | Scheduled |

---

## Test Environment Setup

### Prerequisites
```bash
# Node.js and packages
node --version  # Should be >= 18
npm install

# Database (for integration tests)
brew install postgresql
brew services start postgresql
createdb cookcam_test

# Mobile testing (for E2E)
npm install -g detox-cli
# iOS: Xcode and simulators
# Android: Android Studio and emulators
```

### Environment Variables
```bash
# Copy and configure test environment
cp .env.test.example .env.test

# Required variables:
DATABASE_URL=postgresql://localhost:5432/cookcam_test
API_URL=http://localhost:3000
SUPABASE_URL=your_test_supabase_url
SUPABASE_ANON_KEY=your_test_key
```

---

## Test Monitoring & Health

### Coverage Monitoring
```bash
# Generate coverage reports
./run-tests.sh coverage

# View HTML reports
open coverage/index.html

# CI coverage check
npm run test:coverage:check
```

### Test Health Metrics
```bash
# Test execution times
npm run test:benchmark

# Flaky test detection
npm run test:flaky-detection

# Test stability report
npm run test:stability
```

### Monitoring Dashboard
Access real-time test metrics:
- **Codecov**: [codecov.io/gh/your-org/cookcam](https://codecov.io)
- **GitHub Actions**: Repository → Actions tab
- **Test Reports**: `coverage/index.html` (generated locally)

---

## Debugging Test Failures

### Common Issues & Solutions

#### 1. Database Connection Failures
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Reset test database
npm run db:test:teardown
npm run db:test:setup

# Check environment variables
echo $DATABASE_URL
```

#### 2. Mobile Test Failures
```bash
# Reset simulators
xcrun simctl erase all

# Check Detox setup
detox doctor

# Clean build cache
cd mobile/CookCam
rm -rf node_modules
npm install
detox clean-framework-cache
```

#### 3. Integration Test Timeouts
```bash
# Check API server is running
curl http://localhost:3000/api/health

# Increase timeout in test file
// In test file:
jest.setTimeout(30000); // 30 seconds

# Debug with verbose logging
SILENT_TESTS=false npm run test:integration
```

#### 4. Flaky Tests
```bash
# Run test multiple times
npm run test:integration -- --testNamePattern="flaky test name" --verbose

# Check for race conditions
# Review async/await usage
# Verify test isolation
```

### Debugging Commands
```bash
# Verbose test output
npm run test:integration -- --verbose

# Run specific test file
jest test/integration/auth-flow.integration.test.ts

# Debug with breakpoints (VS Code)
# Use "Debug Integration Tests" launch configuration

# Test with different timeouts
JEST_TIMEOUT=60000 npm run test:integration
```

---

## Performance Optimization

### Test Execution Speed
```bash
# Parallel execution (integration tests run sequentially by design)
npm test -- --maxWorkers=4

# Run only changed tests
npm test -- --onlyChanged

# Bail on first failure (for quick feedback)
npm test -- --bail

# Cache test results
npm test -- --cache
```

### Resource Management
```bash
# Monitor memory usage during tests
npm run test:memory-check

# Clean up test artifacts
npm run test:cleanup

# Database optimization
npm run db:test:optimize
```

---

## CI/CD Integration

### GitHub Actions Configuration
The test pipeline is configured in `.github/workflows/test-suite.yml`:

```yaml
# Automatic triggers:
- Push to main branch
- Pull requests
- Release tags
- Scheduled nightly runs

# Test stages:
1. Backend unit tests (parallel)
2. Mobile unit tests (parallel)  
3. Integration tests (sequential)
4. E2E tests (on simulators)
5. Coverage reporting
```

### Branch Protection Rules
Configure in GitHub repository settings:
```
Branch protection rule for 'main':
☑ Require status checks to pass
☑ Require branches to be up to date
☑ Backend tests
☑ Mobile tests  
☑ Integration tests
☑ Coverage threshold (87%)
```

### Coverage Gates
```bash
# Automatic coverage checking
- Overall coverage: >= 87%
- Backend coverage: >= 85%
- Mobile coverage: >= 83%
- Integration coverage: >= 85%

# PR will fail if coverage drops below thresholds
```

---

## Test Data Management

### Test Factories
```typescript
// Use factories for consistent test data
import { userFactory, recipeFactory } from '../factories';

const testUser = userFactory({
  email: 'test@example.com',
  subscription_tier: 'premium'
});

const testRecipes = createBatch.recipes(10, testUser.id);
```

### Database Seeding
```bash
# Seed test database with sample data
npm run db:test:seed

# Reset to clean state
npm run db:test:reset

# Custom seed scenarios
npm run db:test:seed -- --scenario=premium_users
```

### Mock Data
```bash
# Generate realistic mock data
npm run generate:test-data

# Refresh mock API responses
npm run refresh:mocks

# Validate mock data consistency
npm run validate:test-data
```

---

## Test Maintenance

### Regular Maintenance Tasks
```bash
# Weekly tasks:
npm run test:health-check      # Check for flaky tests
npm run test:performance-check # Performance regression check
npm run test:coverage-report   # Coverage trend analysis

# Monthly tasks:
npm run test:dependency-audit  # Check test dependency updates
npm run test:cleanup-orphaned  # Remove unused test files
npm run test:benchmark-update  # Update performance baselines
```

### Updating Tests
```bash
# When adding new features:
1. Add unit tests for new functions
2. Add integration tests for new endpoints
3. Update E2E tests for new user flows
4. Update test factories for new data types

# When modifying existing features:
1. Update relevant unit tests
2. Update integration test expectations
3. Update E2E test scenarios
4. Verify no regression in unrelated tests
```

### Test Code Quality
```bash
# Lint test files
npm run lint:tests

# Type check test files  
npm run typecheck:tests

# Test code coverage (for test utilities)
npm run test:test-coverage
```

---

## Scaling Test Infrastructure

### Adding New Test Types
```bash
# Visual regression tests
npm install --save-dev @percy/cli @percy/puppeteer
# Configure in percy.config.js

# Performance tests
npm install --save-dev lighthouse puppeteer
# Add to test/performance/

# Security tests
npm install --save-dev @zaproxy/zap-api
# Add to test/security/
```

### Parallel Test Execution
```bash
# Current setup:
- Unit tests: Parallel execution
- Integration tests: Sequential (database isolation)
- E2E tests: Parallel per platform

# Scaling options:
- Multiple test databases for parallel integration tests
- Cloud-based device farms for E2E tests
- Distributed test execution with test sharding
```

### Test Environment Scaling
```bash
# Local development:
- Single test database
- Local simulators/emulators

# CI/CD environment:
- Containerized test databases
- Cloud simulators
- Parallel test runners

# Load testing environment:
- Dedicated performance test cluster
- Production-like data volumes
- Realistic network conditions
```

---

## Troubleshooting Guide

### Common Error Patterns

#### "Connection refused" errors
```bash
# Check services are running
npm run services:status

# Start required services
npm run services:start

# Reset service state
npm run services:restart
```

#### "Test timeout" errors
```bash
# Increase timeout globally
export JEST_TIMEOUT=60000

# Or in specific test file
jest.setTimeout(30000);

# Check for infinite loops or hanging promises
```

#### "Module not found" errors
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check path aliases in jest.config.js
```

#### "Database locked" errors
```bash
# Kill hanging database connections
npm run db:kill-connections

# Reset database state
npm run db:test:reset

# Check for unclosed connections in tests
```

### Performance Issues
```bash
# Slow test execution
npm run test:profile  # Profile test execution
npm run test:analyze  # Analyze bottlenecks

# Memory leaks
npm run test:memory-leak-detection

# Database query optimization
npm run db:test:analyze-queries
```

---

## Best Practices

### Writing New Tests
1. **Follow the AAA pattern**: Arrange, Act, Assert
2. **Use descriptive test names**: Describe behavior, not implementation
3. **Keep tests focused**: One assertion per test when possible
4. **Use factories**: Don't hardcode test data
5. **Clean up**: Ensure tests don't affect each other

### Test Organization
```
test/
├── integration/     # Backend integration tests
├── e2e/            # End-to-end user journey tests
├── factories/      # Test data factories
├── fixtures/       # Static test data
└── utils/          # Test utilities and helpers
```

### Code Quality
- **DRY principle**: Extract common test logic
- **Clear assertions**: Use specific matchers
- **Error messages**: Provide helpful failure messages
- **Documentation**: Comment complex test logic

---

## Support and Resources

### Internal Resources
- **Test README**: `test/README.md`
- **API Documentation**: Generated from tests
- **Test Reports**: Available in CI/CD artifacts

### External Resources
- **Jest Documentation**: [jestjs.io](https://jestjs.io)
- **Detox Documentation**: [wix.github.io/Detox](https://wix.github.io/Detox)
- **Testing Best Practices**: Internal wiki

### Getting Help
1. **Check this guide first**
2. **Review test failure logs**
3. **Search existing issues in repository**
4. **Contact test infrastructure team**
5. **Create detailed bug report with reproduction steps**

---

## Metrics and KPIs

### Test Health Metrics
- **Pass Rate**: Target >99.5%
- **Execution Time**: <20 minutes full suite
- **Coverage**: >87% overall
- **Flaky Test Rate**: <0.1%

### Quality Metrics
- **Bug Escape Rate**: Tests should catch >95% of bugs
- **Time to Feedback**: <5 minutes for unit tests
- **Test Maintenance**: <10% of development time
- **Developer Confidence**: Survey-based metric

### Tracking
All metrics are tracked in:
- **Codecov**: Coverage trends
- **GitHub Actions**: Execution time and pass rates
- **Test Dashboard**: Real-time health status
- **Weekly Reports**: Automated trend analysis

---

*Last Updated: 2025-08-02*
*Maintained by: Integration & E2E Test Architect*