# Mobile Services Test Engineer - Day 1 Priority Tasks

## 🎯 MISSION: API Services & Network Layer Testing
**Current Coverage**: 0% → **Day 1 Target**: 15%

## ⏰ SCHEDULE: Day 1 (8 hours)

### 🌅 Morning Session (9 AM - 1 PM)

#### Task 1: MSW Setup & Mocking Infrastructure (1 hour)
```bash
cd mobile/CookCam
npm install --save-dev msw @mswjs/data
mkdir -p src/__tests__/mocks
```

**Create**: `mobile/CookCam/src/__tests__/mocks/server.ts`
```typescript
import {setupServer} from 'msw/node';
import {handlers} from './handlers';

export const server = setupServer(...handlers);

// Setup for tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Task 2: Create API Mock Handlers (1 hour)
**Create**: `mobile/CookCam/src/__tests__/mocks/handlers.ts`
```typescript
import {rest} from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({token: 'mock-token', user: mockUser}));
  }),
  rest.get('/api/recipes', (req, res, ctx) => {
    return res(ctx.json({recipes: mockRecipes}));
  }),
  // Add all API endpoints
];
```

#### Task 3: CookCamApi Service Tests (2 hours)
**File to test**: `mobile/CookCam/src/services/cookCamApi.ts`
**Update test**: `mobile/CookCam/src/__tests__/services/cookCamApi.test.ts`

✅ **Required Test Cases**:
1. Request interceptor adds auth token
2. Request interceptor handles missing token
3. Response interceptor processes success
4. Response interceptor handles 401 (token refresh)
5. Response interceptor handles 403 (forbidden)
6. Response interceptor handles 500 errors
7. Retry logic for failed requests
8. Timeout handling (30s default)
9. Network error transformation
10. Request queuing during token refresh

### 🌇 Afternoon Session (2 PM - 6 PM)

#### Task 4: API Service Tests (2 hours)
**File to test**: `mobile/CookCam/src/services/apiService.ts`
**Update test**: `mobile/CookCam/src/__tests__/services/apiService.test.ts`

✅ **Required Test Cases**:
1. GET request with params
2. POST request with body
3. PUT request with body
4. DELETE request
5. Custom headers merge correctly
6. Base URL configuration
7. Error response parsing
8. Request cancellation
9. File upload with FormData
10. Response type handling (json/blob/text)

#### Task 5: Data Factory & Test Utilities (2 hours)
**Create**: `mobile/CookCam/src/__tests__/factories/index.ts`
```typescript
// User factory
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  level: 5,
  xp: 1250,
  ...overrides
});

// Recipe factory
export const createMockRecipe = (overrides = {}) => ({
  id: 'recipe-123',
  title: 'Test Recipe',
  ingredients: [],
  nutrition: {},
  ...overrides
});

// Subscription factory
export const createMockSubscription = (overrides = {}) => ({
  id: 'sub-123',
  plan: 'premium',
  status: 'active',
  ...overrides
});
```

## 📊 Coverage Requirements

| Service | Current | Target | Test Cases |
|---------|---------|--------|------------|
| cookCamApi.ts | 0% | 80% | 10+ |
| apiService.ts | 0% | 85% | 10+ |
| Mock Infrastructure | N/A | Complete | N/A |
| Test Factories | N/A | Complete | N/A |

## 🛠 Technical Setup

### Network Mocking Strategy
```typescript
// Success response mock
server.use(
  rest.get('/api/recipes/:id', (req, res, ctx) => {
    const {id} = req.params;
    return res(
      ctx.status(200),
      ctx.json({recipe: createMockRecipe({id})})
    );
  })
);

// Error response mock
server.use(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({error: 'Invalid credentials'})
    );
  })
);
```

### Async Testing Patterns
```typescript
it('should handle token refresh on 401', async () => {
  const api = new CookCamApi();
  
  server.use(
    rest.get('/api/user', (req, res, ctx) => {
      return res.once(ctx.status(401));
    })
  );

  await expect(api.getUser()).resolves.toEqual(mockUser);
  expect(refreshTokenSpy).toHaveBeenCalled();
});
```

## 📝 Deliverables Checklist

- [ ] MSW server setup complete
- [ ] Mock handlers for all endpoints
- [ ] Test factories created
- [ ] CookCamApi: 10+ tests, 80% coverage
- [ ] ApiService: 10+ tests, 85% coverage
- [ ] Network error scenarios tested
- [ ] Token refresh flow tested
- [ ] All async operations properly handled

## 🚀 Run Commands
```bash
# Run service tests
npm test services

# Run specific service
npm test cookCamApi.test.ts

# Coverage for services
npm run coverage -- services

# Debug mode
node --inspect-brk ./node_modules/.bin/jest services
```

## 🚨 Critical Test Scenarios

### Token Refresh Flow
1. Initial request returns 401
2. Refresh token called automatically
3. Original request retried with new token
4. Subsequent requests use new token
5. Refresh failure logs user out

### Network Resilience
1. Retry on network failure (3 attempts)
2. Exponential backoff between retries
3. Queue requests during token refresh
4. Cancel duplicate in-flight requests
5. Timeout after 30 seconds

## 📍 Progress Reporting

Report progress every 2 hours:
- 11 AM: MSW setup complete?
- 1 PM: CookCamApi tests complete?
- 3 PM: ApiService tests progress?
- 5 PM: Test factories complete?
- 6 PM: Final coverage report

## 🆘 Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| MSW not intercepting | Check server.listen() in setup |
| Async test timeout | Increase timeout or use waitFor |
| Token not in request | Check AsyncStorage mock |
| FormData tests fail | Mock FormData globally |

---
*Assigned: Day 1, 9 AM*
*Due: Day 1, 6 PM*
*Orchestrator: Checking every 2 hours*
