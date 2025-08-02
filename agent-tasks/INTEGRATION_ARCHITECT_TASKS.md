# Integration Test Architect - Day 1 Priority Tasks

## 🎯 MISSION: Test Infrastructure & CI/CD Pipeline
**Focus**: Enable all other agents with robust test infrastructure

## ⏰ SCHEDULE: Day 1 (8 hours)

### 🌅 Morning Session (9 AM - 1 PM)

#### Task 1: Jest Performance Optimization (1 hour)

**Backend Configuration**: `backend/api/jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  maxWorkers: '50%',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
};
```

**Mobile Configuration**: `mobile/CookCam/jest.config.js`
```javascript
module.exports = {
  preset: 'react-native',
  maxWorkers: '50%',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/__tests__/setup.ts'
  ]
};
```

#### Task 2: Test Database Setup (1 hour)

**Create**: `backend/api/src/test/setup.ts`
```typescript
import {createClient} from '@supabase/supabase-js';

// Test database connection
const testDb = createClient(
  process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
  process.env.TEST_SUPABASE_KEY || 'test-key'
);

// Clear database before each test suite
beforeAll(async () => {
  await testDb.from('users').delete().neq('id', 0);
  await testDb.from('recipes').delete().neq('id', 0);
});

// Seed test data
export const seedTestData = async () => {
  // Implementation
};
```

#### Task 3: GitHub Actions CI/CD Pipeline (2 hours)

**Create**: `.github/workflows/test-coverage.yml`
```yaml
name: Test Coverage

on:
  push:
    branches: [main, test/*]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Backend Dependencies
        working-directory: ./backend/api
        run: npm ci
      
      - name: Run Backend Tests
        working-directory: ./backend/api
        run: npm run coverage
      
      - name: Upload Backend Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/api/coverage/lcov.info
          flags: backend
          name: backend-coverage

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Mobile Dependencies
        working-directory: ./mobile/CookCam
        run: npm ci
      
      - name: Run Mobile Tests
        working-directory: ./mobile/CookCam
        run: npm run coverage
      
      - name: Upload Mobile Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/CookCam/coverage/lcov.info
          flags: mobile
          name: mobile-coverage

  coverage-check:
    needs: [backend-tests, mobile-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Check Coverage Thresholds
        run: |
          echo "Checking if coverage meets 80% threshold"
          # Implementation to check coverage
```

### 🌇 Afternoon Session (2 PM - 6 PM)

#### Task 4: Test Data Factories (2 hours)

**Create**: `backend/api/src/test/factories/index.ts`
```typescript
import {faker} from '@faker-js/faker';

export const userFactory = {
  build: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.fullName(),
    createdAt: faker.date.past(),
    ...overrides
  }),
  
  create: async (overrides = {}) => {
    const user = userFactory.build(overrides);
    // Save to test database
    return user;
  }
};

export const recipeFactory = {
  build: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    title: faker.lorem.words(3),
    ingredients: Array(5).fill(null).map(() => ({
      name: faker.lorem.word(),
      amount: faker.datatype.number({min: 1, max: 500}),
      unit: faker.helpers.arrayElement(['g', 'ml', 'cup', 'tbsp'])
    })),
    cookTime: faker.datatype.number({min: 10, max: 120}),
    difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    ...overrides
  })
};

export const subscriptionFactory = {
  build: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    userId: faker.datatype.uuid(),
    plan: faker.helpers.arrayElement(['free', 'pro', 'premium']),
    status: 'active',
    startDate: faker.date.past(),
    ...overrides
  })
};
```

#### Task 5: Coverage Reporting & Badges (2 hours)

**Create**: `codecov.yml`
```yaml
coverage:
  precision: 2
  round: down
  range: "70...90"
  
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 80%
        
comment:
  layout: "reach,diff,flags,files,footer"
  behavior: default
  require_changes: false

flags:
  backend:
    paths:
      - backend/api/src/
  mobile:
    paths:
      - mobile/CookCam/src/
```

**Update**: `README.md`
```markdown
# CookCam

[![Test Coverage](https://codecov.io/gh/username/cookcam/branch/main/graph/badge.svg)](https://codecov.io/gh/username/cookcam)
[![Backend Tests](https://github.com/username/cookcam/actions/workflows/test-coverage.yml/badge.svg)](https://github.com/username/cookcam/actions)
```

## 📊 Infrastructure Goals

| Component | Status | Target |
|-----------|--------|--------|
| Jest Optimization | ☐ | Parallel execution, <5min runs |
| Test Database | ☐ | Isolated, fast reset |
| CI/CD Pipeline | ☐ | Auto-run on PR |
| Data Factories | ☐ | Reusable, realistic |
| Coverage Reports | ☐ | Visible, enforced |

## 📝 Deliverables Checklist

- [ ] Jest configs optimized for both projects
- [ ] Test database with migrations
- [ ] GitHub Actions workflow running
- [ ] Test data factories created
- [ ] Coverage reporting to Codecov
- [ ] PR checks requiring 80% coverage
- [ ] Documentation for all setups

## 🚀 Verification Commands
```bash
# Test the CI locally
act -j backend-tests
act -j mobile-tests

# Verify Jest config
cd backend/api && npm test -- --showConfig
cd mobile/CookCam && npm test -- --showConfig

# Check coverage locally
npm run coverage -- --watchAll=false
```

## 🚨 Critical Success Factors

1. **Performance**: Tests must run in <5 minutes
2. **Reliability**: No flaky tests allowed
3. **Isolation**: Tests don't affect each other
4. **Coverage**: Enforce 80% threshold
5. **Visibility**: Dashboard shows real-time progress

## 📍 Progress Reporting

Report progress every 2 hours:
- 11 AM: Jest configs complete?
- 1 PM: Test database ready?
- 3 PM: GitHub Actions running?
- 5 PM: Factories complete?
- 6 PM: Full pipeline operational?

## 🆘 Common CI/CD Issues

| Issue | Solution |
|-------|----------|
| Tests timeout in CI | Increase Jest timeout |
| Coverage not uploading | Check Codecov token |
| Database connection fails | Use test containers |
| Flaky tests | Add retry logic |

## 🔗 Resources
- [Jest Performance](https://jestjs.io/docs/cli#--maxworkers-num-string)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Codecov Setup](https://docs.codecov.com/docs)

---
*Assigned: Day 1, 9 AM*
*Due: Day 1, 6 PM*
*Orchestrator: Checking every 2 hours*
