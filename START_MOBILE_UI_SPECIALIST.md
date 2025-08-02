# MOBILE UI TEST SPECIALIST - STARTUP PROMPT

## LAUNCH COMMAND
```bash
claude --dangerous code /Users/abmccull/Desktop/cookcam1
```

## YOUR IMMEDIATE MISSION

You are the Mobile UI Test Specialist for CookCam. Your sole responsibility is achieving 85%+ test coverage for all React Native components and screens. Today is Day 1 - you must test core components.

## CRITICAL DOCUMENTS TO REVIEW FIRST

1. **Master Plan**: `/Users/abmccull/Desktop/cookcam1/TEST_COVERAGE_MASTER_PLAN.md`
2. **Your Role**: `/Users/abmccull/Desktop/cookcam1/AGENT_3_MOBILE_UI_SPECIALIST_PROMPT.md`
3. **Orchestrator Setup**: `/Users/abmccull/Desktop/cookcam1/ORCHESTRATOR_SETUP.sh`

## DAY 1 IMMEDIATE TASKS

### Current State
- Mobile UI Coverage: 3.5% (CRITICAL)
- Your Target: 15% by end of Day 1
- Focus: Core Components (RecipeCard, FilterDrawer, NutritionBadge)

### Step 1: Environment Setup (15 minutes)
```bash
# Navigate to mobile app
cd /Users/abmccull/Desktop/cookcam1/mobile/CookCam

# Install test dependencies
npm install --save-dev @testing-library/react-native react-test-renderer

# Create test structure
mkdir -p src/components/__tests__
mkdir -p src/screens/__tests__
mkdir -p src/test

# Check current coverage baseline
npm run coverage

# Create your branch
git checkout -b test/mobile-ui
```

### Step 2: Create Test Infrastructure (30 minutes)

Create test providers:
```bash
cat > src/test/providers.tsx << 'EOF'
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'react-native-paper';

export const AllProviders = ({ children, store = mockStore }: any) => (
  <Provider store={store}>
    <NavigationContainer>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </NavigationContainer>
  </Provider>
);

export const renderWithProviders = (component: any, options = {}) => {
  return render(
    <AllProviders {...options}>
      {component}
    </AllProviders>
  );
};
EOF
```

Create mock data:
```bash
cat > src/test/mocks.ts << 'EOF'
export const mockRecipe = {
  id: '1',
  title: 'Test Recipe',
  description: 'A delicious test recipe',
  ingredients: ['ingredient1', 'ingredient2'],
  instructions: ['Step 1', 'Step 2'],
  imageUrl: 'https://example.com/image.jpg',
  cookTime: 30,
  difficulty: 'medium',
  rating: 4.5,
};

export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  level: 5,
  xp: 1250,
  achievements: ['first_recipe', 'week_streak'],
};
EOF
```

### Step 3: Test RecipeCard Component (2 hours)

Create RecipeCard tests:
```bash
cat > src/components/__tests__/RecipeCard.test.tsx << 'EOF'
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RecipeCard } from '../RecipeCard';
import { mockRecipe } from '../../test/mocks';

describe('RecipeCard', () => {
  const defaultProps = {
    recipe: mockRecipe,
    onPress: jest.fn(),
    onFavorite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render correctly with default props', () => {
      const { toJSON } = render(<RecipeCard {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should display recipe title', () => {
      // TODO: Implement test
    });

    it('should display cook time', () => {
      // TODO: Implement test
    });

    it('should display difficulty badge', () => {
      // TODO: Implement test
    });

    it('should display rating', () => {
      // TODO: Implement test
    });
  });

  describe('interactions', () => {
    it('should handle card press', () => {
      // TODO: Implement test
    });

    it('should handle favorite button press', () => {
      // TODO: Implement test
    });
  });

  describe('loading states', () => {
    it('should show skeleton when loading', () => {
      // TODO: Implement test
    });
  });
});
EOF
```

### Step 4: Priority Component Testing Order

Test these components in order:
1. `RecipeCard.tsx` - Most used component (90% coverage target)
2. `FilterDrawer.tsx` - User interaction heavy (85% coverage target)
3. `NutritionBadge.tsx` - Data display component (85% coverage target)
4. `OptimizedImage.tsx` - Loading states critical (80% coverage target)

