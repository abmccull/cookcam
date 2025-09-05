# Phase 2 Agent Task Checklists
**Individual Agent Reference Guides**  
**Generated**: $(date '+%Y-%m-%d %H:%M:%S')

---

## 🎯 **BACKEND TEST ENGINEER - TASK CHECKLIST**

### **WAVE 1: Technical Debt Resolution (60 minutes)**
**Target**: 30-35% → 45-50% coverage

#### **⏰ Task Block 1: Logger & Response Fixes (20 minutes)**
**Files to Fix**: `recipes.test.ts`, `analytics.test.ts`, `auth.test.ts`

- [ ] **Logger Mock Alignment** (10 minutes)
  - [ ] Open `backend/api/src/routes/__tests__/recipes.test.ts`
  - [ ] Fix line 1210: Change `"Recipe suggestion error:"` to `"Generate suggestions error"`
  - [ ] Update all `logger.error` expectations to match actual implementation
  - [ ] Apply pattern: `logger.error.mockImplementation(() => {})`
  - [ ] Validate: Run `npm test recipes.test.ts` - should reduce failures

- [ ] **Response Format Alignment** (10 minutes)
  - [ ] Fix `analytics.test.ts` admin access response expectations
  - [ ] Update authentication test response structures in `auth.test.ts`
  - [ ] Align subscription test response formats
  - [ ] Validate: Run `npm test analytics auth` - should show improvements

#### **⏰ Task Block 2: Mock Standardization (20 minutes)**
**Files to Fix**: `authService.test.ts`, `subscriptionService.test.ts`, `validation.test.ts`

- [ ] **Supabase Mock Pattern** (10 minutes)
  - [ ] Create consistent `supabase.from()` chain mocking
  - [ ] Fix auth service token validation mocks
  - [ ] Standardize error response mocking across tests
  - [ ] Apply pattern:
    ```javascript
    const mockQuery = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: mockData, error: null })
    };
    ```

- [ ] **Environment Setup** (10 minutes)
  - [ ] Add proper env vars in `beforeEach` for all failing tests
  - [ ] Ensure `JWT_SECRET`, `SUPABASE_URL` consistency
  - [ ] Add missing env vars: `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`
  - [ ] Validate: Check that env-dependent tests pass

#### **⏰ Task Block 3: Test Data Factories (20 minutes)**
**Create**: `backend/api/src/test/factories/index.ts`

- [ ] **Standard Factories** (15 minutes)
  ```typescript
  export const userFactory = {
    build: (overrides = {}) => ({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      ...overrides
    })
  };
  
  export const recipeFactory = {
    build: (overrides = {}) => ({
      id: 'recipe-123',
      title: 'Test Recipe',
      ingredients: [],
      nutrition: {},
      ...overrides
    })
  };
  ```

- [ ] **Response Templates** (5 minutes)
  - [ ] Create standard success response template
  - [ ] Create standard error response template
  - [ ] Create pagination response template

### **WAVE 2: Route Testing Expansion (120 minutes)**
**Target**: 45-50% → 75-80% coverage

#### **⏰ Route Block 1: Users Route (30 minutes)**
**File**: `backend/api/src/routes/__tests__/users.test.ts`

- [ ] **User Profile Tests** (15 minutes)
  - [ ] GET `/users/profile` - profile retrieval
  - [ ] PUT `/users/profile` - profile updates with validation
  - [ ] Test authentication requirements
  - [ ] Test profile image upload
  - [ ] Mock Supabase user operations

- [ ] **User Preferences Tests** (15 minutes)
  - [ ] POST `/users/preferences` - dietary preferences
  - [ ] GET `/users/preferences` - preference retrieval
  - [ ] DELETE `/users/account` - account deletion flow
  - [ ] Test preference validation and storage

#### **⏰ Route Block 2: Scan Route (30 minutes)**
**File**: `backend/api/src/routes/__tests__/scan.test.ts`

- [ ] **Image Processing Tests** (15 minutes)
  - [ ] POST `/scan/ingredients` - image upload and OCR
  - [ ] Test file upload validation (size, type)
  - [ ] Mock image processing pipeline
  - [ ] Test error handling for corrupted images

- [ ] **Scan History Tests** (15 minutes)
  - [ ] GET `/scan/history` - user scan history
  - [ ] PUT `/scan/:id/feedback` - user feedback
  - [ ] Test pagination and filtering
  - [ ] Mock scan result storage

#### **⏰ Route Block 3: Ingredients Route (30 minutes)**
**File**: `backend/api/src/routes/__tests__/ingredients.test.ts`

- [ ] **Search & Details Tests** (15 minutes)
  - [ ] GET `/ingredients/search` - ingredient search
  - [ ] GET `/ingredients/:id` - ingredient details
  - [ ] Test search query validation
  - [ ] Mock ingredient database queries

- [ ] **USDA Integration Tests** (15 minutes)
  - [ ] POST `/ingredients/:id/sync-usda` - USDA sync
  - [ ] Test nutrition data integration
  - [ ] Mock USDA API responses
  - [ ] Test error handling for API failures

