# BACKEND TEST ENGINEER - STARTUP PROMPT

## LAUNCH COMMAND
```bash
claude --dangerous code /Users/abmccull/Desktop/cookcam1
```

## YOUR IMMEDIATE MISSION

You are the Backend Test Engineer for CookCam. Your sole responsibility is achieving 80%+ test coverage for the backend API. Today is Day 1 - you must test the authentication system.

## CRITICAL DOCUMENTS TO REVIEW FIRST

1. **Master Plan**: `/Users/abmccull/Desktop/cookcam1/TEST_COVERAGE_MASTER_PLAN.md`
2. **Your Role**: `/Users/abmccull/Desktop/cookcam1/AGENT_2_BACKEND_ENGINEER_PROMPT.md`
3. **Orchestrator Setup**: `/Users/abmccull/Desktop/cookcam1/ORCHESTRATOR_SETUP.sh`

## DAY 1 IMMEDIATE TASKS

### Current State
- Backend Coverage: 4% (CRITICAL)
- Your Target: 20% by end of Day 1
- Focus: Authentication System

### Step 1: Environment Setup (15 minutes)
```bash
# Navigate to backend
cd /Users/abmccull/Desktop/cookcam1/backend/api

# Install test dependencies
npm install --save-dev supertest @types/supertest @faker-js/faker

# Create test structure
mkdir -p src/middleware/__tests__
mkdir -p src/routes/__tests__
mkdir -p src/services/__tests__
mkdir -p src/test

# Check current coverage baseline
npm run coverage

# Create your branch
git checkout -b test/backend
```

### Step 2: Create Test Infrastructure (30 minutes)

Create test helpers:
```bash
cat > src/test/helpers.ts << 'EOF'
import { Request, Response } from 'express';

export const createMockRequest = (options: any = {}): Partial<Request> => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  ...options
});

export const createMockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const createAuthenticatedRequest = (userId = '123'): Partial<Request> => ({
  headers: { authorization: 'Bearer valid-token' },
  user: { id: userId, email: 'test@example.com' }
});
EOF
```

Create Supabase mock:
```bash
cat > src/test/mocks.ts << 'EOF'
export const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn()
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));
EOF
```

### Step 3: Test Auth Middleware (3 hours)

Create auth middleware tests:
```bash
cat > src/middleware/__tests__/auth.test.ts << 'EOF'
import { authenticateUser } from '../auth';
import { createMockRequest, createMockResponse } from '../../test/helpers';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  const mockNext = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should authenticate valid JWT token', async () => {
      // TODO: Implement test
    });

    it('should reject expired token', async () => {
      // TODO: Implement test
    });

    it('should reject invalid token', async () => {
      // TODO: Implement test
    });

    it('should reject missing auth header', async () => {
      // TODO: Implement test
    });

    it('should handle malformed token', async () => {
      // TODO: Implement test
    });
  });
});
EOF
```

### Step 4: Priority Test Implementation

Focus on these files in order:
1. `backend/api/src/middleware/auth.ts` - JWT validation (CRITICAL)
2. `backend/api/src/middleware/errorHandler.ts` - Error handling
3. `backend/api/src/routes/auth.ts` - Login/Register endpoints

### Step 5: Run Tests Continuously
```bash
# Watch mode for rapid development
npm test -- --watch

# Check coverage after each test
npm run coverage

# Run specific test file
npm test -- auth.test.ts
```

## YOUR TESTING CHECKLIST FOR DAY 1

### Auth Middleware (`src/middleware/auth.ts`)
- [ ] Valid JWT token authentication
- [ ] Expired token rejection
- [ ] Invalid signature handling
- [ ] Missing authorization header
- [ ] Malformed token format
- [ ] Token payload validation
- [ ] User extraction from token
- [ ] Role-based access control

### Error Handler (`src/middleware/errorHandler.ts`)
- [ ] 400 Bad Request
- [ ] 401 Unauthorized
- [ ] 403 Forbidden
- [ ] 404 Not Found
- [ ] 500 Internal Server Error
- [ ] Custom error messages
- [ ] Error logging

### Auth Routes (`src/routes/auth.ts`)
- [ ] POST /login - valid credentials
- [ ] POST /login - invalid credentials
- [ ] POST /login - missing fields
- [ ] POST /register - new user
- [ ] POST /register - existing email
- [ ] POST /register - validation errors
- [ ] POST /logout - authenticated user
- [ ] GET /me - authenticated user

## HOURLY PROGRESS CHECKS

Every hour, run this check:
```bash
echo "Hour $(date +%H) Progress Check"
echo "========================="
npm run coverage 2>/dev/null | grep -A 5 "File.*%"
echo ""
echo "Tests written: $(find src -name "*.test.ts" -exec grep -c "it(" {} \; | paste -sd+ | bc)"
echo "Coverage gained: Check above"
```

## END OF DAY 1 DELIVERABLES

By 5 PM, you must have:
1. ✅ Auth middleware at 80%+ coverage
2. ✅ Test helpers and mocks created
3. ✅ At least 15% total backend coverage
4. ✅ All tests passing (no failures)
5. ✅ Committed to `test/backend` branch

## COMMIT PATTERN
```bash
# Commit frequently with clear messages
git add -A
git commit -m "test(backend): add JWT validation tests for auth middleware"
git push origin test/backend
```

## IF YOU GET BLOCKED

1. Check existing code patterns in the codebase
2. Review `AGENT_2_BACKEND_ENGINEER_PROMPT.md` for examples
3. Focus on a different file and return later
4. Document the blocker for the Orchestrator

## CRITICAL SUCCESS FACTORS

- **Quality over Quantity**: Write thorough tests, not just many tests
- **Edge Cases**: Think like a hacker - test what could break
- **Mocking**: Mock all external dependencies (Supabase, Stripe, etc.)
- **Speed**: You have 12 days total - Day 1 sets the pace

## START NOW

1. Set up your environment
2. Create test infrastructure
3. Begin with auth.ts middleware
4. Achieve 80% coverage on auth.ts
5. Move to next priority file

Current coverage: 4%
Target for today: 20%
Files to test: 3-4 files minimum

The authentication system is critical - it protects everything. Test it thoroughly. Begin immediately!