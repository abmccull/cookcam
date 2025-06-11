import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type:
    | 'streak'
    | 'achievement'
    | 'social'
    | 'recipe'
    | 'challenge'
    | 'reminder';
  data?: any;
  scheduledTime?: Date;
}

interface UserBehavior {
  lastCookTime?: string;
  preferredCookingTimes: string[];
  averageSessionLength: number;
  favoriteCategories: string[];
  engagementLevel: 'high' | 'medium' | 'low';
  notificationPreferences: {
    streaks: boolean;
    achievements: boolean;
    social: boolean;
    recipes: boolean;
    challenges: boolean;
    reminders: boolean;
  };
}

class SmartNotificationService {
  private static instance: SmartNotificationService;
  private userBehavior: UserBehavior | null = null;
  private notificationQueue: NotificationData[] = [];

  private constructor() {
    this.initializeService();
  }

  static getInstance(): SmartNotificationService {
    if (!SmartNotificationService.instance) {
      SmartNotificationService.instance = new SmartNotificationService();
    }
    return SmartNotificationService.instance;
  }

  private async initializeService() {
    // Configure push notifications
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'cookcam-default',
          channelName: 'CookCam Notifications',
          channelDescription: 'General notifications from CookCam',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        created => console.log(`createChannel returned '${created}'`),
      );
    }

    // Load user behavior data
    await this.loadUserBehavior();
  }

  private async loadUserBehavior() {
    try {
      const behaviorData = await AsyncStorage.getItem('userBehavior');
      if (behaviorData) {
        this.userBehavior = JSON.parse(behaviorData);
      } else {
        // Initialize with defaults
        this.userBehavior = {
          preferredCookingTimes: ['18:00', '19:00'],
          averageSessionLength: 30,
          favoriteCategories: [],
          engagementLevel: 'medium',
          notificationPreferences: {
            streaks: true,
            achievements: true,
            social: true,
            recipes: true,
            challenges: true,
            reminders: true,
          },
        };
      }
    } catch (error) {
      console.error('Error loading user behavior:', error);
    }
  }

  // Analyze user patterns and update behavior profile
  async analyzeUserBehavior(sessionData: {
    cookingTime: Date;
    sessionLength: number;
    recipesViewed: string[];
    recipesCooked: string[];
  }) {
    if (!this.userBehavior) {
      return;
    }

    // Update last cook time
    this.userBehavior.lastCookTime = sessionData.cookingTime.toISOString();

    // Update average session length
    const currentAvg = this.userBehavior.averageSessionLength;
    this.userBehavior.averageSessionLength =
      currentAvg * 0.8 + sessionData.sessionLength * 0.2;

    // Analyze cooking time patterns
    const cookHour = sessionData.cookingTime.getHours();
    const timeString = `${cookHour}:00`;
    if (!this.userBehavior.preferredCookingTimes.includes(timeString)) {
      this.userBehavior.preferredCookingTimes.push(timeString);
    }

    // Update engagement level
    if (sessionData.recipesCooked.length > 0) {
      this.userBehavior.engagementLevel = 'high';
    } else if (sessionData.recipesViewed.length > 3) {
      this.userBehavior.engagementLevel = 'medium';
    }

    // Save updated behavior
    await AsyncStorage.setItem(
      'userBehavior',
      JSON.stringify(this.userBehavior),
    );
  }

  // Smart notification scheduling based on user behavior
  async scheduleSmartNotifications() {
    if (!this.userBehavior) {
      return;
    }

    // Cancel all existing notifications
    PushNotification.cancelAllLocalNotifications();

    // Schedule based on notification preferences
    const prefs = this.userBehavior.notificationPreferences;

    // Streak reminders
    if (prefs.streaks) {
      await this.scheduleStreakReminder();
    }

    // Achievement proximity alerts
    if (prefs.achievements) {
      await this.scheduleAchievementAlerts();
    }

    // Social notifications
    if (prefs.social) {
      await this.scheduleSocialNotifications();
    }

    // Recipe suggestions
    if (prefs.recipes) {
      await this.scheduleRecipeSuggestions();
    }

    // Challenge reminders
    if (prefs.challenges) {
      await this.scheduleChallengeReminders();
    }
  }

  private async scheduleStreakReminder() {
    const lastCook = this.userBehavior?.lastCookTime
      ? new Date(this.userBehavior.lastCookTime)
      : new Date();

    const nextReminder = new Date(lastCook);
    nextReminder.setDate(nextReminder.getDate() + 1);

    // Set reminder for preferred cooking time
    if (this.userBehavior?.preferredCookingTimes.length) {
      const preferredHour = parseInt(
        this.userBehavior.preferredCookingTimes[0].split(':')[0],
        10
      );
      nextReminder.setHours(preferredHour - 1); // 1 hour before usual time
    }

    this.scheduleNotification({
      id: 'streak-reminder',
      title: '🔥 Keep Your Streak Alive!',
      message: 'Cook something today to maintain your 7-day streak!',
      type: 'streak',
      scheduledTime: nextReminder,
    });
  }

  private async scheduleAchievementAlerts() {
    // Check proximity to achievements
    const userStats = await this.getUserStats();

    if (userStats.recipesUntilNextBadge <= 2) {
      this.scheduleNotification({
        id: 'achievement-proximity',
        title: '🏆 So Close to a Badge!',
        message: `Just ${userStats.recipesUntilNextBadge} more recipes for Master Chef badge!`,
        type: 'achievement',
        scheduledTime: this.getOptimalNotificationTime(),
      });
    }
  }

  private async scheduleSocialNotifications() {
    // FOMO triggers
    const messages = [
      '👥 3 friends just claimed the viral Pasta recipe!',
      '🎉 Sarah just beat your weekly XP record!',
      '🔥 Mike is on a 10-day streak - can you beat it?',
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.scheduleNotification({
      id: 'social-fomo',
      title: 'Your Friends Are Cooking! 👨‍🍳',
      message: randomMessage,
      type: 'social',
      scheduledTime: this.getOptimalNotificationTime(),
    });
  }

  private async scheduleRecipeSuggestions() {
    const dinnerTime = new Date();
    dinnerTime.setHours(17, 0, 0, 0); // 5 PM

    if (dinnerTime < new Date()) {
      dinnerTime.setDate(dinnerTime.getDate() + 1);
    }

    this.scheduleNotification({
      id: 'recipe-suggestion',
      title: '🍝 Perfect for Tonight!',
      message:
        'Your favorite Creamy Pasta takes just 30 min - perfect for dinner!',
      type: 'recipe',
      scheduledTime: dinnerTime,
    });
  }

  private async scheduleChallengeReminders() {
    // Weekly challenge reminder
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(20, 0, 0, 0); // Sunday 8 PM

    this.scheduleNotification({
      id: 'challenge-reminder',
      title: '⏰ Challenge Ending Soon!',
      message: 'Complete 2 more recipes to finish the Speed Chef challenge!',
      type: 'challenge',
      scheduledTime: endOfWeek,
    });
  }

  private scheduleNotification(notification: NotificationData) {
    const scheduledTime =
      notification.scheduledTime || new Date(Date.now() + 3600000); // 1 hour from now

    PushNotification.localNotificationSchedule({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      date: scheduledTime,
      channelId: 'cookcam-default',
      userInfo: {
        type: notification.type,
        data: notification.data,
      },
      // iOS specific
      category: notification.type,
      // Android specific
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: notification.message,
      subText: 'CookCam',
      vibrate: true,
      vibration: 300,
      priority: 'high',
      visibility: 'public',
    });
  }

  private getOptimalNotificationTime(): Date {
    const now = new Date();
    const optimalTime = new Date();

    // Use preferred cooking time if available
    if (this.userBehavior?.preferredCookingTimes.length) {
      const preferredHour = parseInt(
        this.userBehavior.preferredCookingTimes[0].split(':')[0],
        10
      );
      optimalTime.setHours(preferredHour - 2); // 2 hours before usual cooking time
    } else {
      // Default to 5 PM
      optimalTime.setHours(17, 0, 0, 0);
    }

    // If time has passed today, schedule for tomorrow
    if (optimalTime < now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    return optimalTime;
  }

  private async getUserStats() {
    // Mock implementation - would connect to actual user stats
    return {
      recipesUntilNextBadge: 2,
      currentStreak: 7,
      weeklyXP: 450,
      friendsActive: 3,
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(
    preferences: Partial<UserBehavior['notificationPreferences']>,
  ) {
    if (!this.userBehavior) {
      return;
    }

    this.userBehavior.notificationPreferences = {
      ...this.userBehavior.notificationPreferences,
      ...preferences,
    };

    await AsyncStorage.setItem(
      'userBehavior',
      JSON.stringify(this.userBehavior),
    );
    await this.scheduleSmartNotifications();
  }

  // Send immediate notification
  sendImmediateNotification(
    title: string,
    message: string,
    type: NotificationData['type'],
  ) {
    PushNotification.localNotification({
      title,
      message,
      channelId: 'cookcam-default',
      userInfo: {type},
      // iOS specific
      category: type,
      // Android specific
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
      bigText: message,
      subText: 'CookCam',
      vibrate: true,
      vibration: 300,
      priority: 'high',
      visibility: 'public',
    });
  }

  // A/B Testing for notification messages
  getOptimizedMessage(
    type: NotificationData['type'],
    variants: string[],
  ): string {
    // In production, this would use actual A/B testing service
    // For now, random selection with tracking
    const selectedIndex = Math.floor(Math.random() * variants.length);
    const selectedMessage = variants[selectedIndex];

    // Track which variant was used
    this.trackNotificationVariant(type, selectedIndex);

    return selectedMessage;
  }

  private async trackNotificationVariant(type: string, variantIndex: number) {
    // Track in analytics service
    console.log(`Notification variant used: ${type} - Variant ${variantIndex}`);
  }
}

export default SmartNotificationService.getInstance();
