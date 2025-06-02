import React, { useState, useEffect } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {Heart, Clock, Flame, MessageCircle, Share2} from 'lucide-react-native';
import {scale, verticalScale, moderateScale, responsive} from '../utils/responsive';
import ChefBadge from './ChefBadge';
import NutritionBadge from './NutritionBadge';
import { recipeService } from '../services/api';

interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
}

interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    image?: string;
    cookTime: number;
    difficulty: string;
    likes: number;
    comments: number;
    servings?: number;
    creator: {
      name: string;
      tier?: 1 | 2 | 3 | 4 | 5;
      avatar?: string;
    };
  };
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  showNutrition?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onLike,
  onComment,
  onShare,
  showNutrition = true,
}) => {
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  const difficultyColors = {
    Easy: '#4CAF50',
    Medium: '#FF9800',
    Hard: '#F44336',
  };

  // Fetch nutrition data when component mounts
  useEffect(() => {
    if (showNutrition && recipe.id) {
      fetchNutritionData();
    }
  }, [recipe.id, showNutrition]);

  const fetchNutritionData = async () => {
    try {
      setNutritionLoading(true);
      const response = await recipeService.getRecipeNutrition(recipe.id, recipe.servings);
      
      if (response.success && response.data?.data?.per_serving) {
        setNutrition(response.data.data.per_serving);
      }
    } catch (error) {
      console.log('Failed to fetch nutrition data:', error);
      // Silently handle error - nutrition is optional
    } finally {
      setNutritionLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Recipe Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Flame size={moderateScale(48)} color="#FF6B35" />
        </View>
        
        {/* Creator info overlay */}
        <View style={styles.creatorOverlay}>
          <View style={styles.creatorInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{recipe.creator.name[0]}</Text>
            </View>
            <Text style={styles.creatorName}>{recipe.creator.name}</Text>
            {recipe.creator.tier && (
              <ChefBadge tier={recipe.creator.tier} size="small" />
            )}
          </View>
        </View>

        {/* Recipe info badges */}
        <View style={styles.recipeInfoBadges}>
          <View style={styles.timeBadge}>
            <Clock size={moderateScale(14)} color="#F8F8FF" />
            <Text style={styles.timeText}>{recipe.cookTime} min</Text>
          </View>
          <View style={[styles.difficultyBadge, {backgroundColor: difficultyColors[recipe.difficulty as keyof typeof difficultyColors]}]}>
            <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
          </View>
          {/* Nutrition badge */}
          {showNutrition && nutrition && !nutritionLoading && (
            <NutritionBadge nutrition={nutrition} servings={1} variant="compact" />
          )}
        </View>
      </View>

      {/* Recipe Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
        
        {/* Detailed nutrition info */}
        {showNutrition && nutrition && !nutritionLoading && (
          <NutritionBadge nutrition={nutrition} servings={1} variant="detailed" />
        )}
        
        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <Heart size={moderateScale(20)} color="#E91E63" />
            <Text style={styles.actionText}>{recipe.likes}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <MessageCircle size={moderateScale(20)} color="#666" />
            <Text style={styles.actionText}>{recipe.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Share2 size={moderateScale(20)} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    marginBottom: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: verticalScale(200),
    borderTopLeftRadius: responsive.borderRadius.large,
    borderTopRightRadius: responsive.borderRadius.large,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: scale(12),
    paddingHorizontal: scale(12),
    paddingBottom: scale(24),
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  avatarContainer: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8F8FF',
  },
  avatarText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  creatorName: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#F8F8FF',
    flex: 1,
  },
  recipeInfoBadges: {
    position: 'absolute',
    bottom: scale(12),
    right: scale(12),
    flexDirection: 'row',
    gap: scale(8),
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(4),
  },
  timeText: {
    fontSize: responsive.fontSize.small,
    fontWeight: '600',
    color: '#F8F8FF',
  },
  difficultyBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: responsive.borderRadius.medium,
  },
  difficultyText: {
    fontSize: responsive.fontSize.small,
    fontWeight: '600',
    color: '#F8F8FF',
  },
  detailsContainer: {
    padding: responsive.spacing.m,
  },
  recipeTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: '700',
    color: '#2D1B69',
    marginBottom: verticalScale(12),
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    paddingTop: verticalScale(12),
    marginTop: verticalScale(8),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  actionText: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    fontWeight: '500',
  },
});

export default RecipeCard; 