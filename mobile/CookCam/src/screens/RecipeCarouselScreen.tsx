import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  FlatList,
  ActivityIndicator} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { Clock, Users, ChefHat } from "lucide-react-native";
import { useTempData } from "../context/TempDataContext";

import { analyticsService } from "../services/analyticsService";

interface RecipeCarouselScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "RecipeCarousel">;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_WIDTH + 200; // Adjust height for card + padding

// Mock recipe data for demo
const generateMockRecipes = (ingredients: unknown[]) => [
  {
    id: "1",
    title: "Mediterranean Vegetable Pasta",
    description: "A delicious pasta dish with fresh vegetables and herbs",
    cookTime: 25,
    servings: 4,
    difficulty: "Easy",
    ingredients: ingredients.map((ing) => ing.name),
    image: "https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Pasta",
    steps: [
      "Dice the tomatoes and onions",
      "Sauté garlic and onions until fragrant",
      "Add tomatoes and bell peppers",
      "Cook pasta according to package directions",
      "Combine vegetables with pasta",
    ]},
  {
    id: "2",
    title: "Garden Fresh Stir Fry",
    description: "Quick and healthy stir fry with garden vegetables",
    cookTime: 15,
    servings: 3,
    difficulty: "Easy",
    ingredients: ingredients.map((ing) => ing.name),
    image: "https://via.placeholder.com/300x200/66BB6A/FFFFFF?text=Stir+Fry",
    steps: [
      "Heat oil in a large pan",
      "Add garlic and cook for 30 seconds",
      "Add harder vegetables first",
      "Stir fry for 5-7 minutes",
      "Season and serve hot",
    ]},
  {
    id: "3",
    title: "Rustic Vegetable Soup",
    description: "Hearty soup perfect for any season",
    cookTime: 35,
    servings: 6,
    difficulty: "Medium",
    ingredients: ingredients.map((ing) => ing.name),
    image: "https://via.placeholder.com/300x200/2D1B69/FFFFFF?text=Soup",
    steps: [
      "Chop all vegetables evenly",
      "Sauté onions and garlic",
      "Add remaining vegetables",
      "Add broth and simmer",
      "Season to taste and serve",
    ]},
];

