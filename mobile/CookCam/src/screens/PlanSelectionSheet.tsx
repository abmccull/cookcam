import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions} from "react-native";
import {
  Camera,
  DollarSign,
  Users,
  Star,
  Check,
  TrendingUp,
  ChefHat} from "lucide-react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import logger from "../utils/logger";
import { analyticsService } from "../services/analyticsService";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

interface PlanSelectionSheetProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "PlanSelection">;
}

const PlanSelectionSheet: React.FC<PlanSelectionSheetProps> = ({
  navigation,
  route}) => {
  const [selectedPlan, setSelectedPlan] = useState<"consumer" | "creator">(
    "consumer");

  useEffect(() => {
    analyticsService.track('plan_selection_viewed', {
      entry_point: route.params?.source || 'unknown',
      timestamp: new Date().toISOString()
    });
  }, []);

  const planOptions = [
    {
      id: "consumer",
      name: "Get Cooking",
      price: "$3.99",
      period: "month",
      description: "Perfect for home cooks who want AI-powered recipes",
      icon: Camera,
      color: "#66BB6A",
      features: [
        "Unlimited ingredient scanning",
        "AI recipe generation",
        "Step-by-step cook mode",
        "Save favorite recipes",
        "Nutrition information",
      ]},
    {
      id: "creator",
      name: "Creator Pro",
      price: "$9.99",
      period: "month",
      description: "For food creators who want to monetize their content",
      icon: DollarSign,
      color: "#FF6B35",
      features: [
        "Everything in Get Cooking",
        "Creator dashboard & analytics",
        "Publish premium recipes",
        "Earn 30% revenue share",
        "Referral tracking & bonuses",
        "Priority support",
      ]},
  ];

  const handlePlanSelect = (planId: "consumer" | "creator") => {
    setSelectedPlan(planId);
    
    analyticsService.track('plan_selected', {
      plan: planId,
      price: planId === 'creator' ? 9.99 : 3.99,
      timestamp: new Date().toISOString()
    });
  };

  const handleContinue = () => {
    logger.debug("🎯 Selected plan:", selectedPlan);

    analyticsService.track('plan_continue_clicked', {
      plan: selectedPlan,
      timestamp: new Date().toISOString()
    });

    // Navigate to paywall with selected plan
    navigation.navigate("PlanPaywall", {
      selectedPlan,
      source: "plan_selection"});
  };

  const renderPlanCard = (plan: (typeof planOptions)[0]) => {
    const isSelected = selectedPlan === plan.id;
    const IconComponent = plan.icon;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          { borderColor: isSelected ? plan.color : "#E0E0E0" },
        ]}
        onPress={() => handlePlanSelect(plan.id as "consumer" | "creator")}
      >
        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: plan.color }]}>
            <IconComponent size={24} color="#FFFFFF" />
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planPeriod}>/{plan.period}</Text>
            </View>
          </View>
          {isSelected && (
            <View style={[styles.checkmark, { backgroundColor: plan.color }]}>
              <Check size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={16} color={plan.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {plan.id === "creator" && (
          <View style={styles.revenueHighlight}>
            <Star size={16} color="#FFC107" />
            <Text style={styles.revenueText}>
              Earn money sharing recipes you love!
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Start your 7-day free trial, cancel anytime
        </Text>
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>🎉 7 Days Free</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.plansContainer}>
          {planOptions.map(renderPlanCard)}
        </View>

        <View style={styles.trialInfo}>
          <ChefHat size={20} color="#FF6B35" />
          <Text style={styles.trialText}>
            7-day free trial • No commitment • Cancel anytime
          </Text>
        </View>
        
        {/* Trust badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustBadge}>
            <Star size={16} color="#FFC107" fill="#FFC107" />
            <Text style={styles.trustBadgeText}>4.8★ Rating</Text>
          </View>
          <View style={styles.trustBadge}>
            <Users size={16} color="#66BB6A" />
            <Text style={styles.trustBadgeText}>50K+ Users</Text>
          </View>
          <View style={styles.trustBadge}>
            <TrendingUp size={16} color="#FF6B35" />
            <Text style={styles.trustBadgeText}>98% Stay</Text>
          </View>
        </View>
        
        <View style={styles.valueProposition}>
          <Text style={styles.valueTitle}>Why CookCam?</Text>
          <View style={styles.valueItem}>
            <Text style={styles.valueEmoji}>⚡</Text>
            <Text style={styles.valueText}>Save 30+ min on meal planning</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueEmoji}>🎯</Text>
            <Text style={styles.valueText}>No more food waste</Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueEmoji}>🍳</Text>
            <Text style={styles.valueText}>Learn new recipes daily</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: planOptions.find((p) => p.id === selectedPlan)
                ?.color},
          ]}
          onPress={handleContinue}
          accessible={true}
          accessibilityLabel={`Start 7-day free trial with ${selectedPlan === 'creator' ? 'Creator Pro' : 'Get Cooking'} plan`}
          accessibilityHint="Proceed to payment details and start your free trial"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>Start Free Trial</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You won't be charged until after your free trial ends. Cancel anytime
          in your device settings.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF"},
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: "center"},
  trialBadge: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12},
  trialBadgeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF"},
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center"},
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22},
  scrollView: {
    flex: 1},
  plansContainer: {
    paddingHorizontal: 24,
    paddingTop: 16},
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3},
  selectedPlanCard: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6},
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12},
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16},
  planInfo: {
    flex: 1},
  planName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 4},
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline"},
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69"},
  planPeriod: {
    fontSize: 16,
    color: "#8E8E93",
    marginLeft: 2},
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"},
  planDescription: {
    fontSize: 16,
    color: "#8E8E93",
    lineHeight: 22,
    marginBottom: 16},
  featuresContainer: {
    marginBottom: 16},
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8},
  featureText: {
    fontSize: 16,
    color: "#2D1B69",
    marginLeft: 12,
    flex: 1},
  revenueHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    padding: 12,
    borderRadius: 8,
    marginTop: 8},
  revenueText: {
    fontSize: 14,
    color: "#F57C00",
    fontWeight: "600",
    marginLeft: 8},
  trialInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16},
  trialText: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600",
    marginLeft: 8,
    textAlign: "center"},
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    paddingTop: 16},
  continueButton: {
    paddingVertical: 16,
    minHeight: 56, // Ensures 44pt minimum touch target + padding
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16},
  continueButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF"},
  footerNote: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20},
  valueProposition: {
    backgroundColor: "#F8F8FF",
    padding: 20,
    marginHorizontal: 24,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0"},
  valueTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 12,
    textAlign: "center"},
  valueItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8},
  valueEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 28},
  valueText: {
    fontSize: 16,
    color: "#2D1B69",
    flex: 1},
  trustBadges: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2},
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6},
  trustBadgeText: {
    fontSize: 14,
    color: "#2D1B69",
    fontWeight: "600",
    marginLeft: 6}});

export default PlanSelectionSheet;
