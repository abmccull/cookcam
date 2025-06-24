/**
 * Quiz Progress Component
 * Displays progress bar and step information
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { QuizProgressProps } from '../../types/preferences';

const QuizProgress: React.FC<QuizProgressProps> = React.memo(({
  currentStep,
  totalSteps,
  progressAnim,
}) => {
  const completionPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Your Preferences</Text>
        <Text style={styles.percentage}>{completionPercentage}%</Text>
      </View>
      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.stepText}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
});

QuizProgress.displayName = 'QuizProgress';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1B69",
    letterSpacing: -0.5,
  },
  percentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E5E7",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 3,
  },
  stepText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 6,
  },
});

export default QuizProgress; 