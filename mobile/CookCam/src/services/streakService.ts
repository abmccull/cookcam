import { supabase } from "./supabaseClient";
import logger from "../utils/logger";

export class StreakService {
  /**
   * Updates the user's streak when they cook a recipe
   */
  static async updateStreak(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("update_user_streak", {
        p_user_id: userId,
      });

      if (error) {
        logger.error("Failed to update streak:", error);
        return false;
      }

      logger.info("Streak updated successfully");
      return true;
    } catch (error) {
      logger.error("Error updating streak:", error);
      return false;
    }
  }

  /**
   * Gets the user's current streak data
   */
  static async getStreakData(userId: string) {
    try {
      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error("Failed to get streak data:", error);
      return null;
    }
  }

  /**
   * Gets the user's cooking history for a date range
   */
  static async getCookingHistory(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("daily_cooks")
        .select("*")
        .eq("user_id", userId)
        .gte("cook_date", startDate)
        .lte("cook_date", endDate)
        .order("cook_date", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error("Failed to get cooking history:", error);
      return [];
    }
  }

  /**
   * Uses a freeze token to maintain streak
   */
  static async useFreezeToken(userId: string, date: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("use_freeze_token", {
        p_user_id: userId,
        p_date: date,
      });

      if (error) {
        logger.error("Failed to use freeze token:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      logger.error("Error using freeze token:", error);
      return false;
    }
  }

  /**
   * Checks if user has cooked today
   */
  static async hasCookedToday(userId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_cooks")
        .select("id")
        .eq("user_id", userId)
        .eq("cook_date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error("Failed to check if cooked today:", error);
      return false;
    }
  }

  /**
   * Gets streak milestones and rewards
   */
  static getStreakMilestones() {
    return [
      {
        days: 3,
        name: "Starter Chef",
        reward: "10 XP",
        description: "Cook for 3 days in a row",
      },
      {
        days: 7,
        name: "Week Warrior",
        reward: "50 XP + Freeze Token",
        description: "Complete a full week",
      },
      {
        days: 14,
        name: "Fortnight Fighter",
        reward: "100 XP + Recipe Pack",
        description: "Two weeks of dedication",
      },
      {
        days: 30,
        name: "Monthly Master",
        reward: "Exclusive Recipes + Badge",
        description: "A full month of cooking",
      },
      {
        days: 60,
        name: "Culinary Champion",
        reward: "Creator Features Access",
        description: "Two months strong",
      },
      {
        days: 100,
        name: "Century Chef",
        reward: "Lifetime Achievement Badge",
        description: "100 days of culinary excellence",
      },
      {
        days: 365,
        name: "Legendary Chef",
        reward: "Hall of Fame + Special Title",
        description: "A full year of cooking mastery",
      },
    ];
  }

  /**
   * Awards milestone rewards
   */
  static async checkAndAwardMilestones(userId: string, currentStreak: number) {
    const milestones = this.getStreakMilestones();

    for (const milestone of milestones) {
      if (currentStreak === milestone.days) {
        // Log achievement (you can expand this to actually award XP, badges, etc.)
        logger.info(`User ${userId} reached ${milestone.name} milestone!`);

        // TODO: Award XP, unlock features, send notifications, etc.
        // This would integrate with your gamification system
      }
    }
  }
}
