/**
 * Navigation Controls Component
 * Bottom navigation with cooking tips and step controls
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react-native';
import { tokens, mixins } from '../../styles';
import { NavigationControlsProps } from '../../types/cookMode';

const NavigationControls: React.FC<NavigationControlsProps> = React.memo(({
  currentStep,
  totalSteps,
  currentStepData,
  cookingTip,
  onPrevious,
  onNext,
  onComplete,
  potentialXP,
}) => {
  const isLastStep = currentStep === totalSteps - 1;
  const canGoBack = currentStep > 0;

  return (
    <View style={styles.container}>
      {/* Cooking Tip Strip */}
      {cookingTip && (
        <View style={styles.cookingTip}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipEmoji}>{cookingTip.emoji}</Text>
          </View>
          <Text style={styles.tipText} numberOfLines={2}>
            {cookingTip.tip}
          </Text>
        </View>
      )}

      {/* Main Navigation Row */}
      <View style={styles.navigation}>
        {/* Previous Button */}
        <TouchableOpacity
          style={[
            styles.navButton,
            !canGoBack && styles.navButtonDisabled,
          ]}
          onPress={onPrevious}
          disabled={!canGoBack}
        >
          <ChevronLeft
            size={20}
            color={canGoBack ? tokens.colors.text.primary : tokens.colors.text.disabled}
          />
          <Text
            style={[
              styles.navText,
              !canGoBack && styles.navTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {/* Main Action Button */}
        {isLastStep ? (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={onComplete}
          >
            <CheckCircle size={20} color={tokens.colors.text.inverse} />
            <Text style={styles.buttonText}>Complete</Text>
            <Text style={styles.xpText}>+{potentialXP}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={!currentStepData?.duration ? onComplete : onNext}
          >
            <Text style={styles.buttonText}>
              {!currentStepData?.duration ? "✓ Done" : "Next Step"}
            </Text>
            <ChevronRight size={20} color={tokens.colors.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

NavigationControls.displayName = 'NavigationControls';

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.background.primary,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border.primary,
  },
  cookingTip: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    padding: 10,
    borderRadius: tokens.borderRadius.large,
    marginBottom: tokens.spacing.md,
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.1)',
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: tokens.borderRadius.large,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    ...mixins.layout.centerContent,
    marginTop: 1,
  },
  tipEmoji: {
    fontSize: 12,
  },
  tipText: {
    ...mixins.layout.flex1,
    fontSize: tokens.fontSize.xs,
    lineHeight: 16,
    color: tokens.colors.text.secondary,
    fontWeight: tokens.fontWeight.medium,
  },
  navigation: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    ...mixins.layout.spaceBetween,
    gap: tokens.spacing.md,
  },
  navButton: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.background.secondary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
    borderRadius: tokens.borderRadius.large,
    borderWidth: 1,
    borderColor: tokens.colors.border.primary,
    flex: 0.35,
  },
  navText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text.primary,
  },
  navButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  navTextDisabled: {
    color: tokens.colors.text.disabled,
  },
  completeButton: {
    flex: 0.65,
    ...mixins.layout.flexRow,
    ...mixins.layout.centerContent,
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.status.success,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.medium,
    ...tokens.shadow.md,
  },
  nextButton: {
    flex: 0.65,
    ...mixins.layout.flexRow,
    ...mixins.layout.centerContent,
    gap: tokens.spacing.xs,
    backgroundColor: tokens.colors.brand.chef,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.medium,
    ...tokens.shadow.md,
  },
  buttonText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.inverse,
    letterSpacing: 0.2,
  },
  xpText: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.small,
    marginLeft: tokens.spacing.xs,
  },
});

export default NavigationControls; 