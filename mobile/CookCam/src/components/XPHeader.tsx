import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Star } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { useNavigation } from "@react-navigation/native";
import ChefBadge from "./ChefBadge";

// Remove unused screenWidth variable

const XPHeader: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { xp, level, levelProgress, nextLevelXP } = useGamification();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate progress bar when XP changes
    Animated.spring(progressAnim, {
      toValue: levelProgress,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();

    // Pulse animation when gaining XP
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [xp, levelProgress]);

  const navigateToProfile = () => {
    navigation.navigate("Profile" as never);
  };

  const getCreatorTier = () => {
    if (!user?.isCreator) {
      return 0;
    }
    // Mock tier calculation based on subscriber count
    const subscribers = user.subscriberCount || 0;
    if (subscribers >= 100000) {
      return 5;
    }
    if (subscribers >= 10000) {
      return 4;
    }
    if (subscribers >= 1000) {
      return 3;
    }
    if (subscribers >= 100) {
      return 2;
    }
    return 1;
  };

  const creatorTier = getCreatorTier();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={navigateToProfile}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <User size={22} color="#2D1B69" />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || "Guest"}
              </Text>
              {user?.isCreator && creatorTier > 0 && creatorTier <= 5 && (
                <ChefBadge
                  tier={creatorTier as 1 | 2 | 3 | 4 | 5}
                  size="small"
                />
              )}
            </View>

            <View style={styles.levelContainer}>
              <Star size={14} color="#FFB800" />
              <Text style={styles.levelText}>Level {level}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.xpSection}>
          <Animated.View
            style={[
              styles.xpBarContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.xpBarBg}>
              <Animated.View
                style={[
                  styles.xpBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
              <View style={styles.xpBarShine} />
            </View>

            <Text style={styles.xpText}>
              {xp}/{nextLevelXP} XP
            </Text>
          </Animated.View>

          <Text style={styles.xpToNext}>
            {nextLevelXP - xp} to level {level + 1}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#E5E5E7",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    maxWidth: "70%",
  },
  levelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  levelText: {
    fontSize: 13,
    color: "#FFB800",
    fontWeight: "600",
  },
  xpSection: {
    flex: 1.2,
    alignItems: "flex-end",
  },
  xpBarContainer: {
    width: "100%",
    position: "relative",
  },
  xpBarBg: {
    height: 24,
    backgroundColor: "#F0F0F2",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  xpBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FFB800",
    borderRadius: 12,
  },
  xpBarShine: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 10,
  },
  xpText: {
    position: "absolute",
    alignSelf: "center",
    top: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#2D1B69",
    letterSpacing: 0.5,
  },
  xpToNext: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "500",
  },
});

export default XPHeader;
