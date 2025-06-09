import { supabase } from './supabaseClient';

class GamificationService {
  private lastXPCall: { [key: string]: number } = {};
  private readonly XP_COOLDOWN = 5000; // 5 seconds between same action XP calls

  async addXP(xpAmount: number, action: string, metadata?: any) {
    // Rate limiting: prevent rapid duplicate XP calls
    const callKey = `${action}_${xpAmount}`;
    const now = Date.now();
    const lastCall = this.lastXPCall[callKey] || 0;
    
    if (now - lastCall < this.XP_COOLDOWN) {
      console.log(`⏸️ XP call rate limited for ${action} (${this.XP_COOLDOWN/1000}s cooldown)`);
      return {
        success: true,
        data: { message: 'XP call rate limited' }
      };
    }
    
    this.lastXPCall[callKey] = now;
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User not authenticated for XP addition');
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      console.log(`🎯 Calling Supabase add_user_xp function with:`, {
        xpAmount,
        action,
        userId: user.id,
        metadata: metadata || {}
      });

      // Call the 4-parameter version explicitly to avoid overloading issues
      // Use string metadata to differentiate from the 3-parameter version
      const { data, error } = await supabase.rpc('add_user_xp', {
        p_user_id: user.id,
        p_xp_amount: xpAmount,
        p_action: action,
        p_metadata: JSON.stringify(metadata || {})
      });

      if (error) {
        console.error('❌ Supabase add_user_xp error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Supabase add_user_xp success:', data);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Exception in addXP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }



  async checkStreak() {
    try {
      const { data, error } = await supabase.rpc('check_user_streak');

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProgress() {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get user stats from users table
      const { data: userStats, error: statsError } = await supabase
        .from('users')
        .select('level, xp, total_xp, streak_current, streak_shields')
        .eq('id', user.id)
        .single();

      if (statsError) {
        return {
          success: false,
          error: statsError.message
        };
      }

      // Get user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get user achievements  
      const { data: achievements, error: achievementsError } = await supabase
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
        .eq('user_id', user.id);

      return {
        success: true,
        data: {
          user_stats: userStats,
          recent_progress: progress || {},
          achievements: achievements || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getLeaderboard(type = 'global', period = 'weekly') {
    try {
      // FIXED: Query users table directly instead of empty leaderboards table
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, level, total_xp, is_creator, creator_tier')
        .gt('total_xp', 0) // Only users with XP
        .order('total_xp', { ascending: false })
        .limit(50);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Transform to leaderboard format with ranks
      const leaderboard = (users || []).map((user, index) => ({
        rank: index + 1,
        xp_total: user.total_xp,
        movement: 0, // Static for now
        users: {
          id: user.id,
          name: user.name,
          avatar_url: user.avatar_url,
          level: user.level,
          is_creator: user.is_creator,
          creator_tier: user.creator_tier
        }
      }));

      return {
        success: true,
        data: {
          leaderboard,
          metadata: {
            type,
            period,
            updated_at: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async openMysteryBox() {
    try {
      const { data, error } = await supabase.rpc('open_mystery_box');

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getMysteryBoxHistory() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      const { data, error } = await supabase
        .from('mystery_box_history')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false })
        .limit(20);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const gamificationService = new GamificationService();
export default gamificationService; 