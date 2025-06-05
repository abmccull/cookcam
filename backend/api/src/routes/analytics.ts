import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';
import { supabase } from '../index';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    is_admin?: boolean;
  };
}

const router = Router();

// Track user analytics events (using existing user_progress table)
router.post('/track', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { event_type, event_data, metadata, xp_gained = 0 } = req.body;
    const userId = req.user?.id;

    if (!event_type) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get current user data for total_xp calculation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('total_xp, level')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.error('Failed to fetch user data for analytics', { error: userError, userId });
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const currentTotalXp = userData?.total_xp || 0;
    const currentLevel = userData?.level || 1;
    const newTotalXp = currentTotalXp + xp_gained;

    // Calculate new level (simple formula: level = floor(total_xp / 100) + 1)
    const newLevel = Math.floor(newTotalXp / 100) + 1;

    // Insert analytics event into user_progress table
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        action: event_type,
        xp_gained,
        total_xp: newTotalXp,
        old_level: currentLevel,
        new_level: newLevel,
        metadata: {
          ...metadata,
          event_data,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to track analytics event', { error, userId, event_type });
      return res.status(500).json({ error: 'Failed to track event' });
    }

    // Update user's total XP and level if XP was gained
    if (xp_gained > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          total_xp: newTotalXp, 
          level: newLevel,
          xp: newTotalXp // Also update current XP
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('Failed to update user XP', { error: updateError, userId });
      }
    }

    logger.info('Analytics event tracked', { userId, event_type, eventId: data.id });

    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      event_id: data.id,
      level_up: newLevel > currentLevel
    });

  } catch (error) {
    logger.error('Error tracking analytics event', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics dashboard data using existing tables
router.get('/dashboard', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { timeframe = '7d' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Calculate date range based on timeframe
    let startDate: Date;
    const endDate = new Date();

    switch (timeframe) {
      case '1d':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch user progress events
    const { data: progressEvents, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    // Fetch scan activity
    const { data: scanEvents, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Fetch recipe generation sessions
    const { data: recipeEvents, error: recipeError } = await supabase
      .from('recipe_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (progressError || scanError || recipeError) {
      logger.error('Failed to fetch analytics dashboard data', { 
        progressError, scanError, recipeError, userId 
      });
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

    // Process analytics data
    const allEvents = [
      ...(progressEvents || []).map(e => ({ ...e, source: 'progress', type: e.action })),
      ...(scanEvents || []).map(e => ({ ...e, source: 'scan', type: 'scan' })),
      ...(recipeEvents || []).map(e => ({ ...e, source: 'recipe', type: 'recipe_generation' }))
    ];

    const eventCounts = allEvents.reduce((acc: Record<string, number>, event: any) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    // Group events by date for timeline
    const eventsByDate = allEvents.reduce((acc: Record<string, number>, event: any) => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (date) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {});

    // Calculate popular times (hour of day)
    const eventsByHour: Record<number, number> = {};
    allEvents.forEach((event: any) => {
      const hour = new Date(event.created_at).getHours();
      if (!isNaN(hour)) {
        eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
      }
    });

    // Most recent events
    const recentEvents = allEvents
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((event: any) => ({
        id: event.id,
        type: event.type,
        source: event.source,
        timestamp: event.created_at,
        data: event.metadata || event.scan_metadata || {}
      }));

    const analytics = {
      summary: {
        total_events: allEvents.length,
        unique_event_types: Object.keys(eventCounts).length,
        total_scans: scanEvents?.length || 0,
        total_recipes_generated: recipeEvents?.length || 0,
        timeframe,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      event_counts: eventCounts,
      timeline: eventsByDate,
      hourly_distribution: eventsByHour,
      recent_events: recentEvents
    };

    logger.info('Analytics dashboard data fetched', { userId, totalEvents: allEvents.length });

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error fetching analytics dashboard', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global analytics (admin only) using existing tables
router.get('/global', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Check if user has admin privileges
    if (!user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { timeframe = '7d' } = req.query;

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();

    switch (timeframe) {
      case '1d':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch global data from multiple tables
    const [progressResult, scanResult, recipeResult, userResult] = await Promise.all([
      supabase
        .from('user_progress')
        .select('user_id, action, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      supabase
        .from('scans')
        .select('user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      supabase
        .from('recipe_sessions')
        .select('user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      supabase
        .from('users')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    const progressEvents = progressResult.data || [];
    const scanEvents = scanResult.data || [];
    const recipeEvents = recipeResult.data || [];
    const newUsers = userResult.data || [];

    // Process global data
    const allUserIds = new Set([
      ...progressEvents.map(e => e.user_id),
      ...scanEvents.map(e => e.user_id),
      ...recipeEvents.map(e => e.user_id)
    ]);

    const totalEvents = progressEvents.length + scanEvents.length + recipeEvents.length;
    const actionCounts = progressEvents.reduce((acc: Record<string, number>, event: any) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {});

    const globalAnalytics = {
      summary: {
        total_events: totalEvents,
        active_users: allUserIds.size,
        new_users: newUsers.length,
        total_scans: scanEvents.length,
        total_recipes_generated: recipeEvents.length,
        avg_events_per_user: allUserIds.size > 0 ? (totalEvents / allUserIds.size).toFixed(2) : 0,
        timeframe
      },
      activity_distribution: {
        scans: scanEvents.length,
        recipe_generations: recipeEvents.length,
        progress_events: progressEvents.length
      },
      top_actions: Object.entries(actionCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([action, count]) => ({ action, count }))
    };

    res.json({
      success: true,
      data: globalAnalytics
    });

  } catch (error) {
    logger.error('Error fetching global analytics', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 