import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Animated, { Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Recipe } from "../utils/recipeTypes";
import SwipeableCard from "./SwipeableCard"; // Import the corrected component

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenWidth * 1.2;

interface CardStackProps {
  recipes: Recipe[];
  onCookRecipe: (recipe: Recipe) => void;
  onFavoriteRecipe: (recipe: Recipe) => void;
  onViewRecipeDetails: (recipe: Recipe) => void;
  onRefreshRecipes: () => void;
  isLoading: boolean;
}

const CardStack: React.FC<CardStackProps> = ({ recipes, onCookRecipe, onRefreshRecipes, onFavoriteRecipe, onViewRecipeDetails, isLoading }) => {
  const [cardStack, setCardStack] = useState(recipes);

  useEffect(() => {
    // The top card is at index 0, no reversal needed.
    setCardStack(recipes);
  }, [recipes]);

  const handleSwipe = useCallback(
    (recipe: Recipe, direction: "left" | "right") => {
      // Swipe removes the first element from the array
      setCardStack((prev) => prev.slice(1));
      if (direction === "right") {
        onCookRecipe(recipe);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [onCookRecipe]
  );

  const handleSelect = useCallback((recipe: Recipe) => {
    setCardStack((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  if (isLoading) {
      return (
          <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
          </View>
      )
  }

  return (
    <Animated.View style={styles.container} layout={Layout.springify()}>
      {cardStack.length > 0 ? (
        // Render the top 3 cards, but in reverse order for correct z-index stacking
        cardStack.slice(0, 3).reverse().map((recipe: Recipe, index: number) => {
          // The actual index in the full stack determines its position
          const stackIndex = cardStack.findIndex(r => r.id === recipe.id);
          return (
            <SwipeableCard
              key={recipe.id}
              recipe={recipe}
              index={stackIndex}
              onSwipeLeft={(r) => handleSwipe(r, "left")}
              onSwipeRight={(r) => handleSwipe(r, "right")}
              onFavorite={onFavoriteRecipe}
              onCardTap={onViewRecipeDetails}
              onCardSelect={handleSelect}
              isTop={stackIndex === 0}
            />
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All Done!</Text>
          <TouchableOpacity onPress={onRefreshRecipes}>
            <Text style={styles.refreshText}>Generate New Recipes</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
  },
  cardContainer: {
    width: screenWidth,
    height: screenHeight * 0.75,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  refreshText: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600",
    marginTop: 20,
  },
});

export default CardStack;
