# INTEGRATION & E2E TEST ARCHITECT - STARTUP PROMPT

## LAUNCH COMMAND
```bash
claude --dangerous code /Users/abmccull/Desktop/cookcam1
```

## YOUR IMMEDIATE MISSION

You are the Integration & E2E Test Architect for CookCam. You build the test infrastructure, create integration tests between services, implement E2E user journeys, and configure CI/CD pipelines. Today is Day 1 - set up the foundation.

## CRITICAL DOCUMENTS TO REVIEW FIRST

1. **Master Plan**: `/Users/abmccull/Desktop/cookcam1/TEST_COVERAGE_MASTER_PLAN.md`
2. **Your Role**: `/Users/abmccull/Desktop/cookcam1/AGENT_5_INTEGRATION_ARCHITECT_PROMPT.md`
3. **Orchestrator Setup**: `/Users/abmccull/Desktop/cookcam1/ORCHESTRATOR_SETUP.sh`

## DAY 1 IMMEDIATE TASKS

### Current State
- Integration Coverage: 0% (Starting fresh)
- E2E Coverage: 0% (Not configured)
- CI/CD: Basic setup needs enhancement
- Your Goal: Complete test infrastructure by end of Day 1

### Step 1: CI/CD Pipeline Setup (1 hour)

Create comprehensive GitHub Actions workflow:
```bash
cd /Users/abmccull/Desktop/cookcam1

# Create workflow directory if not exists
mkdir -p .github/workflows

# Create main test workflow
cat > .github/workflows/test-suite.yml << 'EOF'
name: Complete Test Suite

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
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install backend dependencies
        run: |
          cd backend/api
          npm ci
      
      - name: Run backend tests with coverage
        run: |
          cd backend/api
          npm run test:coverage
      
      - name: Upload backend coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/api/coverage/lcov.info
          flags: backend
          name: backend-coverage

  mobile-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install mobile dependencies
        run: |
          cd mobile/CookCam
          npm ci
      
      - name: Run mobile tests with coverage
        run: |
          cd mobile/CookCam
          npm run test:coverage
      
      - name: Upload mobile coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./mobile/CookCam/coverage/lcov.info
          flags: mobile
          name: mobile-coverage

  integration-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, mobile-tests]
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:test:setup
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb

  coverage-check:
    runs-on: ubuntu-latest
    needs: [backend-tests, mobile-tests, integration-tests]
    
    steps:
      - name: Check coverage thresholds
        run: |
          echo "Checking if coverage meets minimum thresholds..."
          # This will be configured to fail if below thresholds
EOF

# Create your branch
git checkout -b test/integration
```

### Step 2: Test Database Setup (45 minutes)

Create test database configuration:
```bash
# Create test directory structure
mkdir -p test/integration
mkdir -p test/e2e
mkdir -p test/factories
mkdir -p test/fixtures

# Create database setup script
cat > test/integration/setup-db.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class TestDatabase {
  private client: any;
  private dbName: string;

  constructor() {
    this.dbName = `test_${Date.now()}`;
  }

  async setup() {
    console.log('Creating test database...');
    
    // Create test database
    execSync(`createdb ${this.dbName}`, { stdio: 'inherit' });
    
    // Run migrations
    const migrationsPath = path.join(__dirname, '../../backend/api/migrations');
    const migrations = fs.readdirSync(migrationsPath).sort();
    
    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`);
      const sql = fs.readFileSync(path.join(migrationsPath, migration), 'utf8');
      execSync(`psql ${this.dbName} -c "${sql}"`, { stdio: 'inherit' });
    }
    
    // Initialize Supabase client
    this.client = createClient(
      process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
      process.env.TEST_SUPABASE_ANON_KEY || 'test-key'
    );
    
    await this.seedTestData();
  }

  async seedTestData() {
    console.log('Seeding test data...');
    
    // Create test users
    const users = [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
    ];
    
    for (const user of users) {
      await this.client.auth.signUp({
        email: user.email,
        password: 'TestPass123!',
        options: { data: user }
      });
    }
  }

  async cleanup() {
    await this.client.auth.signOut();
    execSync(`dropdb ${this.dbName}`, { stdio: 'inherit' });
  }

  getClient() {
    return this.client;
  }
}
EOF
```

### Step 3: Test Data Factories (45 minutes)

Create comprehensive test factories:
```bash
cat > test/factories/index.ts << 'EOF'
import { faker } from '@faker-js/faker';

