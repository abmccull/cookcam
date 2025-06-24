import React, { useCallback } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Star } from "lucide-react-native";
import { ContinueButtonProps } from "../../types/ingredientReview";
import { tokens, mixins } from "../../styles";

const ContinueButton: React.FC<ContinueButtonProps> = React.memo(({
  ingredientCount,
  onContinue,
}) => {
  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  return (
    <View
      style={{
        backgroundColor: tokens.colors.background.secondary,
        paddingHorizontal: tokens.spacing.md,
        paddingBottom: 20,
        paddingTop: tokens.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: tokens.colors.border.primary,
      }}
    >
      <TouchableOpacity
        style={[
          mixins.buttons.primary,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.brand.chef,
            gap: tokens.spacing.xs,
            ...tokens.shadow.lg,
          },
        ]}
        onPress={handleContinue}
        disabled={ingredientCount === 0}
      >
        <Text style={mixins.text.buttonPrimary}>Generate Recipes</Text>
        <Star size={18} color={tokens.colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );
});

ContinueButton.displayName = "ContinueButton";

export default ContinueButton; 