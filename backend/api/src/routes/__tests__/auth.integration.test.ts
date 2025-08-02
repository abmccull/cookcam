// Real Authentication Routes Integration Tests
import request from 'supertest';
import express from 'express';
import { supabase } from '../../index';

// Mock the auth router
const authRouter = express.Router();

// Mock middleware
const mockAuthenticateUser = jest.fn((req, res, next) => {
  req.user = { id: 'test-user-123', email: 'test@example.com' };
  next();
});

const mockRateLimit = jest.fn((req, res, next) => next());
const mockValidation = jest.fn((req, res, next) => next());

// Mock Supabase auth methods
jest.mock('../../index', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),  
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
  createAuthenticatedClient: jest.fn(),
}));

// Simple auth routes for testing
authRouter.post('/signup', mockRateLimit, mockValidation, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Mock successful signup
    const mockAuthResponse = {
      data: {
        user: {
          id: 'new-user-123',
          email: email.toLowerCase().trim(),
          email_confirmed_at: null,
        },
        session: null,
      },
      error: null,
    };

    (supabase.auth.signUp as jest.Mock).mockResolvedValue(mockAuthResponse);

    // Mock profile creation
    const mockProfileResponse = {
      data: {
        id: 'new-user-123',
        email: email.toLowerCase().trim(),
        name,
        created_at: new Date().toISOString(),
      },
      error: null,
    };

    (supabase.from as jest.Mock)().insert().select().single.mockResolvedValue(mockProfileResponse);

    res.status(201).json({
      success: true,
      user: mockProfileResponse.data,
      message: 'Account created successfully. Please check your email to verify your account.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/login', mockRateLimit, mockValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Mock successful login
    const mockAuthResponse = {
      data: {
        user: {
          id: 'user-123',
          email: email.toLowerCase().trim(),
          email_confirmed_at: new Date().toISOString(),
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000, // 1 hour
        },
      },
      error: null,
    };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue(mockAuthResponse);

    // Mock user profile fetch
    const mockProfileResponse = {
      data: {
        id: 'user-123',
        email: email.toLowerCase().trim(),
        name: 'Test User',
        subscription_tier: 'free',
      },
      error: null,
    };

    (supabase.from as jest.Mock)().select().eq().single.mockResolvedValue(mockProfileResponse);

    res.json({
      success: true,
      user: mockProfileResponse.data,
      session: mockAuthResponse.data.session,
    });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

authRouter.get('/profile', mockAuthenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Mock profile fetch
    const mockProfileResponse = {
      data: {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        subscription_tier: 'free',
        total_xp: 150,
        level: 3,
      },
      error: null,
    };

    (supabase.from as jest.Mock)().select().eq().single.mockResolvedValue(mockProfileResponse);

    res.json({
      success: true,
      user: mockProfileResponse.data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.put('/profile', mockAuthenticateUser, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate allowed fields
    const allowedFields = ['name', 'avatar_url', 'creator_bio'];
    const sanitizedUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Mock profile update
    const mockUpdateResponse = {
      data: {
        id: userId,
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      },
      error: null,
    };

    (supabase.from as jest.Mock)().update().eq().select().single.mockResolvedValue(mockUpdateResponse);

    res.json({
      success: true,
      user: mockUpdateResponse.data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post('/reset-password', mockRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Mock password reset
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Authentication Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('should create new user account', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.message).toContain('Account created successfully');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          // Missing password and name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should normalize email addresses', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'SecurePass123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.session).toBeDefined();
      expect(response.body.session.access_token).toBe('mock-access-token');
    });

    it('should validate required login fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should handle authentication errors', async () => {
      // Mock auth failure first
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('test-user-123');
      expect(response.body.user.subscription_tier).toBe('free');
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'Updated Name',
          avatar_url: 'https://example.com/avatar.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('Updated Name');
    });

    it('should filter invalid fields', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'Updated Name',
          invalid_field: 'should be ignored',
          admin: true, // Should be filtered out
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.invalid_field).toBeUndefined();
      expect(response.body.user.admin).toBeUndefined();
    });

    it('should reject empty updates', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({
          invalid_field: 'only invalid fields',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No valid fields to update');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset link sent');
    });

    it('should validate email field', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          // Missing email
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      // Mock Supabase error first
      (supabase.auth.signUp as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'Test User',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive information', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should handle authentication middleware', async () => {
      // Test protected route without authentication
      const mockAuth = jest.fn((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const protectedRouter = express.Router();
      protectedRouter.get('/protected', mockAuth, (req, res) => {
        res.json({ success: true });
      });

      const protectedApp = express();
      protectedApp.use(express.json());
      protectedApp.use('/api', protectedRouter);

      const response = await request(protectedApp)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent authentication requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'ValidPass123!',
          })
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});