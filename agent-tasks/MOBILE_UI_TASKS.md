# Mobile UI Test Specialist - Day 1 Priority Tasks

## 🎯 MISSION: Core Component Testing
**Current Coverage**: 3.5% → **Day 1 Target**: 15%

## ⏰ SCHEDULE: Day 1 (8 hours)

### 🌅 Morning Session (9 AM - 1 PM)

#### Task 1: Testing Setup (1 hour)
```bash
cd mobile/CookCam
npm install --save-dev @testing-library/react-native @testing-library/jest-native
# Verify jest.config.js is properly configured
# Set up test utilities and mocks
```

#### Task 2: Create Component Test Utilities (1 hour)
**Create**: `mobile/CookCam/src/__tests__/test-utils.tsx`
```typescript
import {render} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';

export const renderWithNavigation = (component) => {
  return render(
    <NavigationContainer>{component}</NavigationContainer>
  );
};

// Mock providers and contexts
export const AllTheProviders = ({children}) => {...};
```

#### Task 3: RecipeCard Component Tests (2 hours)
**File to test**: `mobile/CookCam/src/components/RecipeCard.tsx`
**Update test**: `mobile/CookCam/src/__tests__/components/RecipeCard.test.tsx`

✅ **Required Test Cases**:
1. Renders with minimal props
2. Renders with full recipe data
3. Displays recipe title correctly
4. Shows cooking time and difficulty
5. Handles missing image gracefully
6. onPress callback fires correctly
7. Favorite button toggles state
8. Nutrition badges display conditionally
9. Loading state renders skeleton
10. Error state shows fallback

### 🌇 Afternoon Session (2 PM - 6 PM)

#### Task 4: FilterDrawer Component Tests (2 hours)
**File to test**: `mobile/CookCam/src/components/FilterDrawer.tsx`
**Update test**: `mobile/CookCam/src/__tests__/components/FilterDrawer.test.tsx`

✅ **Required Test Cases**:
1. Initial state renders correctly
2. Category filters toggle on/off
3. Dietary restriction filters work
4. Difficulty selection updates
5. Time range slider updates
6. Clear all filters resets state
7. Apply button triggers callback
8. Filter count badge updates
9. Accessibility labels present
10. Animations complete properly

#### Task 5: NutritionBadge Component Tests (2 hours)
**File to test**: `mobile/CookCam/src/components/NutritionBadge.tsx`
**Update test**: `mobile/CookCam/src/__tests__/components/NutritionBadge.test.tsx`

✅ **Required Test Cases**:
1. Renders with nutrition data
2. Handles missing nutrition data
3. Color coding by value ranges
4. Icon displays correctly
5. Text formatting (calories, protein, etc.)
6. Accessibility text present
7. Conditional visibility logic
8. Snapshot tests for variations

## 📊 Coverage Requirements

| Component | Current | Target | Test Cases |
|-----------|---------|--------|------------|
| RecipeCard.tsx | ~3% | 85% | 10+ |
| FilterDrawer.tsx | 0% | 80% | 10+ |
| NutritionBadge.tsx | 0% | 90% | 8+ |
| OptimizedImage.tsx | 0% | 75% | 6+ |

## 🛠 Technical Setup

### Mock Requirements
```typescript
// Navigation mocks
jest.mock('@react-navigation/native');

// Image mocks
jest.mock('react-native-fast-image');

// Async Storage
jest.mock('@react-native-async-storage/async-storage');

// Animations
jest.mock('react-native-reanimated');
```

### Testing Patterns
```typescript
describe('RecipeCard', () => {
  it('should render recipe title', () => {
    const {getByText} = render(
      <RecipeCard recipe={mockRecipe} />
    );
    expect(getByText('Chicken Pasta')).toBeTruthy();
  });

  it('should handle press events', () => {
    const onPress = jest.fn();
    const {getByTestId} = render(
      <RecipeCard recipe={mockRecipe} onPress={onPress} />
    );
    fireEvent.press(getByTestId('recipe-card'));
    expect(onPress).toHaveBeenCalledWith(mockRecipe);
  });
});
```

## 📝 Deliverables Checklist

- [ ] Test utilities and helpers created
- [ ] RecipeCard: 10+ tests, 85% coverage
- [ ] FilterDrawer: 10+ tests, 80% coverage
- [ ] NutritionBadge: 8+ tests, 90% coverage
- [ ] All tests passing (no skipped)
- [ ] Snapshot tests created
- [ ] Accessibility tests included
- [ ] Coverage report showing 15%+ overall

## 🚀 Run Commands
```bash
# Run component tests
npm test components

# Update snapshots
npm test -- -u

# Coverage report
npm run coverage

# Watch mode
npm test -- --watch
```

## 🚨 Testing Best Practices

1. **User-centric**: Test what users see/do, not implementation
2. **Accessibility**: Use getByRole, getByLabelText
3. **Async**: Use waitFor for async operations
4. **Isolation**: Each test should be independent
5. **Snapshots**: Only for stable UI components

## 📍 Progress Reporting

Report progress every 2 hours:
- 11 AM: Setup and utilities complete?
- 1 PM: RecipeCard tests complete?
- 3 PM: FilterDrawer tests progress?
- 5 PM: NutritionBadge tests progress?
- 6 PM: Final coverage report

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Navigation errors | Wrap in NavigationContainer |
| Async warnings | Use waitFor() or findBy queries |
| Animation errors | Mock react-native-reanimated |
| Image loading | Mock FastImage component |

---
*Assigned: Day 1, 9 AM*
*Due: Day 1, 6 PM*
*Orchestrator: Checking every 2 hours*
