import { useState, useEffect, useCallback } from "react";
import { Ingredient } from "../types/ingredientReview";
import { 
  getEmojiForIngredient, 
  getMockIngredients, 
  getFallbackIngredients, 
  getSimulatedIngredients 
} from "../data/ingredientReviewData";
import { cookCamApi } from "../services/cookCamApi";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import logger from "../utils/logger";

export interface UseIngredientAnalysisReturn {
  ingredients: Ingredient[];
  loading: boolean;
  hasAnalyzedImage: boolean;
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  analyzeImageIngredients: () => Promise<void>;
}

export const useIngredientAnalysis = (
  imageUri: string,
  isSimulator: boolean,
  user: any
): UseIngredientAnalysisReturn => {
  const { addXP } = useGamification();
  const [loading, setLoading] = useState(false);
  const [hasAnalyzedImage, setHasAnalyzedImage] = useState(false);
  const [lastAnalyzedImageUri, setLastAnalyzedImageUri] = useState<string | null>(null);

  // Enhanced ingredients with real data potential
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (isSimulator) {
      // For simulator, return mock data that could represent real API detection
      return getMockIngredients();
    } else {
      // For real device, start with empty and let API populate
      return [];
    }
  });

  // Reset analysis flag when imageUri changes
  useEffect(() => {
    if (imageUri !== lastAnalyzedImageUri) {
      setHasAnalyzedImage(false);
      setLastAnalyzedImageUri(imageUri);
    }
  }, [imageUri, lastAnalyzedImageUri]);

  const analyzeImageIngredients = useCallback(async () => {
    try {
      setLoading(true);
      logger.debug("🔍 Analyzing image for ingredients...");
      logger.debug("📍 Current imageUri:", imageUri);
      logger.debug("📍 Is simulator:", isSimulator);

      if (!imageUri) {
        logger.debug("⚠️ No valid image URI, using fallback ingredients");

        // Fallback to searching some common ingredients in USDA database
        const simulatedDetectedNames = getSimulatedIngredients();
        const foundIngredients: Ingredient[] = [];

        for (let i = 0; i < simulatedDetectedNames.length; i++) {
          const name = simulatedDetectedNames[i];
          try {
            const response = await cookCamApi.searchIngredients(name, 1);

            if (response.success && response.data && response.data.length > 0) {
              const ingredient = response.data[0];
              foundIngredients.push({
                id: ingredient.id || `detected-${i}`,
                name: ingredient.name || name,
                confidence: 0.9 - i * 0.1,
                emoji: getEmojiForIngredient(ingredient.name || name),
              });
            }
          } catch (error) {
            logger.debug(`Failed to find ingredient ${name}:`, error);
          }
        }

        setIngredients(foundIngredients);
        return;
      }

      // For file:// URIs, we need to read the file
      if (imageUri) {
        logger.debug("✅ Image URI present, converting to base64...");

        // Convert image to base64 before sending
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error("Failed to read file as base64 string"));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(blob);
        });

        // The base64 string includes a prefix "data:image/jpeg;base64,"
        // which we need to remove before sending.
        const base64Data = base64Image.split(",")[1];

        // Use the cookCamApi service to handle the upload correctly
        const apiResponse = await cookCamApi.scanIngredients(base64Data);

        logger.debug("📥 Backend response received:", apiResponse);

        if (apiResponse.success && apiResponse.data) {
          // The backend now returns a ScanResult object
          const scanResult = apiResponse.data;
          logger.debug("🎯 Backend analysis successful:", scanResult.ingredients);

          // Convert backend response to our local ingredient format
          const foundIngredients: Ingredient[] = scanResult.ingredients.map(
            (detectedIng, i) => ({
              id: `detected-${i}`, // Or use an ID from backend if available
              name: detectedIng.name,
              confidence: detectedIng.confidence || 0.8,
              emoji: getEmojiForIngredient(detectedIng.name),
              quantity: detectedIng.quantity || "",
              unit: detectedIng.unit || "",
              variety: detectedIng.variety || "",
              category: detectedIng.category || "",
            })
          );

          if (foundIngredients.length > 0) {
            setIngredients(foundIngredients);
            logger.debug(
              `✅ Successfully analyzed image: ${foundIngredients.length} ingredients found`
            );

            // Award bonus XP for successful real analysis
            await addXP(XP_VALUES.SCAN_INGREDIENTS, "SUCCESSFUL_SCAN");
          } else {
            throw new Error("No ingredients detected in image");
          }
        } else {
          logger.debug("❌ Backend analysis failed:", apiResponse.error);
          throw new Error(apiResponse.error || "Backend analysis failed");
        }
      } else {
        throw new Error("Unsupported image URI format or URI is missing");
      }
    } catch (imageError) {
      logger.error("❌ Image processing/analysis error:", imageError);

      // Fallback to common ingredients if image analysis fails
      logger.debug("🔄 Falling back to common ingredients...");
      const fallbackNames = getFallbackIngredients();
      const foundIngredients: Ingredient[] = [];

      for (let i = 0; i < fallbackNames.length; i++) {
        const name = fallbackNames[i];
        try {
          const response = await cookCamApi.searchIngredients(name, 1);

          if (response.success && response.data && response.data.length > 0) {
            const ingredient = response.data[0];
            foundIngredients.push({
              id: ingredient.id || `detected-${i}`,
              name: ingredient.name || name,
              confidence: 0.9 - i * 0.1,
              emoji: getEmojiForIngredient(ingredient.name || name),
            });
          }
        } catch (error) {
          logger.debug(`Failed to find fallback ingredient ${name}:`, error);
        }
      }

      if (foundIngredients.length > 0) {
        setIngredients(foundIngredients);
        logger.debug(
          `✅ Fallback successful: ${foundIngredients.length} ingredients found`
        );
      } else {
        // Ultimate fallback
        setIngredients([
          {
            id: "1",
            name: "Detected Ingredient 1",
            confidence: 0.85,
            emoji: "🥘",
          },
          {
            id: "2",
            name: "Detected Ingredient 2",
            confidence: 0.75,
            emoji: "🍽️",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [imageUri, isSimulator, addXP]);

  return {
    ingredients,
    loading,
    hasAnalyzedImage,
    setIngredients,
    analyzeImageIngredients,
  };
}; 