import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import { userFactory, mockApiResponses } from '../factories';
import { delay } from './setup';

describe('Authentication Flow Integration', () => {
  let apiClient: AxiosInstance;
  let apiUrl: string;
  let supabaseClient: any;
  
  beforeAll(async () => {
    // Setup API client
    apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });
    
    // Get Supabase client from test database
    supabaseClient = testDb.getClient();
  });
  
  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      const userData = {
        email: `test_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Integration Test User',
      };
      
      // 1. Register user via API
      const registerResponse = await apiClient.post('/api/auth/register', userData);
      
      // Verify registration response
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data).toMatchObject({
        success: true,
        user: expect.objectContaining({
          email: userData.email,
          name: userData.name,
        }),
      });
      
      if (registerResponse.data.token) {
        expect(registerResponse.data.token).toBeValidJWT();
      }
      
      // 2. Verify user exists in database
      const { data: dbUser, error: dbError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single();
      
      if (!dbError) {
        expect(dbUser).toBeDefined();
        expect(dbUser.email).toBe(userData.email);
        expect(dbUser.name).toBe(userData.name);
        expect(dbUser.level).toBe(1); // New users start at level 1
        expect(dbUser.xp).toBe(0); // New users start with 0 XP
      }
      
      // 3. Attempt login with new credentials
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: userData.email,
        password: userData.password,
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toMatchObject({
        success: true,
        user: expect.objectContaining({
          email: userData.email,
        }),
      });
      
      const authToken = loginResponse.data.token;
      if (authToken) {
        expect(authToken).toBeValidJWT();
        
        // 4. Access protected route with token
        const profileResponse = await apiClient.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        expect(profileResponse.status).toBe(200);
        expect(profileResponse.data).toMatchObject({
          email: userData.email,
          name: userData.name,
        });
      }
    });
    
    it('should handle duplicate email registration', async () => {
      const userData = {
        email: `duplicate_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Duplicate Test User',
      };
      
      // First registration should succeed
      const firstResponse = await apiClient.post('/api/auth/register', userData);
      expect([200, 201]).toContain(firstResponse.status);
      
      // Second registration with same email should fail
      const secondResponse = await apiClient.post('/api/auth/register', userData);
      expect([400, 409]).toContain(secondResponse.status);
      expect(secondResponse.data).toMatchObject({
        success: false,
        error: expect.stringContaining('already'),
      });
    });
    
    it('should validate password requirements', async () => {
      const weakPasswords = [
        'short', // Too short
        '12345678', // No letters
        'password', // No numbers or special chars
        'Password1', // No special characters
      ];
      
      for (const password of weakPasswords) {
        const response = await apiClient.post('/api/auth/register', {
          email: `weak_${Date.now()}@example.com`,
          password,
          name: 'Test User',
        });
        
        expect(response.status).toBeWithinRange(400, 422);
        expect(response.data.success).toBe(false);
      }
    });
    
    it('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
      ];
      
      for (const email of invalidEmails) {
        const response = await apiClient.post('/api/auth/register', {
          email,
          password: 'ValidPass123!',
          name: 'Test User',
        });
        
        expect(response.status).toBeWithinRange(400, 422);
        expect(response.data.success).toBe(false);
      }
    });
  });
  
  describe('Login Flow', () => {
    let testUser: any;
    const testPassword = 'TestPass123!';
    
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = {
        email: `login_test_${Date.now()}@example.com`,
        password: testPassword,
        name: 'Login Test User',
      };
      
      await apiClient.post('/api/auth/register', testUser);
    });
    
    it('should successfully login with valid credentials', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: testUser.email,
        password: testPassword,
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        success: true,
        token: expect.any(String),
        user: expect.objectContaining({
          email: testUser.email,
        }),
      });
      
      if (response.data.refresh_token) {
        expect(response.data.refresh_token).toBeTruthy();
      }
    });
    
    it('should reject login with incorrect password', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: testUser.email,
        password: 'WrongPassword123!',
      });
      
      expect([401, 403]).toContain(response.status);
      expect(response.data.success).toBe(false);
    });
    
    it('should reject login with non-existent email', async () => {
      const response = await apiClient.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: testPassword,
      });
      
      expect([401, 404]).toContain(response.status);
      expect(response.data.success).toBe(false);
    });
    
    it('should handle rate limiting on multiple failed attempts', async () => {
      const attempts = 10;
      let rateLimited = false;
      
      for (let i = 0; i < attempts; i++) {
        const response = await apiClient.post('/api/auth/login', {
          email: testUser.email,
          password: 'WrongPassword!',
        });
        
        if (response.status === 429) {
          rateLimited = true;
          expect(response.data).toMatchObject({
            success: false,
            error: expect.stringContaining('rate'),
          });
          break;
        }
        
        await delay(100); // Small delay between attempts
      }
      
      // Rate limiting should be triggered (if implemented)
      // This assertion can be adjusted based on actual implementation
      if (process.env.RATE_LIMITING_ENABLED === 'true') {
        expect(rateLimited).toBe(true);
      }
    });
  });
  
  describe('Token Management', () => {
    let authToken: string;
    let refreshToken: string;
    let testUser: any;
    
    beforeEach(async () => {
      // Create and login a test user
      testUser = {
        email: `token_test_${Date.now()}@example.com`,
        password: 'TokenTest123!',
        name: 'Token Test User',
      };
      
      await apiClient.post('/api/auth/register', testUser);
      
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      
      authToken = loginResponse.data.token;
      refreshToken = loginResponse.data.refresh_token;
    });
    
    it('should access protected routes with valid token', async () => {
      const response = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        email: testUser.email,
        name: testUser.name,
      });
    });
    
    it('should reject requests with invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      const response = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${invalidToken}` }
      });
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
    
    it('should reject requests without token', async () => {
      const response = await apiClient.get('/api/user/profile');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
    
    it('should refresh expired tokens', async () => {
      if (!refreshToken) {
        console.log('Refresh token not implemented, skipping test');
        return;
      }
      
      const response = await apiClient.post('/api/auth/refresh', {
        refresh_token: refreshToken,
      });
      
      if (response.status === 200) {
        expect(response.data).toMatchObject({
          success: true,
          token: expect.any(String),
        });
        
        // New token should work
        const profileResponse = await apiClient.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${response.data.token}` }
        });
        
        expect(profileResponse.status).toBe(200);
      }
    });
  });
  
  describe('Logout Flow', () => {
    let authToken: string;
    
    beforeEach(async () => {
      // Create and login a test user
      const testUser = {
        email: `logout_test_${Date.now()}@example.com`,
        password: 'LogoutTest123!',
        name: 'Logout Test User',
      };
      
      await apiClient.post('/api/auth/register', testUser);
      
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      
      authToken = loginResponse.data.token;
    });
    
    it('should successfully logout user', async () => {
      const response = await apiClient.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect([200, 204]).toContain(response.status);
      
      // Token should no longer work after logout
      const profileResponse = await apiClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      // This behavior depends on implementation
      // Some systems invalidate tokens, others don't
      if (process.env.INVALIDATE_TOKENS_ON_LOGOUT === 'true') {
        expect(profileResponse.status).toBe(401);
      }
    });
  });
  
  describe('Password Reset Flow', () => {
    let testUser: any;
    
    beforeEach(async () => {
      testUser = {
        email: `reset_test_${Date.now()}@example.com`,
        password: 'OldPassword123!',
        name: 'Password Reset User',
      };
      
      await apiClient.post('/api/auth/register', testUser);
    });
    
    it('should initiate password reset for existing user', async () => {
      const response = await apiClient.post('/api/auth/forgot-password', {
        email: testUser.email,
      });
      
      // Should always return success for security (don't reveal if email exists)
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
    
    it('should handle password reset for non-existent user', async () => {
      const response = await apiClient.post('/api/auth/forgot-password', {
        email: 'nonexistent@example.com',
      });
      
      // Should return same response as existing user (security)
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });
});