#### **⏰ Final Block: Middleware (30 minutes)**

- [ ] **Security Middleware** (15 minutes)
  - [ ] Rate limiting comprehensive testing
  - [ ] CORS middleware testing
  - [ ] Security headers validation
  - [ ] Request validation middleware

- [ ] **Error Handling** (15 minutes)
  - [ ] Global error handler testing
  - [ ] 404 handler testing
  - [ ] Validation error formatting
  - [ ] Database error handling

---

## 📱 **MOBILE UI TEST SPECIALIST - TASK CHECKLIST**

### **WAVE 1: Systematic Component Unlock (60 minutes)**
**Target**: 1-2% → 30-35% coverage

#### **⚰️ Proven Success Pattern to Copy**
**Reference Files**: `AIChefIcon.test.tsx`, `ChefBadge.test.tsx`
**Pattern**:
```javascript
// 1. Global mocks
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
};

// 2. Component mocks
jest.mock('../../components/ComponentName', () => 'MockComponentName');

// 3. Context mocks
const mockContext = { /* standardized structure */ };
jest.mock('../../context/ContextName', () => ({
  useContextName: () => mockContext,
}));

// 4. Navigation mocks
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  // ... other navigation methods
};
```

#### **⏰ Component Block 1: RecipeCard (15 minutes)**
**File**: `mobile/CookCam/src/__tests__/components/RecipeCard.test.tsx`

- [ ] **Setup Phase** (5 minutes)
  - [ ] Copy exact global mock structure from `AIChefIcon.test.tsx`
  - [ ] Add PixelRatio mock at top of file
  - [ ] Copy proven StyleSheet mock pattern

- [ ] **Mock Configuration** (5 minutes)
  - [ ] Fix navigation mock: `const mockNavigation = { navigate: jest.fn(), ... }`
  - [ ] Add FastImage mock: `jest.mock('react-native-fast-image')`
  - [ ] Apply AuthContext mock pattern from working tests
  - [ ] Apply GamificationContext mock pattern

- [ ] **Validation** (5 minutes)
  - [ ] Run: `npm test RecipeCard.test.tsx`
  - [ ] Expected: 62/62 tests passing
  - [ ] Expected coverage increase: ~4%
  - [ ] If failures: check mock patterns match AIChefIcon exactly

#### **⏰ Component Block 2: FilterDrawer (15 minutes)**
**File**: `mobile/CookCam/src/__tests__/components/FilterDrawer.test.tsx`

- [ ] **Mock Application** (8 minutes)
  - [ ] Copy PixelRatio mock from RecipeCard (now working)
  - [ ] Add modal mock: `jest.mock('react-native-modal')`
  - [ ] Fix state management mocks for filter operations
  - [ ] Apply Animated.Value pattern from ChefBadge

- [ ] **Animation Fixes** (4 minutes)
  - [ ] Copy exact animation mock structure from ChefBadge
  - [ ] Apply Animated.timing and spring mocks
  - [ ] Fix gesture handler mocks

- [ ] **Validation** (3 minutes)
  - [ ] Run: `npm test FilterDrawer.test.tsx`
  - [ ] Expected: 60+/60+ tests passing
  - [ ] Expected coverage increase: ~4%

#### **⏰ Component Block 3: NutritionBadge (15 minutes)**
**File**: `mobile/CookCam/src/__tests__/components/NutritionBadge.test.tsx`

- [ ] **Responsive System Mocks** (8 minutes)
  - [ ] Copy responsive system mocks from working components
  - [ ] Fix color calculation logic mocks
  - [ ] Apply nutrition data formatting mocks
  - [ ] Copy StyleSheet mock pattern exactly

- [ ] **Data Handling** (4 minutes)
  - [ ] Mock nutrition calculation functions
  - [ ] Fix conditional rendering logic tests
  - [ ] Apply variant display mocks (full/compact)

- [ ] **Validation** (3 minutes)
  - [ ] Run: `npm test NutritionBadge.test.tsx`
  - [ ] Expected: 45/45 tests passing
  - [ ] Expected coverage increase: ~3%

#### **⏰ Component Block 4: XPProgressBar (15 minutes)**
**File**: `mobile/CookCam/src/__tests__/components/XPProgressBar.test.tsx`

- [ ] **Animation Pattern Application** (10 minutes)
  - [ ] Copy exact animation mock pattern from ChefBadge
  - [ ] Apply GamificationContext mock structure
  - [ ] Fix progress calculation mocks
  - [ ] Copy Animated sequence mocks exactly

- [ ] **Validation** (5 minutes)
  - [ ] Run: `npm test XPProgressBar.test.tsx`
  - [ ] Expected: 50+/50+ tests passing
  - [ ] Expected coverage increase: ~4%

### **WAVE 2: Screen Component Implementation (60 minutes)**
**Target**: 30-35% → 45-50% coverage

