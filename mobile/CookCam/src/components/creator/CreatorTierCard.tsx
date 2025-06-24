import React from "react";
import { View, Text, Animated } from "react-native";
import { Users } from "lucide-react-native";
import { CreatorTierCardProps } from "../../types/creator";
import ChefBadge from "../ChefBadge";
import { tokens } from "../../styles";
import { mixins } from "../../styles";

const CreatorTierCard: React.FC<CreatorTierCardProps> = React.memo(({
  currentTier,
  nextTier,
  analytics,
  progressToNext,
  progressAnim,
  fadeAnim,
}) => {
  const subscriberCount = analytics?.referrals.active || 0;

  return (
    <Animated.View
      style={[
        mixins.cards.elevated,
        {
          marginHorizontal: tokens.spacing.md,
          marginBottom: tokens.spacing.lg,
          borderWidth: 2,
          borderColor: currentTier.color,
          opacity: fadeAnim,
          padding: tokens.spacing.md,
        },
      ]}
    >
      <View style={mixins.layout.flexRow}>
        <View style={[mixins.layout.flexRow, { flex: 1, gap: tokens.spacing.md }]}>
          <ChefBadge
            tier={currentTier.id as 1 | 2 | 3 | 4 | 5}
            size="large"
          />
          <View style={{ flex: 1 }}>
            <Text style={[mixins.text.h3, { color: tokens.colors.text.primary }]}>
              {currentTier.title}
            </Text>
            <Text
              style={[
                mixins.text.body,
                {
                  color: currentTier.color,
                  fontWeight: "600",
                  marginTop: tokens.spacing.xs,
                },
              ]}
            >
              Revenue Share • {currentTier.title}
            </Text>
          </View>
        </View>
        <View
          style={[
            mixins.layout.flexRow,
            {
              backgroundColor: tokens.colors.background.tertiary,
              paddingHorizontal: tokens.spacing.sm,
              paddingVertical: tokens.spacing.xs,
              borderRadius: tokens.borderRadius.large,
              gap: tokens.spacing.xs,
            },
          ]}
        >
          <Users size={16} color={tokens.colors.text.secondary} />
          <Text
            style={[
              mixins.text.body,
              {
                fontWeight: "600",
                color: tokens.colors.text.primary,
              },
            ]}
          >
            {subscriberCount.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Progress to next tier */}
      {nextTier && (
        <View style={{ marginTop: tokens.spacing.md }}>
          <View
            style={[
              mixins.layout.flexRow,
              { justifyContent: "space-between", marginBottom: tokens.spacing.xs },
            ]}
          >
            <Text style={[mixins.text.caption, { color: tokens.colors.text.secondary }]}>
              Progress to {nextTier.title}
            </Text>
            <Text
              style={[
                mixins.text.caption,
                {
                  fontWeight: "600",
                  color: tokens.colors.text.primary,
                },
              ]}
            >
              {subscriberCount.toLocaleString()} / {nextTier.minSubscribers}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: tokens.colors.background.tertiary,
              borderRadius: tokens.borderRadius.small,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: nextTier.color,
                borderRadius: tokens.borderRadius.small,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
          <Text
            style={[
              mixins.text.caption,
              {
                color: tokens.colors.text.secondary,
                marginTop: tokens.spacing.xs,
                textAlign: "center",
              },
            ]}
          >
            {nextTier.minSubscribers - subscriberCount} more subscribers to unlock{" "}
            {nextTier.title} tier and exclusive benefits!
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

CreatorTierCard.displayName = "CreatorTierCard";

export default CreatorTierCard; 