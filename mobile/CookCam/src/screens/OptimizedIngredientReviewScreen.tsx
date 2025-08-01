import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import { useAuth } from "../context/AuthContext";
import { cookCamApi } from "../services/cookCamApi";
import LoadingAnimation from "../components/LoadingAnimation";
import logger from "../utils/logger";
import { useIngredientAnalysis } from "../hooks/useIngredientAnalysis";
import {
  getEmojiForIngredient,
  getSmartIncrement,
  getRandomReward,
} from "../data/ingredientReviewData";
import {
  ReviewHeader,
  StatsRow,
  IngredientCard,
  AddIngredientButton,
  AddIngredientModal,
  MysteryBoxModal,
  ContinueButton,
} from "../components/ingredientReview";
import {
  IngredientReviewScreenProps,
  Ingredient,
  MysteryReward,
} from "../types/ingredientReview";
import { tokens, mixins } from "../styles";

const OptimizedIngredientReviewScreen: React.FC<IngredientReviewScreenProps> =
  React.memo(({ navigation, route }) => {
    const { imageUri, isSimulator, isManualInput } = route.params;
    const { addXP, unlockBadge } = useGamification();
    const { user } = useAuth();

    // Mystery box state
    const [showMysteryBox, setShowMysteryBox] = useState(() => {
      // 25% chance (1/4) of mystery box appearing
      return Math.random() < 0.25;
    });
    const [mysteryReward, setMysteryReward] = useState<MysteryReward | null>(
      null,
    );
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Add ingredient modal state
    const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);

    // Animation values
    const addAnimScale = useRef(new Animated.Value(1)).current;

    // Ingredient analysis hook
    const {
      ingredients,
      loading,
      hasAnalyzedImage,
      setIngredients,
      analyzeImageIngredients,
    } = useIngredientAnalysis(imageUri, isSimulator, user);

    // Load real ingredients from image analysis
    useEffect(() => {
      if (isManualInput) {
        // For manual input, show the add ingredient modal immediately
        setTimeout(() => {
          setShowAddIngredientModal(true);
        }, 500); // Small delay for smooth transition
      } else if (imageUri && !hasAnalyzedImage) {
        // Ensure authentication before analysis
        if (!user) {
          logger.debug("🔐 Not authenticated, redirecting to login...");
          navigation.navigate("Auth", { screen: "SignIn" });
          return;
        } else {
          analyzeImageIngredients();
        }
      }
    }, [
      imageUri,
      user,
      hasAnalyzedImage,
      analyzeImageIngredients,
      navigation,
      isManualInput,
    ]);

    const handleQuantityChange = useCallback(
      (ingredientId: string, action: "increase" | "decrease") => {
        setIngredients((prevIngredients) =>
          prevIngredients.map((ing) => {
            if (ing.id === ingredientId) {
              const currentQty = parseFloat(ing.quantity || "1");
              const { increment, minValue } = getSmartIncrement(ing);
              let newQty;

              if (action === "increase") {
                newQty = currentQty + increment;
              } else {
                newQty = Math.max(minValue, currentQty - increment);
              }

              // Round to avoid floating point precision issues
              newQty = Math.round(newQty * 100) / 100;

              return {
                ...ing,
                quantity: newQty.toString(),
              };
            }
            return ing;
          }),
        );

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      [setIngredients],
    );

    const handleRemoveIngredient = useCallback(
      (id: string) => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIngredients((prevIngredients) =>
          prevIngredients.filter((item) => item.id !== id),
        );
      },
      [setIngredients],
    );

    const handleAddIngredient = useCallback(() => {
      setShowAddIngredientModal(true);
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleAddIngredientSubmit = useCallback(
      async (text: string) => {
        try {
          // Animate add button
          Animated.sequence([
            Animated.timing(addAnimScale, {
              toValue: 1.2,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(addAnimScale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();

          // Haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          logger.debug(`🔍 Searching for ingredient: ${text}`);

          // Search for the ingredient in USDA database
          const response = await cookCamApi.searchIngredients(text, 1);

          let newIngredient: Ingredient;

          if (response.success && response.data && response.data.length > 0) {
            const foundIngredient = response.data[0];
            logger.debug("✅ Found ingredient in database:", foundIngredient);

            newIngredient = {
              id: foundIngredient.id || Date.now().toString(),
              name: foundIngredient.name || text,
              confidence: 1.0, // User-added = 100% confidence
              emoji: getEmojiForIngredient(foundIngredient.name || text),
            };

            // Award XP for finding real ingredient
            await addXP(5, "ADD_REAL_INGREDIENT");
          } else {
            logger.debug(
              "⚠️ Ingredient not found in database, adding as custom",
            );

            newIngredient = {
              id: Date.now().toString(),
              name: text,
              confidence: 1.0,
              emoji: getEmojiForIngredient(text),
            };
          }

          setIngredients((prevIngredients) => [
            ...prevIngredients,
            newIngredient,
          ]);

          // Show confetti for 5+ ingredients
          if (ingredients.length >= 4) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
          }
        } catch (error) {
          logger.error("❌ Error adding ingredient:", error);

          // Fallback to basic add
          const newIngredient: Ingredient = {
            id: Date.now().toString(),
            name: text,
            confidence: 1.0,
            emoji: getEmojiForIngredient(text),
          };
          setIngredients((prevIngredients) => [
            ...prevIngredients,
            newIngredient,
          ]);
        }
      },
      [addAnimScale, addXP, ingredients.length, setIngredients],
    );

    const handleContinue = useCallback(() => {
      if (ingredients.length === 0) {
        Alert.alert(
          "No Ingredients",
          "Please add at least one ingredient to continue.",
        );
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      navigation.navigate("EnhancedPreferences", {
        ingredients,
        imageUri,
      });
    }, [ingredients, imageUri, navigation]);

    const handleMysteryBoxOpen = useCallback(async () => {
      const reward = getRandomReward();
      setMysteryReward(reward);
      setShowMysteryBox(false);
      setShowRewardModal(true);

      // Apply reward
      if (reward.type === "xp" && typeof reward.value === "number") {
        await addXP(reward.value, "MYSTERY_BOX");
      } else if (reward.type === "badge" && typeof reward.value === "string") {
        await unlockBadge(reward.value);
      }

      // Enhanced haptic feedback based on rarity
      if (reward.rarity === "legendary") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (reward.rarity === "rare") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (reward.rarity === "uncommon") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, [addXP, unlockBadge]);

    const handleCloseRewardModal = useCallback(() => {
      setShowRewardModal(false);
    }, []);

    return (
      <SafeAreaView
        style={mixins.containers.screen}
        edges={["top", "left", "right"]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={tokens.colors.background.secondary}
          translucent={false}
        />
        <View style={{ flex: 1 }}>
          {/* Header with AI detection info */}
          <ReviewHeader
            loading={loading}
            ingredientCount={ingredients.length}
            isManualInput={isManualInput}
          />

          {/* Stats row */}
          <StatsRow
            ingredients={ingredients}
            showMysteryBox={showMysteryBox}
            onMysteryBoxOpen={handleMysteryBoxOpen}
          />

          {/* Ingredients List - Now the main focus */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: tokens.spacing.md,
              paddingBottom: 20,
            }}
          >
            {ingredients.map((ingredient, index) => (
              <IngredientCard
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                addAnimScale={addAnimScale}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveIngredient}
              />
            ))}

            {/* Add Ingredient Button */}
            <AddIngredientButton
              addAnimScale={addAnimScale}
              onAddIngredient={handleAddIngredient}
            />

            {/* Empty state for manual input */}
            {isManualInput && ingredients.length === 0 && (
              <View
                style={{
                  marginHorizontal: tokens.spacing.md,
                  marginBottom: 20,
                  backgroundColor: "rgba(255, 107, 53, 0.1)",
                  padding: tokens.spacing.lg,
                  borderRadius: tokens.borderRadius.medium,
                  alignItems: "center",
                }}
              >
                <Text
                  style={[
                    mixins.text.h4,
                    {
                      color: tokens.colors.brand.primary,
                      marginBottom: tokens.spacing.xs,
                      textAlign: "center",
                    },
                  ]}
                >
                  Start Adding Ingredients! 🥗
                </Text>
                <Text
                  style={[
                    mixins.text.body,
                    {
                      color: tokens.colors.text.secondary,
                      textAlign: "center",
                    },
                  ]}
                >
                  Tap the button below to add your ingredients manually
                </Text>
              </View>
            )}

            {/* Fun tip */}
            {ingredients.length < 3 && !isManualInput && (
              <View
                style={{
                  marginHorizontal: tokens.spacing.md,
                  marginBottom: 20,
                  backgroundColor: "rgba(255, 184, 0, 0.1)",
                  padding: tokens.spacing.md,
                  borderRadius: tokens.borderRadius.medium,
                  borderWidth: 1,
                  borderColor: "rgba(255, 184, 0, 0.3)",
                  marginTop: tokens.spacing.md,
                }}
              >
                <Text
                  style={[
                    mixins.text.body,
                    {
                      color: tokens.colors.interactive.leaderboard,
                      textAlign: "center",
                    },
                  ]}
                >
                  💡 Add at least 3 ingredients for best results!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Continue Button */}
          <ContinueButton
            ingredientCount={ingredients.length}
            onContinue={handleContinue}
          />
        </View>

        {/* Confetti effect placeholder */}
        {showConfetti && (
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: [{ translateX: -100 }, { translateY: -20 }],
              backgroundColor: "rgba(76, 175, 80, 0.95)",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: tokens.borderRadius.large,
              zIndex: 999,
            }}
          >
            <Text
              style={[
                mixins.text.h4,
                {
                  fontWeight: "bold",
                  color: tokens.colors.text.inverse,
                },
              ]}
            >
              🎉 Great variety! 🎉
            </Text>
          </View>
        )}

        {/* AI Analysis Loading Animation */}
        <LoadingAnimation visible={loading} />

        {/* Mystery Box Reward Modal */}
        <MysteryBoxModal
          visible={showRewardModal}
          reward={mysteryReward}
          onClose={handleCloseRewardModal}
        />

        {/* Add Ingredient Modal */}
        <AddIngredientModal
          visible={showAddIngredientModal}
          onClose={() => setShowAddIngredientModal(false)}
          onAdd={handleAddIngredientSubmit}
        />
      </SafeAreaView>
    );
  });

OptimizedIngredientReviewScreen.displayName = "OptimizedIngredientReviewScreen";

export default OptimizedIngredientReviewScreen;
