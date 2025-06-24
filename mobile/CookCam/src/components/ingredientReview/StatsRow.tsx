import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Star, Camera } from "lucide-react-native";
import { StatsRowProps } from "../../types/ingredientReview";
import { tokens, mixins } from "../../styles";

const StatsRow: React.FC<StatsRowProps> = React.memo(({
  ingredients,
  showMysteryBox,
  onMysteryBoxOpen,
}) => {
  const highConfidenceCount = ingredients.filter((ing) => ing.confidence >= 0.85).length;

  return (
    <View
      style={[
        mixins.layout.flexRow,
        {
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          backgroundColor: tokens.colors.background.primary,
          gap: tokens.spacing.md,
        },
      ]}
    >
      <View style={mixins.layout.centerContent}>
        <Star size={20} color={tokens.colors.brand.primary} />
        <Text
          style={[
            mixins.text.h4,
            {
              marginTop: tokens.spacing.xs / 2,
              fontSize: tokens.fontSize.lg,
            },
          ]}
        >
          {highConfidenceCount}
        </Text>
        <Text
          style={[
            mixins.text.caption,
            {
              textAlign: "center",
              marginTop: tokens.spacing.xs / 2,
              fontSize: tokens.fontSize.xs,
            },
          ]}
        >
          High Confidence
        </Text>
      </View>

      <View
        style={{
          width: 1,
          height: 40,
          backgroundColor: tokens.colors.border.primary,
        }}
      />

      <View style={mixins.layout.centerContent}>
        <Camera size={20} color={tokens.colors.interactive.leaderboard} />
        <Text
          style={[
            mixins.text.h4,
            {
              marginTop: tokens.spacing.xs / 2,
              fontSize: tokens.fontSize.lg,
            },
          ]}
        >
          {ingredients.length}
        </Text>
        <Text
          style={[
            mixins.text.caption,
            {
              textAlign: "center",
              marginTop: tokens.spacing.xs / 2,
              fontSize: tokens.fontSize.xs,
            },
          ]}
        >
          Detected
        </Text>
      </View>

      {/* Mystery box - only shows 25% of the time */}
      {showMysteryBox && (
        <View style={mixins.layout.centerContent}>
          <TouchableOpacity
            style={{
              padding: tokens.spacing.sm,
              backgroundColor: "rgba(255, 184, 0, 0.1)",
              borderRadius: tokens.borderRadius.medium,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255, 184, 0, 0.2)",
            }}
            onPress={onMysteryBoxOpen}
          >
            <Text style={{ fontSize: tokens.fontSize.lg }}>🎁</Text>
            <Text
              style={[
                mixins.text.caption,
                {
                  fontSize: tokens.fontSize.xs,
                  fontWeight: "600",
                  color: tokens.colors.interactive.leaderboard,
                  marginTop: tokens.spacing.xs / 2,
                },
              ]}
            >
              Lucky!
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

StatsRow.displayName = "StatsRow";

export default StatsRow; 