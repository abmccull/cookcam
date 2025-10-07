import React, { useState, useEffect,useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  ImageBackground,
  Alert} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import {
  Camera,
  ChefHat,
  Heart,
  Trophy,
  Plus,
  Zap,
  Flame,
  Star,
  _Users,
  TrendingUp,
  _Gift,
  Calendar} from "lucide-react-native";
import * as Haptics from "expo-haptics";

// Context and services
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import FeatureGate from "../components/FeatureGate";
import DailyCheckIn from "../components/DailyCheckIn";
import SafeScreen from "../components/SafeScreen";
import GamificationService from "../services/gamificationService";
import logger from "../utils/logger";

const { width: SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get("window");

// Level thresholds - must match backend/context exactly
const LEVEL_THRESHOLDS = [
  0, // Level 1
  50, // Level 2
  150, // Level 3
  300, // Level 4
  500, // Level 5
  750, // Level 6
  1100, // Level 7
  1500, // Level 8
  2000, // Level 9
  2600, // Level 10
];

interface MainScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

const MainScreen: React.FC<MainScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { xp, _level, streak, badges, addXP, levelProgress, nextLevelXP } =
    useGamification();

  // State - only for UI interactions, no mock data
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [celebratedAchievements, setCelebratedAchievements] = useState<
    Set<string>
  >(new Set());

  // Animation refs
  const heroScale = useRef(new Animated.Value(0.95)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const achievementPulse = useRef(new Animated.Value(1)).current;

  // Load data and start animations
  useEffect(() => {
    checkDailyCheckInStatus();
    startEntryAnimations();
    startPulseAnimations();
    checkAndUpdateStreak();
  }, []);

  const checkDailyCheckInStatus = async () => {
    // Check if user has checked in today from backend/storage
    const _today = new Date().toDateString();
    // In a real implementation, this would check backend or AsyncStorage
    // For now, assume they haven't checked in today
    setHasCheckedInToday(false);
  };

  const checkAndUpdateStreak = async () => {
    try {
      logger.debug("🔥 Checking user streak...");
      const response = await GamificationService.getInstance().checkStreak();
      if (response.success) {
        logger.debug("✅ Streak check response:", response.data);
        // The streak will be updated through the gamification context
      } else {
        logger.error("❌ Failed to check streak:", response.error);
      }
    } catch (error) {
      logger.error("❌ Exception checking streak:", error);
    }
  };

  const startEntryAnimations = () => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true}),
      Animated.spring(heroScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true}),
      Animated.timing(statsSlide, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true}),
    ]).start();
  };

  const startPulseAnimations = () => {
    // Scan button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true}),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true}),
      ])).start();
  };

  // Action handlers
  const handleScanPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addXP(2, "SCAN_INGREDIENTS"); // Small teaser XP
    navigation.navigate("Camera");
  };

  const handleDailyCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDailyCheckIn(!showDailyCheckIn);
  };

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (action) {
      case "favorites":
        navigation.navigate("Favorites");
        break;
      case "leaderboard":
        navigation.navigate("Leaderboard");
        break;
      case "create":
        navigation.navigate("Creator");
        break;
      case "discover":
        navigation.navigate("Discover");
        break;
      default:
        Alert.alert(
          "Coming Soon!",
          "This feature is being prepared for you! 🎉");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.name || user?.email?.split("@")[0] || "Chef";

    if (hour < 12) return `Good morning, ${name}! ☀️`;
    if (hour < 17) return `Good afternoon, ${name}! 🌤️`;
    return `Good evening, ${name}! 🌙`;
  };

  const getXPToNextLevel = () => {
    return nextLevelXP - xp;
  };

  // Calculate correct level from XP (must match backend logic)
  const calculateCorrectLevel = (totalXP: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  };

  const correctLevel = calculateCorrectLevel(xp);

  // Get recent achievement from actual user data
  const getRecentAchievement = () => {
    const achievementKey = `level-${correctLevel}`;
    if (correctLevel >= 10 && !celebratedAchievements.has(achievementKey)) {
      return {
        text: "👑 Reached Level 10 - Master Chef!",
        key: achievementKey};
    }
    if (correctLevel >= 8 && !celebratedAchievements.has(achievementKey)) {
      return { text: "⭐ Reached Level 8!", key: achievementKey };
    }
    if (streak >= 7 && !celebratedAchievements.has(`streak-${streak}`)) {
      return { text: "🔥 7-day cooking streak!", key: `streak-${streak}` };
    }
    if (
      badges.length >= 5 &&
      !celebratedAchievements.has(`badges-${badges.length}`)
    ) {
      return {
        text: "🏆 Badge collector supreme!",
        key: `badges-${badges.length}`};
    }
    if (
      xp >= 2500 &&
      !celebratedAchievements.has(`xp-${Math.floor(xp / 500) * 500}`)
    ) {
      return {
        text: "🌟 Amazing progress!",
        key: `xp-${Math.floor(xp / 500) * 500}`};
    }
    return null;
  };

  const recentAchievement = getRecentAchievement();

  const handleAchievementCelebration = () => {
    if (!recentAchievement) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("🎉 Achievement Unlocked!", recentAchievement.text);

    // Mark this achievement as celebrated
    setCelebratedAchievements(
      (prev) => new Set([...prev, recentAchievement.key]));
  };

  return (
    <SafeScreen style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: heroOpacity,
              transform: [{ scale: heroScale }]},
          ]}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.motivationalText}>
              Ready to create something delicious?
            </Text>
          </View>

          {/* Level & XP Display - Using corrected level calculation */}
          <View style={styles.levelDisplay}>
            <View style={styles.levelBadge}>
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Text style={styles.levelText}>Level {correctLevel}</Text>
            </View>
            <View style={styles.xpContainer}>
              <View style={styles.xpProgressBar}>
                <View
                  style={[
                    styles.xpProgressFill,
                    { width: `${levelProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.xpText}>
                {xp} XP • {getXPToNextLevel()} to level {correctLevel + 1}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          style={[styles.statsRow, { transform: [{ translateY: statsSlide }] }]}
        >
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <Flame size={24} color="#E91E63" />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <Trophy size={24} color="#FFB800" />
            <Text style={styles.statValue}>{badges.length}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <ChefHat size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{correctLevel}</Text>
            <Text style={styles.statLabel}>Chef Level</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Achievement Banner - only show if user has real achievements */}
        {recentAchievement && (
          <Animated.View
            style={[
              styles.achievementBanner,
              { transform: [{ scale: achievementPulse }] },
            ]}
          >
            <TouchableOpacity
              style={styles.achievementContent}
              onPress={handleAchievementCelebration}
              activeOpacity={0.9}
            >
              <Zap size={20} color="#FF6B35" />
              <Text style={styles.achievementText}>
                {recentAchievement.text}
              </Text>
              <Text style={styles.achievementAction}>Tap to celebrate! 🎉</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Main Scan Action */}
        <FeatureGate
          feature="scan"
          userId={user?.id || ""}
          onUpgrade={() => navigation.navigate("PlanSelection", {})}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanPress}
              activeOpacity={0.9}
            >
              <View style={styles.scanContent}>
                <Camera size={40} color="#FFFFFF" />
                <View style={styles.scanTextContainer}>
                  <Text style={styles.scanTitle}>Scan Your Ingredients</Text>
                  <Text style={styles.scanSubtitle}>
                    Point your camera & discover recipes ✨
                  </Text>
                </View>
              </View>
              <View style={styles.xpBadge}>
                <Zap size={12} color="#FFFFFF" />
                <Text style={styles.xpBadgeText}>+15 XP</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </FeatureGate>

        {/* Daily Check-In Section - only show if not checked in today */}
        {!hasCheckedInToday && (
          <TouchableOpacity
            style={styles.dailyCheckInCard}
            onPress={handleDailyCheckIn}
            activeOpacity={0.8}
          >
            <View style={styles.dailyCheckInHeader}>
              <Calendar size={24} color="#66BB6A" />
              <Text style={styles.dailyCheckInTitle}>
                Daily Fridge Check-In
              </Text>
              <Text style={styles.dailyCheckInXP}>+5 XP</Text>
            </View>
            <Text style={styles.dailyCheckInSubtitle}>
              Show us what's in your fridge for personalized suggestions! 📸
            </Text>
          </TouchableOpacity>
        )}

        {/* Daily Check-In Component */}
        {showDailyCheckIn && <DailyCheckIn />}

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("favorites")}
              activeOpacity={0.8}
            >
              <Heart size={24} color="#E91E63" />
              <Text style={styles.quickActionText}>My Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("leaderboard")}
              activeOpacity={0.8}
            >
              <Trophy size={24} color="#FFB800" />
              <Text style={styles.quickActionText}>Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("create")}
              activeOpacity={0.8}
            >
              <Plus size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Create Recipe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => handleQuickAction("discover")}
              activeOpacity={0.8}
            >
              <TrendingUp size={24} color="#9C27B0" />
              <Text style={styles.quickActionText}>Discover</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Padding for Tab Bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF"},
  scrollView: {
    flex: 1},
  scrollContent: {
    paddingBottom: 20},
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 6},
  greetingContainer: {
    marginBottom: 6,
    alignItems: "center"},
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 4,
    textAlign: "center"},
  motivationalText: {
    fontSize: 16,
    color: "#8E8E93",
    fontStyle: "italic"},
  levelDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3},
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12},
  levelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFB800",
    marginLeft: 4},
  xpContainer: {
    flex: 1},
  xpProgressBar: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    marginBottom: 4},
  xpProgressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 3},
  xpText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500"},
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12},
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2},
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 8,
    marginBottom: 4},
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500"},
  achievementBanner: {
    marginHorizontal: 24,
    marginBottom: 20},
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F7",
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 16,
    padding: 16},
  achievementText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginLeft: 12},
  achievementAction: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "500"},
  scanButton: {
    backgroundColor: "#FF6B35",
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: "relative"},
  scanContent: {
    flexDirection: "row",
    alignItems: "center"},
  scanTextContainer: {
    flex: 1,
    marginLeft: 16},
  scanTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4},
  scanSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9},
  xpBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12},
  xpBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4},
  dailyCheckInCard: {
    backgroundColor: "#E8F5E9",
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9"},
  dailyCheckInHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8},
  dailyCheckInTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginLeft: 12},
  dailyCheckInXP: {
    fontSize: 14,
    fontWeight: "600",
    color: "#66BB6A"},
  dailyCheckInSubtitle: {
    fontSize: 14,
    color: "#66BB6A",
    lineHeight: 20,
    marginBottom: 4},
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24},
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 16},
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12},
  quickActionCard: {
    width: (SCREEN_WIDTH - 60) / 2, // Account for margins and gap
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2},
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    marginTop: 8,
    textAlign: "center"},
  bottomPadding: {
    height: 20}});

export default MainScreen;
