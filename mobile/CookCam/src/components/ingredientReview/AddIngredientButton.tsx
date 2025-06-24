import React, { useCallback } from "react";
import { TouchableOpacity, Text, Animated } from "react-native";
import { Plus } from "lucide-react-native";
import { AddIngredientButtonProps } from "../../types/ingredientReview";
import { tokens, mixins } from "../../styles";

const AddIngredientButton: React.FC<AddIngredientButtonProps> = React.memo(({
  addAnimScale,
  onAddIngredient,
}) => {
  const handlePress = useCallback(() => {
    onAddIngredient();
  }, [onAddIngredient]);

  return (
    <Animated.View style={{ transform: [{ scale: addAnimScale }] }}>
      <TouchableOpacity
        style={[
          mixins.layout.flexRow,
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.medium,
            gap: tokens.spacing.xs,
            borderWidth: 1,
            borderColor: tokens.colors.brand.primary,
            borderStyle: "dashed",
            marginTop: tokens.spacing.xs,
            marginHorizontal: tokens.spacing.md,
          },
        ]}
        onPress={handlePress}
      >
        <Plus size={20} color={tokens.colors.brand.primary} />
        <Text
          style={[
            mixins.text.body,
            {
              fontWeight: "600",
              color: tokens.colors.brand.primary,
            },
          ]}
        >
          Add Ingredient
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

AddIngredientButton.displayName = "AddIngredientButton";

export default AddIngredientButton; 