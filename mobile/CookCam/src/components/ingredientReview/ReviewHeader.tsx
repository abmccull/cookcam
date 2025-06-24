import React from "react";
import { View, Text } from "react-native";
import { ReviewHeaderProps } from "../../types/ingredientReview";
import AIChefIcon from "../AIChefIcon";
import { tokens, mixins } from "../../styles";

const ReviewHeader: React.FC<ReviewHeaderProps> = React.memo(({ loading, ingredientCount }) => {
  return (
    <View
      style={[
        mixins.containers.sectionPadded,
        {
          alignItems: "center",
          paddingTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.sm,
          backgroundColor: tokens.colors.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.border.primary,
          ...tokens.shadow.md,
        },
      ]}
    >
      <AIChefIcon size={24} />
      <Text
        style={[
          mixins.text.h4,
          {
            marginTop: tokens.spacing.xs / 2,
            marginBottom: tokens.spacing.xs / 4,
          },
        ]}
      >
        {loading ? "Analyzing Ingredients..." : "AI Detected Ingredients"}
      </Text>
      <Text style={mixins.text.caption}>
        {loading ? "Please wait" : `${ingredientCount} items found`}
      </Text>
    </View>
  );
});

ReviewHeader.displayName = "ReviewHeader";

export default ReviewHeader; 