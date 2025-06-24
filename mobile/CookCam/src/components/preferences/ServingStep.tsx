/**
 * Serving Step Component
 * Handles serving size selection and meal prep options
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { ServingStepProps } from '../../types/preferences';
import { MEAL_PREP_PORTIONS } from '../../data/preferencesData';
import ServingSizeIcon from '../ServingSizeIcon';
import { moderateScale, verticalScale } from '../../utils/responsive';

const ServingStep: React.FC<ServingStepProps> = React.memo(({
  servingOptions,
  selectedServing,
  mealPrepEnabled,
  mealPrepPortions,
  onServingSelection,
  onToggleMealPrep,
  onMealPrepPortions,
}) => {
  return (
    <View>
      {/* Serving Size Section */}
      <View style={styles.servingGrid}>
        {servingOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.servingOption,
              selectedServing.id === option.id && styles.servingOptionSelected,
            ]}
            onPress={() => onServingSelection(option)}
          >
            <View style={styles.servingIconContainer}>
              <ServingSizeIcon type={option.label} size={moderateScale(32)} />
            </View>
            <Text
              style={[
                styles.servingLabel,
                selectedServing.id === option.id && styles.servingLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            {selectedServing.id === option.id && option.isCustom && (
              <Text style={styles.customValue}>
                {selectedServing.value} people
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Meal Prep Section */}
      <TouchableOpacity
        style={[
          styles.mealPrepToggle,
          mealPrepEnabled && styles.mealPrepToggleActive,
        ]}
        onPress={onToggleMealPrep}
      >
        <View style={styles.mealPrepContent}>
          <Text
            style={[
              styles.mealPrepText,
              mealPrepEnabled && styles.mealPrepTextActive,
            ]}
          >
            Enable Meal Prep
          </Text>
          <Text
            style={[
              styles.mealPrepSubtext,
              mealPrepEnabled && styles.mealPrepSubtextActive,
            ]}
          >
            Cook once, eat multiple times
          </Text>
        </View>
        <View
          style={[
            styles.checkbox,
            mealPrepEnabled && styles.checkboxActive,
          ]}
        >
          {mealPrepEnabled && <Check size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>

      {mealPrepEnabled && (
        <View style={styles.mealPrepPortions}>
          <Text style={styles.portionsLabel}>
            How many meal prep portions?
          </Text>
          <View style={styles.portionsRow}>
            {MEAL_PREP_PORTIONS.map((portions) => (
              <TouchableOpacity
                key={portions}
                style={[
                  styles.portionOption,
                  mealPrepPortions === portions &&
                    styles.portionOptionSelected,
                ]}
                onPress={() => onMealPrepPortions(portions)}
              >
                <Text
                  style={[
                    styles.portionText,
                    mealPrepPortions === portions &&
                      styles.portionTextSelected,
                  ]}
                >
                  {portions}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

ServingStep.displayName = 'ServingStep';

const styles = StyleSheet.create({
  servingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    paddingTop: 8,
  },
  servingOption: {
    width: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5E7",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  servingOptionSelected: {
    backgroundColor: "rgba(45, 27, 105, 0.1)",
    borderColor: "#2D1B69",
  },
  servingIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
    height: moderateScale(40),
    width: moderateScale(40),
  },
  servingLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
  },
  servingLabelSelected: {
    color: "#2D1B69",
    fontWeight: "700",
  },
  customValue: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 4,
  },
  mealPrepToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E5E7",
    marginTop: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  mealPrepToggleActive: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "#4CAF50",
  },
  mealPrepContent: {
    flex: 1,
  },
  mealPrepText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  mealPrepTextActive: {
    color: "#4CAF50",
  },
  mealPrepSubtext: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  mealPrepSubtextActive: {
    color: "#4CAF50",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#4CAF50",
  },
  mealPrepPortions: {
    marginTop: 16,
  },
  portionsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  portionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  portionOption: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  portionOptionSelected: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "#4CAF50",
  },
  portionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  portionTextSelected: {
    color: "#4CAF50",
  },
});

export default ServingStep; 