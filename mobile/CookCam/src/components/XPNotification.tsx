import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { TrendingUp } from "lucide-react-native";
import { haptics } from "../utils/haptics";

interface XPNotificationProps {
  visible: boolean;
  xpGained: number;
  reason: string;
  currentXP: number;
  currentLevel: number;
  levelProgress: number;
  nextLevelXP: number;
  onComplete?: () => void;
  showConfetti?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");

const XPNotification: React.FC<XPNotificationProps> = ({
  visible,
  xpGained,
  reason,
  currentXP,
  currentLevel,
  levelProgress, // eslint-disable-line @typescript-eslint/no-unused-vars
  nextLevelXP,
  onComplete,
  showConfetti = false,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const [progressWidth, setProgressWidth] = useState(0);

  const getReasonText = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      SCAN_INGREDIENTS: "Scanned ingredients! 📸",
      COMPLETE_RECIPE: "Recipe completed! 🎉",
      CLAIM_RECIPE: "Recipe claimed! 🏆",
      SHARE_RECIPE: "Recipe shared! 📤",
      RECEIVE_RATING: "Received a rating! ⭐",
      RECEIVE_5_STAR: "5-star rating! 🌟",
      HELPFUL_REVIEW: "Helpful review! 💬",
      DAILY_STREAK: "Daily streak! 🔥",
      WEEKLY_STREAK: "Weekly streak! 💎",
    };
    return reasonMap[reason] || "Great job! ✨";
  };

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      haptics.success({
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      // Calculate new progress
      const newProgress =
        ((currentXP + xpGained - (nextLevelXP - 100)) / 100) * 100;
      setProgressWidth(Math.min(newProgress, 100));

      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate progress bar after a short delay
      setTimeout(() => {
        Animated.timing(progressAnim, {
          toValue: progressWidth,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }, 300);

      // Trigger confetti if enabled
      if (showConfetti) {
        triggerConfetti();
      }

      // Auto hide after 3 seconds
      setTimeout(() => {
        hideNotification();
      }, 3000);
    }
  }, [visible, currentXP, xpGained]);

  const triggerConfetti = () => {
    confettiAnims.forEach((anim, index) => {
      const delay = index * 30;
      const randomX = (Math.random() - 0.5) * screenWidth;
      const randomRotation = Math.random() * 720 - 360;

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: 300,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim.x, {
            toValue: randomX,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotation,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            delay: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset animations
      progressAnim.setValue(0);
      confettiAnims.forEach((anim) => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(0);
      });
      if (onComplete) {
        onComplete();
      }
    });
  };

  if (!visible) {
    return null;
  }

  const confettiColors = [
    "#FF6B35",
    "#FFB800",
    "#4CAF50",
    "#9C27B0",
    "#2196F3",
  ];

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* XP Icon and Amount */}
        <View style={styles.xpSection}>
          <View style={styles.xpIcon}>
            <TrendingUp size={24} color="#FFB800" />
          </View>
          <Text style={styles.xpAmount}>+{xpGained} XP</Text>
        </View>

        {/* Reason Text */}
        <Text style={styles.reasonText}>{getReasonText(reason)}</Text>

        {/* Level Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>Level {currentLevel}</Text>
            <Text style={styles.progressText}>
              {currentXP}/{nextLevelXP} XP
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg} />
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
            <View style={styles.progressBarShine} />
          </View>
        </View>

        {/* Trending Up Indicator for big gains */}
        {xpGained >= 50 && (
          <View style={styles.trendingBadge}>
            <TrendingUp size={16} color="#4CAF50" />
            <Text style={styles.trendingText}>Big gain!</Text>
          </View>
        )}
      </Animated.View>

      {/* Confetti Particles */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confettiParticle,
                {
                  backgroundColor:
                    confettiColors[index % confettiColors.length],
                  opacity: anim.opacity,
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    {
                      rotate: anim.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  xpSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  xpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  xpAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFB800",
  },
  reasonText: {
    fontSize: 16,
    color: "#2D1B69",
    marginBottom: 16,
    fontWeight: "500",
  },
  progressSection: {
    marginTop: 8,
  },
  levelInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
  },
  progressText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  progressBarContainer: {
    position: "relative",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#E5E5E7",
  },
  progressBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#FFB800",
    borderRadius: 6,
  },
  progressBarShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
  },
  trendingBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  confettiParticle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 2,
    top: 120,
    left: screenWidth / 2 - 5,
  },
});

export default XPNotification;
