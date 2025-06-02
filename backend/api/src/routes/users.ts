import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}


const router = Router();

// Get user by ID (public profile)
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, level, total_xp, is_creator, creator_tier, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, limit = 20 } = req.query;

    let query = supabase
      .from('users')
      .select('id, name, avatar_url, level, total_xp, is_creator, creator_tier')
      .order('total_xp', { ascending: false })
      .limit(parseInt(limit as string));

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to search users' });
    }

    res.json({ users: users || [] });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow/unfollow user
router.post('/:userId/follow', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const followerId = (req as AuthenticatedRequest).user.id;

    if (followerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', targetUserId)
      .single();

    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', targetUserId);

      if (error) {
        return res.status(500).json({ error: 'Failed to unfollow user' });
      }

      res.json({ message: 'User unfollowed successfully', following: false });
    } else {
      // Follow
      const { error } = await supabase
        .from('user_follows')
        .insert([{
          follower_id: followerId,
          following_id: targetUserId
        }]);

      if (error) {
        return res.status(500).json({ error: 'Failed to follow user' });
      }

      res.json({ message: 'User followed successfully', following: true });
    }
  } catch (error) {
    logger.error('Follow/unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's followers
router.get('/:userId/followers', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const { data: followers, error } = await supabase
      .from('user_follows')
      .select(`
        created_at,
        follower:follower_id (
          id, name, avatar_url, level, total_xp
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch followers' });
    }

    res.json({ followers: followers || [] });
  } catch (error) {
    logger.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's following
router.get('/:userId/following', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const { data: following, error } = await supabase
      .from('user_follows')
      .select(`
        created_at,
        following:following_id (
          id, name, avatar_url, level, total_xp
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch following' });
    }

    res.json({ following: following || [] });
  } catch (error) {
    logger.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 