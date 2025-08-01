import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Calendar, Shield, Flame, Lock, Gift, Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useGamification } from "../context/GamificationContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseClient";
import logger from "../utils/logger";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_cook_date: string | null;
  freeze_tokens_used: number;
  total_freeze_tokens: number;
}

interface DailyCook {
  cook_date: string;
  freeze_used: boolean;
  recipes_cooked: number;
  xp_earned: number;
}

interface StreakReward {
  days: number;
  title: string;
  reward: string;
  icon: string;
  earned: boolean;
}

const StreakCalendar: React.FC = () => {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [dailyCooks, setDailyCooks] = useState<DailyCook[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRewards, setShowRewards] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shieldScale = useRef(new Animated.Value(1)).current;

  const streakRewards: StreakReward[] = [
    {
      days: 7,
      title: "Week Warrior",
      reward: "50 XP + Shield",
      icon: "🔥",
      earned: (streakData?.current_streak || 0) >= 7,
    },
    {
      days: 30,
      title: "Monthly Master",
      reward: "Exclusive Recipes",
      icon: "💎",
      earned: (streakData?.current_streak || 0) >= 30,
    },
    {
      days: 100,
      title: "Century Chef",
      reward: "Creator Features",
      icon: "👑",
      earned: (streakData?.current_streak || 0) >= 100,
    },
  ];

  useEffect(() => {
    if (user) {
      loadStreakData();
      startAnimations();
    }
  }, [user]);

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Pulse animation for active streak
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const loadStreakData = async () => {
    try {
      setLoading(true);

      // Get user's streak data
      const { data: streak, error: streakError } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (streakError && streakError.code !== "PGRST116") {
        throw streakError;
      }

      // If no streak exists, create one
      if (!streak) {
        const { data: newStreak, error: createError } = await supabase
          .from("user_streaks")
          .insert({
            user_id: user?.id,
            current_streak: 0,
            longest_streak: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        setStreakData(newStreak);
      } else {
        setStreakData(streak);
      }

      // Get this month's cooking records
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      );

      const { data: cooks, error: cooksError } = await supabase
        .from("daily_cooks")
        .select("*")
        .eq("user_id", user?.id)
        .gte("cook_date", startOfMonth.toISOString().split("T")[0])
        .lte("cook_date", endOfMonth.toISOString().split("T")[0])
        .order("cook_date", { ascending: true });

      if (cooksError) throw cooksError;
      setDailyCooks(cooks || []);
    } catch (error) {
      logger.error("Failed to load streak data:", error);
      Alert.alert("Error", "Failed to load streak data");
    } finally {
      setLoading(false);
    }
  };

  const handleUseFreeze = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (
        !streakData ||
        streakData.freeze_tokens_used >= streakData.total_freeze_tokens
      ) {
        Alert.alert(
          "No Shields Available",
          "You have used all your streak shields.",
        );
        return;
      }

      // Use freeze token for yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const { data, error } = await supabase.rpc("use_freeze_token", {
        p_user_id: user?.id,
        p_date: yesterdayStr,
      });

      if (error) throw error;

      if (data) {
        Alert.alert(
          "Shield Used!",
          "Your streak has been protected for yesterday.",
        );
        await loadStreakData(); // Reload data
      } else {
        Alert.alert(
          "Shield Failed",
          "Unable to use shield. You may have already cooked yesterday.",
        );
      }
    } catch (error) {
      logger.error("Failed to use freeze token:", error);
      Alert.alert("Error", "Failed to use streak shield");
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateCooked = (date: number) => {
    const dateStr = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      date,
    )
      .toISOString()
      .split("T")[0];
    return dailyCooks.some((cook) => cook.cook_date === dateStr);
  };

  const isDateFrozen = (date: number) => {
    const dateStr = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      date,
    )
      .toISOString()
      .split("T")[0];
    const cook = dailyCooks.find((c) => c.cook_date === dateStr);
    return cook?.freeze_used || false;
  };

  const renderCalendarDay = (day: number | null) => {
    if (!day) {
      return <View style={styles.emptyDay} />;
    }

    const isCooked = isDateCooked(day);
    const isFrozen = isDateFrozen(day);
    const isToday =
      day === new Date().getDate() &&
      currentMonth.getMonth() === new Date().getMonth() &&
      currentMonth.getFullYear() === new Date().getFullYear();

    return (
      <View
        style={[
          styles.calendarDay,
          isCooked && styles.cookedDay,
          isToday && styles.todayDay,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isCooked && styles.cookedDayText,
            isToday && styles.todayDayText,
          ]}
        >
          {day}
        </Text>
        {isCooked && !isFrozen && (
          <Flame size={12} color="#FF6B6B" style={styles.dayIcon} />
        )}
        {isFrozen && (
          <Shield size={12} color="#4ECDC4" style={styles.dayIcon} />
        )}
      </View>
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Render weeks
    const weeks: React.ReactElement[] = [];
    let week: React.ReactElement[] = [];
    days.forEach((day, index) => {
      week.push(renderCalendarDay(day));
      if ((index + 1) % 7 === 0 || index === days.length - 1) {
        weeks.push(
          <View key={`week-${weeks.length}`} style={styles.calendarWeek}>
            {week}
          </View>,
        );
        week = [];
      }
    });

    return weeks;
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
    loadStreakData(); // Reload data for new month
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;
  const freezeTokensLeft =
    (streakData?.total_freeze_tokens || 3) -
    (streakData?.freeze_tokens_used || 0);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.streakInfo}>
          <Animated.View
            style={[styles.streakBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <Flame size={32} color="#FF6B6B" />
            <Text style={styles.streakNumber}>{currentStreak}</Text>
          </Animated.View>
          <View style={styles.streakDetails}>
            <Text style={styles.streakLabel}>Day Streak</Text>
            <Text style={styles.longestStreak}>
              Longest: {longestStreak} days
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.freezeButton}
          onPress={handleUseFreeze}
          disabled={freezeTokensLeft === 0}
        >
          <Animated.View style={{ transform: [{ scale: shieldScale }] }}>
            <Shield
              size={24}
              color={freezeTokensLeft > 0 ? "#4ECDC4" : "#666"}
            />
          </Animated.View>
          <Text style={styles.freezeCount}>{freezeTokensLeft}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <Text key={index} style={styles.calendarHeaderText}>
              {day}
            </Text>
          ))}
        </View>
        {renderCalendar()}
      </View>

      <TouchableOpacity
        style={styles.rewardsButton}
        onPress={() => setShowRewards(!showRewards)}
      >
        <Gift size={20} color="#FFE66D" />
        <Text style={styles.rewardsButtonText}>Streak Rewards</Text>
      </TouchableOpacity>

      {showRewards && (
        <ScrollView style={styles.rewardsContainer}>
          {streakRewards.map((reward, index) => (
            <View
              key={index}
              style={[styles.rewardItem, reward.earned && styles.rewardEarned]}
            >
              <Text style={styles.rewardIcon}>{reward.icon}</Text>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>{reward.title}</Text>
                <Text style={styles.rewardDays}>{reward.days} days</Text>
                <Text style={styles.rewardReward}>{reward.reward}</Text>
              </View>
              {reward.earned ? (
                <Zap size={24} color="#FFE66D" />
              ) : (
                <Lock size={24} color="#666" />
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  streakInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B6B",
    marginTop: 4,
  },
  streakDetails: {
    justifyContent: "center",
  },
  streakLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
  },
  longestStreak: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  freezeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  freezeCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ECDC4",
    marginLeft: 8,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthArrow: {
    fontSize: 28,
    color: "#FFF",
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFF",
  },
  calendar: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  calendarHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    width: 40,
    textAlign: "center",
  },
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  emptyDay: {
    width: 40,
    height: 40,
  },
  dayText: {
    fontSize: 16,
    color: "#666",
  },
  cookedDay: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
  },
  cookedDayText: {
    color: "#FFF",
    fontWeight: "600",
  },
  todayDay: {
    borderWidth: 2,
    borderColor: "#FFE66D",
  },
  todayDayText: {
    color: "#FFE66D",
    fontWeight: "700",
  },
  dayIcon: {
    position: "absolute",
    bottom: 2,
    right: 8,
  },
  rewardsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 230, 109, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rewardsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFE66D",
    marginLeft: 8,
  },
  rewardsContainer: {
    maxHeight: 200,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  rewardEarned: {
    backgroundColor: "rgba(255, 230, 109, 0.1)",
  },
  rewardIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  rewardDays: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  rewardReward: {
    fontSize: 14,
    color: "#4ECDC4",
    marginTop: 4,
  },
});

export default StreakCalendar;
