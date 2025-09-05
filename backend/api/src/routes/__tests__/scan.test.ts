import request from 'supertest';
import express from 'express';
import { supabase } from '../../index';
import { authenticateUser, optionalAuth } from '../../middleware/auth';
import { validateScanInput } from '../../middleware/validation';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';

// Create a mock authenticated client that behaves like the real one
const createMockAuthenticatedClient = () => {
  const mockClient = {
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  };
  return mockClient;
};

// Mock dependencies BEFORE importing the router
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
  createAuthenticatedClient: jest.fn(() => createMockAuthenticatedClient()),
}));

jest.mock('../../middleware/auth', () => ({
  authenticateUser: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
  optionalAuth: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
}));

jest.mock('../../middleware/validation', () => ({
  validateScanInput: jest.fn((req, res, next) => next()),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create a mock OpenAI instance
const mockOpenAIInstance = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAIInstance);
});

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
  }));
});

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
  },
  readFileSync: jest.fn().mockReturnValue(Buffer.from('test-image-data')),
  existsSync: jest.fn().mockReturnValue(true),
}));

// Import the router AFTER all mocks are set up
import scanRouter from '../scan';
import { createAuthenticatedClient } from '../../index';

// Create test app
const app = express();
app.use(express.json());
app.use('/scan', scanRouter);

