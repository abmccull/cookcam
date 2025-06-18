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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
    const { data: user, error: userError } = await userClient
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
  } catch (error: unknown) {
    logger.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { type = 'global', period = 'weekly', limit = 50 } = req.query;

    logger.debug('🏆 Fetching leaderboard:', { type, period, limit });

    // Use the new get_leaderboard_data function
    const { data, error } = await supabase.rpc('get_leaderboard_data', {
      p_period: period as string,
      p_limit: parseInt(limit as string)
    });

    if (error) {
      logger.error('Leaderboard query error:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Transform to expected frontend format
    const leaderboard = (data || []).map((entry: any) => ({
      rank: entry.rank,
      xp_total: entry.xp_total || 0,
      xp_gained: entry.xp_gained || 0,
      movement: 0, // Could implement this later
      users: {
        id: entry.user_id,
        name: entry.name,
        level: entry.level,
        avatar_url: entry.avatar_url,
        is_creator: entry.is_creator,
        creator_tier: entry.creator_tier
      }
    }));

    logger.debug(`✅ Leaderboard fetched: ${leaderboard.length} entries for ${period}`);

    res.json({
      leaderboard,
      metadata: {
        type,
        period,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 