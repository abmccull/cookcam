import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Zap, Activity } from "lucide-react-native";
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
} from "../utils/responsive";

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
}

interface NutritionBadgeProps {
  nutrition: NutritionData;
  servings?: number;
  variant?: "full" | "compact";
}

const NutritionBadge: React.FC<NutritionBadgeProps> = React.memo(
  ({ nutrition, servings = 1, variant = "full" }) => {
    const isCompact = variant === "compact";

    // Memoize nutrition calculations
    const nutritionPerServing = useMemo(
      () => ({
        calories: Math.round(nutrition.calories / servings),
        protein: Math.round(nutrition.protein_g / servings),
        carbs: Math.round(nutrition.carbs_g / servings),
        fat: Math.round(nutrition.fat_g / servings),
        fiber: nutrition.fiber_g
          ? Math.round(nutrition.fiber_g / servings)
          : undefined,
        sodium: nutrition.sodium_mg
          ? Math.round(nutrition.sodium_mg / servings)
          : undefined,
      }),
      [nutrition, servings],
    );

    // Memoize calorie level classification
    const calorieLevel = useMemo(() => {
      const calories = nutritionPerServing.calories;
      if (calories < 200) return { level: "low", color: "#4CAF50" };
      if (calories < 400) return { level: "moderate", color: "#FF9800" };
      return { level: "high", color: "#F44336" };
    }, [nutritionPerServing.calories]);

    // Memoize protein level classification
    const proteinLevel = useMemo(() => {
      const protein = nutritionPerServing.protein;
      if (protein >= 20) return { level: "high", color: "#4CAF50" };
      if (protein >= 10) return { level: "moderate", color: "#FF9800" };
      return { level: "low", color: "#9E9E9E" };
    }, [nutritionPerServing.protein]);

    if (isCompact) {
      return (
        <View style={styles.compactContainer}>
          <View
            style={[
              styles.compactBadge,
              { backgroundColor: calorieLevel.color },
            ]}
          >
            <Zap size={moderateScale(12)} color="#FFFFFF" />
            <Text style={styles.compactText}>
              {nutritionPerServing.calories}
            </Text>
          </View>
          <View
            style={[
              styles.compactBadge,
              { backgroundColor: proteinLevel.color },
            ]}
          >
            <Activity size={moderateScale(12)} color="#FFFFFF" />
            <Text style={styles.compactText}>
              {nutritionPerServing.protein}g
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition Facts</Text>
          <Text style={styles.servingText}>Per serving</Text>
        </View>

        <View style={styles.mainNutrient}>
          <View style={styles.calorieRow}>
            <Zap size={moderateScale(20)} color={calorieLevel.color} />
            <Text style={styles.calorieValue}>
              {nutritionPerServing.calories}
            </Text>
            <Text style={styles.calorieLabel}>calories</Text>
          </View>
        </View>

        <View style={styles.macroNutrients}>
          <View style={styles.macroItem}>
            <Activity size={moderateScale(16)} color={proteinLevel.color} />
            <Text style={styles.macroValue}>
              {nutritionPerServing.protein}g
            </Text>
            <Text style={styles.macroLabel}>protein</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{nutritionPerServing.carbs}g</Text>
            <Text style={styles.macroLabel}>carbs</Text>
          </View>

          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{nutritionPerServing.fat}g</Text>
            <Text style={styles.macroLabel}>fat</Text>
          </View>
        </View>

        {(nutritionPerServing.fiber || nutritionPerServing.sodium) && (
          <View style={styles.additionalNutrients}>
            {nutritionPerServing.fiber && (
              <Text style={styles.additionalText}>
                Fiber: {nutritionPerServing.fiber}g
              </Text>
            )}
            {nutritionPerServing.sodium && (
              <Text style={styles.additionalText}>
                Sodium: {nutritionPerServing.sodium}mg
              </Text>
            )}
          </View>
        )}
      </View>
    );
  },
);

// Add display name for debugging
NutritionBadge.displayName = "NutritionBadge";

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(3),
  },
  compactText: {
    fontSize: responsive.fontSize.small,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  container: {
    backgroundColor: "#F8F9FA",
    borderRadius: responsive.borderRadius.medium,
    padding: scale(12),
    marginTop: verticalScale(8),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(8),
  },
  title: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "600",
    color: "#4CAF50",
  },
  servingText: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: "500",
    color: "#666",
  },
  mainNutrient: {
    marginBottom: verticalScale(16),
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  calorieValue: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "700",
    color: "#2D1B69",
  },
  calorieLabel: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: "500",
    color: "#666",
    marginTop: verticalScale(2),
  },
  macroNutrients: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "700",
    color: "#2D1B69",
  },
  macroLabel: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: "500",
    color: "#666",
    marginTop: verticalScale(2),
  },
  additionalNutrients: {
    marginTop: verticalScale(16),
  },
  additionalText: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: "500",
    color: "#666",
  },
});

export default NutritionBadge;
