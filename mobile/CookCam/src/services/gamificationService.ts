import {supabase} from './supabaseClient';

interface User {
  id: string;
  name?: string;
  avatar_url?: string;
  level?: number;
  total_xp?: number;
  is_creator?: boolean;
  creator_tier?: number;
}

interface LeaderboardEntry {
  rank: number;
  xp_total: number;
  xp_gained: number;
  users: User;
}

interface LeaderboardResponse {
  success: boolean;
  data?: {
    leaderboard: LeaderboardEntry[];
    metadata: {
      type: string;
      period: string;
      updated_at: string;
      note?: string;
    };
  };
  error?: string;
}

class GamificationService {
  private lastXPCall: {[key: string]: number} = {};
  private readonly XP_COOLDOWN = 5000; // 5 seconds between same action XP calls

  async addXP(userId: string, amount: number, reason: string, _metadata?: any) {
    try {
      console.log(`🎮 Adding ${amount} XP for action: ${reason}`);

      const callKey = `${reason}_${amount}`;
      const now = Date.now();

      // Prevent spam calls for the same action
      if (
        this.lastXPCall[callKey] &&
        now - this.lastXPCall[callKey] < this.XP_COOLDOWN
      ) {
        console.log(`⏳ XP call for ${reason} is on cooldown`);
        return {success: false, error: 'Action on cooldown'};
      }

      this.lastXPCall[callKey] = now;

      // Get current user from auth
      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ No authenticated user found');
        return {success: false, error: 'User not authenticated'};
      }

      // Get current user data first
      const {data: currentUser, error: getUserError} = await supabase
        .from('users')
        .select('total_xp, xp, level')
        .eq('id', user.id)
        .single();

      if (getUserError) {
        console.error('❌ Error getting current user data:', getUserError);
        return {success: false, error: getUserError.message};
      }

      // Calculate new XP values
      const newTotalXP = (currentUser.total_xp || 0) + amount;
      const newXP = (currentUser.xp || 0) + amount;

      // Update user's XP
      const {data, error} = await supabase
        .from('users')
        .update({
          total_xp: newTotalXP,
          xp: newXP,
        })
        .eq('id', user.id)
        .select('total_xp, xp, level')
        .single();

      if (error) {
        console.error('❌ Error adding XP:', error);
        return {success: false, error: error.message};
      }

      console.log(`✅ Added ${amount} XP. New total: ${data.total_xp}`);

      return {
        success: true,
        data: {
          xp_gained: amount,
          total_xp: data.total_xp,
          level: data.level,
        },
      };
    } catch (error) {
      console.error('❌ Unexpected error adding XP:', error);
      return {success: false, error: 'Failed to add XP'};
    }
  }

  async checkStreak() {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (!user) {
        return {success: false, error: 'User not authenticated'};
      }

      // For now, return a simple streak response
      return {
        success: true,
        data: {
          current_streak: 1,
          longest_streak: 1,
          last_check_in: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error checking streak:', error);
      return {success: false, error: 'Failed to check streak'};
    }
  }

  async getProgress() {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (!user) {
        return {success: false, error: 'User not authenticated'};
      }

      const {data, error} = await supabase
        .from('users')
        .select('total_xp, xp, level')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error getting progress:', error);
        return {success: false, error: error.message};
      }

      return {
        success: true,
        data: {
          total_xp: data.total_xp || 0,
          current_xp: data.xp || 0,
          level: data.level || 1,
        },
      };
    } catch (error) {
      console.error('❌ Error getting progress:', error);
      return {success: false, error: 'Failed to get progress'};
    }
  }

  async getLeaderboard(
    type: 'xp' | 'cooking_streak' | 'recipes_completed' = 'xp',
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'allTime' = 'allTime',
  ): Promise<LeaderboardResponse> {
    try {
      console.log(`🏆 Fetching ${type} leaderboard for ${period}`);

      // For simplicity, always use the users table with total_xp
      const {data, error} = await supabase
        .from('users')
        .select(
          'id, name, avatar_url, level, total_xp, is_creator, creator_tier',
        )
        .gt('total_xp', 0)
        .order('total_xp', {ascending: false})
        .limit(50);

      if (error) {
        console.error('❌ Error fetching leaderboard:', error);
        return {success: false, error: error.message};
      }

      const leaderboard = (data || [])
        .filter(user => (user.total_xp || 0) > 0)
        .map((user, index) => ({
          rank: index + 1,
          xp_total: user.total_xp || 0,
          xp_gained: 0, // Simplified - no period-specific tracking
          users: {
            id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            level: user.level,
            is_creator: user.is_creator,
            creator_tier: user.creator_tier,
          },
        }));

      console.log(`✅ Leaderboard fetched: ${leaderboard.length} entries`);

      return {
        success: true,
        data: {
          leaderboard,
          metadata: {
            type,
            period,
            updated_at: new Date().toISOString(),
            note: 'Simplified leaderboard based on total XP',
          },
        },
      };
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      return {success: false, error: 'Failed to get leaderboard'};
    }
  }

  async unlockBadge(badgeId: string, metadata?: any) {
    try {
      console.log(`🏅 Unlocking badge: ${badgeId}`);

      const {
        data: {user},
      } = await supabase.auth.getUser();

      if (!user) {
        return {success: false, error: 'User not authenticated'};
      }

      // For now, just log the badge unlock
      console.log(`✅ Badge ${badgeId} unlocked for user ${user.id}`);

      return {
        success: true,
        data: {
          badge_id: badgeId,
          unlocked_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ Error unlocking badge:', error);
      return {success: false, error: 'Failed to unlock badge'};
    }
  }

  async getUserRank(userId?: string) {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        return {success: false, error: 'User not found'};
      }

      // Get user's total XP
      const {data: userData, error: userError} = await supabase
        .from('users')
        .select('total_xp')
        .eq('id', targetUserId)
        .single();

      if (userError || !userData) {
        return {success: false, error: 'User not found'};
      }

      // Count users with higher XP to determine rank
      const {count, error: countError} = await supabase
        .from('users')
        .select('*', {count: 'exact', head: true})
        .gt('total_xp', userData.total_xp || 0);

      if (countError) {
        return {success: false, error: countError.message};
      }

      const rank = (count || 0) + 1;

      return {
        success: true,
        data: {
          rank,
          total_xp: userData.total_xp || 0,
        },
      };
    } catch (error) {
      console.error('❌ Error getting user rank:', error);
      return {success: false, error: 'Failed to get user rank'};
    }
  }

  async loadLeaderboard(type: string, period: string, _metadata?: any) {
    // Implementation of loadLeaderboard method
  }
}

export const gamificationService = new GamificationService();
export default gamificationService;
