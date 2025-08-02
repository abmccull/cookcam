# MOBILE SERVICES & HOOKS TEST ENGINEER - STARTUP PROMPT

## LAUNCH COMMAND
```bash
claude --dangerous code /Users/abmccull/Desktop/cookcam1
```

## YOUR IMMEDIATE MISSION

You are the Mobile Services & Hooks Test Engineer for CookCam. Your sole responsibility is achieving 85%+ test coverage for all mobile services, hooks, utilities, and context providers. Today is Day 1 - you must test core API services.

## CRITICAL DOCUMENTS TO REVIEW FIRST

1. **Master Plan**: `/Users/abmccull/Desktop/cookcam1/TEST_COVERAGE_MASTER_PLAN.md`
2. **Your Role**: `/Users/abmccull/Desktop/cookcam1/AGENT_4_MOBILE_SERVICES_ENGINEER_PROMPT.md`
3. **Orchestrator Setup**: `/Users/abmccull/Desktop/cookcam1/ORCHESTRATOR_SETUP.sh`

## DAY 1 IMMEDIATE TASKS

### Current State
- Mobile Services Coverage: 3% (CRITICAL)
- Your Target: 15% by end of Day 1
- Focus: Core API Services (cookCamApi, apiService, authService)

### Step 1: Environment Setup (15 minutes)
```bash
# Navigate to mobile app
cd /Users/abmccull/Desktop/cookcam1/mobile/CookCam

# Install MSW for API mocking
npm install --save-dev msw @testing-library/react-hooks

# Set up MSW
npx msw init ./public

# Create test structure
mkdir -p src/services/__tests__
mkdir -p src/hooks/__tests__
mkdir -p src/utils/__tests__
mkdir -p src/context/__tests__
mkdir -p src/test

# Check current coverage baseline
npm run coverage

# Create your branch
git checkout -b test/mobile-services
```

### Step 2: Set Up MSW Server (30 minutes)

Create MSW server configuration:
```bash
cat > src/test/server.ts << 'EOF'
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('*/api/auth/login', async (req, res, ctx) => {
    const { email, password } = await req.json();
    
    if (email === 'test@example.com' && password === 'password') {
      return res(ctx.json({
        token: 'mock-jwt-token',
        user: { id: '1', email }
      }));
    }
    
    return res(ctx.status(401), ctx.json({ error: 'Invalid credentials' }));
  }),

  rest.post('*/api/auth/refresh', (req, res, ctx) => {
    return res(ctx.json({ token: 'new-mock-token' }));
  }),

  // User endpoints
  rest.get('*/api/user', (req, res, ctx) => {
    const auth = req.headers.get('authorization');
    
    if (!auth) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }
    
    return res(ctx.json({
      id: '1',
      email: 'test@example.com',
      level: 5,
      xp: 1250
    }));
  }),

  // Recipes endpoints
  rest.get('*/api/recipes', (req, res, ctx) => {
    return res(ctx.json({
      recipes: [
        { id: '1', title: 'Recipe 1' },
        { id: '2', title: 'Recipe 2' }
      ],
      total: 2
    }));
  }),

  rest.post('*/api/recipes', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.status(201), ctx.json({
      id: '3',
      ...body
    }));
  }),
];

export const server = setupServer(...handlers);
EOF
```

Setup test configuration:
```bash
cat > src/test/setup.ts << 'EOF'
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));
EOF
```

### Step 3: Test API Service (2 hours)

Create API service tests:
```bash
cat > src/services/__tests__/apiService.test.ts << 'EOF'
import { server } from '../../test/server';
import { rest } from 'msw';
import { apiService } from '../apiService';

describe('ApiService', () => {
  describe('GET requests', () => {
    it('should fetch data successfully', async () => {
      const result = await apiService.get('/recipes');
      expect(result.recipes).toHaveLength(2);
    });

    it('should handle 404 errors', async () => {
      server.use(
        rest.get('*/api/notfound', (req, res, ctx) => {
          return res(ctx.status(404), ctx.json({ error: 'Not found' }));
        })
      );

      await expect(apiService.get('/notfound'))
        .rejects.toThrow('Not found');
    });

    it('should handle network errors', async () => {
      // TODO: Implement test
    });

    it('should handle timeout', async () => {
      // TODO: Implement test
    });

    it('should add auth headers when token exists', async () => {
      // TODO: Implement test
    });
  });

  describe('POST requests', () => {
    it('should send data correctly', async () => {
      // TODO: Implement test
    });

    it('should handle validation errors', async () => {
      // TODO: Implement test
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      // TODO: Implement test
    });

    it('should respect max retry limit', async () => {
      // TODO: Implement test
    });
  });
});
EOF
```

### Step 4: Test Auth Service (1.5 hours)

