/**
 * Single Choice Step Component
 * Handles single selection options like cooking time and difficulty
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SingleChoiceStepProps } from '../../types/preferences';

const SingleChoiceStep: React.FC<SingleChoiceStepProps> = React.memo(({
  options,
  selectedValue,
  onSelectOption,
}) => {
  const isOptionSelected = (value: string): boolean => {
    return selectedValue === value;
  };

  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.singleOption,
            isOptionSelected(option.value) && styles.selectedSingleOption,
          ]}
          onPress={() => onSelectOption(option.value)}
        >
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionLabel,
                isOptionSelected(option.value) && styles.selectedOptionLabel,
              ]}
            >
              {option.label}
            </Text>
            {option.subtitle && (
              <Text
                style={[
                  styles.optionSubtitle,
                  isOptionSelected(option.value) && styles.selectedOptionSubtitle,
                ]}
              >
                {option.subtitle}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.radioCircle,
              isOptionSelected(option.value) && styles.selectedRadioCircle,
            ]}
          >
            {isOptionSelected(option.value) && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

SingleChoiceStep.displayName = 'SingleChoiceStep';

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingTop: 8,
  },
  singleOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  selectedSingleOption: {
    backgroundColor: "rgba(45, 27, 105, 0.1)",
    borderColor: "#2D1B69",
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 2,
  },
  selectedOptionLabel: {
    color: "#2D1B69",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#8E8E93",
  },
  selectedOptionSubtitle: {
    color: "#2D1B69",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedRadioCircle: {
    borderColor: "#2D1B69",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2D1B69",
  },
});

export default SingleChoiceStep; 