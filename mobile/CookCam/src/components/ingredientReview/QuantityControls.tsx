import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { QuantityControlsProps } from "../../types/ingredientReview";
import { tokens, mixins } from "../../styles";

const QuantityControls: React.FC<QuantityControlsProps> = React.memo(({
  ingredient,
  onQuantityChange,
}) => {
  const handleDecrease = useCallback(() => {
    onQuantityChange(ingredient.id, "decrease");
  }, [ingredient.id, onQuantityChange]);

  const handleIncrease = useCallback(() => {
    onQuantityChange(ingredient.id, "increase");
  }, [ingredient.id, onQuantityChange]);

  return (
    <View
      style={[
        mixins.layout.flexRow,
        {
          alignItems: "center",
          marginVertical: tokens.spacing.xs / 2,
        },
      ]}
    >
      <TouchableOpacity
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: tokens.colors.background.tertiary,
          justifyContent: "center",
          alignItems: "center",
          marginHorizontal: tokens.spacing.xs / 2,
        }}
        onPress={handleDecrease}
      >
        <Text
          style={[
            mixins.text.body,
            {
              fontWeight: "bold",
              color: tokens.colors.text.primary,
            },
          ]}
        >
          −
        </Text>
      </TouchableOpacity>
      <Text
        style={[
          mixins.text.caption,
          {
            color: tokens.colors.text.primary,
            fontWeight: "500",
            minWidth: 60,
            textAlign: "center",
          },
        ]}
      >
        {ingredient.quantity || "1"} {ingredient.unit || "unit"}
      </Text>
      <TouchableOpacity
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: tokens.colors.background.tertiary,
          justifyContent: "center",
          alignItems: "center",
          marginHorizontal: tokens.spacing.xs / 2,
        }}
        onPress={handleIncrease}
      >
        <Text
          style={[
            mixins.text.body,
            {
              fontWeight: "bold",
              color: tokens.colors.text.primary,
            },
          ]}
        >
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
});

QuantityControls.displayName = "QuantityControls";

export default QuantityControls; 