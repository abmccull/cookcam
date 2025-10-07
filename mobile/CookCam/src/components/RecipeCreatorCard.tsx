import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import OptimizedImage from "./OptimizedImage";
import {
  Star,
  Eye,
  Heart,
  ChefHat} from "lucide-react-native";
import ChefBadge from "./ChefBadge";

interface RecipeCreatorCardProps {
  recipe: {
    id: string;
    title: string;
    imageUrl?: string;
    creatorName?: string;
    creatorAvatar?: string;
    creatorTier?: number | undefined;
    viewCount: number;
    averageRating: number;
    ratingCount: number;
    prepTime: number;
    difficulty: "Easy" | "Medium" | "Hard";
    isSaved?: boolean | undefined;
  };
  onPress: () => void;
  onCreatorPress?: () => void;
  onSavePress?: () => void;
  size?: "small" | "medium" | "large";
}

const RecipeCreatorCard: React.FC<RecipeCreatorCardProps> = ({
  recipe,
  onPress,
  onCreatorPress,
  onSavePress,
  size = "medium"}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "#4CAF50";
      case "Medium":
        return "#FF9800";
      case "Hard":
        return "#F44336";
      default:
        return "#8E8E93";
    }
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const cardStyles =
    size === "small"
      ? smallStyles
      : size === "large"
        ? largeStyles
        : mediumStyles;

  const iconSize = size === "small" ? 30 : size === "large" ? 50 : 40;

  return (
    <TouchableOpacity
      style={[styles.container, cardStyles.container]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Recipe Image */}
      <View style={[styles.imageContainer, cardStyles.imageContainer]}>
        {recipe.imageUrl ? (
          <OptimizedImage
            source={{ uri: recipe.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ChefHat size={iconSize} color="#E5E5E7" />
          </View>
        )}

        {/* Save Button */}
        {onSavePress && (
          <TouchableOpacity style={styles.saveButton} onPress={onSavePress}>
            <Heart
              size={20}
              color={recipe.isSaved ? "#FF6B35" : "#FFFFFF"}
              fill={recipe.isSaved ? "#FF6B35" : "transparent"}
            />
          </TouchableOpacity>
        )}

        {/* Difficulty Badge */}
        <View
          style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(recipe.difficulty) + "20" },
          ]}
        >
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(recipe.difficulty) },
            ]}
          >
            {recipe.difficulty}
          </Text>
        </View>
      </View>

      {/* Recipe Info */}
      <View style={[styles.infoContainer, cardStyles.infoContainer]}>
        <Text style={[styles.title, cardStyles.title]} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Star size={14} color="#FFB800" fill="#FFB800" />
            <Text style={styles.statText}>
              {recipe.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.statSubtext}>({recipe.ratingCount})</Text>
          </View>
          <View style={styles.stat}>
            <Eye size={14} color="#8E8E93" />
            <Text style={styles.statText}>
              {formatViewCount(recipe.viewCount)}
            </Text>
          </View>
          <Text style={styles.prepTime}>{recipe.prepTime}min</Text>
        </View>

        {/* Creator Info */}
        {recipe.creatorName && (
          <TouchableOpacity
            style={styles.creatorRow}
            onPress={onCreatorPress}
            disabled={!onCreatorPress}
          >
            <View style={styles.creatorAvatar}>
              {recipe.creatorAvatar ? (
                <OptimizedImage
                  source={{ uri: recipe.creatorAvatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {recipe.creatorName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.creatorName}>by {recipe.creatorName}</Text>
            {recipe.creatorTier &&
              recipe.creatorTier >= 1 &&
              recipe.creatorTier <= 5 && (
                <ChefBadge
                  tier={recipe.creatorTier as 1 | 2 | 3 | 4 | 5}
                  size="small"
                />
              )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16},
  imageContainer: {
    position: "relative",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden"},
  image: {
    width: "100%",
    height: "100%"},
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center"},
  saveButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center"},
  difficultyBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12},
  difficultyText: {
    fontSize: 12,
    fontWeight: "600"},
  infoContainer: {
    padding: 16},
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8},
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12},
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16},
  statText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2D1B69",
    marginLeft: 4},
  statSubtext: {
    fontSize: 12,
    color: "#8E8E93",
    marginLeft: 2},
  prepTime: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: "auto"},
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
    paddingTop: 12},
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8},
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12},
  avatarText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF"},
  creatorName: {
    fontSize: 14,
    color: "#8E8E93",
    marginRight: 8}});

// Size variations
const smallStyles = StyleSheet.create({
  container: {
    width: 160},
  imageContainer: {
    height: 120},
  infoContainer: {
    padding: 12},
  title: {
    fontSize: 14}});

const mediumStyles = StyleSheet.create({
  container: {
    width: "100%"},
  imageContainer: {
    height: 180},
  infoContainer: {
    padding: 16},
  title: {
    fontSize: 18}});

const largeStyles = StyleSheet.create({
  container: {
    width: "100%"},
  imageContainer: {
    height: 240},
  infoContainer: {
    padding: 20},
  title: {
    fontSize: 20}});

export default RecipeCreatorCard;
