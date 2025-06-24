import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, ExternalLink } from "lucide-react-native";
import { PayoutSectionProps } from "../../types/creator";
import { tokens, mixins } from "../../styles";

const PayoutSection: React.FC<PayoutSectionProps> = React.memo(({
  analytics,
  earnings,
  onOpenStripeConnect,
}) => {
  const isConnected = analytics?.stripeAccount?.isConnected || false;
  const availableBalance = earnings?.available_balance || 0;
  const nextPayoutDate = earnings?.next_payout_date;

  const handleManageBank = useCallback(() => {
    onOpenStripeConnect();
  }, [onOpenStripeConnect]);

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
        Payout Status 💳
      </Text>
      <View
        style={[
          mixins.cards.base,
          {
            marginHorizontal: tokens.spacing.md,
            padding: tokens.spacing.md,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <View style={[mixins.layout.flexRow, { flex: 1 }]}>
          <View style={{ marginRight: tokens.spacing.sm }}>
            <CheckCircle 
              size={20} 
              color={isConnected ? tokens.colors.status.success : tokens.colors.status.warning} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                mixins.text.body,
                {
                  fontWeight: "600",
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing.xs / 2,
                },
              ]}
            >
              {isConnected ? "Bank Account Connected" : "Setup Required"}
            </Text>
            <Text
              style={[
                mixins.text.caption,
                { color: tokens.colors.text.secondary },
              ]}
            >
              {nextPayoutDate
                ? `Next payout: ${new Date(nextPayoutDate).toLocaleDateString()}`
                : "Complete Stripe setup to enable payouts"}
            </Text>
            {availableBalance > 0 && (
              <Text
                style={[
                  mixins.text.caption,
                  {
                    color: tokens.colors.status.success,
                    fontWeight: "600",
                    marginTop: tokens.spacing.xs / 2,
                  },
                ]}
              >
                Available: ${availableBalance.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            mixins.layout.flexRow,
            {
              backgroundColor: "rgba(0, 122, 255, 0.1)",
              paddingHorizontal: tokens.spacing.sm,
              paddingVertical: tokens.spacing.xs,
              borderRadius: tokens.borderRadius.medium,
              gap: tokens.spacing.xs / 2,
            },
          ]}
          onPress={handleManageBank}
        >
          <ExternalLink size={16} color="#007AFF" />
          <Text
            style={[
              mixins.text.caption,
              {
                fontWeight: "600",
                color: "#007AFF",
              },
            ]}
          >
            {isConnected ? "Manage" : "Setup"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

PayoutSection.displayName = "PayoutSection";

export default PayoutSection; 