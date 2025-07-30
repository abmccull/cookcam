import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";
import getEnvVars from "../config/env";
import logger from "../utils/logger";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type:
    | "streak"
    | "achievement"
    | "social"
    | "recipe"
    | "challenge"
    | "reminder";
  data?: any;
  scheduledTime?: Date;
}

interface UserBehavior {
  lastCookTime?: string;
  preferredCookingTimes: string[];
  averageSessionLength: number;
  favoriteCategories: string[];
  engagementLevel: "high" | "medium" | "low";
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
    this.configure();
  }

  public static getInstance(): SmartNotificationService {
    if (!SmartNotificationService.instance) {
      SmartNotificationService.instance = new SmartNotificationService();
    }
    return SmartNotificationService.instance;
  }

  private async configure() {
    await this.requestPermissions();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  }

  async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      logger.debug("Failed to get push token for push notification!");
      return false;
    }
    return true;
  }

  async registerForPushNotificationsAsync() {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      logger.debug("Expo Push Token:", token);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && token) {
        const { error } = await supabase
          .from("users")
          .update({ push_token: token })
          .eq("id", user.id);
        if (error) {
          logger.error("Error saving push token:", error);
        }
      }
      return token;
    } catch (e) {
      logger.error("Failed to get push token", e);
      return null;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: Record<string, unknown>,
    delaySeconds: number,
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: {
        seconds: delaySeconds,
        channelId: "default",
      },
    });
  }

  cancelAllLocalNotifications() {
    Notifications.cancelAllScheduledNotificationsAsync();
  }

  private async loadUserBehavior() {
    try {
      const behaviorData = await AsyncStorage.getItem("userBehavior");
      if (behaviorData) {
        this.userBehavior = JSON.parse(behaviorData);
      } else {
        // Initialize with defaults
        this.userBehavior = {
          preferredCookingTimes: ["18:00", "19:00"],
          averageSessionLength: 30,
          favoriteCategories: [],
          engagementLevel: "medium",
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
      logger.error("Error loading user behavior:", error);
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
      this.userBehavior.engagementLevel = "high";
    } else if (sessionData.recipesViewed.length > 3) {
      this.userBehavior.engagementLevel = "medium";
    }

    // Save updated behavior
    await AsyncStorage.setItem(
      "userBehavior",
      JSON.stringify(this.userBehavior),
    );
  }

  // Smart notification scheduling based on user behavior
  async scheduleSmartNotifications() {
    if (!this.userBehavior) {
      return;
    }

    // Cancel all existing notifications
    this.cancelAllLocalNotifications();

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
        this.userBehavior.preferredCookingTimes[0].split(":")[0],
        10,
      );
      nextReminder.setHours(preferredHour - 1); // 1 hour before usual time
    }

    this.scheduleNotification({
      id: "streak-reminder",
      title: "🔥 Keep Your Streak Alive!",
      message: "Cook something today to maintain your 7-day streak!",
      type: "streak",
      scheduledTime: nextReminder,
    });
  }

  private async scheduleAchievementAlerts() {
    // Check proximity to achievements
    const userStats = await this.getUserStats();

    if (userStats.recipesUntilNextBadge <= 2) {
      this.scheduleNotification({
        id: "achievement-proximity",
        title: "🏆 So Close to a Badge!",
        message: `Just ${userStats.recipesUntilNextBadge} more recipes for Master Chef badge!`,
        type: "achievement",
        scheduledTime: this.getOptimalNotificationTime(),
      });
    }
  }

  private async scheduleSocialNotifications() {
    // FOMO triggers
    const messages = [
      "👥 3 friends just claimed the viral Pasta recipe!",
      "🎉 Sarah just beat your weekly XP record!",
      "🔥 Mike is on a 10-day streak - can you beat it?",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.scheduleNotification({
      id: "social-fomo",
      title: "Your Friends Are Cooking! 👨‍🍳",
      message: randomMessage,
      type: "social",
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
      id: "recipe-suggestion",
      title: "🍝 Perfect for Tonight!",
      message:
        "Your favorite Creamy Pasta takes just 30 min - perfect for dinner!",
      type: "recipe",
      scheduledTime: dinnerTime,
    });
  }

  private async scheduleChallengeReminders() {
    // Weekly challenge reminder
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(20, 0, 0, 0); // Sunday 8 PM

    this.scheduleNotification({
      id: "challenge-reminder",
      title: "⏰ Challenge Ending Soon!",
      message: "Complete 2 more recipes to finish the Speed Chef challenge!",
      type: "challenge",
      scheduledTime: endOfWeek,
    });
  }

  private scheduleNotification(notification: NotificationData) {
    const scheduledTime =
      notification.scheduledTime || new Date(Date.now() + 3600000); // 1 hour from now

    this.scheduleLocalNotification(
      notification.title,
      notification.message,
      { type: notification.type, data: notification.data },
      (scheduledTime.getTime() - Date.now()) / 1000,
    );
  }

  private getOptimalNotificationTime(): Date {
    const now = new Date();
    const optimalTime = new Date();

    // Use preferred cooking time if available
    if (this.userBehavior?.preferredCookingTimes.length) {
      const preferredHour = parseInt(
        this.userBehavior.preferredCookingTimes[0].split(":")[0],
        10,
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
    preferences: Partial<UserBehavior["notificationPreferences"]>,
  ) {
    if (!this.userBehavior) {
      return;
    }

    this.userBehavior.notificationPreferences = {
      ...this.userBehavior.notificationPreferences,
      ...preferences,
    };

    await AsyncStorage.setItem(
      "userBehavior",
      JSON.stringify(this.userBehavior),
    );
    await this.scheduleSmartNotifications();
  }

  // Send immediate notification
  sendImmediateNotification(
    title: string,
    message: string,
    type: NotificationData["type"],
  ) {
    this.scheduleLocalNotification(title, message, { type }, 0);
  }

  // A/B Testing for notification messages
  getOptimizedMessage(
    type: NotificationData["type"],
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
    logger.debug(`Notification variant used: ${type} - Variant ${variantIndex}`);
  }
}

// Keep the rest of the user behavior tracking logic if needed,
// but remove direct push notification calls from here.
// For example, loadUserBehavior and trackUserEvent can remain if they
// are used for other purposes like analytics.

// Example of keeping user behavior logic (if needed elsewhere)
class UserBehaviorTracker {
  private userBehavior: { [key: string]: number } = {};
  private static instance: UserBehaviorTracker;

  private constructor() {
    this.loadUserBehavior();
  }

  public static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker();
    }
    return UserBehaviorTracker.instance;
  }

  async loadUserBehavior() {
    try {
      const storedBehavior = await AsyncStorage.getItem("user_behavior");
      if (storedBehavior) {
        this.userBehavior = JSON.parse(storedBehavior);
      }
    } catch (error) {
      logger.error("Failed to load user behavior:", error);
    }
  }

  async trackUserEvent(event: string) {
    this.userBehavior[event] = (this.userBehavior[event] || 0) + 1;
    try {
      await AsyncStorage.setItem(
        "user_behavior",
        JSON.stringify(this.userBehavior),
      );
    } catch (error) {
      logger.error("Failed to save user behavior:", error);
    }
  }
}

export default SmartNotificationService.getInstance();
export const userBehaviorTracker = UserBehaviorTracker.getInstance();
