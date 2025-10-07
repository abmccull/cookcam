import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { ExternalLink, Users, Award, DollarSign } from "lucide-react-native";
import { AnalyticsSectionProps } from "../../types/creator";
import { calculateConversionRate, calculateActiveRate } from "../../data/creatorData";
import { tokens, mixins } from "../../styles";

const AnalyticsSection: React.FC<AnalyticsSectionProps> = React.memo(({
  analytics,
  earnings,
}) => {
  const conversionRate = useMemo(() => {
    if (!analytics?.referrals) return "0";
    return calculateConversionRate(analytics.referrals.total, analytics.referrals.active);
  }, [analytics?.referrals]);

  const activeRate = useMemo(() => {
    if (!analytics?.referrals) return "0";
    return calculateActiveRate(analytics.referrals.total, analytics.referrals.active);
  }, [analytics?.referrals]);

  const totalClicks = analytics?.referrals.total || 0;
  const signUps = analytics?.referrals.active || 0;
  const activeSubs = analytics?.referrals.active || 0;
  const monthlyRevenue = earnings?.total_earnings || 0;

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
        Your Performance 📊
      </Text>
      <View
        style={[
          mixins.layout.flexRow,
          {
            flexWrap: "wrap",
            paddingHorizontal: tokens.spacing.md,
            gap: tokens.spacing.sm,
          },
        ]}
      >
        {/* Total Clicks */}
        <View
          style={[
            mixins.cards.base,
            {
              flex: 1,
              minWidth: 150,
              padding: tokens.spacing.md,
            },
          ]}
        >
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.sm,
              },
            ]}
          >
            <ExternalLink size={20} color={tokens.colors.brand.chef} />
            <Text style={[mixins.text.caption, { color: tokens.colors.text.secondary }]}>
              Total Clicks
            </Text>
          </View>
          <Text
            style={[
              mixins.text.h2,
              {
                color: tokens.colors.text.primary,
                fontSize: tokens.fontSize.xl + 4,
                fontWeight: tokens.fontWeight.bold,
              },
            ]}
          >
            {totalClicks.toLocaleString()}
          </Text>
        </View>

        {/* Sign-ups */}
        <View
          style={[
            mixins.cards.base,
            {
              flex: 1,
              minWidth: 150,
              padding: tokens.spacing.md,
            },
          ]}
        >
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.sm,
              },
            ]}
          >
            <Users size={20} color={tokens.colors.discover} />
            <Text style={[mixins.text.caption, { color: tokens.colors.text.secondary }]}>
              Sign-ups
            </Text>
          </View>
          <Text
            style={[
              mixins.text.h2,
              {
                color: tokens.colors.text.primary,
                fontSize: tokens.fontSize.xl + 4,
                fontWeight: tokens.fontWeight.bold,
              },
            ]}
          >
            {signUps.toLocaleString()}
          </Text>
          <Text
            style={[
              mixins.text.caption,
              {
                color: tokens.colors.text.tertiary,
                marginTop: tokens.spacing.xs / 2,
              },
            ]}
          >
            {conversionRate}% conversion
          </Text>
        </View>

        {/* Active Subs */}
        <View
          style={[
            mixins.cards.base,
            {
              flex: 1,
              minWidth: 150,
              padding: tokens.spacing.md,
            },
          ]}
        >
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.sm,
              },
            ]}
          >
            <Award size={20} color={tokens.colors.brand.primary} />
            <Text style={[mixins.text.caption, { color: tokens.colors.text.secondary }]}>
              Active Subs
            </Text>
          </View>
          <Text
            style={[
              mixins.text.h2,
              {
                color: tokens.colors.text.primary,
                fontSize: tokens.fontSize.xl + 4,
                fontWeight: tokens.fontWeight.bold,
              },
            ]}
          >
            {activeSubs.toLocaleString()}
          </Text>
          <Text
            style={[
              mixins.text.caption,
              {
                color: tokens.colors.text.tertiary,
                marginTop: tokens.spacing.xs / 2,
              },
            ]}
          >
            {activeRate}% active
          </Text>
        </View>

        {/* Monthly Revenue */}
        <View
          style={[
            mixins.cards.base,
            {
              minWidth: 312,
              backgroundColor: tokens.colors.background.accent,
              borderWidth: 1,
              borderColor: "#FFE5DC",
              padding: tokens.spacing.md,
            },
          ]}
        >
          <View
            style={[
              mixins.layout.flexRow,
              {
                alignItems: "center",
                gap: tokens.spacing.xs,
                marginBottom: tokens.spacing.sm,
              },
            ]}
          >
            <DollarSign size={20} color={tokens.colors.leaderboard} />
            <Text style={[mixins.text.caption, { color: tokens.colors.text.secondary }]}>
              Monthly Revenue
            </Text>
          </View>
          <Text
            style={[
              mixins.text.h2,
              {
                color: tokens.colors.brand.chef,
                fontSize: tokens.fontSize.xl + 4,
                fontWeight: tokens.fontWeight.bold,
              },
            ]}
          >
            ${monthlyRevenue.toFixed(2)}
          </Text>
          <Text
            style={[
              mixins.text.caption,
              {
                color: tokens.colors.text.tertiary,
                marginTop: tokens.spacing.xs / 2,
              },
            ]}
          >
            This month
          </Text>
        </View>
      </View>
    </View>
  );
});

AnalyticsSection.displayName = "AnalyticsSection";

export default AnalyticsSection; 