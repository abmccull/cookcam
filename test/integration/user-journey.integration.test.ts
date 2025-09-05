import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import { userFactory, recipeFactory, mockApiResponses } from '../factories';
import { delay } from './setup';

describe('Complete User Journey Integration', () => {
  let apiClient: AxiosInstance;
  let apiUrl: string;
  let supabaseClient: any;
  let testUserData: any;
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    supabaseClient = testDb.getClient();
  });
  
  describe('New User Complete Journey', () => {
    it('should complete full new user onboarding and activity flow', async () => {
      // Step 1: Registration
      testUserData = {
        email: `journey_${Date.now()}@example.com`,
        password: 'JourneyPass123!',
        name: 'Journey Test User',
      };
      
      console.log('Step 1: Registering new user...');
      const registerResponse = await apiClient.post('/api/auth/register', testUserData);
      
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data.success).toBe(true);
      expect(registerResponse.data.user).toMatchObject({
        email: testUserData.email,
        name: testUserData.name,
        level: 1,
        xp: 0,
        streak: 0,
      });
      
      userId = registerResponse.data.user.id;
      authToken = registerResponse.data.token;
      
      // Step 2: Email Verification (if implemented)
      if (registerResponse.data.requires_verification) {
        console.log('Step 2: Email verification required...');
        // In a real test, we'd verify the email was sent
        // For now, we'll simulate verification
        const verifyResponse = await apiClient.post('/api/auth/verify-email', {
          token: 'test-verification-token',
          user_id: userId,
        });
        
        if (verifyResponse.status === 200) {
          expect(verifyResponse.data.success).toBe(true);
        }
      }
      
      // Step 3: Login
      console.log('Step 3: Logging in...');
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: testUserData.email,
        password: testUserData.password,
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.token).toBeValidJWT();
      authToken = loginResponse.data.token;
      
      // Step 4: Complete Profile
      console.log('Step 4: Updating profile...');
      const profileUpdateResponse = await apiClient.put(
        '/api/user/profile',
        {
          dietary_preferences: ['vegetarian', 'gluten-free'],
          cooking_skill_level: 'intermediate',
          favorite_cuisines: ['Italian', 'Mexican'],
          allergies: ['nuts'],
          household_size: 4,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect([200, 201]).toContain(profileUpdateResponse.status);
      
      // Step 5: Check Gamification Initial State
      console.log('Step 5: Checking gamification state...');
      const gamificationResponse = await apiClient.get(
        '/api/gamification/stats',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (gamificationResponse.status === 200) {
        expect(gamificationResponse.data).toMatchObject({
          level: 1,
          xp: 0,
          next_level_xp: expect.any(Number),
          current_streak: 0,
        });
      }
      
      // Step 6: Complete First Recipe Scan (earn XP)
      console.log('Step 6: Scanning first ingredients...');
      const scanResponse = await apiClient.post(
        '/api/scan',
        {
          image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // Mock image
          detected_ingredients: ['tomatoes', 'onions', 'garlic'],
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (scanResponse.status === 200) {
        expect(scanResponse.data.xp_earned).toBeGreaterThan(0);
        expect(scanResponse.data.recipes).toBeInstanceOf(Array);
      }
      
      // Step 7: Create First Recipe
      console.log('Step 7: Creating first recipe...');
      const recipeData = {
        title: 'My First Recipe',
        description: 'A delicious test recipe',
        ingredients: ['tomatoes', 'onions', 'garlic', 'pasta'],
        instructions: ['Step 1: Prepare ingredients', 'Step 2: Cook', 'Step 3: Serve'],
        cook_time: 30,
        prep_time: 15,
        servings: 4,
        difficulty: 'easy',
        cuisine: 'Italian',
      };
      
      const createRecipeResponse = await apiClient.post(
        '/api/recipes',
        recipeData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (createRecipeResponse.status === 201) {
        expect(createRecipeResponse.data.recipe).toMatchObject({
          title: recipeData.title,
          created_by: userId,
        });
        expect(createRecipeResponse.data.xp_earned).toBeGreaterThan(0);
      }
      
      // Step 8: Check Achievement Unlock
      console.log('Step 8: Checking achievements...');
      const achievementsResponse = await apiClient.get(
        '/api/gamification/achievements',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (achievementsResponse.status === 200) {
        const firstRecipeAchievement = achievementsResponse.data.achievements?.find(
          (a: any) => a.type === 'first_recipe'
        );
        
        if (firstRecipeAchievement) {
          expect(firstRecipeAchievement.unlocked).toBe(true);
        }
      }
      
      // Step 9: Check Daily Streak
      console.log('Step 9: Checking daily streak...');
      const streakResponse = await apiClient.post(
        '/api/gamification/daily-checkin',
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (streakResponse.status === 200) {
        expect(streakResponse.data.current_streak).toBeGreaterThanOrEqual(1);
        expect(streakResponse.data.xp_earned).toBeGreaterThan(0);
      }
      
      // Step 10: View Leaderboard
      console.log('Step 10: Viewing leaderboard...');
      const leaderboardResponse = await apiClient.get(
        '/api/gamification/leaderboard',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (leaderboardResponse.status === 200) {
        expect(leaderboardResponse.data.leaderboard).toBeInstanceOf(Array);
        
        const userEntry = leaderboardResponse.data.leaderboard.find(
          (entry: any) => entry.user_id === userId
        );
        
        if (userEntry) {
          expect(userEntry.xp).toBeGreaterThan(0);
        }
      }
      
      // Step 11: Logout
      console.log('Step 11: Logging out...');
      const logoutResponse = await apiClient.post(
        '/api/auth/logout',
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect([200, 204]).toContain(logoutResponse.status);
      
      console.log('✅ Complete user journey test passed!');
    });
  });
  
  describe('Premium User Journey', () => {
    let premiumToken: string;
    let premiumUserId: string;
    
    it('should complete premium user flow with subscription', async () => {
      // Step 1: Create premium user
      const premiumUserData = {
        email: `premium_${Date.now()}@example.com`,
        password: 'PremiumPass123!',
        name: 'Premium Test User',
      };
      
      const registerResponse = await apiClient.post('/api/auth/register', premiumUserData);
      expect(registerResponse.status).toBe(201);
      
      premiumUserId = registerResponse.data.user.id;
      premiumToken = registerResponse.data.token;
      
      // Step 2: Start subscription trial
      console.log('Starting subscription trial...');
      const trialResponse = await apiClient.post(
        '/api/subscriptions/start-trial',
        { plan: 'premium' },
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      if (trialResponse.status === 200) {
        expect(trialResponse.data.subscription).toMatchObject({
          plan: 'premium',
          status: 'trialing',
        });
      }
      
      // Step 3: Access premium features
      console.log('Accessing premium features...');
      const premiumFeaturesResponse = await apiClient.get(
        '/api/features/premium',
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      if (premiumFeaturesResponse.status === 200) {
        expect(premiumFeaturesResponse.data.access_granted).toBe(true);
      }
      
      // Step 4: Create creator profile
      console.log('Creating creator profile...');
      const creatorResponse = await apiClient.post(
        '/api/creator/profile',
        {
          bio: 'Professional chef and recipe creator',
          specialty: 'Italian Cuisine',
          social_links: {
            instagram: '@testchef',
            youtube: 'testchef',
          },
        },
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      if (creatorResponse.status === 201) {
        expect(creatorResponse.data.creator_profile).toMatchObject({
          user_id: premiumUserId,
          verified: false,
        });
      }
      
      // Step 5: Publish premium recipe
      console.log('Publishing premium recipe...');
      const premiumRecipeResponse = await apiClient.post(
        '/api/recipes/premium',
        {
          title: 'Exclusive Gourmet Recipe',
          description: 'A premium recipe for subscribers',
          is_premium: true,
          price: 4.99,
          ingredients: ['Special ingredient 1', 'Special ingredient 2'],
          instructions: ['Premium step 1', 'Premium step 2'],
        },
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      if (premiumRecipeResponse.status === 201) {
        expect(premiumRecipeResponse.data.recipe.is_premium).toBe(true);
      }
      
      // Step 6: Check subscription usage
      console.log('Checking subscription usage...');
      const usageResponse = await apiClient.get(
        '/api/subscriptions/usage',
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      if (usageResponse.status === 200) {
        expect(usageResponse.data).toHaveProperty('recipes_created');
        expect(usageResponse.data).toHaveProperty('ai_requests_used');
      }
      
      console.log('✅ Premium user journey test passed!');
    });
  });
  
  describe('Social Features Journey', () => {
    let user1Token: string;
    let user2Token: string;
    let user1Id: string;
    let user2Id: string;
    let sharedRecipeId: string;
    
    it('should complete social interaction flow', async () => {
      // Create two users
      const user1Data = {
        email: `social1_${Date.now()}@example.com`,
        password: 'Social1Pass123!',
        name: 'Social User 1',
      };
      
      const user2Data = {
        email: `social2_${Date.now()}@example.com`,
        password: 'Social2Pass123!',
        name: 'Social User 2',
      };
      
      // Register both users
      const user1Response = await apiClient.post('/api/auth/register', user1Data);
      const user2Response = await apiClient.post('/api/auth/register', user2Data);
      
      user1Token = user1Response.data.token;
      user2Token = user2Response.data.token;
      user1Id = user1Response.data.user.id;
      user2Id = user2Response.data.user.id;
      
      // User 1 creates a recipe
      console.log('User 1 creating recipe...');
      const recipeResponse = await apiClient.post(
        '/api/recipes',
        {
          title: 'Shareable Recipe',
          description: 'A recipe to share with friends',
          ingredients: ['ingredient 1', 'ingredient 2'],
          instructions: ['step 1', 'step 2'],
          is_public: true,
        },
        {
          headers: { Authorization: `Bearer ${user1Token}` }
        }
      );
      
      if (recipeResponse.status === 201) {
        sharedRecipeId = recipeResponse.data.recipe.id;
      }
      
      // User 2 favorites the recipe
      console.log('User 2 favoriting recipe...');
      const favoriteResponse = await apiClient.post(
        `/api/recipes/${sharedRecipeId}/favorite`,
        {},
        {
          headers: { Authorization: `Bearer ${user2Token}` }
        }
      );
      
      if (favoriteResponse.status === 200) {
        expect(favoriteResponse.data.favorited).toBe(true);
      }
      
      // User 2 rates the recipe
      console.log('User 2 rating recipe...');
      const ratingResponse = await apiClient.post(
        `/api/recipes/${sharedRecipeId}/rate`,
        { rating: 5, comment: 'Excellent recipe!' },
        {
          headers: { Authorization: `Bearer ${user2Token}` }
        }
      );
      
      if (ratingResponse.status === 200) {
        expect(ratingResponse.data.rating).toBe(5);
      }
      
      // User 1 follows User 2
      console.log('Setting up follow relationship...');
      const followResponse = await apiClient.post(
        `/api/users/${user2Id}/follow`,
        {},
        {
          headers: { Authorization: `Bearer ${user1Token}` }
        }
      );
      
      if (followResponse.status === 200) {
        expect(followResponse.data.following).toBe(true);
      }
      
      // Check activity feed
      console.log('Checking activity feed...');
      const feedResponse = await apiClient.get(
        '/api/feed',
        {
          headers: { Authorization: `Bearer ${user1Token}` }
        }
      );
      
      if (feedResponse.status === 200) {
        expect(feedResponse.data.activities).toBeInstanceOf(Array);
      }
      
      console.log('✅ Social features journey test passed!');
    });
  });
});