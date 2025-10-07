import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import { useGamification } from "../context/GamificationContext";

interface XPProgressBarProps {
  showLabels?: boolean;
  height?: number;
  style?: unknown;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  showLabels = true,
  height = 24,
  style,
}) => {
  const { xp, level, levelProgress, nextLevelXP } = useGamification();
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: levelProgress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [levelProgress, animatedWidth]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, style]}>
      {showLabels && (
        <View style={styles.labelContainer}>
          <Text style={styles.levelText}>Level {level}</Text>
          <Text style={styles.xpText}>
            {xp} / {nextLevelXP} XP
          </Text>
        </View>
      )}

      <View style={[styles.progressBar, { height }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: widthInterpolated,
              height,
            },
          ]}
        />

        {/* Shimmer effect */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              width: widthInterpolated,
              height,
            },
          ]}
        />
      </View>

      {showLabels && (
        <Text style={styles.progressText}>{Math.round(levelProgress)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  xpText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  progressBar: {
    backgroundColor: "#E5E5E7",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 4,
  },
});

export default XPProgressBar;
