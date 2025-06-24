import React from "react";
import { View, Text } from "react-native";
import { ConfidenceBarProps } from "../../types/ingredientReview";
import { getConfidenceColor } from "../../data/ingredientReviewData";
import { tokens, mixins } from "../../styles";

const ConfidenceBar: React.FC<ConfidenceBarProps> = React.memo(({ confidence }) => {
  const confidenceColor = getConfidenceColor(confidence);

  return (
    <View
      style={[
        mixins.layout.flexRow,
        {
          alignItems: "center",
          marginTop: tokens.spacing.xs / 2,
        },
      ]}
    >
      <View
        style={{
          height: 4,
          backgroundColor: tokens.colors.border.primary,
          borderRadius: tokens.borderRadius.small,
          overflow: "hidden",
          flex: 1,
          marginRight: tokens.spacing.xs,
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${confidence * 100}%`,
            backgroundColor: confidenceColor,
          }}
        />
      </View>
      <Text
        style={[
          mixins.text.caption,
          {
            color: confidenceColor,
            fontWeight: "600",
            minWidth: 30,
            fontSize: tokens.fontSize.xs,
          },
        ]}
      >
        {Math.round(confidence * 100)}%
      </Text>
    </View>
  );
});

ConfidenceBar.displayName = "ConfidenceBar";

export default ConfidenceBar; 