Create auth service tests:
```bash
cat > src/services/__tests__/authService.test.ts << 'EOF'
import { authService } from '../authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { server } from '../../test/server';
import { rest } from 'msw';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password');
      
      expect(result.token).toBe('mock-jwt-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', expect.any(String));
    });

    it('should throw error with invalid credentials', async () => {
      // TODO: Implement test
    });

    it('should handle network errors', async () => {
      // TODO: Implement test
    });
  });

  describe('logout', () => {
    it('should clear stored data', async () => {
      // TODO: Implement test
    });
  });

  describe('token refresh', () => {
    it('should refresh expired token', async () => {
      // TODO: Implement test
    });

    it('should handle refresh failure', async () => {
      // TODO: Implement test
    });
  });

  describe('session management', () => {
    it('should check if user is authenticated', async () => {
      // TODO: Implement test
    });

    it('should get current user', async () => {
      // TODO: Implement test
    });
  });
});
EOF
```

### Step 5: Priority Service Testing Order

Test these services in order:
1. `apiService.ts` - Foundation for all API calls (90% coverage target)
2. `authService.ts` - Security critical (90% coverage target)
3. `cookCamApi.ts` - App-specific API wrapper (85% coverage target)
4. `storage.ts` - Data persistence (80% coverage target)

## YOUR TESTING CHECKLIST FOR DAY 1

### API Service
- [ ] GET request success
- [ ] POST request with body
- [ ] PUT request with update
- [ ] DELETE request
- [ ] Error handling (4xx, 5xx)
- [ ] Network timeout
- [ ] Retry logic with backoff
- [ ] Request interceptors
- [ ] Response interceptors
- [ ] Auth header injection

### Auth Service
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token storage in AsyncStorage
- [ ] Token retrieval
- [ ] Token refresh flow
- [ ] Logout and cleanup
- [ ] Session persistence
- [ ] Auto-logout on 401

### Storage Utilities
- [ ] Save string data
- [ ] Save object data (JSON)
- [ ] Retrieve and parse data
- [ ] Handle missing keys
- [ ] Clear all data
- [ ] Multi-key operations

## ASYNC TESTING PATTERNS

### Testing Promises
```javascript
// Always use async/await
it('should handle async operations', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});

// Test rejection
it('should handle errors', async () => {
  await expect(service.fetchData())
    .rejects.toThrow('Error message');
});
```

### Testing with Timers
```javascript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('should debounce calls', () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 500);
  
  debounced();
  debounced();
  debounced();
  
  expect(fn).not.toHaveBeenCalled();
  
  jest.advanceTimersByTime(500);
  expect(fn).toHaveBeenCalledTimes(1);
});
```

## HOURLY PROGRESS CHECKS

Every hour, run this check:
```bash
echo "Hour $(date +%H) Services Test Progress"
echo "======================================"
npm run coverage 2>/dev/null | grep -A 10 "src/services"
echo ""
echo "Services tested: $(ls src/services/__tests__/*.test.ts 2>/dev/null | wc -l)"
echo "Hooks tested: $(ls src/hooks/__tests__/*.test.ts 2>/dev/null | wc -l)"
echo "MSW handlers: $(grep -c "rest\." src/test/server.ts)"
```

## END OF DAY 1 DELIVERABLES

By 5 PM, you must have:
1. ✅ API Service at 90%+ coverage
2. ✅ Auth Service at 85%+ coverage
3. ✅ MSW server fully configured
4. ✅ AsyncStorage mocking complete
5. ✅ At least 15% total services coverage
6. ✅ Committed to `test/mobile-services` branch

## MSW BEST PRACTICES

### Dynamic Handlers
```javascript
// Override handlers for specific tests
it('should handle server error', async () => {
  server.use(
    rest.get('*/api/data', (req, res, ctx) => {
      return res.once(ctx.status(500));
    })
  );
  
  await expect(apiService.get('/data'))
    .rejects.toThrow('Server error');
});
```

### Request Validation
```javascript
rest.post('*/api/data', async (req, res, ctx) => {
  const body = await req.json();
  
  // Validate request
  if (!body.required_field) {
    return res(ctx.status(400), ctx.json({
      error: 'Missing required field'
    }));
  }
  
  return res(ctx.json({ success: true }));
});
```

## IF YOU GET BLOCKED

1. Check MSW documentation
2. Review existing service patterns
3. Use simple mock returns temporarily
4. Test a different service
5. Document blocker for Orchestrator

## CRITICAL SUCCESS FACTORS

- **Mock Everything**: No real API calls in tests
- **Test Error Paths**: Network failures are common
- **Async Handling**: Properly await all promises
- **Token Management**: Critical for app security
- **Offline Support**: Test offline scenarios

## START NOW

1. Set up MSW server
2. Configure test environment
3. Begin with apiService (foundation)
4. Test all HTTP methods
5. Move to authService

Current coverage: 3%
Target for today: 15%
Services to test: 3-4 minimum

The API service is the backbone of the app - every feature depends on it. Test it thoroughly. Begin immediately!