import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { logger } from '../utils/logger';

const router = Router();

// Open mystery box with proper randomization
router.post('/open', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 25% chance (1/4) for mystery box to be available
    const boxAvailable = Math.random() < 0.25;

    if (!boxAvailable) {
      return res.json({
        box_available: false,
        message: 'No mystery box available right now. Try again later!',
      });
    }

    // Call your SQL function to generate reward
    const { data: reward, error } = await supabase.rpc('open_mystery_box', {
      p_user_id: user_id,
    });

    if (error) {
      logger.error('Error opening mystery box:', error);
      return res.status(500).json({ error: 'Failed to open mystery box' });
    }

    // Enhanced reward response with proper tier information
    const enhancedReward = {
      ...reward,
      box_available: true,
      opened_at: new Date().toISOString(),
      rarity_info: getRarityInfo(reward.rarity),
    };

    res.json(enhancedReward);
  } catch (error) {
    logger.error('Mystery box error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mystery box history for user
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const { data: history, error } = await supabase
      .from('mystery_boxes')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch mystery box history' });
    }

    res.json({
      history: history || [],
      total_boxes_opened: history?.length || 0,
    });
  } catch (error) {
    logger.error('Mystery box history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mystery box statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data: stats, error } = await supabase
      .from('mystery_boxes')
      .select('rarity, reward_type')
      .order('opened_at', { ascending: false })
      .limit(1000); // Last 1000 boxes for stats

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    // Calculate rarity distribution
    const rarityCount = {
      common: 0,
      uncommon: 0,
      rare: 0,
      legendary: 0,
    };

    const rewardTypeCount: { [key: string]: number } = {};

    stats?.forEach((box) => {
      rarityCount[box.rarity as keyof typeof rarityCount]++;
      rewardTypeCount[box.reward_type] = (rewardTypeCount[box.reward_type] || 0) + 1;
    });

    const total = stats?.length || 0;

    res.json({
      total_boxes: total,
      rarity_distribution: {
        common: {
          count: rarityCount.common,
          percentage: ((rarityCount.common / total) * 100).toFixed(1),
        },
        uncommon: {
          count: rarityCount.uncommon,
          percentage: ((rarityCount.uncommon / total) * 100).toFixed(1),
        },
        rare: {
          count: rarityCount.rare,
          percentage: ((rarityCount.rare / total) * 100).toFixed(1),
        },
        legendary: {
          count: rarityCount.legendary,
          percentage: ((rarityCount.legendary / total) * 100).toFixed(1),
        },
      },
      reward_type_distribution: rewardTypeCount,
    });
  } catch (error) {
    logger.error('Mystery box stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get rarity information
function getRarityInfo(rarity: string) {
  const rarityData = {
    common: {
      color: '#4CAF50',
      glow: 'rgba(76, 175, 80, 0.3)',
      probability: '90%',
      description: 'Common rewards appear frequently',
    },
    uncommon: {
      color: '#2196F3',
      glow: 'rgba(33, 150, 243, 0.3)',
      probability: '9%',
      description: 'Uncommon rewards are more valuable',
    },
    rare: {
      color: '#9C27B0',
      glow: 'rgba(156, 39, 176, 0.3)',
      probability: '0.9%',
      description: 'Rare rewards include premium features',
    },
    legendary: {
      color: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.5)',
      probability: '0.1%',
      description: 'Legendary rewards are extremely rare!',
    },
  };

  return rarityData[rarity as keyof typeof rarityData] || rarityData.common;
}

export default router;
