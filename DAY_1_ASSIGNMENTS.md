# DAY 1 TASK ASSIGNMENTS - Test Coverage Sprint

**Date**: Day 1  
**Overall Goal**: Achieve 10% total coverage (from 3.75% baseline)  
**Status**: 🚀 Sprint Started

---

## 🎯 CRITICAL ISSUE: Failing Tests
**Priority**: IMMEDIATE
- Backend: 87 tests failing (327 passing)
- Mobile: 190 tests failing (311 passing)
- **Action**: Integration Architect must fix test infrastructure FIRST

---

## Agent 1: Backend Test Engineer

### Morning Tasks (4 hours)
1. **FIX FAILING TESTS FIRST**
   - Fix recipe test logger issues in `src/routes/__tests__/recipes.test.ts`
   - Resolve mock configuration problems
   - Get all 414 tests passing

2. **Setup Test Infrastructure**
   ```bash
   cd /Users/abmccull/Desktop/cookcam1/backend/api
   npm install --save-dev supertest @types/supertest @faker-js/faker
   mkdir -p src/test
   ```

3. **Test Auth Middleware** (`src/middleware/auth.ts`)
   - JWT validation
   - Token expiry
   - Invalid token scenarios
   - Target: 80% coverage on this file

### Afternoon Tasks (4 hours)
4. Complete auth middleware edge cases
5. Begin auth routes testing
6. Document any blockers

**Files to Test**:
- `backend/api/src/middleware/auth.ts` → 80% coverage
- `backend/api/src/middleware/errorHandler.ts` → 70% coverage
- `backend/api/src/routes/auth.ts` → Start testing

**Success Metric**: Backend coverage from 4% → 15%

---

## Agent 2: Mobile UI Test Specialist

### Morning Tasks (4 hours)
1. **FIX BABEL/PARSING ERRORS**
   - Resolve syntax errors causing test failures
   - Fix jest configuration issues
   - Get base tests running

2. **Setup React Native Testing**
   ```bash
   cd /Users/abmccull/Desktop/cookcam1/mobile/CookCam
   npm install --save-dev @testing-library/react-native react-test-renderer
   mkdir -p src/components/__tests__
   ```

3. **Test RecipeCard Component**
   - Create snapshot test
   - Test all props
   - Test user interactions
   - Target: 90% coverage

### Afternoon Tasks (4 hours)
4. Test FilterDrawer component
5. Test NutritionBadge component
6. Create test utilities

**Files to Test**:
- `src/components/RecipeCard.tsx` → 90% coverage
- `src/components/FilterDrawer.tsx` → 85% coverage
- `src/components/NutritionBadge.tsx` → 85% coverage

**Success Metric**: Mobile UI coverage from 3.5% → 12%

---

## Agent 3: Mobile Services Engineer

### Morning Tasks (4 hours)
1. **Setup MSW for API Mocking**
   ```bash
   cd /Users/abmccull/Desktop/cookcam1/mobile/CookCam
   npm install --save-dev msw @testing-library/react-hooks
   npx msw init ./public
   mkdir -p src/services/__tests__
   ```

2. **Create MSW Server Configuration**
   - Setup handlers for all API endpoints
   - Configure test server
   - Mock AsyncStorage

3. **Test API Service**
   - GET/POST/PUT/DELETE methods
   - Error handling
   - Retry logic
   - Target: 90% coverage

### Afternoon Tasks (4 hours)
4. Test auth service
5. Test cookCamApi wrapper
6. Test storage utilities

**Files to Test**:
- `src/services/apiService.ts` → 90% coverage
- `src/services/authService.ts` → 85% coverage
- `src/services/cookCamApi.ts` → 85% coverage

**Success Metric**: Mobile services coverage from 3% → 12%

---

## Agent 4: Integration & E2E Architect

### URGENT - Morning Tasks (4 hours)
1. **FIX TEST INFRASTRUCTURE**
   - Debug and fix Jest configurations
   - Resolve Babel parsing errors
   - Fix mock setup issues
   - **BLOCKER FOR ALL OTHER AGENTS**

2. **Setup CI/CD Pipeline**
   ```bash
   cd /Users/abmccull/Desktop/cookcam1
   mkdir -p .github/workflows
   # Create test-suite.yml workflow
   ```

3. **Configure Test Database**
   - Setup test database scripts
   - Create migration runners
   - Setup seed data

### Afternoon Tasks (4 hours)
4. Create test factories with Faker
5. Write first integration test
6. Setup Codecov integration

**Deliverables**:
- Working test suite (no failures)
- CI/CD pipeline configured
- Test database ready
- One integration test passing

**Success Metric**: All tests passing, CI/CD operational

---

## 📊 Hourly Check-ins

**Every 2 hours**, each agent must report:
1. Tests written/fixed
2. Coverage gained
3. Blockers encountered
4. Next task

**Check-in Times**:
- 10:00 AM - First status
- 12:00 PM - Morning progress
- 2:00 PM - Afternoon start
- 4:00 PM - End of day summary

---

## 🚨 Critical Path

1. **Integration Architect** MUST fix test infrastructure first
2. **Backend Engineer** focuses on auth (security critical)
3. **Mobile UI** tackles most-used components
4. **Mobile Services** ensures API communication works

---

## 📈 Day 1 Success Criteria

- [ ] All test suites running (no parse errors)
- [ ] Backend: 15% coverage achieved
- [ ] Mobile UI: 12% coverage achieved
- [ ] Mobile Services: 12% coverage achieved
- [ ] CI/CD pipeline operational
- [ ] No blocking issues for Day 2

---

## 🔄 Git Workflow

Each agent works on their own branch:
```bash
git checkout -b test/backend      # Backend Engineer
git checkout -b test/mobile-ui    # Mobile UI Specialist
git checkout -b test/mobile-services  # Mobile Services Engineer
git checkout -b test/integration  # Integration Architect
```

Commit frequently with clear messages:
```bash
git commit -m "test(backend): add JWT validation tests"
git commit -m "test(mobile-ui): add RecipeCard snapshot tests"
git commit -m "test(services): add API service error handling"
git commit -m "test(integration): fix Jest configuration"
```

---

## 📞 Communication

- **Blocker Alert**: Immediately notify orchestrator
- **Success Share**: Post wins in DAILY_STANDUP.md
- **Help Needed**: Create entry in BLOCKERS.md

**Remember**: We have 4 weeks to reach 80% coverage. Day 1 sets the pace!

**START NOW!** 🚀