import request from 'supertest';
import express from 'express';
import scanRouter from '../scan';
import { supabase, createAuthenticatedClient } from '../../index';
import { authenticateUser, optionalAuth } from '../../middleware/auth';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
  createAuthenticatedClient: jest.fn(),
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

jest.mock('openai');
jest.mock('sharp');
jest.mock('fs');

// Create test app
const app = express();
app.use(express.json());
app.use(express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '10mb' }));
app.use('/scan', scanRouter);

describe('Scan Routes', () => {
  let mockUserClient: any;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock user client
    mockUserClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createAuthenticatedClient as jest.Mock).mockReturnValue(mockUserClient);

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  });

  describe('GET /scan/test-vision', () => {
    it('should test vision API successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  name: 'Apple',
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
      expect(response.body.success).toBe(true);
      expect(response.body.ingredients).toHaveLength(1);
      expect(response.body.ingredients[0].name).toBe('Apple');
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Vision API test failed');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json',
            },
          },
        ],
      } as any);

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Vision API test failed');
    });
  });

  describe('POST /scan/scan-ingredients', () => {
    const mockImageBuffer = Buffer.from('fake-image-data');

    beforeEach(() => {
      // Mock sharp for image processing
      (sharp as jest.MockedFunction<typeof sharp>).mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockImageBuffer),
      } as any);
    });

    it('should scan ingredients successfully with image upload', async () => {
      const mockDetectedIngredients = [
        {
          name: 'Tomato',
          variety: 'Roma',
          quantity: '2',
          unit: 'pieces',
          confidence: 0.9,
          category: 'vegetable',
        },
        {
          name: 'Onion',
          variety: 'White',
          quantity: '1',
          unit: 'pieces',
          confidence: 0.85,
          category: 'vegetable',
        },
      ];

      // Mock OpenAI vision response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockDetectedIngredients),
            },
          },
        ],
      } as any);

      // Mock Supabase storage upload
      const mockStorageClient = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'scans/test-scan.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/test-scan.jpg' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageClient);

      // Mock scan record insertion
      mockUserClient.single.mockResolvedValueOnce({
        data: {
          id: 'scan-123',
          user_id: 'test-user-123',
          image_url: 'https://storage.url/test-scan.jpg',
          detected_ingredients: mockDetectedIngredients,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scan_id).toBe('scan-123');
      expect(response.body.data.detected_ingredients).toEqual(mockDetectedIngredients);
      expect(mockStorageClient.upload).toHaveBeenCalled();
      expect(mockUserClient.insert).toHaveBeenCalled();
    });

    it('should handle image processing errors', async () => {
      (sharp as jest.MockedFunction<typeof sharp>).mockImplementation(() => {
        throw new Error('Image processing failed');
      });

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to process image');
    });

    it('should handle storage upload errors', async () => {
      const mockStorageClient = {
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage upload failed' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageClient);

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to upload image');
    });

    it('should handle OpenAI vision API errors', async () => {
      // Mock successful storage upload
      const mockStorageClient = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'scans/test-scan.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/test-scan.jpg' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageClient);

      // Mock OpenAI error
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('Vision API error'));

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to analyze image');
    });

    it('should handle database insertion errors', async () => {
      // Mock successful storage and vision API
      const mockStorageClient = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'scans/test-scan.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/test-scan.jpg' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageClient);

      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify([{ name: 'Apple', confidence: 0.9 }]),
            },
          },
        ],
      } as any);

      // Mock database error
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database insertion failed' },
      });

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to save scan results');
    });

    it('should require image data', async () => {
      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No image data provided');
    });

    it('should handle missing OpenAI API key', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(mockImageBuffer);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to process image');
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

      mockUserClient.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: mockScans,
          error: null,
        }),
      });

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scans).toEqual(mockScans);
      expect(response.body.data.total).toBe(2);
    });

    it('should handle pagination', async () => {
      mockUserClient.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await request(app).get('/scan/history?page=2&limit=10');

      expect(mockUserClient.limit).toHaveBeenCalledWith(10);
    });

    it('should handle database errors', async () => {
      mockUserClient.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch scan history');
    });

    it('should require authentication', async () => {
      (authenticateUser as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(401);
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

      mockUserClient.single.mockResolvedValueOnce({
        data: mockScan,
        error: null,
      });

      const response = await request(app).get('/scan/scan-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockScan);
      expect(mockUserClient.eq).toHaveBeenCalledWith('id', 'scan-123');
    });

    it('should handle scan not found', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const response = await request(app).get('/scan/nonexistent-scan');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Scan not found');
    });

    it('should handle database errors', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await request(app).get('/scan/scan-123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch scan details');
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

      mockUserClient.single.mockResolvedValueOnce({
        data: updatedScan,
        error: null,
      });

      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: manualIngredients });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.manual_ingredients).toEqual(manualIngredients);
      expect(mockUserClient.update).toHaveBeenCalledWith({
        manual_ingredients: manualIngredients,
        updated_at: expect.any(String),
      });
    });

    it('should validate ingredients array', async () => {
      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Ingredients must be an array');
    });

    it('should handle update errors', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const response = await request(app)
        .put('/scan/scan-123/ingredients')
        .send({ ingredients: [] });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update ingredients');
    });
  });

  describe('POST /scan/:scanId/generate-recipes', () => {
    it('should generate recipes from scan successfully', async () => {
      const mockScan = {
        id: 'scan-123',
        detected_ingredients: [
          { name: 'Tomato', confidence: 0.9 },
          { name: 'Onion', confidence: 0.85 },
        ],
        manual_ingredients: [],
      };

      const mockRecipes = [
        {
          title: 'Tomato Onion Stir Fry',
          cuisine: 'Asian',
          totalTimeMinutes: 15,
          difficulty: 'Easy',
        },
      ];

      // Mock scan fetch
      mockUserClient.single.mockResolvedValueOnce({
        data: mockScan,
        error: null,
      });

      // Mock recipe generation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({ recipes: mockRecipes }),
            },
          },
        ],
      } as any);

      const response = await request(app).post('/scan/scan-123/generate-recipes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recipes).toEqual(mockRecipes);
      expect(response.body.data.ingredients_used).toHaveLength(2);
    });

    it('should handle scan not found', async () => {
      mockUserClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const response = await request(app).post('/scan/nonexistent-scan/generate-recipes');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Scan not found');
    });

    it('should handle no ingredients found', async () => {
      const mockScan = {
        id: 'scan-123',
        detected_ingredients: [],
        manual_ingredients: [],
      };

      mockUserClient.single.mockResolvedValueOnce({
        data: mockScan,
        error: null,
      });

      const response = await request(app).post('/scan/scan-123/generate-recipes');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No ingredients found in scan');
    });

    it('should handle recipe generation errors', async () => {
      const mockScan = {
        id: 'scan-123',
        detected_ingredients: [{ name: 'Tomato', confidence: 0.9 }],
        manual_ingredients: [],
      };

      mockUserClient.single.mockResolvedValueOnce({
        data: mockScan,
        error: null,
      });

      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('Recipe generation failed')
      );

      const response = await request(app).post('/scan/scan-123/generate-recipes');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate recipes');
    });
  });

  describe('Input Validation', () => {
    it('should validate image content type', async () => {
      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'text/plain')
        .send('not an image');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Invalid content type. Expected image/jpeg, image/png, or image/webp'
      );
    });

    it('should validate image size', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/scan/scan-ingredients')
        .set('Content-Type', 'image/jpeg')
        .send(largeBuffer);

      expect(response.status).toBe(413); // Payload too large
    });

    it('should validate scan ID format', async () => {
      const response = await request(app).get('/scan/invalid-scan-id-with-special-chars!@#');

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      const response = await request(app).post('/scan/scan-123/generate-recipes');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Server configuration error');
    });

    it('should handle unexpected server errors', async () => {
      (createAuthenticatedClient as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app).get('/scan/history');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle file system errors', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Vision API test failed');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      (authenticateUser as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const endpoints = [
        { method: 'get', path: '/scan/history' },
        { method: 'get', path: '/scan/scan-123' },
        { method: 'put', path: '/scan/scan-123/ingredients' },
        { method: 'post', path: '/scan/scan-123/generate-recipes' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should allow optional auth for certain endpoints', async () => {
      (optionalAuth as jest.Mock).mockImplementation((req, res, next) => {
        req.user = null; // No user
        next();
      });

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(200);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent scan requests', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');

      // Mock successful responses for all requests
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([{ name: 'Apple', confidence: 0.9 }]),
            },
          },
        ],
      } as any);

      const mockStorageClient = {
        upload: jest.fn().mockResolvedValue({
          data: { path: 'scans/test-scan.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.url/test-scan.jpg' },
        }),
      };
      (supabase.storage.from as jest.Mock).mockReturnValue(mockStorageClient);

      mockUserClient.single.mockResolvedValue({
        data: { id: 'scan-123', detected_ingredients: [] },
        error: null,
      });

      // Make 3 concurrent requests
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .post('/scan/scan-ingredients')
            .set('Content-Type', 'image/jpeg')
            .send(mockImageBuffer)
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle OpenAI API timeout', async () => {
      mockOpenAI.chat.completions.create.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const response = await request(app).get('/scan/test-vision');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Vision API test failed');
    });
  });
});
