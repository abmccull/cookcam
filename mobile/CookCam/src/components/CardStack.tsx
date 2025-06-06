import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  RefreshCw,
  RotateCcw,
  ThumbsUp,
  Info,
} from 'lucide-react-native';
import SwipeableCard from './SwipeableCard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Recipe } from '../utils/recipeTypes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CardStackProps {
  recipes: Recipe[];
  onCookRecipe: (recipe: Recipe) => void;
  onFavoriteRecipe: (recipe: Recipe) => void;
  onViewRecipeDetails: (recipe: Recipe) => void;
  onRefreshRecipes: () => void;
  isLoading?: boolean;
}

const CardStack: React.FC<CardStackProps> = ({
  recipes,
  onCookRecipe,
  onFavoriteRecipe,
  onViewRecipeDetails,
  onRefreshRecipes,
  isLoading = false,
}) => {
  const [cardStack, setCardStack] = useState<Recipe[]>(recipes);
  const [lastDismissedCard, setLastDismissedCard] = useState<Recipe | null>(null);

  useEffect(() => {
    setCardStack(recipes);
  }, [recipes]);

  const handleSwipeLeft = (recipe: Recipe) => {
    // Dismiss card - remove from stack
    ReactNativeHapticFeedback.trigger('impactMedium');
    setLastDismissedCard(recipe);
    
    setTimeout(() => {
      setCardStack(prev => prev.filter(r => r.id !== recipe.id));
    }, 200);
  };

  const handleSwipeRight = (recipe: Recipe) => {
    // Cook recipe - go to cook mode
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    onCookRecipe(recipe);
  };

  const handleFavorite = (recipe: Recipe) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onFavoriteRecipe(recipe);
  };

  const handleCardTap = (recipe: Recipe) => {
    onViewRecipeDetails(recipe);
  };

  const handleUndo = () => {
    if (lastDismissedCard) {
      ReactNativeHapticFeedback.trigger('impactLight');
      setCardStack(prev => [lastDismissedCard, ...prev]);
      setLastDismissedCard(null);
    }
  };

  const handleRefresh = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onRefreshRecipes();
  };

  const visibleCards = cardStack.slice(0, 3); // Show max 3 cards

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Generating diverse recipes...</Text>
        </View>
      </View>
    );
  }

  if (cardStack.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No more recipes! 🍽️</Text>
          <Text style={styles.emptySubtitle}>
            Swipe through all your options or generate new ones
          </Text>
          
          <View style={styles.emptyActions}>
            {lastDismissedCard && (
              <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                <RotateCcw size={16} color="#666" />
                <Text style={styles.undoText}>Undo last dismiss</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <RefreshCw size={18} color="#FFFFFF" />
              <Text style={styles.refreshText}>Generate New Recipes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Recipe</Text>
        <Text style={styles.subtitle}>
          {cardStack.length} recipe{cardStack.length !== 1 ? 's' : ''} remaining
        </Text>
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {visibleCards.map((recipe, index) => (
          <SwipeableCard
            key={recipe.id}
            recipe={recipe}
            index={index}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onFavorite={handleFavorite}
            onCardTap={handleCardTap}
            isTop={index === 0}
          />
        ))}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => visibleCards[0] && handleSwipeLeft(visibleCards[0])}
          disabled={visibleCards.length === 0}
        >
          <Text style={styles.actionButtonText}>👈</Text>
          <Text style={styles.actionLabel}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => visibleCards[0] && handleFavorite(visibleCards[0])}
          disabled={visibleCards.length === 0}
        >
          <ThumbsUp size={20} color="#FF6B6B" />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => visibleCards[0] && handleCardTap(visibleCards[0])}
          disabled={visibleCards.length === 0}
        >
          <Info size={20} color="#666" />
          <Text style={styles.actionLabel}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => visibleCards[0] && handleSwipeRight(visibleCards[0])}
          disabled={visibleCards.length === 0}
        >
          <Text style={styles.actionButtonText}>👉</Text>
          <Text style={styles.actionLabel}>Cook</Text>
        </TouchableOpacity>
      </View>

      {/* Swipe Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Swipe left to pass • Tap ❤️ to save • Swipe right to cook
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    width: screenWidth - 40,
    height: screenHeight * 0.65,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyActions: {
    gap: 16,
    alignItems: 'center',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
  },
  undoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#2D1B69',
    borderRadius: 25,
  },
  refreshText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  actionButtonText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default CardStack; 