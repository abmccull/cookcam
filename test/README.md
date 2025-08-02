# CookCam Test Infrastructure

## Overview

This directory contains the comprehensive test infrastructure for CookCam, including integration tests, E2E tests, test factories, and fixtures.

## Test Structure

```
test/
├── integration/        # Integration tests
│   ├── setup-db.ts    # Database setup utilities
│   ├── setup.ts       # Test environment setup
│   ├── globalSetup.ts # Jest global setup
│   └── *.test.ts      # Integration test files
├── e2e/               # End-to-end tests (in mobile/CookCam/e2e)
├── factories/         # Test data factories
│   └── index.ts       # Factory definitions
└── fixtures/          # Static test data
```

## Running Tests

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests (except E2E)
./run-tests.sh all

# Run specific test types
./run-tests.sh unit         # Unit tests only
./run-tests.sh integration  # Integration tests only
./run-tests.sh e2e ios      # iOS E2E tests
./run-tests.sh e2e android  # Android E2E tests
```

### NPM Scripts

```bash
# Integration tests
npm run test:integration           # Run integration tests
npm run test:integration:watch     # Watch mode
npm run test:integration:coverage  # With coverage

# E2E tests
npm run test:e2e                   # Run E2E tests
npm run test:e2e:build             # Build app for E2E

# All tests
npm run test:all                   # Run all test suites
```

## Test Database

Integration tests use a isolated test database that is created and destroyed for each test run.

### Setup

1. Ensure PostgreSQL is installed and running
2. Create a `.env.test` file with test database credentials
3. The test database will be automatically created when tests run

### Manual Database Commands

```bash
# Setup test database
npm run db:test:setup

# Teardown test database
npm run db:test:teardown
```

## Test Factories

We use factories to generate consistent test data:

```typescript
import { userFactory, recipeFactory, createBatch } from '../factories';

// Create a single user
const user = userFactory({ 
  email: 'test@example.com',
  subscription_tier: 'premium' 
});

// Create multiple recipes
const recipes = createBatch.recipes(10);

// Create user with full data
const fullUser = createUserWithFullData();
```

## Writing Tests

### Integration Tests

Integration tests should test the interaction between multiple components:

```typescript
// test/integration/recipe-flow.integration.test.ts
describe('Recipe Creation Flow', () => {
  let apiClient: AxiosInstance;
  
  beforeAll(async () => {
    apiClient = axios.create({ baseURL: process.env.API_URL });
  });
  
  it('should create recipe from image', async () => {
    // Test implementation
  });
});
```

### E2E Tests

E2E tests use Detox to test the complete user journey:

```typescript
// mobile/CookCam/e2e/recipe.e2e.ts
describe('Recipe Journey', () => {
  it('should scan and create recipe', async () => {
    await element(by.id('camera-tab')).tap();
    await element(by.id('capture-button')).tap();
    // More test steps
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request
- Scheduled nightly runs

### GitHub Actions Workflow

The test suite runs in this order:
1. Backend unit tests
2. Mobile unit tests  
3. Integration tests (with test database)
4. E2E tests (on simulators)
5. Coverage reporting to Codecov

## Coverage Requirements

Minimum coverage thresholds:
- Backend: 80%
- Mobile: 80%
- Integration: 70%
- Overall: 80%

### Viewing Coverage

```bash
# Generate coverage report
./run-tests.sh coverage

# Open HTML report
open coverage/index.html
```

## Debugging Tests

### Debug Integration Tests

```bash
# Run with verbose logging
SILENT_TESTS=false npm run test:integration

# Run specific test file
jest --config jest.config.integration.js test/integration/auth-flow.integration.test.ts

# Debug in VS Code
# Add breakpoint and run "Debug Integration Tests" configuration
```

### Debug E2E Tests

```bash
# Run Detox in debug mode
detox test --configuration ios.sim.debug --loglevel trace

# Take screenshots on failure
detox test --take-screenshots failing
```

## Environment Variables

Test environment variables are defined in `.env.test`:

```env
# Database
DATABASE_URL=postgresql://localhost:5432/testdb

# API
API_URL=http://localhost:3000

# Features
ENABLE_GAMIFICATION=true
ENABLE_SUBSCRIPTIONS=true
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env.test
   - Verify database permissions

2. **E2E tests failing**
   - Ensure simulator/emulator is installed
   - Run `detox doctor` to check setup
   - Clear app data: `detox clean-framework-cache`

3. **Coverage not meeting threshold**
   - Run `npm run test:integration:coverage` to see gaps
   - Focus on untested critical paths
   - Update thresholds in jest.config.integration.js if needed

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Use Factories**: Don't hardcode test data
3. **Clean State**: Always cleanup after tests
4. **Descriptive Names**: Use clear test descriptions
5. **Fast Tests**: Keep integration tests under 30s
6. **Reliable Tests**: No flaky tests allowed

## Contributing

When adding new tests:
1. Follow existing patterns
2. Update factories if needed
3. Ensure tests pass locally
4. Check coverage doesn't decrease
5. Update this README if needed

## Support

For issues or questions:
- Check troubleshooting section
- Review existing tests for examples
- Contact the test orchestrator team