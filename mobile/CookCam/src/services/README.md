# CookCam API Services

## Recipe Generation Migration Guide

### 🚀 NEW: Two-Step Recipe Generation (Recommended)

The new two-step process provides **80% faster initial load times** and better user experience:

```typescript
// Step 1: Generate quick previews (30 seconds)
const previewResponse = await recipeService.generatePreviews({
  detectedIngredients: ['chicken', 'broccoli', 'rice'],
  userPreferences: {
    servingSize: 2,
    cuisinePreferences: ['Italian', 'Asian'],
    dietaryTags: ['gluten-free'],
    selectedAppliances: ['oven', 'stove'],
    timeAvailable: 'medium',
    skillLevel: 'easy',
    mealPrepEnabled: false
  }
});

// Step 2: Generate detailed instructions when user selects "Cook" (45 seconds)
const detailedResponse = await recipeService.generateDetailedRecipe({
  selectedPreview: previewResponse.data.previews[0],
  sessionId: previewResponse.data.sessionId
});
```

### 📜 Legacy: Single-Step Generation (Deprecated)

**⚠️ DEPRECATED**: This approach takes 2.5 minutes and is no longer recommended:

```typescript
// OLD: Single-step generation (slow, deprecated)
const response = await recipeService.generateSuggestions({
  detectedIngredients: ['chicken', 'broccoli', 'rice'],
  dietaryTags: ['gluten-free'],
  cuisinePreferences: ['Italian'],
  timeAvailable: 'medium',
  skillLevel: 'easy',
  servingSize: 2
});
```

### Performance Comparison

| Method | Initial Load | Total Time | User Experience |
|--------|-------------|------------|-----------------|
| **New Two-Step** | 30 seconds | 75 seconds | ✅ See options quickly, details on-demand |
| **Old Single-Step** | 150 seconds | 150 seconds | ❌ Long wait before seeing any options |

### Migration Checklist

- ✅ **RecipeCardsScreen**: Updated to use new two-step process
- ✅ **API Service**: New methods added, old methods marked deprecated  
- ✅ **Backend**: New endpoints `/generate-previews` and `/generate-detailed`
- ✅ **Database**: New tables for session tracking and preview storage

### Future Cleanup

The deprecated methods will be removed in a future version. All new development should use the two-step approach. 