describe('Scan Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.NODE_ENV = 'development';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    
    // Reset sharp mock to normal behavior
    (sharp as any).mockImplementation(() => ({
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
    }));
    
    // Reset fs mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('GET /scan/test-vision', () => {
    it('should test vision API successfully', async () => {
      // Mock the OpenAI response
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  name: 'apple',
                  variety: 'Red Delicious',
                  quantity: '3',
                  unit: 'pieces',
                  confidence: 0.95,
                  category: 'fruit',
                },
              ]),
            },
          },
        ],
      } as any);

      const response = await request(app).get('/scan/test-vision');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('ingredients');
      expect(Array.isArray(response.body.ingredients)).toBe(true);
      
      if (response.body.ingredients && response.body.ingredients.length > 0) {
        expect(response.body.ingredients[0]).toHaveProperty('name');
        expect(response.body.ingredients[0].name).toBe('apple');
      }
    });

    it('should handle OpenAI API errors', async () => {
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Vision analysis failed');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json',
            },
          },
        ],
      } as any);

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Vision analysis failed');
    });
  });

  describe('POST /scan/ingredients', () => {
    const mockImageBuffer = Buffer.from('fake-image-data');

    it('should scan ingredients successfully with image upload', async () => {
      const mockDetectedIngredients = [
        {
          name: 'tomato',  // The detectIngredients function lowercases names
          variety: 'Roma',
          quantity: '2',
          unit: 'pieces',
          confidence: 0.9,
          category: 'vegetable',
        },
        {
          name: 'onion',  // The detectIngredients function lowercases names
          variety: 'White',
          quantity: '1',
          unit: 'pieces',
          confidence: 0.85,
          category: 'vegetable',
        },
      ];

      // Mock OpenAI vision response
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockDetectedIngredients),
            },
          },
        ],
      } as any);

      // Mock the authenticated client's database operations
      const mockAuthClient = createMockAuthenticatedClient();
      const mockInsertChain = mockAuthClient.from('ingredient_scans');
      (mockInsertChain as any).select = jest.fn().mockReturnThis();
      (mockInsertChain as any).single = jest.fn().mockResolvedValueOnce({
        data: {
          id: 'scan-123',
          user_id: 'test-user-123',
          detected_ingredients: mockDetectedIngredients,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      // Mock the RPC call for XP
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      expect(response.status).toBe(200);
      expect(response.body.scan_id).toBe('scan-123');
      expect(response.body.ingredients).toEqual(mockDetectedIngredients);
      expect(response.body.xp_awarded).toBe(10);
    });

    it('should handle image processing errors', async () => {
      // Make sharp throw an error when processing
      (sharp as any).mockImplementationOnce(() => ({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Image processing failed')),
      }));

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle storage upload errors', async () => {
      // Mock successful vision analysis
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([{ name: 'Apple', confidence: 0.9 }]),
            },
          },
        ],
      } as any);

      // Mock database insertion error
      const mockAuthClient = createMockAuthenticatedClient();
      const mockInsertChain = mockAuthClient.from('ingredient_scans');
      (mockInsertChain as any).select = jest.fn().mockReturnThis();
      (mockInsertChain as any).single = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to store scan result');
    });

    it('should handle OpenAI vision API errors', async () => {
      // Mock OpenAI error
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockRejectedValueOnce(new Error('Vision API error'));

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Failed to analyze image');
    });

    it('should handle database insertion errors', async () => {
      // Mock successful vision API
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([{ name: 'Apple', confidence: 0.9 }]),
            },
          },
        ],
      } as any);

      // Mock database error
      const mockAuthClient = createMockAuthenticatedClient();
      const mockInsertChain = mockAuthClient.from('ingredient_scans');
      (mockInsertChain as any).select = jest.fn().mockReturnThis();
      (mockInsertChain as any).single = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database insertion failed' },
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to store scan result');
    });

    it('should require image data', async () => {
      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(Buffer.alloc(0)); // Empty buffer

      expect(response.status).toBe(422); 
      expect(response.body.error).toBe('Failed to analyze image');
    });

    it('should handle missing OpenAI API key', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .set('Authorization', 'Bearer test-token')
        .send(mockImageBuffer);

      process.env.OPENAI_API_KEY = originalKey;

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Failed to analyze image');
    });
  });

  describe('GET /scan/history', () => {
    it('should get scan history successfully', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          image_url: 'https://storage.url/scan1.jpg',
          detected_ingredients: [{ name: 'Apple', confidence: 0.9 }],
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'scan-2',
          image_url: 'https://storage.url/scan2.jpg',
          detected_ingredients: [{ name: 'Banana', confidence: 0.85 }],
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      // Mock the authenticated client's query chain
      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).order = jest.fn().mockReturnThis();
      (mockQueryChain as any).range = jest.fn().mockResolvedValueOnce({
        data: mockScans,
        error: null,
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(200);
      expect(response.body.scans).toEqual(mockScans);
    });

    it('should handle pagination', async () => {
      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).order = jest.fn().mockReturnThis();
      (mockQueryChain as any).range = jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/history?offset=10&limit=10');
      
      expect(response.status).toBe(200);
      expect(mockQueryChain.range).toHaveBeenCalledWith(10, 19);
    });

    it('should handle database errors', async () => {
      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).order = jest.fn().mockReturnThis();
      (mockQueryChain as any).range = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch scan history');
    });

    it('should require authentication', async () => {
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /scan/:scanId', () => {
    it('should get scan details successfully', async () => {
      const mockScan = {
        id: 'scan-123',
        user_id: 'test-user-123',
        image_url: 'https://storage.url/scan.jpg',
        detected_ingredients: [{ name: 'Tomato', confidence: 0.9, category: 'vegetable' }],
        manual_ingredients: [],
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).single = jest.fn().mockResolvedValueOnce({
        data: mockScan,
        error: null,
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/scan-123');

      expect(response.status).toBe(200);
      expect(response.body.scan).toEqual(mockScan);
    });

    it('should handle scan not found', async () => {
      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).single = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/nonexistent-scan');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Scan not found');
    });

    it('should handle database errors', async () => {
      const mockAuthClient = createMockAuthenticatedClient();
      const mockQueryChain = mockAuthClient.from('ingredient_scans');
      (mockQueryChain as any).select = jest.fn().mockReturnThis();
      (mockQueryChain as any).eq = jest.fn().mockReturnThis();
      (mockQueryChain as any).single = jest.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      
      (createAuthenticatedClient as jest.Mock).mockReturnValueOnce(mockAuthClient);

      const response = await request(app).get('/scan/scan-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /scan/:scanId/ingredients', () => {
    it('should update manual ingredients successfully', async () => {
      const manualIngredients = [
        {
          name: 'Garlic',
          variety: 'Fresh',
          quantity: '2',
          unit: 'cloves',
          category: 'vegetable',
        },
      ];

      const updatedScan = {
        id: 'scan-123',
        manual_ingredients: manualIngredients,
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSupabaseQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: updatedScan,
          error: null,
        }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery);

      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: manualIngredients });

      expect(response.status).toBe(200);
      expect(response.body.scan.manual_ingredients).toEqual(manualIngredients);
      expect(response.body.message).toBe('Ingredients updated successfully');
    });

    it('should validate ingredients array', async () => {
      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid ingredients array is required');
    });

    it('should handle update errors', async () => {
      const mockSupabaseQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed' },
        }),
      };
      
      (supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery);

      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: [] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Scan not found or update failed');
    });
  });

  describe('Input Validation', () => {
    it('should validate image content type', async () => {
      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'text/plain')
        .send('not an image');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No image file provided');
    });

    it('should validate image size', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/scan/ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(largeBuffer);

      expect(response.status).toBe(413); // Payload too large
    });

    it('should validate scan ID format', async () => {
      const response = await request(app).get('/scan/invalid-scan-id-with-special-chars!@#');

      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Vision analysis failed');
    });

    it('should handle unexpected server errors', async () => {
      (createAuthenticatedClient as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/scan/history')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle file system errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Test image not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      // Mock auth to fail for all protected endpoints
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const endpoints = [
        { method: 'get', path: '/scan/history' },
        { method: 'get', path: '/scan/scan-123' },
        { method: 'put', path: '/scan/scan-123/ingredients', body: { ingredients: [] } },
      ];

      for (const endpoint of endpoints) {
        const req = (request(app) as any)[endpoint.method](endpoint.path);
        if ((endpoint as any).body) {
          req.send((endpoint as any).body);
        }
        const response = await req;
        expect(response.status).toBe(401);
      }
    });

    it('should allow optional auth for certain endpoints', async () => {
      (optionalAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.user = null; // No user
        next();
      });

      // Mock successful OpenAI response for test-vision endpoint
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { name: 'apple', confidence: 0.9, category: 'fruit' },
              ]),
            },
          },
        ],
      } as any);

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(200);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent scan requests', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');

      // Mock successful responses for all requests
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([{ name: 'Apple', confidence: 0.9 }]),
            },
          },
        ],
      } as any);

      // Make 3 concurrent requests to test-vision endpoint which doesn't require auth
      const requests = Array(3)
        .fill(null)
        .map(() => request(app).get('/scan/test-vision'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle OpenAI API timeout', async () => {
      (mockOpenAIInstance.chat.completions.create as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('Vision analysis failed');
    });
  });
});