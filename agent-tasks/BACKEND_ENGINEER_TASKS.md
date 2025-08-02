# Backend Test Engineer - Day 1 Priority Tasks

## 🎯 MISSION: Authentication System Testing
**Current Coverage**: 4% → **Day 1 Target**: 20%

## ⏰ SCHEDULE: Day 1 (8 hours)

### 🌅 Morning Session (9 AM - 1 PM)

#### Task 1: Test Infrastructure Setup (1 hour)
```bash
cd backend/api
npm install --save-dev @supabase/supabase-js @types/supertest
mkdir -p src/test src/middleware/__tests__ src/routes/__tests__ src/services/__tests__
```

#### Task 2: Create Test Helpers (1 hour)
**Create**: `backend/api/src/test/helpers.ts`
```typescript
// Mock Supabase client
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn()
  }
};

// JWT test tokens
export const validToken = 'eyJ...';
export const expiredToken = 'eyJ...';

// Test user factory
export const createTestUser = (overrides = {}) => ({...});
```

#### Task 3: Auth Middleware Tests (2 hours)
**File to test**: `backend/api/src/middleware/auth.ts`
**Create test**: `backend/api/src/middleware/__tests__/auth.test.ts`

✅ **Required Test Cases**:
1. Valid JWT token passes through
2. Expired token returns 401
3. Invalid signature returns 401  
4. Missing Authorization header returns 401
5. Malformed token format returns 401
6. Token with invalid claims returns 401
7. Verify user context is attached to request
8. Rate limiting works correctly

### 🌇 Afternoon Session (2 PM - 6 PM)

#### Task 4: Auth Routes Tests (2 hours)
**File to test**: `backend/api/src/routes/auth.ts`
**Create test**: `backend/api/src/routes/__tests__/auth.test.ts`

✅ **Required Test Cases**:
1. POST /api/auth/login - valid credentials
2. POST /api/auth/login - invalid credentials
3. POST /api/auth/register - valid data
4. POST /api/auth/register - duplicate email
5. POST /api/auth/logout - clears session
6. POST /api/auth/refresh - refreshes token
7. Input validation for all endpoints
8. Error response formats

#### Task 5: Auth Service Tests (2 hours)
**File to test**: `backend/api/src/services/authService.ts`
**Create test**: `backend/api/src/services/__tests__/authService.test.ts`

✅ **Required Test Cases**:
1. createUser with valid data
2. createUser with duplicate email
3. validatePassword correct/incorrect
4. generateTokens creates valid JWT
5. verifyToken validates correctly
6. getUserById returns user
7. updateLastLogin timestamps
8. Supabase error handling

## 📊 Coverage Requirements

| File | Current | Target | Priority |
|------|---------|--------|----------|
| middleware/auth.ts | 0% | 80% | HIGH |
| routes/auth.ts | 0% | 75% | HIGH |
| services/authService.ts | 0% | 75% | HIGH |

## 🛠 Technical Setup

### Environment Variables
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-key
JWT_SECRET=test-secret
NODE_ENV=test
```

### Run Commands
```bash
# Run all auth tests
npm test -- auth

# Run with coverage
npm run coverage

# Watch mode for development
npm test -- --watch auth
```

## 📝 Deliverables Checklist

- [ ] Test helper utilities created
- [ ] Auth middleware: 15+ test cases, 80% coverage
- [ ] Auth routes: 12+ test cases, 75% coverage  
- [ ] Auth service: 10+ test cases, 75% coverage
- [ ] All tests passing (no skipped)
- [ ] Coverage report showing 20%+ overall
- [ ] Git commit with descriptive message

## 🚨 IMPORTANT NOTES

1. **Mock Everything**: Do not make real API calls
2. **Test Isolation**: Each test should be independent
3. **Clean State**: Reset mocks between tests
4. **Error Cases**: Test both success and failure paths
5. **Performance**: Tests should run in <30 seconds

## 📍 Progress Reporting

Report progress every 2 hours:
- 11 AM: Infrastructure setup complete?
- 1 PM: Middleware tests complete?
- 3 PM: Routes tests progress?
- 5 PM: Service tests progress?
- 6 PM: Final coverage report

## 🆘 If Blocked

Contact orchestrator immediately if:
- Cannot access files
- Dependencies won't install
- Tests are flaky
- Coverage tools not working
- Need architectural decisions

---
*Assigned: Day 1, 9 AM*
*Due: Day 1, 6 PM*
*Orchestrator: Checking every 2 hours*
