import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
} from 'react-native';
import {Heart, Clock, ChefHat, Star, Trophy, TrendingUp, Award, Sparkles} from 'lucide-react-native';
import {useGamification} from '../context/GamificationContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface SavedRecipe {
  id: string;
  title: string;
  imageUrl: string;
  prepTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rating: number;
  cuisine: string;
  dateAdded: Date;
}

interface CollectionBadge {
  id: string;
  name: string;
  icon: string;
  requirement: number;
  cuisineType: string;
  earned: boolean;
}

const FavoritesScreen = ({navigation}: {navigation: any}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'top-rated' | 'collections'>('all');
  const {addXP} = useGamification();
  
  // Animation values
  const milestoneScale = useRef(new Animated.Value(0)).current;
  const recommendScale = useRef(new Animated.Value(0.95)).current;

  // Mock data - in real app would come from storage/API
  const savedRecipes: SavedRecipe[] = [
    {
      id: '1',
      title: 'Spaghetti Carbonara',
      imageUrl: 'https://example.com/carbonara.jpg',
      prepTime: 30,
      difficulty: 'Medium',
      rating: 4.8,
      cuisine: 'Italian',
      dateAdded: new Date('2024-01-15'),
    },
    {
      id: '2',
      title: 'Chicken Tikka Masala',
      imageUrl: 'https://example.com/tikka.jpg',
      prepTime: 45,
      difficulty: 'Medium',
      rating: 4.9,
      cuisine: 'Indian',
      dateAdded: new Date('2024-01-14'),
    },
    {
      id: '3',
      title: 'Classic Margherita Pizza',
      imageUrl: 'https://example.com/pizza.jpg',
      prepTime: 25,
      difficulty: 'Easy',
      rating: 4.7,
      cuisine: 'Italian',
      dateAdded: new Date('2024-01-13'),
    },
    {
      id: '4',
      title: 'Beef Teriyaki Bowl',
      imageUrl: 'https://example.com/teriyaki.jpg',
      prepTime: 35,
      difficulty: 'Easy',
      rating: 4.6,
      cuisine: 'Japanese',
      dateAdded: new Date('2024-01-12'),
    },
  ];
  
  // Collection badges
  const collectionBadges: CollectionBadge[] = [
    {id: '1', name: 'Italian Master', icon: '🇮🇹', requirement: 10, cuisineType: 'Italian', earned: false},
    {id: '2', name: 'Asian Explorer', icon: '🥢', requirement: 10, cuisineType: 'Asian', earned: false},
    {id: '3', name: 'Indian Guru', icon: '🌶️', requirement: 10, cuisineType: 'Indian', earned: false},
    {id: '4', name: 'French Connoisseur', icon: '🥖', requirement: 10, cuisineType: 'French', earned: false},
    {id: '5', name: 'Mexican Aficionado', icon: '🌮', requirement: 10, cuisineType: 'Mexican', earned: false},
  ];
  
  // Savings milestones
  const savingsMilestones = [
    {count: 5, reward: 'Recipe Rookie', xp: 50, icon: '🌟'},
    {count: 10, reward: 'Collection Starter', xp: 100, icon: '⭐'},
    {count: 25, reward: 'Recipe Hunter', xp: 250, icon: '🏆'},
    {count: 50, reward: 'Master Collector', xp: 500, icon: '👑'},
    {count: 100, reward: 'Recipe Legend', xp: 1000, icon: '💎'},
  ];
  
  const currentMilestone = savingsMilestones.find(m => m.count > savedRecipes.length) || savingsMilestones[savingsMilestones.length - 1];
  const progress = Math.min((savedRecipes.length / currentMilestone.count) * 100, 100);
  
  // Recipe recommendations based on saved
  const recommendations = [
    {id: 'r1', title: 'Fettuccine Alfredo', cuisine: 'Italian', match: '92%'},
    {id: 'r2', title: 'Pad Thai', cuisine: 'Thai', match: '88%'},
    {id: 'r3', title: 'Butter Chicken', cuisine: 'Indian', match: '85%'},
  ];

  const filters = [
    {key: 'all', label: 'All'},
    {key: 'recent', label: 'Recent'},
    {key: 'top-rated', label: 'Top Rated'},
    {key: 'collections', label: 'Collections'},
  ];
  
  useEffect(() => {
    // Animate milestone progress
    if (progress > 0) {
      Animated.spring(milestoneScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
    
    // Pulse recommendations
    Animated.loop(
      Animated.sequence([
        Animated.timing(recommendScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(recommendScale, {
          toValue: 0.95,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return '#4CAF50';
      case 'Medium':
        return '#FF9800';
      case 'Hard':
        return '#F44336';
      default:
        return '#8E8E93';
    }
  };

  const handleRecipePress = (recipe: SavedRecipe) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    // Navigate to recipe detail or cook mode
    // Convert Date object to ISO string to make it serializable
    const serializedRecipe = {
      ...recipe,
      dateAdded: recipe.dateAdded.toISOString(),
    };
    
    navigation.navigate('Home', {
      screen: 'CookMode',
      params: {recipe: serializedRecipe},
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Favorites</Text>
        <Text style={styles.headerSubtitle}>
          {savedRecipes.length} saved recipe{savedRecipes.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {/* Milestone Progress */}
      <Animated.View style={[styles.milestoneCard, {transform: [{scale: milestoneScale}]}]}>
        <View style={styles.milestoneHeader}>
          <Text style={styles.milestoneTitle}>Next Milestone: {currentMilestone.reward}</Text>
          <View style={styles.milestoneReward}>
            <Sparkles size={14} color="#FFB800" />
            <Text style={styles.milestoneXP}>+{currentMilestone.xp} XP</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.progressText}>
          {savedRecipes.length} / {currentMilestone.count} recipes saved
        </Text>
      </Animated.View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('selection');
              setSelectedFilter(filter.key as any);
            }}>
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.key && styles.filterTextActive,
              ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Collections View */}
      {selectedFilter === 'collections' ? (
        <ScrollView
          style={styles.recipeList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recipeListContent}>
          {collectionBadges.map(badge => {
            const cuisineCount = savedRecipes.filter(r => r.cuisine === badge.cuisineType).length;
            const progress = (cuisineCount / badge.requirement) * 100;
            
            return (
              <View key={badge.id} style={styles.collectionCard}>
                <View style={styles.collectionIcon}>
                  <Text style={styles.collectionEmoji}>{badge.icon}</Text>
                  {progress >= 100 && <Trophy size={16} color="#FFB800" style={styles.earnedBadge} />}
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionName}>{badge.name}</Text>
                  <View style={styles.collectionProgress}>
                    <View style={[styles.collectionProgressFill, {width: `${Math.min(progress, 100)}%`}]} />
                  </View>
                  <Text style={styles.collectionProgressText}>
                    {cuisineCount} / {badge.requirement} {badge.cuisineType} recipes
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <>
          {/* Recommendations */}
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>Recommended for you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.map(rec => (
                <Animated.View 
                  key={rec.id} 
                  style={[styles.recommendCard, {transform: [{scale: recommendScale}]}]}
                >
                  <View style={styles.recommendMatch}>
                    <TrendingUp size={12} color="#4CAF50" />
                    <Text style={styles.recommendMatchText}>{rec.match} match</Text>
                  </View>
                  <Text style={styles.recommendTitle}>{rec.title}</Text>
                  <Text style={styles.recommendCuisine}>{rec.cuisine}</Text>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* Recipe Grid */}
          <ScrollView
            style={styles.recipeList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recipeListContent}>
            {savedRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => handleRecipePress(recipe)}
                activeOpacity={0.8}>
                {/* Recipe Image */}
                <View style={styles.imageContainer}>
                  <View style={styles.imagePlaceholder}>
                    <ChefHat size={40} color="#E5E5E7" />
                  </View>
                  <TouchableOpacity style={styles.favoriteButton}>
                    <Heart size={20} color="#FF6B35" fill="#FF6B35" />
                  </TouchableOpacity>
                </View>

                {/* Recipe Info */}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
                  
                  <View style={styles.recipeStats}>
                    <View style={styles.stat}>
                      <Clock size={14} color="#8E8E93" />
                      <Text style={styles.statText}>{recipe.prepTime}min</Text>
                    </View>
                    <View style={styles.stat}>
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.statText}>{recipe.rating}</Text>
                    </View>
                    <View style={[styles.difficultyBadge, {backgroundColor: getDifficultyColor(recipe.difficulty) + '20'}]}>
                      <Text style={[styles.difficultyText, {color: getDifficultyColor(recipe.difficulty)}]}>
                        {recipe.difficulty}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#F8F8FF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  milestoneCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
  milestoneReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  milestoneXP: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFB800',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5E7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#F8F8FF',
    fontWeight: '600',
  },
  collectionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  collectionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  collectionEmoji: {
    fontSize: 28,
  },
  earnedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 8,
  },
  collectionProgress: {
    height: 6,
    backgroundColor: '#E5E5E7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  collectionProgressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  collectionProgressText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  recommendationsSection: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 12,
  },
  recommendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  recommendMatchText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 4,
  },
  recommendCuisine: {
    fontSize: 12,
    color: '#8E8E93',
  },
  recipeList: {
    flex: 1,
  },
  recipeListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recipeInfo: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 4,
  },
  recipeCuisine: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  recipeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FavoritesScreen; 