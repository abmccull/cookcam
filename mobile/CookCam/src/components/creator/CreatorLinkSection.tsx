import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Copy, Share2 } from "lucide-react-native";
import { CreatorLinkSectionProps } from "../../types/creator";
import { getCreatorShareableLink } from "../../data/creatorData";
import { tokens, mixins } from "../../styles";

const CreatorLinkSection: React.FC<CreatorLinkSectionProps> = React.memo(({
  userId,
  onCopyCode,
  onShare,
}) => {
  const shareableLink = getCreatorShareableLink(userId);

  const handleCopyCode = useCallback(() => {
    onCopyCode();
  }, [onCopyCode]);

  const handleShare = useCallback(() => {
    onShare();
  }, [onShare]);

  return (
    <View style={{ marginBottom: tokens.spacing.lg }}>
      <Text
        style={[
          mixins.text.h3,
          {
            paddingHorizontal: tokens.spacing.md,
            marginBottom: tokens.spacing.md,
          },
        ]}
      >
        Your Creator Link 🔗
      </Text>
      <View
        style={[
          mixins.cards.base,
          {
            marginHorizontal: tokens.spacing.md,
            padding: tokens.spacing.md,
          },
        ]}
      >
        <Text
          style={[
            mixins.text.caption,
            {
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing.sm,
            },
          ]}
        >
          Share this link with your audience:
        </Text>
        <View
          style={[
            mixins.layout.flexRow,
            {
              backgroundColor: tokens.colors.background.tertiary,
              borderRadius: tokens.borderRadius.medium,
              padding: tokens.spacing.md,
              marginBottom: tokens.spacing.sm,
            },
          ]}
        >
          <Text
            style={[
              mixins.text.body,
              {
                flex: 1,
                fontWeight: "600",
                color: tokens.colors.text.primary,
                fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
              },
            ]}
          >
            {shareableLink}
          </Text>
          <TouchableOpacity
            style={{ padding: tokens.spacing.xs }}
            onPress={handleCopyCode}
          >
            <Copy size={18} color={tokens.colors.brand.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            mixins.buttons.primary,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tokens.colors.brand.chef,
              gap: tokens.spacing.xs,
            },
          ]}
          onPress={handleShare}
        >
          <Share2 size={18} color={tokens.colors.text.inverse} />
          <Text style={mixins.text.buttonPrimary}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

CreatorLinkSection.displayName = "CreatorLinkSection";

export default CreatorLinkSection; 