/**
 * CookMode Header Component
 * Consolidated header with timer, voice controls, and navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import { tokens, mixins } from '../../styles';
import { CookModeHeaderProps } from '../../types/cookMode';

const CookModeHeader: React.FC<CookModeHeaderProps> = React.memo(({
  onBack,
  recipeTitle,
  currentStepData,
  timeRemaining,
  isPlaying,
  voiceEnabled,
  onPlayPause,
  onToggleVoice,
  formatTime,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ChevronLeft size={24} color={tokens.colors.text.inverse} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={styles.title}>Cook Mode</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {recipeTitle || "Recipe"}
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Timer - Only show if step has duration */}
        {currentStepData?.duration && (
          <View style={styles.timer}>
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            <TouchableOpacity style={styles.playButton} onPress={onPlayPause}>
              {isPlaying ? (
                <Pause size={12} color={tokens.colors.text.inverse} />
              ) : (
                <Play size={12} color={tokens.colors.text.inverse} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Voice toggle */}
        <TouchableOpacity onPress={onToggleVoice} style={styles.voiceButton}>
          {voiceEnabled ? (
            <Volume2 size={18} color={tokens.colors.brand.chef} />
          ) : (
            <VolumeX size={18} color="rgba(255, 255, 255, 0.6)" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

CookModeHeader.displayName = 'CookModeHeader';

const styles = StyleSheet.create({
  container: {
    ...mixins.layout.flexRow,
    ...mixins.layout.spaceBetween,
    ...mixins.layout.centerHorizontal,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.text.primary,
  },
  backButton: {
    padding: tokens.spacing.xs,
  },
  center: {
    ...mixins.layout.flex1,
    ...mixins.layout.centerHorizontal,
    marginHorizontal: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.inverse,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  actions: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.sm,
  },
  timer: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.large,
  },
  timerText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.inverse,
    minWidth: 40,
    textAlign: 'center',
  },
  playButton: {
    ...mixins.layout.centerContent,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceButton: {
    padding: tokens.spacing.xs,
  },
});

export default CookModeHeader; 