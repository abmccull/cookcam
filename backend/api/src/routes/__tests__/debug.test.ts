import request from 'supertest';
import express from 'express';
import debugRoutes from '../debug';

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  }
}));

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Test response' } }]
          })
        }
      }
    }))
  };
});

describe('Debug Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/debug', debugRoutes);
    jest.clearAllMocks();
  });

  describe('GET /debug/env', () => {
    it('should return environment check information', async () => {
      const response = await request(app)
        .get('/debug/env')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.environment).toHaveProperty('openai_key_present');
      expect(response.body.environment).toHaveProperty('node_env');
      expect(response.body.environment).toHaveProperty('port');
    });

    it('should mask API key in response', async () => {
      // Set a test API key
      process.env.OPENAI_API_KEY = 'sk-test-key-12345';

      const response = await request(app)
        .get('/debug/env')
        .expect(200);

      expect(response.body.environment.openai_key_present).toBe(true);
      expect(response.body.environment.openai_key_prefix).toContain('...');
      
      // Clean up
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('POST /debug/test-openai', () => {
    it('should test OpenAI connection successfully', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const response = await request(app)
        .post('/debug/test-openai')
        .send({ message: 'Hello' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response');
      
      delete process.env.OPENAI_API_KEY;
    });

    it('should handle missing OpenAI API key', async () => {
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .post('/debug/test-openai')
        .send({ message: 'Hello' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Basic route imports', () => {
    it('should import debug routes without throwing', () => {
      expect(debugRoutes).toBeDefined();
      expect(typeof debugRoutes).toBe('function');
    });
  });
});