import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Star } from "lucide-react-native";
import { MysteryBoxModalProps } from "../../types/ingredientReview";
import { tokens, mixins } from "../../styles";

const MysteryBoxModal: React.FC<MysteryBoxModalProps> = React.memo(({
  visible,
  reward,
  onClose,
}) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!reward) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          style={[
            mixins.cards.elevated,
            {
              backgroundColor: tokens.colors.background.primary,
              padding: tokens.spacing.md,
              borderRadius: tokens.borderRadius.medium,
              borderWidth: 2,
              borderColor: reward.color,
              minWidth: 280,
            },
          ]}
        >
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: tokens.spacing.md,
                backgroundColor: reward.color,
                marginHorizontal: -tokens.spacing.md,
                marginTop: -tokens.spacing.md,
                paddingHorizontal: tokens.spacing.md,
                paddingVertical: tokens.spacing.sm,
                borderTopLeftRadius: tokens.borderRadius.medium,
                borderTopRightRadius: tokens.borderRadius.medium,
              },
            ]}
          >
            <Text
              style={[
                mixins.text.body,
                {
                  fontWeight: "bold",
                  color: tokens.colors.text.inverse,
                },
              ]}
            >
              {reward.rarity.toUpperCase()}
            </Text>
            <Text style={{ fontSize: tokens.fontSize.lg }}>{reward.icon}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text
              style={[
                mixins.text.h4,
                {
                  color: reward.color,
                  marginBottom: tokens.spacing.md,
                  textAlign: "center",
                },
              ]}
            >
              {reward.title}
            </Text>
            <Text
              style={[
                mixins.text.body,
                {
                  color: tokens.colors.text.tertiary,
                  textAlign: "center",
                  marginBottom: tokens.spacing.md,
                },
              ]}
            >
              {reward.description}
            </Text>
            <TouchableOpacity
              style={[
                mixins.buttons.primary,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: reward.color,
                  gap: tokens.spacing.xs,
                },
              ]}
              onPress={handleClose}
            >
              <Text style={mixins.text.buttonPrimary}>Collect!</Text>
              <Star size={16} color={tokens.colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

MysteryBoxModal.displayName = "MysteryBoxModal";

export default MysteryBoxModal; 