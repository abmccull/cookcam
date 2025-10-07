/**
 * Step Card Component
 * Displays the current cooking step with instruction, tips, and contextual info
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { tokens, mixins } from '../../styles';
import { StepCardProps } from '../../types/cookMode';

const StepCard: React.FC<StepCardProps> = React.memo(({
  currentStepData,
  currentStep,
  totalSteps,
  stepTranslateX,
  onShowIngredients,
  onShowAllSteps,
  nextStepPreview,
}) => {
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: stepTranslateX }] },
        ]}
      >
        {/* Top Row: Step Badge + Quick Access Buttons */}
        <View style={styles.headerRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {currentStep + 1}</Text>
          </View>

          <View style={styles.quickAccess}>
            <TouchableOpacity
              style={styles.quickAccessButton}
              onPress={onShowIngredients}
            >
              <Text style={styles.quickAccessIcon}>🥘</Text>
              <Text style={styles.quickAccessText}>Ingredients</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessButton}
              onPress={onShowAllSteps}
            >
              <Text style={styles.quickAccessIcon}>📋</Text>
              <Text style={styles.quickAccessText}>All Steps</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.instructionContainer}
          contentContainerStyle={styles.instructionContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Instruction */}
          <Animated.Text
            style={[
              styles.heroInstruction,
              {
                transform: [
                  {
                    scale: stepTranslateX.interpolate({
                      inputRange: [-30, 0, 30],
                      outputRange: [0.98, 1, 0.98],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          >
            {currentStepData?.instruction}
          </Animated.Text>

          {/* Contextual Info Row - Temperature & Time */}
          {(currentStepData?.temperature || currentStepData?.time) && (
            <View style={styles.contextualInfo}>
              {currentStepData.temperature && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoIcon}>🌡️</Text>
                  <Text style={styles.infoText}>
                    {currentStepData.temperature}
                  </Text>
                </View>
              )}
              {currentStepData.time && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoIcon}>⏱️</Text>
                  <Text style={styles.infoText}>
                    {currentStepData.time} min
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Chef's Tip */}
          {currentStepData?.tips && (
            <View style={styles.chefsTip}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipLabel}>Chef's Tip</Text>
              </View>
              <Text style={styles.tipText}>{currentStepData.tips}</Text>
            </View>
          )}

          {/* Next Step Preview */}
          {nextStepPreview && currentStep < totalSteps - 1 && (
            <View style={styles.nextStepPreview}>
              <Text style={styles.nextStepLabel}>Coming up next:</Text>
              <Text style={styles.nextStepText} numberOfLines={2}>
                {nextStepPreview}
              </Text>
            </View>
          )}

          {/* Step Completion Celebration */}
          {currentStepData?.completed && (
            <View style={styles.stepCompletedBanner}>
              <CheckCircle size={20} color={tokens.colors.status.success} />
              <Text style={styles.stepCompletedText}>
                Step Complete! Well done! 🎉
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
});

StepCard.displayName = 'StepCard';

const styles = StyleSheet.create({
  container: {
    ...mixins.layout.flex1,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },
  card: {
    ...mixins.layout.flex1,
    ...mixins.cards.elevated,
    borderRadius: tokens.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(45, 27, 105, 0.08)',
  },
  headerRow: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    ...mixins.layout.spaceBetween,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  stepBadge: {
    backgroundColor: tokens.colors.text.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.large,
  },
  stepBadgeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.inverse,
    letterSpacing: 0.5,
  },
  quickAccess: {
    ...mixins.layout.flexRow,
    gap: tokens.spacing.sm,
  },
  quickAccessButton: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.large,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
  },
  quickAccessIcon: {
    fontSize: 12,
  },
  quickAccessText: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  instructionContainer: {
    ...mixins.layout.flex1,
    paddingHorizontal: tokens.spacing.xxxl,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
  },
  instructionContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: tokens.spacing.xxl,
  },
  heroInstruction: {
    fontSize: 28,
    lineHeight: 40,
    color: tokens.colors.text.primary,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },
  contextualInfo: {
    ...mixins.layout.flexRow,
    justifyContent: 'center',
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  infoChip: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.background.secondary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  chefsTip: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.medium,
    marginTop: tokens.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.brand.chef,
  },
  tipHeader: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  tipIcon: {
    fontSize: 16,
  },
  tipLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  tipText: {
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    color: tokens.colors.text.secondary,
  },
  nextStepPreview: {
    backgroundColor: 'rgba(45, 27, 105, 0.04)',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.large,
    marginTop: tokens.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.text.primary,
  },
  nextStepLabel: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextStepText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text.secondary,
    lineHeight: 20,
  },
  stepCompletedBanner: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.large,
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.status.success,
  },
  stepCompletedText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.status.success,
  },
});

export default StepCard; 