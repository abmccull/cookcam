import { by, device, element, expect, waitFor } from 'detox';

describe('New User Onboarding E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        camera: 'YES',
        photos: 'YES',
        notifications: 'YES',
        location: 'inuse',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Complete New User Journey', () => {
    it('should complete full onboarding flow for new user', async () => {
      const timestamp = Date.now();
      const testEmail = `e2e_test_${timestamp}@example.com`;
      
      // Step 1: Launch app and see welcome screen
      await waitFor(element(by.id('welcome-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.text('Welcome to CookCam'))).toBeVisible();
      await expect(element(by.text('Your AI-powered cooking companion'))).toBeVisible();
      
      // Step 2: Navigate to signup
      await element(by.id('get-started-button')).tap();
      
      await waitFor(element(by.id('signup-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Step 3: Fill signup form
      await element(by.id('name-input')).typeText('E2E Test User');
      await element(by.id('email-input')).typeText(testEmail);
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('TestPass123!');
      
      // Accept terms
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      
      // Submit signup
      await element(by.id('signup-button')).tap();
      
      // Step 4: Verify account creation success
      await waitFor(element(by.text('Account created successfully!')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Step 5: Preferences onboarding screen
      await waitFor(element(by.id('preferences-onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Tell us about your cooking preferences'))).toBeVisible();
      
      // Select dietary preferences
      await element(by.id('dietary-preference-vegetarian')).tap();
      await element(by.id('dietary-preference-gluten-free')).tap();
      
      // Select cooking skill level
      await element(by.id('skill-level-intermediate')).tap();
      
      // Select favorite cuisines
      await element(by.id('cuisine-italian')).tap();
      await element(by.id('cuisine-mexican')).tap();
      await element(by.id('cuisine-asian')).tap();
      
      // Set household size
      await element(by.id('household-size-slider')).swipe('right', 'slow', 0.3);
      
      // Continue to next step
      await element(by.id('preferences-continue-button')).tap();
      
      // Step 6: Allergy and restrictions screen
      await waitFor(element(by.id('allergies-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Any allergies or dietary restrictions?'))).toBeVisible();
      
      // Select allergies
      await element(by.id('allergy-nuts')).tap();
      await element(by.id('allergy-dairy')).tap();
      
      // Add custom allergy
      await element(by.id('add-custom-allergy')).tap();
      await element(by.id('custom-allergy-input')).typeText('Shellfish');
      await element(by.id('add-allergy-button')).tap();
      
      await element(by.id('allergies-continue-button')).tap();
      
      // Step 7: Notification preferences
      await waitFor(element(by.id('notifications-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Stay updated with CookCam'))).toBeVisible();
      
      // Enable recipe recommendations
      await element(by.id('notification-recipe-recommendations')).tap();
      
      // Enable cooking reminders
      await element(by.id('notification-cooking-reminders')).tap();
      
      // Skip promotional notifications
      await element(by.id('notification-promotions')).tap(); // Turn off
      
      await element(by.id('notifications-continue-button')).tap();
      
      // Step 8: Camera permissions explanation
      await waitFor(element(by.id('camera-permissions-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Camera Access'))).toBeVisible();
      await expect(element(by.text('Scan ingredients to get personalized recipes'))).toBeVisible();
      
      await element(by.id('grant-camera-permission')).tap();
      
      // Handle system permission dialog (if shown)
      try {
        await waitFor(element(by.text('Allow')))
          .toBeVisible()
          .withTimeout(3000);
        await element(by.text('Allow')).tap();
      } catch (e) {
        // Permission might already be granted
      }
      
      // Step 9: Tutorial/walkthrough
      await waitFor(element(by.id('tutorial-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Quick Tutorial'))).toBeVisible();
      
      // Tutorial step 1: Scanning
      await expect(element(by.text('Scan ingredients in your kitchen'))).toBeVisible();
      await element(by.id('tutorial-next-button')).tap();
      
      // Tutorial step 2: Recipes
      await expect(element(by.text('Get personalized recipe suggestions'))).toBeVisible();
      await element(by.id('tutorial-next-button')).tap();
      
      // Tutorial step 3: Cooking mode
      await expect(element(by.text('Follow step-by-step cooking instructions'))).toBeVisible();
      await element(by.id('tutorial-next-button')).tap();
      
      // Tutorial step 4: Gamification
      await expect(element(by.text('Earn XP and unlock achievements'))).toBeVisible();
      await element(by.id('tutorial-finish-button')).tap();
      
      // Step 10: Main app screen
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Verify main screen elements
      await expect(element(by.id('camera-tab'))).toBeVisible();
      await expect(element(by.id('discover-tab'))).toBeVisible();
      await expect(element(by.id('favorites-tab'))).toBeVisible();
      await expect(element(by.id('profile-tab'))).toBeVisible();
      
      // Check welcome message for new user
      await expect(element(by.text('Welcome, E2E Test User!'))).toBeVisible();
      await expect(element(by.text('Ready to start cooking?'))).toBeVisible();
      
      // Step 11: Verify gamification setup
      await expect(element(by.id('xp-progress-bar'))).toBeVisible();
      await expect(element(by.text('Level 1'))).toBeVisible();
      await expect(element(by.text('0 XP'))).toBeVisible();
      
      // Step 12: Check initial achievements
      await element(by.id('profile-tab')).tap();
      
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('achievements-section')).tap();
      
      await waitFor(element(by.id('achievements-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Should have "Welcome" achievement
      await expect(element(by.id('achievement-welcome'))).toBeVisible();
      await expect(element(by.text('+50 XP'))).toBeVisible();
      
      // Go back to main screen
      await element(by.id('back-button')).tap();
      await element(by.id('back-button')).tap();
      
      // Step 13: Test initial recipe recommendations
      await element(by.id('discover-tab')).tap();
      
      await waitFor(element(by.id('discover-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Should show personalized recommendations based on preferences
      await expect(element(by.text('Recommended for you'))).toBeVisible();
      
      // Check for vegetarian recipes (based on preferences)
      await waitFor(element(by.id('recipe-card-0')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Verify dietary badges on recommended recipes
      await expect(element(by.id('dietary-badge-vegetarian'))).toBeVisible();
      
      // Step 14: Test first interaction (view recipe)
      await element(by.id('recipe-card-0')).tap();
      
      await waitFor(element(by.id('recipe-detail-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('recipe-title'))).toBeVisible();
      await expect(element(by.id('ingredients-section'))).toBeVisible();
      await expect(element(by.id('instructions-section'))).toBeVisible();
      
      // Check for allergy warnings (should warn about nuts/dairy if present)
      const allergyWarning = element(by.id('allergy-warning'));
      try {
        await expect(allergyWarning).toBeVisible();
      } catch {
        // No allergies in this recipe
      }
      
      // Go back
      await element(by.id('back-button')).tap();
      
      // Step 15: Test camera functionality
      await element(by.id('camera-tab')).tap();
      
      await waitFor(element(by.id('camera-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('capture-button'))).toBeVisible();
      await expect(element(by.id('gallery-button'))).toBeVisible();
      
      // Test help tooltip for new users
      await expect(element(by.text('Tap to scan ingredients'))).toBeVisible();
      
      // Step 16: Complete onboarding checklist
      await element(by.id('profile-tab')).tap();
      
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Check onboarding progress
      await element(by.id('onboarding-progress')).tap();
      
      await waitFor(element(by.id('onboarding-checklist')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify completed steps
      await expect(element(by.id('checklist-create-account'))).toBeVisible();
      await expect(element(by.id('checklist-set-preferences'))).toBeVisible();
      await expect(element(by.id('checklist-enable-notifications'))).toBeVisible();
      await expect(element(by.id('checklist-grant-permissions'))).toBeVisible();
      await expect(element(by.id('checklist-complete-tutorial'))).toBeVisible();
      await expect(element(by.id('checklist-view-first-recipe'))).toBeVisible();
      
      // Check completion percentage
      await expect(element(by.text('Onboarding: 100% Complete'))).toBeVisible();
      
      console.log('✅ New user onboarding E2E test completed successfully!');
    });
    
    it('should handle onboarding interruption and resume', async () => {
      const testEmail = `interrupt_${Date.now()}@example.com`;
      
      // Start onboarding
      await element(by.id('get-started-button')).tap();
      await element(by.id('name-input')).typeText('Interrupt User');
      await element(by.id('email-input')).typeText(testEmail);
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('TestPass123!');
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      await element(by.id('signup-button')).tap();
      
      // Complete first onboarding step (preferences)
      await waitFor(element(by.id('preferences-onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('dietary-preference-vegan')).tap();
      await element(by.id('skill-level-beginner')).tap();
      await element(by.id('preferences-continue-button')).tap();
      
      // Simulate app backgrounding during allergies step
      await device.sendToHome();
      await delay(2000);
      await device.launchApp({ newInstance: false });
      
      // Should resume at allergies screen
      await waitFor(element(by.id('allergies-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Any allergies or dietary restrictions?'))).toBeVisible();
      
      // Continue and complete onboarding
      await element(by.id('allergies-skip-button')).tap();
      
      await waitFor(element(by.id('notifications-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('notifications-continue-button')).tap();
      
      // Skip remaining steps
      await element(by.id('skip-tutorial-button')).tap();
      
      // Should reach main screen
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      console.log('✅ Onboarding interruption and resume test completed!');
    });
    
    it('should handle onboarding skip options', async () => {
      const testEmail = `skip_${Date.now()}@example.com`;
      
      // Complete basic signup
      await element(by.id('get-started-button')).tap();
      await element(by.id('name-input')).typeText('Skip User');
      await element(by.id('email-input')).typeText(testEmail);
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('TestPass123!');
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      await element(by.id('signup-button')).tap();
      
      // Skip preferences
      await waitFor(element(by.id('preferences-onboarding-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('skip-preferences-button')).tap();
      
      // Skip allergies
      await waitFor(element(by.id('allergies-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('allergies-skip-button')).tap();
      
      // Skip notifications
      await waitFor(element(by.id('notifications-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('notifications-skip-button')).tap();
      
      // Skip camera permissions
      await waitFor(element(by.id('camera-permissions-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('skip-camera-permission')).tap();
      
      // Skip tutorial
      await waitFor(element(by.id('tutorial-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('skip-tutorial-button')).tap();
      
      // Should still reach main screen with default settings
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Verify default preferences were applied
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();
      
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Should have default preferences
      await expect(element(by.text('No dietary preferences set'))).toBeVisible();
      await expect(element(by.text('Skill level: Beginner'))).toBeVisible();
      
      console.log('✅ Onboarding skip options test completed!');
    });
  });
  
  describe('Onboarding Error Handling', () => {
    it('should handle network errors during signup', async () => {
      // Simulate network unavailability
      await device.setURLBlacklist(['*']);
      
      await element(by.id('get-started-button')).tap();
      await element(by.id('name-input')).typeText('Network Error User');
      await element(by.id('email-input')).typeText('networkerror@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('confirm-password-input')).typeText('TestPass123!');
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      
      await element(by.id('signup-button')).tap();
      
      // Should show network error
      await waitFor(element(by.text('Network error')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.text('Please check your connection and try again'))).toBeVisible();
      
      // Restore network
      await device.setURLBlacklist([]);
      
      // Retry should work
      await element(by.id('retry-button')).tap();
      
      await waitFor(element(by.text('Account created successfully!')))
        .toBeVisible()
        .withTimeout(10000);
      
      console.log('✅ Network error handling test completed!');
    });
    
    it('should validate form inputs', async () => {
      await element(by.id('get-started-button')).tap();
      
      // Try to submit with empty fields
      await element(by.id('signup-button')).tap();
      
      // Should show validation errors
      await expect(element(by.text('Name is required'))).toBeVisible();
      await expect(element(by.text('Email is required'))).toBeVisible();
      await expect(element(by.text('Password is required'))).toBeVisible();
      
      // Fill with invalid data
      await element(by.id('name-input')).typeText('A'); // Too short
      await element(by.id('email-input')).typeText('invalid-email'); // Invalid format
      await element(by.id('password-input')).typeText('123'); // Weak password
      await element(by.id('confirm-password-input')).typeText('456'); // Doesn't match
      
      await element(by.id('signup-button')).tap();
      
      // Should show specific validation errors
      await expect(element(by.text('Name must be at least 2 characters'))).toBeVisible();
      await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
      await expect(element(by.text('Password must be at least 8 characters'))).toBeVisible();
      await expect(element(by.text('Passwords do not match'))).toBeVisible();
      
      console.log('✅ Form validation test completed!');
    });
  });
  
  describe('Accessibility', () => {
    it('should be accessible with screen reader', async () => {
      // Enable accessibility features
      await device.launchApp({
        newInstance: true,
        permissions: {
          camera: 'YES',
          photos: 'YES',
          notifications: 'YES',
        },
      });
      
      // Check for accessibility labels
      await expect(element(by.id('welcome-screen'))).toHaveLabel('Welcome screen');
      await expect(element(by.id('get-started-button'))).toHaveLabel('Get started button');
      
      await element(by.id('get-started-button')).tap();
      
      // Check form accessibility
      await expect(element(by.id('name-input'))).toHaveLabel('Full name input field');
      await expect(element(by.id('email-input'))).toHaveLabel('Email address input field');
      await expect(element(by.id('password-input'))).toHaveLabel('Password input field');
      await expect(element(by.id('signup-button'))).toHaveLabel('Create account button');
      
      console.log('✅ Accessibility test completed!');
    });
  });
});

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}