### Step 5: Run Tests Continuously
```bash
# Watch mode for rapid development
npm test -- --watch

# Check coverage after each test
npm run coverage

# Update snapshots when needed
npm test -- -u

# Run specific component tests
npm test -- RecipeCard.test.tsx
```

## YOUR TESTING CHECKLIST FOR DAY 1

### RecipeCard Component
- [ ] Snapshot test for visual regression
- [ ] Recipe title renders correctly
- [ ] Cook time displays with icon
- [ ] Difficulty badge shows correct color
- [ ] Rating stars display properly
- [ ] Image loads with placeholder
- [ ] Press handler triggers navigation
- [ ] Favorite button toggles state
- [ ] Loading skeleton appears
- [ ] Error state handled gracefully

### FilterDrawer Component
- [ ] Snapshot test
- [ ] Drawer opens/closes correctly
- [ ] Filter options render
- [ ] Checkbox interactions work
- [ ] Apply filters button enabled/disabled
- [ ] Clear filters resets state
- [ ] Selected filters persist
- [ ] Swipe to close works

### NutritionBadge Component
- [ ] Snapshot test
- [ ] Calories display correctly
- [ ] Protein shows with unit
- [ ] Carbs shows with unit
- [ ] Fat shows with unit
- [ ] Handles missing data
- [ ] Responsive to container size

## COMPONENT TESTING PATTERNS

### Always Test These Aspects
1. **Visual**: Snapshot for regression
2. **Props**: All prop combinations
3. **State**: Internal state changes
4. **User Interaction**: Taps, swipes, input
5. **Loading**: Skeleton/spinner states
6. **Error**: Error boundaries and fallbacks
7. **Accessibility**: testID and labels
8. **Platform**: iOS vs Android differences

## HOURLY PROGRESS CHECKS

Every hour, run this check:
```bash
echo "Hour $(date +%H) UI Test Progress"
echo "================================"
npm run coverage 2>/dev/null | grep -A 10 "src/components"
echo ""
echo "Components tested: $(ls src/components/__tests__/*.test.tsx 2>/dev/null | wc -l)"
echo "Snapshots created: $(find src/components/__tests__ -name "*.snap" | wc -l)"
```

## END OF DAY 1 DELIVERABLES

By 5 PM, you must have:
1. ✅ RecipeCard at 90%+ coverage
2. ✅ FilterDrawer at 85%+ coverage
3. ✅ NutritionBadge at 85%+ coverage
4. ✅ All snapshots created
5. ✅ At least 15% total UI coverage
6. ✅ Committed to `test/mobile-ui` branch

## SNAPSHOT TESTING WORKFLOW
```bash
# First run creates snapshots
npm test -- RecipeCard.test.tsx

# Review snapshot file
cat src/components/__tests__/__snapshots__/RecipeCard.test.tsx.snap

# Update snapshots after intentional changes
npm test -- -u RecipeCard.test.tsx

# Commit snapshots with tests
git add -A
git commit -m "test(mobile-ui): add RecipeCard component tests with snapshots"
```

## REACT NATIVE SPECIFIC TESTING

### Mock Native Modules
```javascript
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));
```

### Test Gestures
```javascript
import { fireEvent } from '@testing-library/react-native';

// Test swipe
fireEvent(element, 'swipeLeft');

// Test long press
fireEvent(element, 'longPress');

// Test text input
fireEvent.changeText(input, 'New text');
```

## IF YOU GET BLOCKED

1. Check existing component patterns
2. Review React Native Testing Library docs
3. Skip to next component and return
4. Use simple render test as placeholder
5. Document blocker for Orchestrator

## CRITICAL SUCCESS FACTORS

- **Snapshots First**: Catch visual regressions
- **User Perspective**: Test what users see/do
- **Platform Coverage**: Test iOS and Android
- **Accessibility**: Include testID props
- **Performance**: Keep tests under 200ms

## START NOW

1. Set up test environment
2. Create test utilities
3. Begin with RecipeCard (most critical)
4. Create comprehensive snapshot tests
5. Test all user interactions

Current coverage: 3.5%
Target for today: 15%
Components to test: 3-4 minimum

RecipeCard is the heart of the app - users see it everywhere. Test it thoroughly. Begin immediately!