import request from 'supertest';
import express from 'express';
import mysteryBoxRoutes from '../mysteryBox';

// Mock supabase
jest.mock('../../index', () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

import { supabase } from '../../index';
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Mystery Box Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/mystery-box', mysteryBoxRoutes);
    jest.clearAllMocks();
    
    // Reset Math.random mock
    jest.spyOn(Math, 'random').mockRestore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /mystery-box/open', () => {
    it('should return box not available when random chance fails', async () => {
      // Mock Math.random to return > 0.25 (box not available)
      jest.spyOn(Math, 'random').mockReturnValue(0.8);

      const response = await request(app)
        .post('/mystery-box/open')
        .send({ user_id: 'test-user-123' })
        .expect(200);

      expect(response.body).toEqual({
        box_available: false,
        message: 'No mystery box available right now. Try again later!'
      });
    });

    it('should open mystery box when available (random chance succeeds)', async () => {
      // Mock Math.random to return < 0.25 (box available)
      jest.spyOn(Math, 'random').mockReturnValue(0.2);

      const mockReward = {
        reward_type: 'xp',
        reward_amount: 100,
        message: 'You earned 100 XP!'
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockReward,
        error: null
      });

      const response = await request(app)
        .post('/mystery-box/open')
        .send({ user_id: 'test-user-123' })
        .expect(200);

      expect(response.body).toEqual({
        box_available: true,
        reward: mockReward
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('open_mystery_box', {
        p_user_id: 'test-user-123'
      });
    });

    it('should handle database errors', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Box available

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const response = await request(app)
        .post('/mystery-box/open')
        .send({ user_id: 'test-user-123' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should require user_id', async () => {
      const response = await request(app)
        .post('/mystery-box/open')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'User ID is required'
      });
    });

    it('should handle service exceptions', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Box available
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .post('/mystery-box/open')
        .send({ user_id: 'test-user-123' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Basic route imports', () => {
    it('should import mysteryBox routes without throwing', () => {
      expect(mysteryBoxRoutes).toBeDefined();
      expect(typeof mysteryBoxRoutes).toBe('function');
    });
  });
});