import { supabase } from '../index';

interface SocialStats {
  followers: number;
  following: number;
  recipes_shared: number;
  total_likes: number;
}

interface Activity {
  id: string;
  user_id: string;
  type: 'recipe_created' | 'achievement_earned' | 'challenge_completed' | 'recipe_liked';
  data: any;
  created_at: string;
}

export class SocialService {
  // Follow a user
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }
    
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: followerId,
          following_id: followingId
        });
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Already following this user');
        }
        throw error;
      }
      
      // Create activity
      await this.createActivity(followerId, 'started_following', {
        following_id: followingId
      });
    } catch (error) {
      console.error('Follow user error:', error);
      throw error;
    }
  }
  
  // Unfollow a user
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Unfollow user error:', error);
      throw error;
    }
  }
  
  // Get user's followers
  async getFollowers(userId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          follower:follower_id (
            id,
            name,
            avatar_url,
            level,
            is_creator
          )
        `)
        .eq('following_id', userId)
        .range(offset, offset + limit - 1);
      
      if (error) {throw error;}
      
      return data || [];
    } catch (error) {
      console.error('Get followers error:', error);
      throw error;
    }
  }
  
  // Get who user is following
  async getFollowing(userId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          following:following_id (
            id,
            name,
            avatar_url,
            level,
            is_creator
          )
        `)
        .eq('follower_id', userId)
        .range(offset, offset + limit - 1);
      
      if (error) {throw error;}
      
      return data || [];
    } catch (error) {
      console.error('Get following error:', error);
      throw error;
    }
  }
  
  // Check if user follows another user
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      
      if (error) {throw error;}
      
      return (count || 0) > 0;
    } catch (error) {
      console.error('Check following error:', error);
      return false;
    }
  }
  
  // Get social stats for a user
  async getUserStats(userId: string): Promise<SocialStats> {
    try {
      // Get followers count
      const { count: followers } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      
      // Get following count
      const { count: following } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      
      // Get recipes shared count
      const { count: recipes_shared } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('is_published', true);
      
      // Get total likes received
      const { data: likesData } = await supabase
        .from('recipes')
        .select('rating_count')
        .eq('created_by', userId);
      
      const total_likes = likesData?.reduce((sum, recipe) => sum + (recipe.rating_count || 0), 0) || 0;
      
      return {
        followers: followers || 0,
        following: following || 0,
        recipes_shared: recipes_shared || 0,
        total_likes
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw error;
    }
  }
  
  // Get activity feed for a user
  async getActivityFeed(userId: string, limit = 20, offset = 0): Promise<Activity[]> {
    try {
      // Get users that this user follows
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      const followingIds = followingData?.map(f => f.following_id) || [];
      followingIds.push(userId); // Include own activities
      
      // Get activities from followed users
      const { data: activities, error } = await supabase
        .from('user_activities')
        .select(`
          *,
          user:user_id (
            id,
            name,
            avatar_url,
            level
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {throw error;}
      
      return activities || [];
    } catch (error) {
      console.error('Get activity feed error:', error);
      throw error;
    }
  }
  
  // Create activity entry
  private async createActivity(userId: string, type: string, data: any): Promise<void> {
    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          type,
          data,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Create activity error:', error);
      // Don't throw - activity creation shouldn't break main flow
    }
  }
  
  // Share recipe
  async shareRecipe(recipeId: string, userId: string, message?: string): Promise<void> {
    try {
      await this.createActivity(userId, 'recipe_shared', {
        recipe_id: recipeId,
        message
      });
    } catch (error) {
      console.error('Share recipe error:', error);
      throw error;
    }
  }
  
  // Get trending creators
  async getTrendingCreators(limit = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          avatar_url,
          level,
          creator_tier,
          creator_bio,
          creator_specialty
        `)
        .eq('is_creator', true)
        .order('creator_tier', { ascending: false })
        .limit(limit);
      
      if (error) {throw error;}
      
      // Add follower counts
      const creatorsWithStats = await Promise.all(
        (data || []).map(async (creator) => {
          const stats = await this.getUserStats(creator.id);
          return { ...creator, ...stats };
        })
      );
      
      // Sort by followers
      return creatorsWithStats.sort((a, b) => b.followers - a.followers);
    } catch (error) {
      console.error('Get trending creators error:', error);
      throw error;
    }
  }
  
  // Get suggested users to follow
  async getSuggestedUsers(userId: string, limit = 5): Promise<any[]> {
    try {
      // Get current user's follows
      const { data: currentFollows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      const followingIds = currentFollows?.map(f => f.following_id) || [];
      followingIds.push(userId); // Exclude self
      
      // Get active users not already followed
      const { data: suggestions, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          avatar_url,
          level,
          is_creator
        `)
        .not('id', 'in', `(${followingIds.join(',')})`)
        .order('total_xp', { ascending: false })
        .limit(limit);
      
      if (error) {throw error;}
      
      return suggestions || [];
    } catch (error) {
      console.error('Get suggested users error:', error);
      throw error;
    }
  }
}

export const socialService = new SocialService(); 