export const factories = {
  // User factory
  user: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.fullName(),
    level: faker.datatype.number({ min: 1, max: 50 }),
    xp: faker.datatype.number({ min: 0, max: 10000 }),
    streak: faker.datatype.number({ min: 0, max: 365 }),
    subscription_tier: faker.helpers.arrayElement(['free', 'pro', 'premium']),
    created_at: faker.date.past(),
    ...overrides,
  }),

  // Recipe factory
  recipe: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    title: faker.lorem.words(3),
    description: faker.lorem.paragraph(),
    ingredients: Array.from(
      { length: faker.datatype.number({ min: 3, max: 10 }) },
      () => ({
        name: faker.lorem.word(),
        amount: faker.datatype.number({ min: 1, max: 500 }),
        unit: faker.helpers.arrayElement(['g', 'ml', 'cups', 'tbsp', 'tsp']),
      })
    ),
    instructions: Array.from(
      { length: faker.datatype.number({ min: 3, max: 8 }) },
      () => faker.lorem.sentence()
    ),
    cook_time: faker.datatype.number({ min: 10, max: 120 }),
    prep_time: faker.datatype.number({ min: 5, max: 60 }),
    servings: faker.datatype.number({ min: 1, max: 8 }),
    difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
    cuisine: faker.helpers.arrayElement(['Italian', 'Mexican', 'Asian', 'American']),
    dietary_tags: faker.helpers.arrayElements(
      ['vegan', 'gluten-free', 'keto', 'paleo', 'vegetarian'],
      faker.datatype.number({ min: 0, max: 3 })
    ),
    nutrition: {
      calories: faker.datatype.number({ min: 100, max: 800 }),
      protein: faker.datatype.number({ min: 5, max: 50 }),
      carbs: faker.datatype.number({ min: 10, max: 100 }),
      fat: faker.datatype.number({ min: 5, max: 40 }),
      fiber: faker.datatype.number({ min: 0, max: 15 }),
      sugar: faker.datatype.number({ min: 0, max: 30 }),
    },
    rating: faker.datatype.float({ min: 3.0, max: 5.0, precision: 0.1 }),
    review_count: faker.datatype.number({ min: 0, max: 500 }),
    image_url: faker.image.food(),
    created_by: faker.datatype.uuid(),
    created_at: faker.date.past(),
    ...overrides,
  }),

  // Subscription factory
  subscription: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    user_id: faker.datatype.uuid(),
    plan: faker.helpers.arrayElement(['free', 'pro', 'premium']),
    status: faker.helpers.arrayElement(['active', 'canceled', 'past_due']),
    stripe_subscription_id: `sub_${faker.random.alphaNumeric(14)}`,
    stripe_customer_id: `cus_${faker.random.alphaNumeric(14)}`,
    current_period_start: faker.date.recent(),
    current_period_end: faker.date.future(),
    cancel_at_period_end: faker.datatype.boolean(),
    ...overrides,
  }),

  // Achievement factory
  achievement: (overrides = {}) => ({
    id: faker.datatype.uuid(),
    user_id: faker.datatype.uuid(),
    type: faker.helpers.arrayElement([
      'first_recipe',
      'week_streak',
      'month_streak',
      'master_chef',
      'recipe_creator',
      'social_butterfly',
    ]),
    unlocked_at: faker.date.recent(),
    xp_earned: faker.datatype.number({ min: 50, max: 500 }),
    ...overrides,
  }),
};

// Batch creation helpers
export const createBatch = {
  users: (count = 10) => 
    Array.from({ length: count }, () => factories.user()),
  
  recipes: (count = 20, userId?: string) =>
    Array.from({ length: count }, () => 
      factories.recipe(userId ? { created_by: userId } : {})
    ),
  
  subscriptions: (users: any[]) =>
    users.map(user => 
      factories.subscription({ user_id: user.id })
    ),
};

// Relationship helpers
export const createUserWithData = () => {
  const user = factories.user();
  const recipes = createBatch.recipes(5, user.id);
  const subscription = factories.subscription({ user_id: user.id });
  const achievements = Array.from({ length: 3 }, () =>
    factories.achievement({ user_id: user.id })
  );
  
  return { user, recipes, subscription, achievements };
};
EOF
```

### Step 4: Jest Configuration (30 minutes)

Create integration test configuration:
```bash
cat > jest.config.integration.js << 'EOF'
module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/*.integration.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  globalSetup: '<rootDir>/test/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/test/integration/globalTeardown.ts'],
  maxWorkers: 1, // Run sequentially for database
  testTimeout: 30000,
  collectCoverageFrom: [
    'backend/api/src/**/*.ts',
    'mobile/CookCam/src/services/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
};
EOF

# Update package.json scripts
cat > package-scripts.json << 'EOF'
{
  "scripts": {
    "test:integration": "jest --config jest.config.integration.js",
    "test:integration:watch": "jest --config jest.config.integration.js --watch",
    "test:integration:coverage": "jest --config jest.config.integration.js --coverage",
    "test:e2e": "detox test",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "db:test:setup": "node test/integration/setup-db.js",
    "db:test:teardown": "node test/integration/teardown-db.js"
  }
}
EOF
```

### Step 5: First Integration Test (1 hour)

Create authentication flow integration test:
```bash
cat > test/integration/auth-flow.integration.test.ts << 'EOF'
import { TestDatabase } from './setup-db';
import { factories } from '../factories';
import axios from 'axios';

