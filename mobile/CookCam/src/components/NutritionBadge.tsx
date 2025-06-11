import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Zap, Activity} from 'lucide-react-native';
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
} from '../utils/responsive';

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
}

interface NutritionBadgeProps {
  nutrition?: NutritionData;
  servings?: number;
  variant?: 'compact' | 'detailed';
  style?: any;
}

const NutritionBadge: React.FC<NutritionBadgeProps> = ({
  nutrition,
  servings = 1,
  variant = 'compact',
  style,
}) => {
  if (!nutrition) {
    return null;
  }

  const perServing = {
    calories: Math.round(nutrition.calories / servings),
    protein: Math.round((nutrition.protein_g / servings) * 10) / 10,
    carbs: Math.round((nutrition.carbs_g / servings) * 10) / 10,
    fat: Math.round((nutrition.fat_g / servings) * 10) / 10,
  };

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.caloriesBadge}>
          <Zap size={moderateScale(12)} color="#FF6B35" />
          <Text style={styles.caloriesText}>{perServing.calories}</Text>
          <Text style={styles.caloriesLabel}>cal</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.detailedContainer, style]}>
      <View style={styles.nutritionHeader}>
        <Activity size={moderateScale(16)} color="#4CAF50" />
        <Text style={styles.nutritionTitle}>Per Serving</Text>
      </View>

      <View style={styles.nutritionGrid}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{perServing.calories}</Text>
          <Text style={styles.nutritionLabel}>Calories</Text>
        </View>

        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{perServing.protein}g</Text>
          <Text style={styles.nutritionLabel}>Protein</Text>
        </View>

        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{perServing.carbs}g</Text>
          <Text style={styles.nutritionLabel}>Carbs</Text>
        </View>

        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{perServing.fat}g</Text>
          <Text style={styles.nutritionLabel}>Fat</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(3),
  },
  caloriesText: {
    fontSize: responsive.fontSize.small,
    fontWeight: '700',
    color: '#FF6B35',
  },
  caloriesLabel: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: '500',
    color: '#FF6B35',
    opacity: 0.8,
  },
  detailedContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: scale(12),
    marginTop: verticalScale(8),
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(8),
  },
  nutritionTitle: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#4CAF50',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '700',
    color: '#2D1B69',
  },
  nutritionLabel: {
    fontSize: responsive.fontSize.tiny,
    fontWeight: '500',
    color: '#666',
    marginTop: verticalScale(2),
  },
});

export default NutritionBadge;
