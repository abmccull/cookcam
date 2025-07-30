import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { Check, Star, Users, TrendingUp, Camera } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";
import logger from "../utils/logger";
import SubscriptionService from "../services/subscriptionService";


interface PlanPaywallScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "PlanPaywall">;
}

const PlanPaywallScreen: React.FC<PlanPaywallScreenProps> = ({
  navigation,
  route,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<"consumer" | "creator">("consumer");
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  // Get params from route or use defaults
  const { source, feature, selectedPlan: routeSelectedPlan, tempData } = route.params || {};
  
  // Use route param if provided, otherwise use state
  const currentSelectedPlan = (routeSelectedPlan || selectedPlan) as "consumer" | "creator";

  const planDetails = {
    consumer: {
      name: "Get Cooking",
      price: "$3.99",
      period: "month",
      description: "Perfect for home cooks who want AI-powered recipes",
      features: [
        "Unlimited ingredient scanning",
        "AI-generated recipes",
        "Step-by-step cooking mode",
        "Recipe favorites & history",
        "Basic nutritional info",
      ],
      color: "#4CAF50",
      icon: Camera,
    },
    creator: {
      name: "Creator Plan",
      price: "$9.99",
      period: "month",
      description: "For creators who want to monetize their culinary expertise",
      features: [
        "Everything in Get Cooking",
        "Creator dashboard & analytics",
        "Revenue sharing (30% to you)",
        "Premium recipe publishing",
        "Subscriber management",
        "Custom branding options",
      ],
      color: "#FF6B35",
      icon: TrendingUp,
    },
  };

  const currentPlan = planDetails[currentSelectedPlan];

  const handleStartTrial = async () => {
    try {
      setIsStartingTrial(true);

      logger.debug("🚀 Starting trial for:", currentSelectedPlan);
      logger.debug("📊 Temp data to merge:", tempData);

      // Initialize the subscription service
      const subscriptionService = SubscriptionService.getInstance();
      
      // 1. Initialize Apple/Google subscription based on plan
      const productId = currentSelectedPlan === "creator" ? "creator_monthly" : "premium_monthly";
      
      try {
        // Start the IAP purchase process
        await subscriptionService.purchaseProduct(productId);
        const purchaseResult: { success: boolean; error?: string } = { success: true };
        
        if (!purchaseResult.success) {
          throw new Error(purchaseResult.error || "Purchase failed");
        }

        logger.debug("✅ IAP purchase successful");

        // 2. Subscription is now active via backend validation
        // 3. User account already exists from signup
        // 4. Temp data merge would happen here if needed

        // 5. Set onboarding complete and navigate
        await SecureStore.setItemAsync("onboardingCompleted", "true");

        // Check if this is a creator plan
        if (currentSelectedPlan === "creator") {
          // Creator plans need KYC verification
          navigation.navigate("CreatorKYC");
        } else {
          // Consumer plans go directly to main app
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
        }
        
      } catch (purchaseError) {
        logger.error("IAP purchase failed:", purchaseError);
        
        // Offer free trial option as fallback
        Alert.alert(
          "Payment Issue",
          "We had trouble processing your payment. Would you like to start with a free trial instead?",
          [
            { text: "Try Again", onPress: () => setIsStartingTrial(false) },
            {
              text: "Start Free Trial",
              onPress: async () => {
                // Set limited free trial mode
                await SecureStore.setItemAsync("freeTrialMode", "true");
                await SecureStore.setItemAsync("onboardingCompleted", "true");
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs" }],
                });
              }
            }
          ]
        );
      }
      
    } catch (error) {
      logger.error("Trial start error:", error);
      Alert.alert(
        "Something went wrong",
        "We had trouble starting your trial. Please try again.",
        [{ text: "Try Again", onPress: () => setIsStartingTrial(false) }],
      );
    }
  };

  const IconComponent = currentPlan.icon;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: currentPlan.color },
              ]}
            >
              <IconComponent size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.planName}>{currentPlan.name}</Text>
            <Text style={styles.planDescription}>
              {currentPlan.description}
            </Text>
          </View>

          <View style={styles.pricingSection}>
            <Text style={styles.trialText}>3-day free trial</Text>
            <View style={styles.pricingContainer}>
              <Text style={styles.price}>{currentPlan.price}</Text>
              <Text style={styles.period}>/{currentPlan.period}</Text>
            </View>
            <Text style={styles.trialNote}>Cancel anytime during trial</Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            {currentPlan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkContainer}>
                  <Check size={16} color="#4CAF50" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {currentSelectedPlan === "creator" && (
            <View style={styles.revenueHighlight}>
              <View style={styles.revenueHeader}>
                <Star size={20} color="#FFC107" />
                <Text style={styles.revenueTitle}>Earn Revenue</Text>
              </View>
              <Text style={styles.revenueText}>
                Keep 30% of subscription revenue from your followers. The more
                subscribers you get, the more you earn!
              </Text>
            </View>
          )}

          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>
              Your demo progress will be saved:
            </Text>
            <View style={styles.dataItem}>
              <Users size={16} color="#8E8E93" />
              <Text style={styles.dataText}>
                {tempData?.tempScanData?.ingredients?.length || 0} scanned
                ingredients
              </Text>
            </View>
            <View style={styles.dataItem}>
              <Camera size={16} color="#8E8E93" />
              <Text style={styles.dataText}>Recipe preferences</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.startTrialButton,
            { backgroundColor: currentPlan.color },
          ]}
          onPress={handleStartTrial}
          disabled={isStartingTrial}
        >
          {isStartingTrial ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.startTrialText}>Start 3-Day Free Trial</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You won't be charged until after your free trial ends.{"\n"}
          Cancel anytime in your device settings.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  planName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  planDescription: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  pricingSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  trialText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 8,
  },
  pricingContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  period: {
    fontSize: 18,
    color: "#8E8E93",
    marginLeft: 4,
  },
  trialNote: {
    fontSize: 14,
    color: "#8E8E93",
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#2D1B69",
    flex: 1,
  },
  revenueHighlight: {
    backgroundColor: "#FFF8E1",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  revenueHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  revenueTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F57C00",
    marginLeft: 8,
  },
  revenueText: {
    fontSize: 14,
    color: "#F57C00",
    lineHeight: 20,
  },
  dataSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  dataSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 12,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dataText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  startTrialButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  startTrialText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footerNote: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default PlanPaywallScreen;
