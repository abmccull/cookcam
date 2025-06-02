import { supabase } from '../index';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export class NotificationService {
  // Register device token
  async registerDevice(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,token'
        });
      
      if (error) {
        throw new Error(`Failed to register device: ${error.message}`);
      }
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }
  
  // Unregister device token
  async unregisterDevice(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('token', token);
      
      if (error) {
        throw new Error(`Failed to unregister device: ${error.message}`);
      }
    } catch (error) {
      console.error('Device unregistration error:', error);
      throw error;
    }
  }
  
  // Send notification to user
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Get user's active devices
      const { data: devices, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);
      
      if (error || !devices || devices.length === 0) {
        console.log(`No active devices for user ${userId}`);
        return;
      }
      
      // Send to all active devices
      const sendPromises = devices.map(device => 
        this.sendToDevice(device.token, device.platform, payload)
      );
      
      await Promise.allSettled(sendPromises);
      
      // Log notification
      await this.logNotification(userId, payload);
    } catch (error) {
      console.error('Send to user error:', error);
      throw error;
    }
  }
  
  // Send to specific device (mock implementation)
  private async sendToDevice(
    token: string, 
    platform: 'ios' | 'android', 
    payload: NotificationPayload
  ): Promise<void> {
    // In production, integrate with FCM/APNS
    console.log(`📱 Sending notification to ${platform} device:`, {
      token: token.substring(0, 10) + '...',
      payload
    });
    
    // Simulate sending
    return Promise.resolve();
  }
  
  // Send daily check-in reminder
  async sendDailyCheckInReminder(userId: string): Promise<void> {
    const payload: NotificationPayload = {
      title: '📸 Time for your daily check-in!',
      body: 'Show us what you\'re cooking today and keep your streak alive!',
      data: {
        type: 'daily_checkin',
        action: 'open_camera'
      },
      sound: 'default'
    };
    
    await this.sendToUser(userId, payload);
  }
  
  // Send challenge reminder
  async sendChallengeReminder(userId: string, challengeTitle: string, daysLeft: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '🎯 Challenge Update',
      body: `${daysLeft} days left in "${challengeTitle}"! Don\'t miss out on the rewards!`,
      data: {
        type: 'challenge_reminder',
        action: 'open_challenges'
      },
      sound: 'default'
    };
    
    await this.sendToUser(userId, payload);
  }
  
  // Send achievement unlocked
  async sendAchievementUnlocked(userId: string, achievementName: string, xpReward: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '🏆 Achievement Unlocked!',
      body: `You earned "${achievementName}" and ${xpReward} XP!`,
      data: {
        type: 'achievement',
        action: 'open_profile'
      },
      sound: 'achievement'
    };
    
    await this.sendToUser(userId, payload);
  }
  
  // Send streak at risk warning
  async sendStreakWarning(userId: string, currentStreak: number): Promise<void> {
    const payload: NotificationPayload = {
      title: '🔥 Your streak is at risk!',
      body: `Don\'t lose your ${currentStreak} day streak! Check in before midnight!`,
      data: {
        type: 'streak_warning',
        action: 'open_camera',
        urgency: 'high'
      },
      sound: 'warning'
    };
    
    await this.sendToUser(userId, payload);
  }
  
  // Send recipe suggestion
  async sendRecipeSuggestion(userId: string, recipeTitle: string): Promise<void> {
    const payload: NotificationPayload = {
      title: '👨‍🍳 New recipe suggestion!',
      body: `Based on your recent scans, try making "${recipeTitle}"`,
      data: {
        type: 'recipe_suggestion',
        action: 'open_recipes'
      },
      sound: 'default'
    };
    
    await this.sendToUser(userId, payload);
  }
  
  // Log notification for analytics
  private async logNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          title: payload.title,
          body: payload.body,
          type: payload.data?.type || 'general',
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Notification logging error:', error);
      // Don't throw - logging failure shouldn't stop notifications
    }
  }
  
  // Schedule notifications (to be called by cron job)
  async scheduleDaily(): Promise<void> {
    try {
      // Get all users with notifications enabled
      const { data: users, error } = await supabase
        .from('users')
        .select('id, notification_preferences')
        .eq('notifications_enabled', true);
      
      if (error || !users) {
        console.error('Failed to get users for notifications:', error);
        return;
      }
      
      // Send appropriate notifications
      for (const user of users) {
        const prefs = user.notification_preferences || {};
        
        // Daily check-in reminder
        if (prefs.daily_checkin !== false) {
          await this.sendDailyCheckInReminder(user.id);
        }
        
        // Check for expiring challenges
        // Add more scheduled notification logic here
      }
    } catch (error) {
      console.error('Schedule daily notifications error:', error);
    }
  }
}

export const notificationService = new NotificationService(); 