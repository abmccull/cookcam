import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from "react-native";
import { Gift, Star } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useGamification } from "../context/GamificationContext";

export interface MysteryReward {
  id: string;
  rarity: "common" | "rare" | "ultra-rare";
  type: "xp" | "recipe" | "badge" | "creator-feature";
  value: string | number;
  title: string;
  description: string;
  icon: string;
}

interface MysteryBoxProps {
  onOpen?: (_reward: MysteryReward) => void;
}

const MysteryBox: React.FC<MysteryBoxProps> = ({ onOpen }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [currentReward, setCurrentReward] = useState<MysteryReward | null>(
    null,
  );
  const { addXP, unlockBadge } = useGamification();

  // Animation values
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Mystery rewards pool
  const rewardPools = {
    common: [
      {
        id: "xp_5",
        rarity: "common" as const,
        type: "xp" as const,
        value: 5,
        title: "Bonus XP!",
        description: "+5 XP added to your account",
        icon: "⚡",
      },
      {
        id: "xp_10",
        rarity: "common" as const,
        type: "xp" as const,
        value: 10,
        title: "Nice Find!",
        description: "+10 XP bonus",
        icon: "✨",
      },
    ],
    rare: [
      {
        id: "recipe_unlock",
        rarity: "rare" as const,
        type: "recipe" as const,
        value: "Secret Pasta Recipe",
        title: "Recipe Unlocked!",
        description: "Exclusive secret recipe revealed",
        icon: "📜",
      },
      {
        id: "badge_mystery",
        rarity: "rare" as const,
        type: "badge" as const,
        value: "mystery_hunter",
        title: "Mystery Hunter Badge!",
        description: "You found a rare badge!",
        icon: "🎖️",
      },
      {
        id: "xp_25",
        rarity: "rare" as const,
        type: "xp" as const,
        value: 25,
        title: "XP Jackpot!",
        description: "+25 XP mega bonus",
        icon: "💎",
      },
    ],
    "ultra-rare": [
      {
        id: "creator_month",
        rarity: "ultra-rare" as const,
        type: "creator-feature" as const,
        value: "30_days",
        title: "LEGENDARY FIND!",
        description: "Free month of creator features!",
        icon: "👑",
      },
      {
        id: "xp_100",
        rarity: "ultra-rare" as const,
        type: "xp" as const,
        value: 100,
        title: "ULTRA RARE!",
        description: "+100 XP MEGA BONUS!",
        icon: "🌟",
      },
    ],
  };

  const startOpeningAnimation = () => {
    // Shake animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 5 },
    ).start();

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Show reward after box disappears
      setShowReward(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    // Glow animation
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const selectRandomReward = (): MysteryReward => {
    const rand = Math.random();
    let pool: MysteryReward[];

    if (rand < 0.05) {
      // 5% ultra-rare
      pool = rewardPools["ultra-rare"];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (rand < 0.3) {
      // 25% rare
      pool = rewardPools.rare;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      // 70% common
      pool = rewardPools.common;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleOpenBox = async () => {
    if (isOpening) {
      return;
    }

    setIsOpening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Start animations
    startOpeningAnimation();

    // Select reward
    const reward = selectRandomReward();
    setCurrentReward(reward);

    // Wait for animation
    setTimeout(async () => {
      // Apply reward
      if (reward.type === "xp" && typeof reward.value === "number") {
        await addXP(reward.value, "MYSTERY_BOX");
      } else if (reward.type === "badge" && typeof reward.value === "string") {
        await unlockBadge(reward.value);
      }

      // Callback
      onOpen?.(reward);
    }, 1000);
  };

  const handleCloseReward = () => {
    setShowReward(false);
    setIsOpening(false);
    setCurrentReward(null);

    // Reset animations
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);
    fadeAnim.setValue(0);
    glowAnim.setValue(0);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#4CAF50";
      case "rare":
        return "#2196F3";
      case "ultra-rare":
        return "#FFB800";
      default:
        return "#666";
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "rgba(76, 175, 80, 0.3)";
      case "rare":
        return "rgba(33, 150, 243, 0.3)";
      case "ultra-rare":
        return "rgba(255, 184, 0, 0.5)";
      default:
        return "transparent";
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handleOpenBox}
        disabled={isOpening}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.box,
            {
              transform: [
                {
                  translateX: shakeAnim.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-5, 5],
                  }),
                },
                { scale: scaleAnim },
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
              opacity: scaleAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim,
                shadowColor: "#FFB800",
                shadowOpacity: glowAnim,
                shadowRadius: 20,
              },
            ]}
          />
          <Gift size={40} color="#FFB800" />
          <Text style={styles.boxText}>Mystery Box</Text>
          <View style={styles.sparkles}>
            <Star size={16} color="#FFB800" />
          </View>
        </Animated.View>

        {!isOpening && <Text style={styles.tapText}>Tap to open!</Text>}
      </TouchableOpacity>

      {/* Reward Modal */}
      <Modal
        visible={showReward}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReward}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseReward}
        >
          <Animated.View
            style={[
              styles.rewardContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: fadeAnim }],
                backgroundColor: getRarityGlow(
                  currentReward?.rarity || "common",
                ),
              },
            ]}
          >
            <View
              style={[
                styles.rewardCard,
                {
                  borderColor: getRarityColor(
                    currentReward?.rarity || "common",
                  ),
                },
              ]}
            >
              <Text style={styles.rewardRarity}>
                {currentReward?.rarity.toUpperCase()}
              </Text>
              <Text style={styles.rewardIcon}>{currentReward?.icon}</Text>
              <Text
                style={[
                  styles.rewardTitle,
                  { color: getRarityColor(currentReward?.rarity || "common") },
                ]}
              >
                {currentReward?.title}
              </Text>
              <Text style={styles.rewardDescription}>
                {currentReward?.description}
              </Text>

              {currentReward?.rarity === "ultra-rare" && (
                <View style={styles.ultraRareEffects}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      color="#FFB800"
                      fill="#FFB800"
                      style={[
                        styles.star,
                        {
                          position: "absolute",
                          top: Math.random() * 100 - 50,
                          left: Math.random() * 100 - 50,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.collectButton,
                  {
                    backgroundColor: getRarityColor(
                      currentReward?.rarity || "common",
                    ),
                  },
                ]}
                onPress={handleCloseReward}
              >
                <Text style={styles.collectButtonText}>Collect!</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  box: {
    width: 120,
    height: 120,
    backgroundColor: "#FFF9F7",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFB800",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  glowEffect: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  boxText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFB800",
    marginTop: 8,
  },
  sparkles: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  tapText: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardContainer: {
    padding: 30,
    borderRadius: 30,
  },
  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    minWidth: 280,
    borderWidth: 3,
    position: "relative",
    overflow: "hidden",
  },
  rewardRarity: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 16,
    opacity: 0.8,
  },
  rewardIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  rewardDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  collectButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  collectButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  ultraRareEffects: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  star: {
    opacity: 0.8,
  },
});

export default MysteryBox;
