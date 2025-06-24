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

    let leaderboard = [];

    // Try the new function first, fallback to manual queries
    try {
      const { data, error } = await supabase.rpc('get_leaderboard_data', {
        p_period: period as string,
        p_limit: parseInt(limit as string)
      });

      if (data && !error) {
        // Transform to expected frontend format
        leaderboard = (data || []).map((entry: any) => ({
          rank: entry.rank,
          xp_total: entry.xp_total || 0,
          xp_gained: entry.xp_gained || 0,
          movement: 0,
          users: {
            id: entry.user_id,
            name: entry.name,
            level: entry.level,
            avatar_url: entry.avatar_url,
            is_creator: entry.is_creator,
            creator_tier: entry.creator_tier
          }
        }));
      } else {
        throw new Error('Function not available, using fallback');
      }
    } catch (funcError) {
      logger.warn('🔄 Using fallback leaderboard query:', { error: funcError });
      
      // Fallback: Direct query approach
      let baseQuery = supabase
        .from('users')
        .select('id, name, avatar_url, level, total_xp, xp, is_creator, creator_tier')
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(parseInt(limit as string));

      const { data: users, error: queryError } = await baseQuery;

      if (queryError) {
        logger.error('❌ Fallback query error:', queryError);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      // For weekly period, try to get period XP from user_progress
      if (period === 'weekly') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Get weekly XP for each user
        const userIds = (users || []).map(u => u.id);
        const { data: weeklyProgress } = await supabase
          .from('user_progress')
          .select('user_id, xp_gained')
          .in('user_id', userIds)
          .gte('created_at', weekStart.toISOString());

        const weeklyXpMap = new Map();
        (weeklyProgress || []).forEach(progress => {
          const currentXp = weeklyXpMap.get(progress.user_id) || 0;
          weeklyXpMap.set(progress.user_id, currentXp + progress.xp_gained);
        });

        // Transform with weekly XP data
        leaderboard = (users || []).map((user, index) => ({
          rank: index + 1,
          xp_total: user.total_xp || 0,
          xp_gained: weeklyXpMap.get(user.id) || 0,
          movement: 0,
          users: {
            id: user.id,
            name: user.name,
            level: user.level,
            avatar_url: user.avatar_url,
            is_creator: user.is_creator,
            creator_tier: user.creator_tier
          }
        }));

        // Re-sort by weekly XP if available
        leaderboard.sort((a, b) => b.xp_gained - a.xp_gained);
        
        // Update ranks after sorting
        leaderboard.forEach((entry, index) => {
          entry.rank = index + 1;
        });
      } else {
        // For all-time, use total_xp
        leaderboard = (users || []).map((user, index) => ({
          rank: index + 1,
          xp_total: user.total_xp || 0,
          xp_gained: user.total_xp || 0,
          movement: 0,
          users: {
            id: user.id,
            name: user.name,
            level: user.level,
            avatar_url: user.avatar_url,
            is_creator: user.is_creator,
            creator_tier: user.creator_tier
          }
        }));
      }
    }

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

// Get user's rank in leaderboard
router.get('/rank/:userId?', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req as AuthenticatedRequest).user.id;
    const { period = 'weekly' } = req.query;

    logger.debug('📊 Getting user rank:', { userId, period });

    // Try to get rank from new function first
    try {
      const { data, error } = await supabase.rpc('get_user_rank', {
        p_user_id: userId,
        p_period: period as string
      });

      if (data && !error) {
        return res.json({
          rank: data[0]?.user_rank || null,
          total_users: data[0]?.total_users || 0,
          user_xp: data[0]?.user_xp || 0,
          period_xp: data[0]?.period_xp || 0
        });
      }
    } catch (funcError) {
      logger.debug('Using fallback rank calculation');
    }

    // Fallback approach
    const { data: user } = await supabase
      .from('users')
      .select('total_xp')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count users with higher XP
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', user.total_xp);

    const rank = (count || 0) + 1;

    // Get total users with XP > 0
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_xp', 0);

    res.json({
      rank,
      total_users: totalUsers || 0,
      user_xp: user.total_xp,
      period_xp: user.total_xp // Fallback - same as total for now
    });

  } catch (error: unknown) {
    logger.error('Get user rank error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 