import React from "react";
import { View, Text, ScrollView } from "react-native";
import { CreatorTipsSectionProps } from "../../types/creator";
import { tokens, mixins } from "../../styles";

const CreatorTipsSection: React.FC<CreatorTipsSectionProps> = React.memo(({ tips }) => {
  return (
    <View style={{ paddingHorizontal: tokens.spacing.md, paddingBottom: 100 }}>
      <Text
        style={[
          mixins.text.h3,
          {
            marginBottom: tokens.spacing.md,
          },
        ]}
      >
        Creator Tips & Best Practices 💡
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tips.map((tip) => (
          <View
            key={tip.id}
            style={[
              mixins.cards.base,
              {
                padding: tokens.spacing.md,
                marginRight: tokens.spacing.sm,
                width: 200,
                alignItems: "center",
              },
            ]}
          >
            <tip.icon size={24} color={tokens.colors.brand.chef} />
            <Text
              style={[
                mixins.text.body,
                {
                  fontWeight: "600",
                  color: tokens.colors.text.primary,
                  marginTop: tokens.spacing.sm,
                  marginBottom: tokens.spacing.xs,
                  textAlign: "center",
                },
              ]}
            >
              {tip.title}
            </Text>
            <Text
              style={[
                mixins.text.caption,
                {
                  color: tokens.colors.text.tertiary,
                  textAlign: "center",
                  lineHeight: 20,
                },
              ]}
            >
              {tip.description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

CreatorTipsSection.displayName = "CreatorTipsSection";

export default CreatorTipsSection; 