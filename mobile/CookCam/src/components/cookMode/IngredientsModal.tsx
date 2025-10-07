/**
 * Ingredients Modal Component
 * Full-screen modal for displaying recipe ingredients
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { X } from 'lucide-react-native';
import { tokens, mixins } from '../../styles';
import { IngredientsModalProps } from '../../types/cookMode';

const IngredientsModal: React.FC<IngredientsModalProps> = React.memo(({
  visible,
  ingredients = [],
  onClose,
}) => {
  const formatIngredient = (ingredient: unknown): string => {
    if (typeof ingredient === "string") {
      return ingredient;
    }
    return `${ingredient.amount || ""} ${ingredient.unit || ""} ${
      ingredient.name || ingredient
    }`.trim();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ingredients</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color={tokens.colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <View style={styles.ingredientBullet} />
              <Text style={styles.ingredientText}>
                {formatIngredient(ingredient)}
              </Text>
            </View>
          ))}
          
          {ingredients.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No ingredients available</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

IngredientsModal.displayName = 'IngredientsModal';

const styles = StyleSheet.create({
  container: {
    ...mixins.layout.flex1,
    backgroundColor: tokens.colors.background.tertiary,
  },
  header: {
    ...mixins.layout.flexRow,
    ...mixins.layout.centerHorizontal,
    ...mixins.layout.spaceBetween,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.primary,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text.primary,
  },
  closeButton: {
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.background.tertiary,
    borderRadius: tokens.borderRadius.large,
  },
  body: {
    ...mixins.layout.flex1,
  },
  content: {
    padding: tokens.spacing.lg,
  },
  ingredientItem: {
    ...mixins.layout.flexRow,
    alignItems: 'flex-start',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border.primary,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.brand.chef,
    marginTop: 8,
    marginRight: tokens.spacing.md,
  },
  ingredientText: {
    ...mixins.layout.flex1,
    fontSize: tokens.fontSize.base,
    lineHeight: 24,
    color: tokens.colors.text.primary,
  },
  emptyState: {
    ...mixins.layout.centerContent,
    paddingVertical: tokens.spacing.xxxl,
  },
  emptyText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text.secondary,
    textAlign: 'center',
  },
});

export default IngredientsModal; 