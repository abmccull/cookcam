import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Star, X, Camera } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface RecipeRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: RatingData) => void;
  recipeName: string;
  recipeId: string;
}

interface RatingData {
  overallRating: number;
  subRatings: {
    taste?: number | undefined;
    ease?: number | undefined;
    presentation?: number | undefined;
    accuracy?: number | undefined;
    value?: number | undefined;
  };
  review?: string | undefined;
  images?: string[] | undefined;
}

const RecipeRatingModal: React.FC<RecipeRatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  recipeName,
  recipeId, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  // Future: Use recipeId for analytics tracking
  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState({
    taste: 0,
    ease: 0,
    presentation: 0,
    accuracy: 0,
    value: 0,
  });
  const [review, setReview] = useState("");
  const [showSubRatings, setShowSubRatings] = useState(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderStars = (
    rating: number,
    onPress: (value: number) => void,
    size = 32,
  ) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => {
              triggerHaptic();
              onPress(value);
            }}
            style={styles.starButton}
          >
            <Star
              size={size}
              color={value <= rating ? "#FFB800" : "#E5E5E7"}
              fill={value <= rating ? "#FFB800" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleSubmit = () => {
    if (overallRating === 0) {
      Alert.alert("Rating Required", "Please provide an overall rating");
      return;
    }

    const ratingData: RatingData = {
      overallRating,
      subRatings: showSubRatings ? subRatings : {},
      review: review.trim() || undefined,
    };

    onSubmit(ratingData);
    resetForm();
  };

  const resetForm = () => {
    setOverallRating(0);
    setSubRatings({
      taste: 0,
      ease: 0,
      presentation: 0,
      accuracy: 0,
      value: 0,
    });
    setReview("");
    setShowSubRatings(false);
  };

  const subRatingCategories = [
    { key: "taste", label: "Taste", emoji: "🍽️" },
    { key: "ease", label: "Ease", emoji: "⚡" },
    { key: "presentation", label: "Presentation", emoji: "📸" },
    { key: "accuracy", label: "Accuracy", emoji: "✅" },
    { key: "value", label: "Value", emoji: "💰" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Rate Your Experience</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Recipe Name */}
            <Text style={styles.recipeName}>{recipeName}</Text>

            {/* Overall Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Overall Rating*</Text>
              {renderStars(overallRating, setOverallRating)}
              <Text style={styles.ratingText}>
                {overallRating === 0
                  ? "Tap to rate"
                  : ["Poor", "Fair", "Good", "Very Good", "Excellent"][
                      overallRating - 1
                    ]}
              </Text>
            </View>

            {/* Toggle Sub-Ratings */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowSubRatings(!showSubRatings)}
            >
              <Text style={styles.toggleText}>
                {showSubRatings ? "Hide" : "Add"} detailed ratings
              </Text>
            </TouchableOpacity>

            {/* Sub-Ratings */}
            {showSubRatings && (
              <View style={styles.subRatingsSection}>
                <Text style={styles.sectionTitle}>Rate Each Aspect</Text>
                {subRatingCategories.map((category) => (
                  <View key={category.key} style={styles.subRatingItem}>
                    <View style={styles.subRatingLabel}>
                      <Text style={styles.subRatingEmoji}>
                        {category.emoji}
                      </Text>
                      <Text style={styles.subRatingText}>{category.label}</Text>
                    </View>
                    {renderStars(
                      subRatings[category.key as keyof typeof subRatings],
                      (value) =>
                        setSubRatings({ ...subRatings, [category.key]: value }),
                      24,
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Review Text */}
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>Write a Review (Optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your cooking experience..."
                placeholderTextColor="#8E8E93"
                multiline
                maxLength={500}
                value={review}
                onChangeText={setReview}
              />
              <Text style={styles.characterCount}>{review.length}/500</Text>
            </View>

            {/* Add Photos Button */}
            <TouchableOpacity style={styles.addPhotoButton}>
              <Camera size={20} color="#FF6B35" />
              <Text style={styles.addPhotoText}>Add Photos</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              overallRating === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={overallRating === 0}
          >
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  closeButton: {
    padding: 4,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 8,
  },
  toggleButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
  },
  subRatingsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subRatingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subRatingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  subRatingEmoji: {
    fontSize: 20,
  },
  subRatingText: {
    fontSize: 14,
    color: "#2D1B69",
  },
  reviewSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    fontSize: 16,
    color: "#2D1B69",
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "right",
    marginTop: 4,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#E5E5E7",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default RecipeRatingModal;