describe('Authentication Flow Integration', () => {
  let db: TestDatabase;
  let apiUrl: string;
  
  beforeAll(async () => {
    db = new TestDatabase();
    await db.setup();
    apiUrl = process.env.API_URL || 'http://localhost:3000';
  });
  
  afterAll(async () => {
    await db.cleanup();
  });
  
  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        name: 'New User',
      };
      
      // 1. Register user via API
      const registerResponse = await axios.post(
        `${apiUrl}/api/auth/register`,
        userData
      );
      
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data).toHaveProperty('token');
      expect(registerResponse.data.user.email).toBe(userData.email);
      
      // 2. Verify user in database
      const client = db.getClient();
      const { data: dbUser } = await client
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single();
      
      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(userData.email);
      
      // 3. Login with new credentials
      const loginResponse = await axios.post(
        `${apiUrl}/api/auth/login`,
        {
          email: userData.email,
          password: userData.password,
        }
      );
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeDefined();
      
      // 4. Access protected route with token
      const token = loginResponse.data.token;
      const profileResponse = await axios.get(
        `${apiUrl}/api/user/profile`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.email).toBe(userData.email);
    });
    
    it('should handle duplicate email registration', async () => {
      // TODO: Implement test
    });
    
    it('should validate password requirements', async () => {
      // TODO: Implement test
    });
  });
  
  describe('Token Management', () => {
    it('should refresh expired tokens', async () => {
      // TODO: Implement test
    });
    
    it('should reject invalid tokens', async () => {
      // TODO: Implement test
    });
  });
});
EOF
```

## YOUR INFRASTRUCTURE CHECKLIST FOR DAY 1

### CI/CD Pipeline
- [ ] GitHub Actions workflow created
- [ ] Backend test job configured
- [ ] Mobile test job configured
- [ ] Integration test job configured
- [ ] Coverage reporting to Codecov
- [ ] Branch protection rules set
- [ ] Status checks required

### Test Database
- [ ] Database creation script
- [ ] Migration runner
- [ ] Seed data loader
- [ ] Cleanup script
- [ ] Connection management

### Test Factories
- [ ] User factory with all fields
- [ ] Recipe factory with relations
- [ ] Subscription factory
- [ ] Achievement factory
- [ ] Batch creation helpers
- [ ] Relationship builders

### Integration Tests
- [ ] Jest configuration
- [ ] Database setup/teardown
- [ ] First auth flow test passing
- [ ] API client configured
- [ ] Error handling tests

## HOURLY PROGRESS CHECKS

Every hour, run this check:
```bash
echo "Hour $(date +%H) Infrastructure Progress"
echo "======================================="
echo "CI/CD Files:"
ls -la .github/workflows/*.yml 2>/dev/null | wc -l
echo ""
echo "Test Factories:"
ls -la test/factories/*.ts 2>/dev/null | wc -l
echo ""
echo "Integration Tests:"
find test/integration -name "*.test.ts" | wc -l
echo ""
echo "GitHub Actions Status:"
gh workflow list
```

## END OF DAY 1 DELIVERABLES

By 5 PM, you must have:
1. ✅ Complete CI/CD pipeline in GitHub Actions
2. ✅ Test database setup and teardown scripts
3. ✅ Comprehensive test factories
4. ✅ Jest integration test configuration
5. ✅ At least 1 working integration test
6. ✅ Codecov integration configured
7. ✅ Committed to `test/integration` branch

## GITHUB ACTIONS DEBUGGING

If workflows fail:
```bash
# View workflow runs
gh run list

# View specific run details
gh run view [run-id]

# Download artifacts
gh run download [run-id]

# Re-run failed jobs
gh run rerun [run-id]
```

## CODECOV SETUP

1. Sign up at codecov.io
2. Add repository
3. Get upload token
4. Add as GitHub secret: `CODECOV_TOKEN`
5. Badge will appear after first upload

## IF YOU GET BLOCKED

1. Check GitHub Actions documentation
2. Review Jest configuration docs
3. Use simpler test temporarily
4. Focus on different infrastructure piece
5. Document blocker for Orchestrator

## CRITICAL SUCCESS FACTORS

- **CI/CD First**: Multiplies everyone's efficiency
- **Database Isolation**: Each test gets clean state
- **Factory Quality**: Good factories = easy tests
- **Fast Feedback**: CI should run in <5 minutes
- **Reliable Tests**: No flaky tests allowed

## START NOW

1. Create GitHub Actions workflow
2. Set up test database scripts
3. Build comprehensive factories
4. Configure Jest for integration
5. Write first integration test

Current state: No infrastructure
Target for today: Complete foundation
Deliverables: Working CI/CD + 1 integration test

The test infrastructure enables everything else. Without it, we can't validate our work. Build it right. Begin immediately!