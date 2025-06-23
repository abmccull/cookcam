/**
 * Progress Section Component
 * Displays cooking progress with animated progress bar and milestones
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { tokens, mixins } from '../../styles';
import { ProgressSectionProps } from '../../types/cookMode';

const ProgressSection: React.FC<ProgressSectionProps> = React.memo(({
  currentStep,
  totalSteps,
  completedSteps,
  progress,
  progressAnim,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Cooking Progress</Text>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
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

        {/* Progress Milestones */}
        <View style={styles.progressMilestones}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.milestone,
                i < completedSteps && styles.milestoneCompleted,
                i === currentStep && styles.milestoneCurrent,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

ProgressSection.displayName = 'ProgressSection';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.background.tertiary,
  },
  progressRow: {
    ...mixins.layout.flexRow,
    ...mixins.layout.spaceBetween,
    ...mixins.layout.centerHorizontal,
    marginBottom: tokens.spacing.sm,
  },
  progressLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
    letterSpacing: 0.2,
  },
  progressPercentage: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.brand.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: tokens.colors.border.primary,
    borderRadius: tokens.borderRadius.small,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: tokens.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.colors.brand.primary,
    borderRadius: tokens.borderRadius.small,
  },
  progressMilestones: {
    ...mixins.layout.absoluteFill,
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    justifyContent: 'space-evenly',
    paddingHorizontal: tokens.spacing.xs,
  },
  milestone: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.background.primary,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
  },
  milestoneCompleted: {
    borderColor: tokens.colors.brand.primary,
    backgroundColor: tokens.colors.brand.primary,
  },
  milestoneCurrent: {
    borderColor: tokens.colors.brand.chef,
    backgroundColor: tokens.colors.brand.chef,
    transform: [{ scale: 1.2 }],
  },
});

export default ProgressSection; 