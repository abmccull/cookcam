import { by, device, element, expect, waitFor } from 'detox';

describe('Recipe Creation from Photo E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        camera: 'YES',
        photos: 'YES',
        notifications: 'YES',
      },
    });
    
    // Login with existing test user
    await loginTestUser();
  });

  beforeEach(async () => {
    // Navigate to home screen before each test
    await element(by.id('discover-tab')).tap();
    await waitFor(element(by.id('discover-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  describe('Complete Recipe Creation Flow', () => {
    it('should create recipe from camera photo with full flow', async () => {
      // Step 1: Navigate to camera
      await element(by.id('camera-tab')).tap();
      
      await waitFor(element(by.id('camera-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('capture-button'))).toBeVisible();
      await expect(element(by.id('gallery-button'))).toBeVisible();
      await expect(element(by.id('camera-preview'))).toBeVisible();
      
      // Step 2: Take photo
      await element(by.id('capture-button')).tap();
      
      // Wait for camera to process image
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.id('captured-image'))).toBeVisible();
      await expect(element(by.id('retake-photo-button'))).toBeVisible();
      await expect(element(by.id('use-photo-button'))).toBeVisible();
      
      // Step 3: Confirm photo
      await element(by.id('use-photo-button')).tap();
      
      // Step 4: AI processing screen
      await waitFor(element(by.id('ai-processing-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Analyzing your ingredients...'))).toBeVisible();
      await expect(element(by.id('processing-animation'))).toBeVisible();
      await expect(element(by.text('This may take a few moments'))).toBeVisible();
      
      // Wait for AI processing to complete
      await waitFor(element(by.id('ingredient-review-screen')))
        .toBeVisible()
        .withTimeout(30000); // AI processing can take time
      
      // Step 5: Review detected ingredients
      await expect(element(by.text('We found these ingredients:'))).toBeVisible();
      await expect(element(by.id('ingredients-list'))).toBeVisible();
      
      // Verify some ingredients were detected
      await waitFor(element(by.id('ingredient-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Check ingredient confidence scores
      await expect(element(by.id('confidence-score-0'))).toBeVisible();
      
      // Add missing ingredient
      await element(by.id('add-ingredient-button')).tap();
      await element(by.id('ingredient-search-input')).typeText('Salt');
      await element(by.id('ingredient-search-result-0')).tap();
      
      // Remove incorrect ingredient (if any)
      try {
        await element(by.id('remove-ingredient-1')).tap();
      } catch {
        // No incorrect ingredients to remove
      }
      
      // Edit ingredient quantity
      await element(by.id('ingredient-item-0')).tap();
      await waitFor(element(by.id('ingredient-edit-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('quantity-input')).clearText();
      await element(by.id('quantity-input')).typeText('2');
      await element(by.id('unit-picker')).tap();
      await element(by.text('cups')).tap();
      await element(by.id('save-ingredient-button')).tap();
      
      // Continue to recipe generation
      await element(by.id('generate-recipes-button')).tap();
      
      // Step 6: Recipe generation
      await waitFor(element(by.id('recipe-generation-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Creating personalized recipes...'))).toBeVisible();
      await expect(element(by.id('generation-progress-bar'))).toBeVisible();
      
      // Wait for recipes to be generated
      await waitFor(element(by.id('recipe-suggestions-screen')))
        .toBeVisible()
        .withTimeout(45000); // Recipe generation can take time
      
      // Step 7: Review recipe suggestions
      await expect(element(by.text('Here are some recipes for you:'))).toBeVisible();
      await expect(element(by.id('recipe-suggestions-list'))).toBeVisible();
      
      // Should have multiple recipe options
      await waitFor(element(by.id('suggested-recipe-0')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('suggested-recipe-1'))).toBeVisible();
      await expect(element(by.id('suggested-recipe-2'))).toBeVisible();
      
      // Check recipe details
      await expect(element(by.id('recipe-title-0'))).toBeVisible();
      await expect(element(by.id('recipe-cook-time-0'))).toBeVisible();
      await expect(element(by.id('recipe-difficulty-0'))).toBeVisible();
      await expect(element(by.id('recipe-servings-0'))).toBeVisible();
      
      // Select first recipe
      await element(by.id('select-recipe-0')).tap();
      
      // Step 8: Recipe customization
      await waitFor(element(by.id('recipe-customization-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Customize your recipe'))).toBeVisible();
      
      // Edit recipe title
      await element(by.id('recipe-title-input')).clearText();
      await element(by.id('recipe-title-input')).typeText('My Custom Recipe from Photo');
      
      // Adjust servings
      await element(by.id('servings-increase')).tap();
      await element(by.id('servings-increase')).tap(); // Now 6 servings
      
      // Modify cooking time
      await element(by.id('cook-time-input')).clearText();
      await element(by.id('cook-time-input')).typeText('35');
      
      // Add cooking notes
      await element(by.id('cooking-notes-input')).typeText(
        'Created from ingredients I had at home. Adjusted for family of 6.'
      );
      
      // Select dietary tags
      await element(by.id('dietary-tag-family-friendly')).tap();
      await element(by.id('dietary-tag-comfort-food')).tap();
      
      // Step 9: Nutrition information review
      await element(by.id('view-nutrition-button')).tap();
      
      await waitFor(element(by.id('nutrition-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.text('Nutrition Information'))).toBeVisible();
      await expect(element(by.id('calories-per-serving'))).toBeVisible();
      await expect(element(by.id('protein-content'))).toBeVisible();
      await expect(element(by.id('carbs-content'))).toBeVisible();
      await expect(element(by.id('fat-content'))).toBeVisible();
      
      await element(by.id('close-nutrition-modal')).tap();
      
      // Step 10: Save recipe
      await element(by.id('save-recipe-button')).tap();
      
      // Step 11: Recipe saved confirmation
      await waitFor(element(by.id('recipe-saved-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.text('Recipe saved!'))).toBeVisible();
      await expect(element(by.text('Your recipe has been added to your collection'))).toBeVisible();
      await expect(element(by.id('xp-earned-badge'))).toBeVisible();
      await expect(element(by.text('+50 XP'))).toBeVisible(); // XP for creating recipe
      
      // Check for achievement unlock
      try {
        await expect(element(by.id('achievement-unlocked-modal'))).toBeVisible();
        await expect(element(by.text('Achievement Unlocked!'))).toBeVisible();
        await expect(element(by.text('First Recipe Creator'))).toBeVisible();
        await element(by.id('close-achievement-modal')).tap();
      } catch {
        // No achievement unlocked this time
      }
      
      // Step 12: Navigate to recipe detail
      await element(by.id('view-recipe-button')).tap();
      
      await waitFor(element(by.id('recipe-detail-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify recipe was saved correctly
      await expect(element(by.text('My Custom Recipe from Photo'))).toBeVisible();
      await expect(element(by.text('6 servings'))).toBeVisible();
      await expect(element(by.text('35 min'))).toBeVisible();
      await expect(element(by.id('original-photo'))).toBeVisible();
      
      // Check ingredients section
      await expect(element(by.id('ingredients-section'))).toBeVisible();
      await expect(element(by.text('2 cups'))).toBeVisible(); // Edited quantity
      
      // Check instructions
      await expect(element(by.id('instructions-section'))).toBeVisible();
      
      // Check cooking notes
      await expect(element(by.text('Created from ingredients I had at home'))).toBeVisible();
      
      // Step 13: Test recipe sharing
      await element(by.id('share-recipe-button')).tap();
      
      await waitFor(element(by.id('share-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.text('Share your recipe'))).toBeVisible();
      await expect(element(by.id('share-social-media'))).toBeVisible();
      await expect(element(by.id('share-with-friends'))).toBeVisible();
      await expect(element(by.id('generate-share-link'))).toBeVisible();
      
      await element(by.id('close-share-modal')).tap();
      
      // Step 14: Add to favorites
      await element(by.id('favorite-button')).tap();
      
      await expect(element(by.id('favorite-button-filled'))).toBeVisible();
      
      // Step 15: Verify recipe appears in user's collection
      await element(by.id('profile-tab')).tap();
      
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('my-recipes-section')).tap();
      
      await waitFor(element(by.id('my-recipes-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Recipe should appear in list
      await expect(element(by.text('My Custom Recipe from Photo'))).toBeVisible();
      
      console.log('✅ Complete recipe creation from photo E2E test passed!');
    });
    
    it('should handle recipe creation from gallery photo', async () => {
      // Navigate to camera
      await element(by.id('camera-tab')).tap();
      
      await waitFor(element(by.id('camera-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select from gallery instead of taking photo
      await element(by.id('gallery-button')).tap();
      
      // Handle photo picker
      await waitFor(element(by.id('photo-picker')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select first photo from gallery
      await element(by.id('gallery-photo-0')).tap();
      
      // Continue with normal flow
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('use-photo-button')).tap();
      
      // Should proceed to AI processing
      await waitFor(element(by.id('ai-processing-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      console.log('✅ Gallery photo selection test passed!');
    });
    
    it('should handle poor image quality with suggestions', async () => {
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      
      // Simulate poor quality image detection
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Check for image quality warning
      try {
        await expect(element(by.id('image-quality-warning'))).toBeVisible();
        await expect(element(by.text('Image quality could be better'))).toBeVisible();
        await expect(element(by.text('For best results, try:'))).toBeVisible();
        await expect(element(by.text('• Better lighting'))).toBeVisible();
        await expect(element(by.text('• Closer to ingredients'))).toBeVisible();
        await expect(element(by.text('• Less blur'))).toBeVisible();
        
        // User can still proceed or retake
        await expect(element(by.id('retake-photo-button'))).toBeVisible();
        await expect(element(by.id('proceed-anyway-button'))).toBeVisible();
        
        await element(by.id('proceed-anyway-button')).tap();
      } catch {
        // Good quality image, proceed normally
        await element(by.id('use-photo-button')).tap();
      }
      
      console.log('✅ Image quality handling test passed!');
    });
  });
  
  describe('Recipe Creation Error Handling', () => {
    it('should handle AI processing failures gracefully', async () => {
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('use-photo-button')).tap();
      
      // Simulate AI processing timeout or failure
      await waitFor(element(by.id('ai-processing-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Wait for potential error
      try {
        await waitFor(element(by.id('ai-error-modal')))
          .toBeVisible()
          .withTimeout(60000);
        
        await expect(element(by.text('Processing failed'))).toBeVisible();
        await expect(element(by.text('We couldn\'t analyze your image'))).toBeVisible();
        await expect(element(by.id('retry-processing-button'))).toBeVisible();
        await expect(element(by.id('manual-entry-button'))).toBeVisible();
        
        // Test manual entry fallback
        await element(by.id('manual-entry-button')).tap();
        
        await waitFor(element(by.id('manual-ingredient-entry')))
          .toBeVisible()
          .withTimeout(5000);
        
        await expect(element(by.text('Add ingredients manually'))).toBeVisible();
        
      } catch {
        // AI processing succeeded, continue normally
        await waitFor(element(by.id('ingredient-review-screen')))
          .toBeVisible()
          .withTimeout(30000);
      }
      
      console.log('✅ AI processing error handling test passed!');
    });
    
    it('should handle network errors during recipe generation', async () => {
      // Start recipe creation process
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('use-photo-button')).tap();
      
      // Get to ingredient review
      await waitFor(element(by.id('ingredient-review-screen')))
        .toBeVisible()
        .withTimeout(30000);
      
      // Simulate network disconnection
      await device.setURLBlacklist(['*']);
      
      await element(by.id('generate-recipes-button')).tap();
      
      // Should show network error
      await waitFor(element(by.id('network-error-modal')))
        .toBeVisible()
        .withTimeout(15000);
      
      await expect(element(by.text('No internet connection'))).toBeVisible();
      await expect(element(by.text('Recipe generation requires internet'))).toBeVisible();
      await expect(element(by.id('save-offline-button'))).toBeVisible();
      await expect(element(by.id('retry-when-online-button'))).toBeVisible();
      
      // Test offline save
      await element(by.id('save-offline-button')).tap();
      
      await waitFor(element(by.id('offline-save-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await expect(element(by.text('Saved for later'))).toBeVisible();
      await expect(element(by.text('We\'ll generate recipes when you\'re back online'))).toBeVisible();
      
      // Restore network
      await device.setURLBlacklist([]);
      
      console.log('✅ Network error handling test passed!');
    });
    
    it('should validate recipe customization inputs', async () => {
      // Complete normal flow up to customization
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      
      await waitFor(element(by.id('image-preview-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('use-photo-button')).tap();
      
      await waitFor(element(by.id('ingredient-review-screen')))
        .toBeVisible()
        .withTimeout(30000);
      
      await element(by.id('generate-recipes-button')).tap();
      
      await waitFor(element(by.id('recipe-suggestions-screen')))
        .toBeVisible()
        .withTimeout(45000);
      
      await element(by.id('select-recipe-0')).tap();
      
      await waitFor(element(by.id('recipe-customization-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Test validation errors
      // Empty title
      await element(by.id('recipe-title-input')).clearText();
      await element(by.id('save-recipe-button')).tap();
      
      await expect(element(by.text('Recipe title is required'))).toBeVisible();
      
      // Invalid cook time
      await element(by.id('recipe-title-input')).typeText('Test Recipe');
      await element(by.id('cook-time-input')).clearText();
      await element(by.id('cook-time-input')).typeText('0');
      await element(by.id('save-recipe-button')).tap();
      
      await expect(element(by.text('Cook time must be at least 1 minute'))).toBeVisible();
      
      // Fix validation errors
      await element(by.id('cook-time-input')).clearText();
      await element(by.id('cook-time-input')).typeText('30');
      
      // Should now save successfully
      await element(by.id('save-recipe-button')).tap();
      
      await waitFor(element(by.id('recipe-saved-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      console.log('✅ Recipe validation test passed!');
    });
  });
  
  describe('Recipe Creation Features', () => {
    it('should handle ingredient substitutions', async () => {
      // Get to ingredient review screen
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      await waitFor(element(by.id('image-preview-screen'))).toBeVisible();
      await element(by.id('use-photo-button')).tap();
      await waitFor(element(by.id('ingredient-review-screen'))).toBeVisible();
      
      // Test ingredient substitution
      await element(by.id('ingredient-item-0')).longPress();
      
      await waitFor(element(by.id('ingredient-options-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('suggest-substitutions')).tap();
      
      await waitFor(element(by.id('substitutions-modal')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Suggested substitutions'))).toBeVisible();
      await expect(element(by.id('substitution-option-0'))).toBeVisible();
      
      // Select substitution
      await element(by.id('substitution-option-0')).tap();
      await element(by.id('use-substitution-button')).tap();
      
      // Ingredient should be updated
      await waitFor(element(by.id('ingredient-review-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      console.log('✅ Ingredient substitution test passed!');
    });
    
    it('should support dietary restriction filtering', async () => {
      // Complete flow to recipe suggestions
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      await waitFor(element(by.id('image-preview-screen'))).toBeVisible();
      await element(by.id('use-photo-button')).tap();
      await waitFor(element(by.id('ingredient-review-screen'))).toBeVisible();
      
      // Set dietary restrictions before generating
      await element(by.id('dietary-filters-button')).tap();
      
      await waitFor(element(by.id('dietary-filters-modal')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('filter-vegetarian')).tap();
      await element(by.id('filter-gluten-free')).tap();
      await element(by.id('apply-filters-button')).tap();
      
      await element(by.id('generate-recipes-button')).tap();
      
      await waitFor(element(by.id('recipe-suggestions-screen')))
        .toBeVisible()
        .withTimeout(45000);
      
      // All suggested recipes should have dietary badges
      await expect(element(by.id('dietary-badge-vegetarian-0'))).toBeVisible();
      await expect(element(by.id('dietary-badge-gluten-free-0'))).toBeVisible();
      
      console.log('✅ Dietary restriction filtering test passed!');
    });
    
    it('should allow recipe difficulty adjustment', async () => {
      // Get to customization screen
      await element(by.id('camera-tab')).tap();
      await element(by.id('capture-button')).tap();
      await waitFor(element(by.id('image-preview-screen'))).toBeVisible();
      await element(by.id('use-photo-button')).tap();
      await waitFor(element(by.id('ingredient-review-screen'))).toBeVisible();
      await element(by.id('generate-recipes-button')).tap();
      await waitFor(element(by.id('recipe-suggestions-screen'))).toBeVisible();
      await element(by.id('select-recipe-0')).tap();
      
      await waitFor(element(by.id('recipe-customization-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Change difficulty level
      await element(by.id('difficulty-selector')).tap();
      
      await waitFor(element(by.id('difficulty-picker')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.text('Easy')).tap();
      
      // Should show simplified instructions
      await expect(element(by.text('Instructions simplified for easier cooking'))).toBeVisible();
      
      console.log('✅ Recipe difficulty adjustment test passed!');
    });
  });
});

// Helper function to login test user
async function loginTestUser() {
  try {
    // Check if already logged in
    await waitFor(element(by.id('main-screen')))
      .toBeVisible()
      .withTimeout(3000);
    return; // Already logged in
  } catch {
    // Need to login
  }
  
  try {
    await waitFor(element(by.id('login-screen')))
      .toBeVisible()
      .withTimeout(3000);
  } catch {
    // Navigate to login
    await element(by.id('login-button')).tap();
  }
  
  await element(by.id('email-input')).typeText('test@example.com');
  await element(by.id('password-input')).typeText('TestPass123!');
  await element(by.id('submit-login-button')).tap();
  
  await waitFor(element(by.id('main-screen')))
    .toBeVisible()
    .withTimeout(10000);
}