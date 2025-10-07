import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert} from "react-native";
import FeatureGate, {
  PremiumRecipesGate,
  CreatorToolsGate,
  UsageLimit} from "../components/FeatureGate";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import {
  useSubscription,
  useFeatureGate} from "../context/SubscriptionContext";
import { useAnalytics, useScreenTracking } from "../services/analyticsService";
import { useAuth } from "../context/AuthContext";

// Example of integrating feature gates into an existing screen
export default function ExampleFeatureGateScreen() {
  const [scanCount, setScanCount] = useState(0);
  const { user } = useAuth();
  const {
    state,
    isSubscribed,
    hasActiveTrial,
    canUseFeature,
    getRemainingUsage} = useSubscription();

  const { hasAccess: canScanUnlimited } = useFeatureGate("unlimited_scans");
  const analytics = useAnalytics();

  // Track screen view
  useScreenTracking("feature_gate_example", {
    subscription_tier: state.currentSubscription?.tier_slug || "free"});

  // Example: Scanning with feature gate
  const handleScan = () => {
    analytics.trackUserAction("scan_attempted");

    if (!canScanUnlimited && scanCount >= 5) {
      // Show upgrade prompt for unlimited scans
      Alert.alert(
        "Daily Scan Limit Reached",
        "Upgrade to scan unlimited ingredients every day!",
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "Upgrade Now",
            onPress: () => {
              analytics.trackSubscriptionEvent("upgrade_clicked", {
                trigger: "scan_limit"});
              // Navigate to subscription screen
            }},
        ]);
      return;
    }

    // Perform scan
    setScanCount((prev) => prev + 1);
    analytics.trackIngredientScan({
      ingredientCount: Math.floor(Math.random() * 5) + 1,
      confidence: 0.85,
      processingTime: 1500});
  };

  // Example: Premium recipe generation
  const handlePremiumRecipe = () => {
    analytics.trackUserAction("premium_recipe_attempted");

    if (!canUseFeature("premium_recipes")) {
      analytics.trackSubscriptionEvent("upgrade_prompt_shown", {
        feature: "premium_recipes"});
      Alert.alert(
        "Premium Feature",
        "This advanced recipe requires a premium subscription",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => {
              analytics.trackSubscriptionEvent("upgrade_clicked", {
                feature: "premium_recipes"});
            }},
        ]);
      return;
    }

    // Generate premium recipe
    analytics.trackRecipeGeneration({
      ingredientCount: 8,
      recipeComplexity: "complex",
      generationTime: 3000,
      success: true});
  };

  const remainingScans = getRemainingUsage("daily_scans");

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feature Gates Example</Text>
        <Text style={styles.subtitle}>
          Subscription: {state.currentSubscription?.tier_slug || "free"}
          {hasActiveTrial() && " (Trial)"}
        </Text>
      </View>

      {/* Example 1: Basic scan with usage tracking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Ingredient Scanning</Text>

        <UsageLimit feature="daily_scans" warningThreshold={0.8}>
          <TouchableOpacity style={styles.actionButton} onPress={handleScan}>
            <Text style={styles.actionButtonText}>
              Scan Ingredients ({scanCount}/5 today)
            </Text>
          </TouchableOpacity>

          {remainingScans !== null && (
            <Text style={styles.usageText}>
              {remainingScans} scans remaining today
            </Text>
          )}
        </UsageLimit>
      </View>

      {/* Example 2: Feature gate with fallback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍳 Recipe Generation</Text>

        {/* Basic recipes (always available) */}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Generate Basic Recipe</Text>
        </TouchableOpacity>

        {/* Premium recipes (feature gated) */}
        <PremiumRecipesGate userId={user?.id || ""}>
          <TouchableOpacity
            style={[styles.actionButton, styles.premiumButton]}
            onPress={handlePremiumRecipe}
          >
            <Text style={[styles.actionButtonText, styles.premiumButtonText]}>
              ✨ Generate Premium Recipe
            </Text>
          </TouchableOpacity>
        </PremiumRecipesGate>
      </View>

      {/* Example 3: Creator tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💼 Creator Tools</Text>

        <CreatorToolsGate userId={user?.id || ""}>
          <View style={styles.creatorTools}>
            <TouchableOpacity style={styles.creatorButton}>
              <Text style={styles.creatorButtonText}>
                📊 Analytics Dashboard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.creatorButton}>
              <Text style={styles.creatorButtonText}>
                🔗 Generate Affiliate Link
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.creatorButton}>
              <Text style={styles.creatorButtonText}>💰 Request Payout</Text>
            </TouchableOpacity>
          </View>
        </CreatorToolsGate>
      </View>

      {/* Example 4: Multiple features with different access levels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Feature Access Summary</Text>

        <View style={styles.featuresList}>
          <FeatureItem
            feature="unlimited_scans"
            name="Unlimited Scans"
            icon="📸"
          />
          <FeatureItem
            feature="premium_recipes"
            name="Premium Recipes"
            icon="✨"
          />
          <FeatureItem
            feature="ad_free_experience"
            name="Ad-Free Experience"
            icon="🚫"
          />
          <FeatureItem
            feature="advanced_nutrition"
            name="Detailed Nutrition"
            icon="📊"
          />
          <FeatureItem
            feature="creator_tools"
            name="Creator Monetization"
            icon="💼"
          />
        </View>
      </View>

      {/* Example 5: Analytics Dashboard (Premium feature) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Analytics Dashboard</Text>

        <FeatureGate
          feature="analytics_dashboard"
          userId={user?.id || ""}
          fallbackComponent={
            <View style={styles.analyticsPlaceholder}>
              <Text style={styles.placeholderText}>
                📊 Analytics dashboard is available with premium subscription
              </Text>
            </View>
          }
        >
          <AnalyticsDashboard />
        </FeatureGate>
      </View>

      {/* Example 6: Subscription management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Subscription Management</Text>

        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionText}>
            Current Plan: {state.currentSubscription?.tier_slug || "Free"}
          </Text>

          {state.currentSubscription && (
            <Text style={styles.subscriptionText}>
              Status: {state.currentSubscription.status}
            </Text>
          )}

          {!isSubscribed() && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                analytics.trackSubscriptionEvent("upgrade_clicked", {
                  source: "settings"});
                // Navigate to subscription screen
              }}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Helper component for feature list
function FeatureItem({
  feature,
  name,
  icon}: {
  feature: string;
  name: string;
  icon: string;
}) {
  const { hasAccess } = useFeatureGate(feature);

  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureName}>{name}</Text>
      <Text
        style={[styles.featureStatus, hasAccess && styles.featureStatusActive]}
      >
        {hasAccess ? "✅" : "🔒"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA"},
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF"},
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#343A40"},
  subtitle: {
    fontSize: 14,
    color: "#6C757D",
    marginTop: 4},
  section: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3},
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#343A40",
    marginBottom: 16},
  actionButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8},
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"},
  premiumButton: {
    backgroundColor: "#6F42C1"},
  premiumButtonText: {
    color: "#FFFFFF"},
  usageText: {
    fontSize: 12,
    color: "#6C757D",
    textAlign: "center",
    marginTop: 4},
  creatorTools: {
    gap: 8},
  creatorButton: {
    backgroundColor: "#28A745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"},
  creatorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"},
  featuresList: {
    gap: 8},
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8},
  featureIcon: {
    fontSize: 20,
    marginRight: 12},
  featureName: {
    flex: 1,
    fontSize: 16,
    color: "#343A40"},
  featureStatus: {
    fontSize: 16},
  featureStatusActive: {
    color: "#28A745"},
  analyticsPlaceholder: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8},
  placeholderText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center"},
  subscriptionInfo: {
    alignItems: "center"},
  subscriptionText: {
    fontSize: 16,
    color: "#343A40",
    marginBottom: 8},
  upgradeButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8},
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"}});