const RecipeCarouselScreen: React.FC<RecipeCarouselScreenProps> = ({
  navigation,
  _route}) => {
  const [recipes, setRecipes] = useState<unknown[]>([]);
  const [_selectedRecipe, setSelectedRecipe] = useState<unknown>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const { tempData, addTempRecipe } = useTempData();

  useEffect(() => {
    analyticsService.track('recipe_carousel_viewed', {
      timestamp: new Date().toISOString()
    });

    if (!tempData.tempScanData) {
      // If no scan data, navigate back to demo
      navigation.goBack();
      return;
    }

    // Simulate recipe generation delay for better UX
    const generateRecipes = async () => {
      setIsGenerating(true);
      
      // Add slight delay to simulate AI processing
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
      
      // Generate recipes based on scanned ingredients
      const mockRecipes = generateMockRecipes(tempData.tempScanData?.ingredients || []);
      setRecipes(mockRecipes);
      setSelectedRecipe(mockRecipes[0]);

      // Store generated recipes in temp context
      mockRecipes.forEach((recipe) => {
        addTempRecipe({
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          cuisineType: "Mediterranean",
          prepTime: 10,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          generateDate: new Date()});
      });

      // Track initial recipe view
      if (mockRecipes[0]) {
        analyticsService.track('recipe_viewed', {
          recipe_id: mockRecipes[0].id,
          recipe_title: mockRecipes[0].title,
          recipe_index: 0,
          total_recipes: mockRecipes.length
        });
      }
      
      setIsGenerating(false);
    };
    
    generateRecipes();
  }, [tempData.tempScanData]);

  const handleCookNow = (recipe: unknown) => {
    setSelectedRecipe(recipe);

    analyticsService.track('recipe_selected', {
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      from_position: currentIndex,
      total_recipes: recipes.length
    });

    // Show toast message
    Alert.alert(
      "🎉 Great Choice!",
      "Save your streak & unlock free trial → next",
      [
        {
          text: "Continue",
          onPress: () => navigation.navigate("PlanSelection", {})},
      ]);
  };

  const _handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    if (index !== currentIndex && recipes[index]) {
      setCurrentIndex(index);
      setSelectedRecipe(recipes[index]);
      
      analyticsService.track('recipe_viewed', {
        recipe_id: recipes[index].id,
        recipe_title: recipes[index].title,
        recipe_index: index,
        total_recipes: recipes.length
      });
    }
  };

  // Show loading state while generating recipes
  if (isGenerating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generating Recipes</Text>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingTitle}>✨ AI Chef at Work</Text>
          <Text style={styles.loadingText}>
            Analyzing your ingredients and crafting personalized recipes...
          </Text>
          
          <View style={styles.loadingSteps}>
            <View style={styles.loadingStep}>
              <Text style={styles.stepEmoji}>🔍</Text>
              <Text style={styles.stepText}>Analyzing ingredients</Text>
            </View>
            <View style={styles.loadingStep}>
              <Text style={styles.stepEmoji}>🤔</Text>
              <Text style={styles.stepText}>Finding flavor combinations</Text>
            </View>
            <View style={styles.loadingStep}>
              <Text style={styles.stepEmoji}>👨‍🍳</Text>
              <Text style={styles.stepText}>Creating recipes just for you</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const renderRecipe = ({ item: recipe, _index }: { item: unknown; _index: number }) => (
    <View key={recipe.id} style={styles.cardContainer}>
      <View style={styles.recipeCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeDescription}>{recipe.description}</Text>
        </View>

        <View style={styles.recipeDetails}>
          <View style={styles.detailItem}>
            <Clock size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{recipe.cookTime} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Users size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{recipe.servings} servings</Text>
          </View>
          <View style={styles.detailItem}>
            <ChefHat size={16} color="#8E8E93" />
            <Text style={styles.detailText}>{recipe.difficulty}</Text>
          </View>
        </View>

        <View style={styles.ingredientsSection}>
          <Text style={styles.sectionTitle}>Ingredients Found:</Text>
          <View style={styles.ingredientsList}>
            {recipe.ingredients
              .slice(0, 4)
              .map((ingredient: string, idx: number) => (
                <View key={idx} style={styles.ingredientChip}>
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                </View>
              ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.cookButton}
          onPress={() => handleCookNow(recipe)}
        >
          <Text style={styles.cookButtonText}>Cook Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {recipes.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            currentIndex === index && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Generated Recipes</Text>
        <Text style={styles.headerSubtitle}>
          Based on your {tempData.tempScanData?.ingredients.length || 0}{" "}
          ingredients
        </Text>
      </View>

      <FlatList
        data={recipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {renderPagination()}

      <View style={styles.bottomInfo}>
        <Text style={styles.swipeHint}>← Swipe to explore more recipes →</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF"},
  header: {
    padding: 20,
    alignItems: "center"},
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8},
  headerSubtitle: {
    fontSize: 16,
    color: "#8E8E93"},
  scrollView: {
    flex: 1},
  cardContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20},
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4},
  cardHeader: {
    marginBottom: 16},
  recipeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8},
  recipeDescription: {
    fontSize: 16,
    color: "#8E8E93",
    lineHeight: 22},
  recipeDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: "#F8F8FF",
    borderRadius: 12},
  detailItem: {
    flexDirection: "row",
    alignItems: "center"},
  detailText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 4,
    fontWeight: "500"},
  ingredientsSection: {
    marginBottom: 24},
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 12},
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap"},
  ingredientChip: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8},
  ingredientText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500"},
  cookButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center"},
  cookButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF"},
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16},
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5E7",
    marginHorizontal: 4},
  paginationDotActive: {
    backgroundColor: "#FF6B35",
    width: 24},
  bottomInfo: {
    padding: 20,
    alignItems: "center"},
  swipeHint: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic"},
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32},
  loadingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 24,
    marginBottom: 12},
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32},
  loadingSteps: {
    alignSelf: "stretch",
    paddingHorizontal: 24},
  loadingStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F8F8FF",
    padding: 16,
    borderRadius: 12},
  stepEmoji: {
    fontSize: 24,
    marginRight: 16},
  stepText: {
    fontSize: 16,
    color: "#2D1B69",
    fontWeight: "500"},
  backButton: {
    minWidth: 60},
  backButtonText: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600"}});

export default RecipeCarouselScreen;
