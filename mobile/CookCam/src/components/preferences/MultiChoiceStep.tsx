/**
 * Multi Choice Step Component
 * Handles multiple selection options like dietary restrictions and cuisines
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import { MultiChoiceStepProps } from '../../types/preferences';

const MultiChoiceStep: React.FC<MultiChoiceStepProps> = React.memo(({
  options,
  selectedOptions,
  onToggleOption,
  showBadgeHint = false,
}) => {
  const isOptionSelected = (option: string): boolean => {
    return selectedOptions.includes(option);
  };

  return (
    <View>
      <View style={styles.optionsGrid}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionChip,
              isOptionSelected(option) && styles.selectedChip,
            ]}
            onPress={() => onToggleOption(option)}
          >
            <Text
              style={[
                styles.chipText,
                isOptionSelected(option) && styles.selectedChipText,
              ]}
            >
              {option}
            </Text>
            {isOptionSelected(option) && (
              <Check size={16} color="#2D1B69" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Badge hint for cuisine selection */}
      {showBadgeHint && selectedOptions.length >= 3 && (
        <Animated.View style={styles.badgeHint}>
          <Globe size={16} color="#FFB800" />
          <Text style={styles.badgeHintText}>
            Explorer badge unlocked for trying exotic cuisines!
          </Text>
        </Animated.View>
      )}
    </View>
  );
});

MultiChoiceStep.displayName = 'MultiChoiceStep';

const styles = StyleSheet.create({
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginHorizontal: 2,
    marginVertical: 2,
  },
  selectedChip: {
    backgroundColor: "rgba(45, 27, 105, 0.1)",
    borderColor: "#2D1B69",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  selectedChipText: {
    color: "#2D1B69",
    fontWeight: "600",
  },
  checkIcon: {
    marginLeft: 4,
  },
  badgeHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  badgeHintText: {
    fontSize: 13,
    color: "#FFB800",
    fontWeight: "500",
    flex: 1,
  },
});

export default MultiChoiceStep; 