#### **⏰ Screen Block 1: MainScreen (20 minutes)**
**File**: `mobile/CookCam/src/__tests__/screens/MainScreen.test.tsx`

- [ ] **Context Integration** (8 minutes)
  - [ ] Apply complete AuthContext mock suite
  - [ ] Apply GamificationContext mock from working components
  - [ ] Fix service integration mocks (GamificationService)
  - [ ] Copy navigation mock pattern

- [ ] **Service & Hardware Mocks** (8 minutes)
  - [ ] Fix haptic feedback mocks: `jest.mock('expo-haptics')`
  - [ ] Add camera navigation mocks
  - [ ] Apply AsyncStorage mocks for check-in data
  - [ ] Mock Alert for achievement celebrations

- [ ] **Validation** (4 minutes)
  - [ ] Run: `npm test MainScreen.test.tsx`
  - [ ] Expected: 100+ tests passing
  - [ ] Expected coverage increase: ~8%

#### **⏰ Screen Block 2: ProfileScreen (20 minutes)**
**File**: `mobile/CookCam/src/__tests__/screens/ProfileScreen.test.tsx`

- [ ] **User Context Application** (10 minutes)
  - [ ] Apply user context mocks from MainScreen
  - [ ] Fix settings management mocks
  - [ ] Apply subscription status mocks
  - [ ] Add AsyncStorage mocks for user preferences

- [ ] **Feature Integration** (6 minutes)
  - [ ] Fix achievement showcase mocks
  - [ ] Apply navigation mocks for settings screens
  - [ ] Add image picker mocks for avatar updates

- [ ] **Validation** (4 minutes)
  - [ ] Run: `npm test ProfileScreen.test.tsx`
  - [ ] Expected coverage increase: ~6%

#### **⏰ Screen Block 3: RecipeDetailScreen (20 minutes)**
**File**: `mobile/CookCam/src/__tests__/screens/RecipeDetailScreen.test.tsx`

- [ ] **Recipe Data Mocks** (10 minutes)
  - [ ] Apply recipe data factory from backend patterns
  - [ ] Fix ingredient interaction mocks
  - [ ] Apply cooking mode toggle mocks
  - [ ] Add timer integration mocks

- [ ] **Sharing & Navigation** (6 minutes)
  - [ ] Apply sharing functionality mocks
  - [ ] Fix social sharing integration
  - [ ] Add navigation mocks for recipe editing

- [ ] **Validation** (4 minutes)
  - [ ] Run: `npm test RecipeDetailScreen.test.tsx`
  - [ ] Expected coverage increase: ~6%

---

## 📊 **SUCCESS VALIDATION CHECKLIST**

### **After Each Component Fix**
- [ ] Run specific test: `npm test ComponentName.test.tsx`
- [ ] Verify all tests passing (no skipped, no flaky)
- [ ] Check coverage increase with: `npm test -- --coverage ComponentName`
- [ ] Commit working fix before moving to next component

### **After Each Wave**
- [ ] Run full test suite: `npm test`
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Verify coverage target met
- [ ] Report progress to orchestrator

### **Wave 1 Success Criteria (60 minutes)**
- [ ] Backend: 30% → 45%+ coverage
- [ ] Mobile UI: 1% → 30%+ coverage
- [ ] No failing tests
- [ ] All mocks stable and reliable

### **Wave 2 Success Criteria (120 minutes)**
- [ ] Backend: 45% → 70%+ coverage
- [ ] Mobile UI: 30% → 45%+ coverage
- [ ] All screen components working
- [ ] Route testing comprehensive

### **Final Success Criteria (240 minutes)**
- [ ] **80%+ overall coverage**
- [ ] **Zero flaky tests**
- [ ] **Production deployment ready**
- [ ] **All agents mission complete**

---

## 🚨 **EMERGENCY PROCEDURES**

### **If Component Fix Fails**
1. **STOP** - Don't continue with broken pattern
2. **REVERT** - Go back to last working state
3. **COPY EXACTLY** - Re-examine AIChefIcon/ChefBadge pattern
4. **ASK FOR HELP** - Escalate to orchestrator if stuck >15 minutes

### **If Coverage Not Increasing**
1. **CHECK** - Verify test is actually running: `npm test ComponentName --verbose`
2. **VALIDATE** - Ensure test files in correct location and naming
3. **RESTART** - Clear Jest cache: `npm test -- --clearCache`
4. **ESCALATE** - Report to orchestrator with specific error messages

### **If Timeline Slipping**
1. **PRIORITIZE** - Focus on highest impact components first
2. **SKIP** - Move to next component if stuck >20 minutes on one
3. **COMMUNICATE** - Report delays immediately to orchestrator
4. **FALLBACK** - Minimum success: Get 2-3 major components working

---

**EXECUTION STATUS**: ✅ **READY FOR IMMEDIATE DEPLOYMENT**  
**Success Probability**: 🟢 **HIGH** (proven patterns available)  
**Expected Timeline**: **2-4 hours to 80% coverage**