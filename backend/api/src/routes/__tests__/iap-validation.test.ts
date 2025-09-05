import request from 'supertest';
import express from 'express';
import iapValidationRoutes from '../iap-validation';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user' };
    next();
  }
}));

jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'purchase-123' }],
          error: null
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      })
    })
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IAP Validation Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/iap', iapValidationRoutes);
    jest.clearAllMocks();
  });

  describe('POST /iap/validate', () => {
    it('should validate iOS receipt successfully', async () => {
      const mockAppleResponse = {
        status: 0,
        receipt: {
          in_app: [{
            product_id: 'premium_monthly',
            transaction_id: 'txn_123',
            purchase_date_ms: '1640995200000'
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockAppleResponse });

      const response = await request(app)
        .post('/iap/validate')
        .send({
          receipt: 'base64-receipt-data',
          platform: 'ios',
          productId: 'premium_monthly'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('purchaseId');
    });

    it('should handle invalid iOS receipt', async () => {
      const mockAppleResponse = {
        status: 21002, // Invalid receipt
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockAppleResponse });

      const response = await request(app)
        .post('/iap/validate')
        .send({
          receipt: 'invalid-receipt',
          platform: 'ios',
          productId: 'premium_monthly'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle Android purchase validation', async () => {
      // For Android validation (simplified test)
      const response = await request(app)
        .post('/iap/validate')
        .send({
          purchaseToken: 'android-purchase-token',
          platform: 'android',
          productId: 'premium_monthly'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should require valid platform', async () => {
      const response = await request(app)
        .post('/iap/validate')
        .send({
          receipt: 'test-receipt',
          platform: 'invalid',
          productId: 'premium_monthly'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should require productId', async () => {
      const response = await request(app)
        .post('/iap/validate')
        .send({
          receipt: 'test-receipt',
          platform: 'ios'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Basic route imports', () => {
    it('should import iap-validation routes without throwing', () => {
      expect(iapValidationRoutes).toBeDefined();
      expect(typeof iapValidationRoutes).toBe('function');
    });
  });
});