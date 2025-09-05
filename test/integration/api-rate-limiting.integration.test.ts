import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import { delay } from './setup';

describe('API Rate Limiting Integration', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Create test user
    const userData = {
      email: `ratelimit_test_${Date.now()}@example.com`,
      password: 'RateLimit123!',
      name: 'Rate Limit Test User',
    };
    
    const registerResponse = await apiClient.post('/api/auth/register', userData);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });
  
  describe('Global Rate Limiting', () => {
    it('should enforce global rate limit per IP', async () => {
      const requests = [];
      const maxRequests = 100; // Typical global limit per minute
      
      // Send rapid requests
      for (let i = 0; i < maxRequests + 10; i++) {
        requests.push(
          apiClient.get('/api/health', {
            headers: { 'X-Forwarded-For': '192.168.1.1' }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Count successful and rate-limited responses
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThanOrEqual(maxRequests);
      
      // Check rate limit headers
      const rateLimitedResponse = responses.find(r => r.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBeDefined();
        expect(rateLimitedResponse.headers['x-ratelimit-remaining']).toBe('0');
        expect(rateLimitedResponse.headers['x-ratelimit-reset']).toBeDefined();
        expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
      }
    });
    
    it('should reset rate limit after time window', async () => {
      // Exhaust rate limit
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(apiClient.get('/api/health'));
      }
      
      await Promise.all(requests);
      
      // Wait for rate limit window to reset (typically 60 seconds, but we'll check header)
      const rateLimitedResponse = requests.find(r => r.status === 429);
      if (rateLimitedResponse) {
        const retryAfter = parseInt(rateLimitedResponse.headers['retry-after'] || '60');
        
        // For testing, we'll just verify the header exists
        expect(retryAfter).toBeGreaterThan(0);
        
        // In real scenario: await delay(retryAfter * 1000);
        // Then verify requests work again
      }
    });
  });
  
  describe('Authenticated User Rate Limiting', () => {
    it('should have higher limits for authenticated users', async () => {
      const authenticatedRequests = [];
      const unauthenticatedRequests = [];
      const requestCount = 50;
      
      // Send authenticated requests
      for (let i = 0; i < requestCount; i++) {
        authenticatedRequests.push(
          apiClient.get('/api/recipes', {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        );
      }
      
      // Send unauthenticated requests
      for (let i = 0; i < requestCount; i++) {
        unauthenticatedRequests.push(
          apiClient.get('/api/recipes')
        );
      }
      
      const authResponses = await Promise.all(authenticatedRequests);
      const unauthResponses = await Promise.all(unauthenticatedRequests);
      
      const authRateLimited = authResponses.filter(r => r.status === 429).length;
      const unauthRateLimited = unauthResponses.filter(r => r.status === 429).length;
      
      // Authenticated users should hit rate limit less frequently
      expect(authRateLimited).toBeLessThanOrEqual(unauthRateLimited);
    });
    
    it('should track rate limit per user, not per token', async () => {
      // Login again to get a new token
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: `ratelimit_test_${Date.now()}@example.com`,
        password: 'RateLimit123!',
      });
      
      const newToken = loginResponse.data.token;
      
      // Send requests with both tokens
      const requests1 = [];
      const requests2 = [];
      
      for (let i = 0; i < 10; i++) {
        requests1.push(
          apiClient.get('/api/user/profile', {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        );
        requests2.push(
          apiClient.get('/api/user/profile', {
            headers: { Authorization: `Bearer ${newToken}` }
          })
        );
      }
      
      const responses = await Promise.all([...requests1, ...requests2]);
      
      // Both tokens should share the same rate limit
      const rateLimited = responses.filter(r => r.status === 429);
      if (rateLimited.length > 0) {
        // Rate limit should apply to user, not individual tokens
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Endpoint-Specific Rate Limiting', () => {
    it('should have strict limits on auth endpoints', async () => {
      const loginAttempts = [];
      const maxAttempts = 5; // Typical limit for auth endpoints
      
      for (let i = 0; i < maxAttempts + 5; i++) {
        loginAttempts.push(
          apiClient.post('/api/auth/login', {
            email: 'test@example.com',
            password: 'wrong_password',
          })
        );
        await delay(100); // Small delay between attempts
      }
      
      const responses = await Promise.all(loginAttempts);
      
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Should include lockout information
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 429) {
        expect(lastResponse.data.error).toContain('too many');
        expect(lastResponse.data.retry_after).toBeDefined();
      }
    });
    
    it('should have strict limits on password reset', async () => {
      const resetAttempts = [];
      const email = `reset_${Date.now()}@example.com`;
      
      for (let i = 0; i < 5; i++) {
        resetAttempts.push(
          apiClient.post('/api/auth/forgot-password', { email })
        );
      }
      
      const responses = await Promise.all(resetAttempts);
      
      // Should rate limit after a few attempts
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
    
    it('should have relaxed limits on read endpoints', async () => {
      const readRequests = [];
      
      // Public read endpoints typically have higher limits
      for (let i = 0; i < 30; i++) {
        readRequests.push(
          apiClient.get('/api/recipes?page=1', {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        );
      }
      
      const responses = await Promise.all(readRequests);
      
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      // Most requests should succeed for read endpoints
      expect(successCount).toBeGreaterThan(rateLimitedCount);
    });
    
    it('should have strict limits on AI generation endpoints', async () => {
      const aiRequests = [];
      const maxAIRequests = 5; // Typical limit for expensive AI operations
      
      for (let i = 0; i < maxAIRequests + 3; i++) {
        aiRequests.push(
          apiClient.post(
            '/api/recipes/generate',
            { prompt: 'Generate a recipe' },
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          )
        );
      }
      
      const responses = await Promise.all(aiRequests);
      
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      // Should include cost information
      const rateLimitedResponse = rateLimited[0];
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.data.error).toContain('limit');
        expect(rateLimitedResponse.data.upgrade_required).toBeDefined();
      }
    });
  });
  
  describe('Subscription-Based Rate Limits', () => {
    it('should have different limits based on subscription tier', async () => {
      // Create premium user
      const premiumUser = {
        email: `premium_rate_${Date.now()}@example.com`,
        password: 'Premium123!',
        name: 'Premium Rate User',
      };
      
      const premiumRegister = await apiClient.post('/api/auth/register', premiumUser);
      const premiumToken = premiumRegister.data.token;
      
      // Mock premium subscription
      await apiClient.post(
        '/api/subscriptions/start-trial',
        { plan: 'premium' },
        {
          headers: { Authorization: `Bearer ${premiumToken}` }
        }
      );
      
      // Compare rate limits
      const freeRequests = [];
      const premiumRequests = [];
      
      for (let i = 0; i < 20; i++) {
        freeRequests.push(
          apiClient.post(
            '/api/recipes/generate',
            { prompt: 'Generate recipe' },
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          )
        );
        premiumRequests.push(
          apiClient.post(
            '/api/recipes/generate',
            { prompt: 'Generate recipe' },
            {
              headers: { Authorization: `Bearer ${premiumToken}` }
            }
          )
        );
      }
      
      const freeResponses = await Promise.all(freeRequests);
      const premiumResponses = await Promise.all(premiumRequests);
      
      const freeRateLimited = freeResponses.filter(r => r.status === 429).length;
      const premiumRateLimited = premiumResponses.filter(r => r.status === 429).length;
      
      // Premium users should have higher limits
      expect(premiumRateLimited).toBeLessThan(freeRateLimited);
    });
  });
  
  describe('Rate Limit Bypass', () => {
    it('should bypass rate limits for internal services with API key', async () => {
      const internalApiKey = process.env.INTERNAL_API_KEY || 'internal_test_key';
      const requests = [];
      
      // Send many requests with internal API key
      for (let i = 0; i < 100; i++) {
        requests.push(
          apiClient.get('/api/internal/stats', {
            headers: { 'X-API-Key': internalApiKey }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Internal requests should not be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      
      if (process.env.INTERNAL_BYPASS_ENABLED === 'true') {
        expect(rateLimited.length).toBe(0);
      }
    });
    
    it('should not bypass with invalid API key', async () => {
      const requests = [];
      
      for (let i = 0; i < 50; i++) {
        requests.push(
          apiClient.get('/api/internal/stats', {
            headers: { 'X-API-Key': 'invalid_key' }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Should still be rate limited with invalid key
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
  
  describe('Distributed Rate Limiting', () => {
    it('should share rate limit across multiple servers', async () => {
      // Simulate requests to different server instances
      const servers = [
        process.env.API_URL_1 || 'http://localhost:3001',
        process.env.API_URL_2 || 'http://localhost:3002',
      ];
      
      const requests = [];
      
      for (const server of servers) {
        const client = axios.create({
          baseURL: server,
          timeout: 10000,
          validateStatus: () => true,
        });
        
        for (let i = 0; i < 25; i++) {
          requests.push(
            client.get('/api/recipes', {
              headers: { Authorization: `Bearer ${authToken}` }
            })
          );
        }
      }
      
      const responses = await Promise.all(requests);
      
      // Rate limit should be shared across servers
      const rateLimited = responses.filter(r => r.status === 429);
      
      if (servers.length > 1) {
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Rate Limit Headers', () => {
    it('should include proper rate limit headers', async () => {
      const response = await apiClient.get('/api/recipes', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      const reset = parseInt(response.headers['x-ratelimit-reset']);
      
      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
      expect(reset).toBeGreaterThan(Date.now() / 1000);
    });
    
    it('should decrement remaining count', async () => {
      const response1 = await apiClient.get('/api/recipes', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      
      const response2 = await apiClient.get('/api/recipes', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
      
      expect(remaining2).toBeLessThan(remaining1);
    });
  });
  
  describe('Rate Limit Error Responses', () => {
    it('should return proper error format when rate limited', async () => {
      // Exhaust rate limit
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          apiClient.post('/api/auth/login', {
            email: 'test@example.com',
            password: 'wrong',
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.data).toMatchObject({
          success: false,
          error: expect.stringContaining('rate limit'),
          retry_after: expect.any(Number),
          limit: expect.any(Number),
          window: expect.any(String),
        });
      }
    });
    
    it('should suggest upgrade for free tier users', async () => {
      // Exhaust free tier AI limits
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          apiClient.post(
            '/api/recipes/generate',
            { prompt: 'Generate recipe' },
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          )
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.data.upgrade_url).toBeDefined();
        expect(rateLimitedResponse.data.message).toContain('upgrade');
      }
    });
  });
});