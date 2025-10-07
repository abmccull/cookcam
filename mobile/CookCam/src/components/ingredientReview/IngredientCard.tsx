import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { X } from "lucide-react-native";
import { IngredientCardProps } from "../../types/ingredientReview";
import QuantityControls from "./QuantityControls";
import ConfidenceBar from "./ConfidenceBar";
import { tokens, mixins } from "../../styles";

const IngredientCard: React.FC<IngredientCardProps> = React.memo(({
  ingredient,
  index,
  addAnimScale,
  onQuantityChange,
  onRemove,
}) => {
  const handleRemove = useCallback(() => {
    onRemove(ingredient.id);
  }, [ingredient.id, onRemove]);

  const isLastAdded = index === 0; // Assuming newest items are at the beginning

  return (
    <Animated.View
      style={[
        mixins.cards.flat,
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginHorizontal: tokens.spacing.md,
          marginBottom: tokens.spacing.xs,
          padding: tokens.spacing.md,
          opacity: 1,
          transform: [{ translateX: 0 }],
        },
      ]}
    >
      <View
        style={[
          mixins.layout.flexRow,
          {
            alignItems: "center",
            gap: tokens.spacing.sm,
          },
        ]}
      >
        <Animated.Text
          style={[
            {
              fontSize: tokens.fontSize.xxxl,
              transform: [
                {
                  scale: isLastAdded ? addAnimScale : 1,
                },
              ],
            },
          ]}
        >
          {ingredient.emoji}
        </Animated.Text>
        <View style={{ flexDirection: "column", flex: 1 }}>
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                flexWrap: "wrap",
              },
            ]}
          >
            <Text
              style={[
                mixins.text.body,
                {
                  fontWeight: "600",
                  color: tokens.colors.text.primary,
                },
              ]}
            >
              {ingredient.name}
            </Text>
            {ingredient.variety && (
              <Text
                style={[
                  mixins.text.caption,
                  {
                    color: tokens.colors.text.tertiary,
                    marginLeft: tokens.spacing.xs / 2,
                    fontStyle: "italic",
                  },
                ]}
              >
                ({ingredient.variety})
              </Text>
            )}
          </View>

          {/* Quantity Controls */}
          <QuantityControls
            ingredient={ingredient}
            onQuantityChange={onQuantityChange}
          />

          {/* Confidence Bar */}
          <ConfidenceBar confidence={ingredient.confidence} />
        </View>
      </View>
      <TouchableOpacity
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(255, 59, 48, 0.1)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={handleRemove}
      >
        <X size={16} color={tokens.colors.status.error} />
      </TouchableOpacity>
    </Animated.View>
  );
});

IngredientCard.displayName = "IngredientCard";

export default IngredientCard; 