import { by, device, element, expect } from 'detox';

describe('CookCam E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        camera: 'YES',
        photos: 'YES',
        notifications: 'YES',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch', () => {
    it('should show welcome screen on first launch', async () => {
      // Check if welcome screen is visible
      await expect(element(by.id('welcome-screen'))).toBeVisible();
      await expect(element(by.text('Welcome to CookCam'))).toBeVisible();
    });

    it('should navigate to login screen', async () => {
      // Tap on login button
      await element(by.id('login-button')).tap();
      
      // Verify login screen is shown
      await expect(element(by.id('login-screen'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
    });
  });

  describe('Authentication Flow', () => {
    it('should login with valid credentials', async () => {
      // Navigate to login
      await element(by.id('login-button')).tap();
      
      // Enter credentials
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      
      // Submit login
      await element(by.id('submit-login-button')).tap();
      
      // Wait for and verify main screen
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify user is logged in
      await expect(element(by.id('profile-tab'))).toBeVisible();
    });

    it('should show error for invalid credentials', async () => {
      // Navigate to login
      await element(by.id('login-button')).tap();
      
      // Enter invalid credentials
      await element(by.id('email-input')).typeText('invalid@example.com');
      await element(by.id('password-input')).typeText('WrongPass123');
      
      // Submit login
      await element(by.id('submit-login-button')).tap();
      
      // Verify error message
      await waitFor(element(by.text('Invalid credentials')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should navigate to signup screen', async () => {
      // Navigate to login first
      await element(by.id('login-button')).tap();
      
      // Tap on signup link
      await element(by.id('signup-link')).tap();
      
      // Verify signup screen
      await expect(element(by.id('signup-screen'))).toBeVisible();
      await expect(element(by.id('name-input'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
    });
  });

  describe('Recipe Scanning', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('login-button')).tap();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('submit-login-button')).tap();
      
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to camera screen', async () => {
      // Tap on camera tab
      await element(by.id('camera-tab')).tap();
      
      // Verify camera screen
      await expect(element(by.id('camera-screen'))).toBeVisible();
      await expect(element(by.id('capture-button'))).toBeVisible();
    });

    it('should show gallery option', async () => {
      // Navigate to camera
      await element(by.id('camera-tab')).tap();
      
      // Tap gallery button
      await element(by.id('gallery-button')).tap();
      
      // Verify gallery options
      await expect(element(by.text('Choose from Gallery'))).toBeVisible();
    });
  });

  describe('Recipe Browsing', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('login-button')).tap();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('submit-login-button')).tap();
      
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display recipe list', async () => {
      // Navigate to discover tab
      await element(by.id('discover-tab')).tap();
      
      // Verify recipe list
      await expect(element(by.id('recipe-list'))).toBeVisible();
      
      // Verify at least one recipe card
      await waitFor(element(by.id('recipe-card-0')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should open recipe details', async () => {
      // Navigate to discover
      await element(by.id('discover-tab')).tap();
      
      // Wait for and tap first recipe
      await waitFor(element(by.id('recipe-card-0')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.id('recipe-card-0')).tap();
      
      // Verify recipe detail screen
      await expect(element(by.id('recipe-detail-screen'))).toBeVisible();
      await expect(element(by.id('recipe-title'))).toBeVisible();
      await expect(element(by.id('ingredients-section'))).toBeVisible();
    });

    it('should filter recipes', async () => {
      // Navigate to discover
      await element(by.id('discover-tab')).tap();
      
      // Open filter drawer
      await element(by.id('filter-button')).tap();
      
      // Select a filter
      await element(by.id('filter-vegetarian')).tap();
      
      // Apply filters
      await element(by.id('apply-filters-button')).tap();
      
      // Verify filtered results
      await waitFor(element(by.id('recipe-list')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Profile and Settings', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('login-button')).tap();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('submit-login-button')).tap();
      
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display user profile', async () => {
      // Navigate to profile
      await element(by.id('profile-tab')).tap();
      
      // Verify profile screen
      await expect(element(by.id('profile-screen'))).toBeVisible();
      await expect(element(by.id('user-name'))).toBeVisible();
      await expect(element(by.id('user-level'))).toBeVisible();
      await expect(element(by.id('xp-progress'))).toBeVisible();
    });

    it('should navigate to settings', async () => {
      // Navigate to profile
      await element(by.id('profile-tab')).tap();
      
      // Tap settings button
      await element(by.id('settings-button')).tap();
      
      // Verify settings screen
      await expect(element(by.id('settings-screen'))).toBeVisible();
      await expect(element(by.id('notification-settings'))).toBeVisible();
      await expect(element(by.id('privacy-settings'))).toBeVisible();
    });

    it('should logout successfully', async () => {
      // Navigate to profile
      await element(by.id('profile-tab')).tap();
      
      // Scroll to logout button
      await element(by.id('profile-screen')).scrollTo('bottom');
      
      // Tap logout
      await element(by.id('logout-button')).tap();
      
      // Confirm logout
      await element(by.text('Logout')).tap();
      
      // Verify back at welcome screen
      await waitFor(element(by.id('welcome-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Gamification Features', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('login-button')).tap();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('TestPass123!');
      await element(by.id('submit-login-button')).tap();
      
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display XP progress bar', async () => {
      // XP bar should be visible in main screen
      await expect(element(by.id('xp-progress-bar'))).toBeVisible();
    });

    it('should show leaderboard', async () => {
      // Navigate to leaderboard
      await element(by.id('leaderboard-button')).tap();
      
      // Verify leaderboard screen
      await expect(element(by.id('leaderboard-screen'))).toBeVisible();
      await expect(element(by.id('leaderboard-list'))).toBeVisible();
    });

    it('should display achievements', async () => {
      // Navigate to profile
      await element(by.id('profile-tab')).tap();
      
      // Tap achievements
      await element(by.id('achievements-button')).tap();
      
      // Verify achievements screen
      await expect(element(by.id('achievements-screen'))).toBeVisible();
      await expect(element(by.id('achievements-list'))).toBeVisible();
    });
  });
});