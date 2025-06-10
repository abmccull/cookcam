import { Router, Request, Response } from 'express';
import { supabase, createAuthenticatedClient } from '../index';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

// Add XP to user (calls your SQL function)
router.post('/add-xp', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { xp_amount, action, metadata = {} } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;

    if (!xp_amount || !action) {
      return res.status(400).json({ error: 'XP amount and action are required' });
    }

    // Call your SQL function
    const { data, error } = await supabase.rpc('add_user_xp', {
      p_user_id: userId,
      p_xp_amount: xp_amount,
      p_action: action,
      p_metadata: metadata
    });

    if (error) {
      logger.error('Error adding XP:', error);
      return res.status(500).json({ error: 'Failed to add XP' });
    }

    res.json({
      success: true,
      result: data
    });
  } catch (error) {
    logger.error('Add XP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check daily streak (calls your SQL function)
router.post('/check-streak', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;

    const { data, error } = await supabase.rpc('check_user_streak', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Error checking streak:', error);
      return res.status(500).json({ error: 'Failed to check streak' });
    }

    res.json({
      success: true,
      streak_data: data
    });
  } catch (error) {
    logger.error('Check streak error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user progress and achievements
router.get('/progress', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const userClient = createAuthenticatedClient(token);

    // Get user stats
    const { data: user } = await userClient
      .from('users')
      .select('level, xp, total_xp, streak_current, streak_shields')
      .eq('id', userId)
      .single();

    // Get user progress
    const { data: progress } = await userClient
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user achievements  
    const { data: achievements } = await userClient
      .from('user_achievements')
      .select(`
        achievement_id,
        unlocked_at,
        achievements (
          id,
          name,
          description,
          type,
          points,
          badge_icon
        )
      `)
      .eq('user_id', userId);

    res.json({
      user_stats: user,
      recent_progress: progress || {},
      achievements: achievements || []
    });
  } catch (error) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { type = 'global', period = 'weekly', limit = 50 } = req.query;

    const { data: leaderboard, error } = await supabase
      .from('leaderboards')
      .select(`
        rank,
        xp_total,
        movement,
        users:user_id (
          id, name, avatar_url, level, is_creator, creator_tier
        )
      `)
      .eq('type', type)
      .eq('period', period)
      .order('rank', { ascending: true })
      .limit(parseInt(limit as string));

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    res.json({
      leaderboard: leaderboard || [],
      metadata: {
        type,
        period,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 