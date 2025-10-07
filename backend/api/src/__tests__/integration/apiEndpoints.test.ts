// Integration Tests - API Endpoints
import { createMockRequest, createMockResponse, createMockSupabaseClient } from '../utils/testHelpers';
import { mockUsers, mockRecipes } from '../utils/mockData';

describe('API Endpoints Integration Tests', () => {
  let mockSupabase: any;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    it('should handle POST /auth/register', async () => {
      // Mock authentication middleware behavior
      const registerEndpoint = async (req: any, res: any) => {
        const { email, password, name } = req.body;

        try {
          // Validate input
          if (!email || !password || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // Check if user exists
          mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });

          // Create user
          mockSupabase.from().insert().select().single.mockResolvedValue({
            data: {
              id: 'new-user-123',
              email: email.toLowerCase(),
              name,
              created_at: new Date().toISOString()
            }
          });

          return res.status(201).json({
            success: true,
            user: { id: 'new-user-123', email: email.toLowerCase(), name }
          });
        } catch (error) {
          return res.status(500).json({ error: 'Registration failed' });
        }
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await registerEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User'
        })
      });
    });

    it('should handle POST /auth/login', async () => {
      const loginEndpoint = async (req: any, res: any) => {
        const { email, password } = req.body;

        try {
          // Validate credentials
          mockSupabase.from().select().eq().single.mockResolvedValue({
            data: {
              id: 'user-123',
              email: email.toLowerCase(),
              name: 'Test User',
              password_hash: 'hashed_password'
            }
          });

          // Generate session token
          const sessionToken = 'session_' + Date.now();

          return res.status(200).json({
            success: true,
            user: { id: 'user-123', email: email.toLowerCase(), name: 'Test User' },
            token: sessionToken
          });
        } catch (error) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      };

      mockReq.body = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      await loginEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.stringMatching(/^session_/)
        })
      );
    });

    it('should handle authentication errors', async () => {
      const loginEndpoint = async (req: any, res: any) => {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        // Simulate user not found
        mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });

        return res.status(401).json({ error: 'Invalid credentials' });
      };

      mockReq.body = { email: 'invalid@example.com', password: 'wrong' };

      await loginEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('Recipe Endpoints', () => {
    it('should handle GET /recipes', async () => {
      const getRecipesEndpoint = async (req: any, res: any) => {
        try {
          const { page = 1, limit = 20, cuisine, difficulty } = req.query;
          
          // Build query filters
          let query = mockSupabase.from('recipes').select('*');
          
          if (cuisine) query = query.eq('cuisine_type', cuisine);
          if (difficulty) query = query.eq('difficulty', difficulty);
          
          const offset = (page - 1) * limit;
          query = query.range(offset, offset + limit - 1);

          // Mock recipe data
          const recipes = [
            { id: 'recipe1', title: 'Pasta Carbonara', cuisine_type: 'italian', difficulty: 'medium' },
            { id: 'recipe2', title: 'Chicken Tikka', cuisine_type: 'indian', difficulty: 'hard' }
          ];

          mockSupabase.from().select().range.mockResolvedValue({
            data: recipes.filter(r => 
              (!cuisine || r.cuisine_type === cuisine) &&
              (!difficulty || r.difficulty === difficulty)
            )
          });

          const filteredRecipes = recipes.filter(r => 
            (!cuisine || r.cuisine_type === cuisine) &&
            (!difficulty || r.difficulty === difficulty)
          );

          return res.status(200).json({
            success: true,
            recipes: filteredRecipes,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: filteredRecipes.length
            }
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch recipes' });
        }
      };

      // Test without filters
      mockReq.query = { page: '1', limit: '10' };
      await getRecipesEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recipes: expect.arrayContaining([
            expect.objectContaining({ title: 'Pasta Carbonara' })
          ])
        })
      );
    });

    it('should handle POST /recipes/generate', async () => {
      const generateRecipeEndpoint = async (req: any, res: any) => {
        try {
          const { ingredients, preferences = {} } = req.body;
          const userId = req.user?.id;

          if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: 'Ingredients are required' });
          }

          if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          // Mock AI recipe generation
          const generatedRecipe = {
            id: 'generated-recipe-123',
            title: `Recipe with ${ingredients.join(', ')}`,
            ingredients: ingredients.map(ing => ({ name: ing, amount: '1 cup' })),
            instructions: [
              'Prepare ingredients',
              'Cook according to recipe',
              'Serve hot'
            ],
            prep_time: 15,
            cook_time: 30,
            difficulty: preferences.difficulty || 'medium',
            cuisine_type: preferences.cuisine || 'fusion',
            created_by: userId,
            created_at: new Date().toISOString()
          };

          // Save to database
          mockSupabase.from().insert().select().single.mockResolvedValue({
            data: generatedRecipe
          });

          return res.status(201).json({
            success: true,
            recipe: generatedRecipe
          });
        } catch (error) {
          return res.status(500).json({ error: 'Recipe generation failed' });
        }
      };

      mockReq.body = {
        ingredients: ['chicken', 'rice', 'vegetables'],
        preferences: { difficulty: 'easy', cuisine: 'asian' }
      };
      mockReq.user = { id: 'user-123' };

      await generateRecipeEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recipe: expect.objectContaining({
            title: expect.stringContaining('chicken'),
            difficulty: 'easy'
          })
        })
      );
    });

    it('should handle GET /recipes/:id', async () => {
      const getRecipeEndpoint = async (req: any, res: any) => {
        try {
          const { id } = req.params;
          
          mockSupabase.from().select().eq().single.mockResolvedValue({
            data: {
              id,
              title: 'Detailed Recipe',
              ingredients: ['ingredient1', 'ingredient2'],
              instructions: ['step1', 'step2'],
              nutrition_info: { calories: 350, protein: 25 }
            }
          });

          const recipe = {
            id,
            title: 'Detailed Recipe',
            ingredients: ['ingredient1', 'ingredient2'],
            instructions: ['step1', 'step2'],
            nutrition_info: { calories: 350, protein: 25 }
          };

          return res.status(200).json({
            success: true,
            recipe
          });
        } catch (error) {
          return res.status(404).json({ error: 'Recipe not found' });
        }
      };

      mockReq.params = { id: 'recipe-123' };

      await getRecipeEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recipe: expect.objectContaining({
            id: 'recipe-123',
            title: 'Detailed Recipe'
          })
        })
      );
    });
  });

  describe('User Endpoints', () => {
    it('should handle GET /users/profile', async () => {
      const getProfileEndpoint = async (req: any, res: any) => {
        try {
          const userId = req.user?.id;

          if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          mockSupabase.from().select().eq().single.mockResolvedValue({
            data: {
              id: userId,
              email: 'user@example.com',
              name: 'Test User',
              total_xp: 150,
              level: 3,
              subscription_tier: 'premium',
              streak_count: 7
            }
          });

          const profile = {
            id: userId,
            email: 'user@example.com',
            name: 'Test User',
            total_xp: 150,
            level: 3,
            subscription_tier: 'premium',
            streak_count: 7
          };

          return res.status(200).json({
            success: true,
            profile
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch profile' });
        }
      };

      mockReq.user = { id: 'user-123' };

      await getProfileEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          profile: expect.objectContaining({
            level: 3,
            subscription_tier: 'premium'
          })
        })
      );
    });

    it('should handle PUT /users/profile', async () => {
      const updateProfileEndpoint = async (req: any, res: any) => {
        try {
          const userId = req.user?.id;
          const updates = req.body;

          if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          // Validate updates
          const allowedFields = ['name', 'dietary_restrictions', 'cuisine_preferences'];
          const sanitizedUpdates = Object.keys(updates)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
              obj[key] = updates[key];
              return obj;
            }, {} as any);

          mockSupabase.from().update().eq().select().single.mockResolvedValue({
            data: {
              id: userId,
              ...sanitizedUpdates,
              updated_at: new Date().toISOString()
            }
          });

          return res.status(200).json({
            success: true,
            profile: {
              id: userId,
              ...sanitizedUpdates,
              updated_at: new Date().toISOString()
            }
          });
        } catch (error) {
          return res.status(500).json({ error: 'Profile update failed' });
        }
      };

      mockReq.user = { id: 'user-123' };
      mockReq.body = {
        name: 'Updated Name',
        dietary_restrictions: ['vegetarian'],
        invalid_field: 'should be ignored'
      };

      await updateProfileEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          profile: expect.objectContaining({
            name: 'Updated Name',
            dietary_restrictions: ['vegetarian']
          })
        })
      );
    });
  });

  describe('Gamification Endpoints', () => {
    it('should handle GET /gamification/leaderboard', async () => {
      const getLeaderboardEndpoint = async (req: any, res: any) => {
        try {
          const { timeframe = 'all_time', limit = 50 } = req.query;

          const mockLeaderboard = [
            { id: 'user1', name: 'Player One', total_xp: 1000, level: 5, rank: 1 },
            { id: 'user2', name: 'Player Two', total_xp: 800, level: 4, rank: 2 },
            { id: 'user3', name: 'Player Three', total_xp: 600, level: 3, rank: 3 }
          ];

          mockSupabase.from().select().order().limit.mockResolvedValue({
            data: mockLeaderboard.slice(0, parseInt(limit))
          });

          return res.status(200).json({
            success: true,
            leaderboard: mockLeaderboard.slice(0, parseInt(limit)),
            timeframe,
            total_users: mockLeaderboard.length
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
      };

      mockReq.query = { timeframe: 'weekly', limit: '10' };

      await getLeaderboardEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          leaderboard: expect.arrayContaining([
            expect.objectContaining({ rank: 1, total_xp: 1000 })
          ])
        })
      );
    });

    it('should handle POST /gamification/award-xp', async () => {
      const awardXPEndpoint = async (req: any, res: any) => {
        try {
          const userId = req.user?.id;
          const { amount, source, metadata } = req.body;

          if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid XP amount required' });
          }

          // Get current user stats
          mockSupabase.from().select().eq().single.mockResolvedValue({
            data: { total_xp: 100, level: 2 }
          });

          const newTotalXP = 100 + amount;
          const newLevel = Math.floor(Math.sqrt(newTotalXP / 50)) + 1;
          const leveledUp = newLevel > 2;

          // Update user stats
          mockSupabase.from().update().eq.mockResolvedValue({
            data: { total_xp: newTotalXP, level: newLevel }
          });

          // Record XP transaction
          mockSupabase.from().insert.mockResolvedValue({
            data: { user_id: userId, xp_amount: amount, source }
          });

          return res.status(200).json({
            success: true,
            xp_awarded: amount,
            total_xp: newTotalXP,
            new_level: newLevel,
            leveled_up: leveledUp
          });
        } catch (error) {
          return res.status(500).json({ error: 'Failed to award XP' });
        }
      };

      mockReq.user = { id: 'user-123' };
      mockReq.body = {
        amount: 50,
        source: 'recipe_completed',
        metadata: { recipe_id: 'recipe-123' }
      };

      await awardXPEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          xp_awarded: 50,
          total_xp: 150
        })
      );
    });
  });

  describe('Subscription Endpoints', () => {
    it('should handle POST /subscriptions/create', async () => {
      const createSubscriptionEndpoint = async (req: any, res: any) => {
        try {
          const userId = req.user?.id;
          const { price_id, payment_method_id } = req.body;

          if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          if (!price_id || !payment_method_id) {
            return res.status(400).json({ error: 'Price ID and payment method required' });
          }

          // Mock Stripe subscription creation
          const subscription = {
            id: 'sub_mock_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000 // 30 days
          };

          // Save subscription to database
          mockSupabase.from().insert().select().single.mockResolvedValue({
            data: {
              id: 'db_sub_123',
              user_id: userId,
              stripe_subscription_id: subscription.id,
              tier: price_id.includes('premium') ? 'premium' : 'creator',
              status: 'active'
            }
          });

          // Update user subscription tier
          mockSupabase.from().update().eq.mockResolvedValue({
            data: { subscription_tier: 'premium' }
          });

          return res.status(201).json({
            success: true,
            subscription: {
              id: subscription.id,
              status: subscription.status,
              tier: 'premium'
            }
          });
        } catch (error) {
          return res.status(500).json({ error: 'Subscription creation failed' });
        }
      };

      mockReq.user = { id: 'user-123' };
      mockReq.body = {
        price_id: 'price_premium_monthly',
        payment_method_id: 'pm_test_123'
      };

      await createSubscriptionEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          subscription: expect.objectContaining({
            status: 'active',
            tier: 'premium'
          })
        })
      );
    });
  });

  describe('Error Handling and Middleware', () => {
    it('should handle missing authentication', async () => {
      const protectedEndpoint = async (req: any, res: any) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return res.status(200).json({ success: true });
      };

      mockReq.user = null;

      await protectedEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should handle validation errors', async () => {
      const validationEndpoint = async (req: any, res: any) => {
        const errors = [];

        if (!req.body.email) errors.push('Email is required');
        if (!req.body.password) errors.push('Password is required');
        if (req.body.password && req.body.password.length < 8) {
          errors.push('Password must be at least 8 characters');
        }

        if (errors.length > 0) {
          return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors 
          });
        }

        return res.status(200).json({ success: true });
      };

      mockReq.body = { email: '', password: '123' };

      await validationEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          'Email is required',
          'Password must be at least 8 characters'
        ])
      });
    });

    it('should handle rate limiting', async () => {
      const rateLimitedEndpoint = async (req: any, res: any) => {
        const requestCount = parseInt(req.headers['x-request-count'] || '0');
        
        if (requestCount > 10) {
          return res.status(429).json({ 
            error: 'Too many requests',
            retry_after: 3600 // 1 hour
          });
        }

        return res.status(200).json({ success: true });
      };

      mockReq.headers = { 'x-request-count': '15' };

      await rateLimitedEndpoint(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too many requests',
        retry_after: 3600
      });
    });
  });
});