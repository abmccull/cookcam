import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Crown,
  Star,
  TrendingUp,
  DollarSign,
  Shield,
  Zap,
} from "lucide-react-native";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import {
  SubscriptionProduct,
  SubscriptionStatus,
} from "../services/subscriptionService";
import SubscriptionService from "../services/subscriptionService";
import logger from "../utils/logger";


interface SubscriptionScreenProps {
  navigation: any;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  navigation,
}) => {
  const {
    state,
    purchaseSubscription,
    autoSubscribeCreator,
    isCreator,
    restorePurchases,
  } = useSubscription();
  const { user } = useAuth();
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const subscriptionService = SubscriptionService.getInstance();
      const availableProducts =
        await subscriptionService.getAvailableProducts();
      setProducts(availableProducts);
    } catch (error) {
      logger.error("Failed to load products:", error);
    }
  };

  const handlePurchase = async (productId: string) => {
    if (loading) {
      return;
    }

    setLoading(true);
    setSelectedProduct(productId);

    try {
      await purchaseSubscription(productId);

      Alert.alert(
        "Success!",
        "Your subscription has been activated. Welcome to CookCam Premium!",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      logger.error("Purchase failed:", error);

      if (error.message?.includes("cancelled")) {
        // User cancelled, no need to show error
        return;
      }

      Alert.alert(
        "Purchase Failed",
        "Unable to complete your purchase. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
      setSelectedProduct(null);
    }
  };

  const handleCreatorAutoSubscribe = async () => {
    if (!user?.id || loading) {
      return;
    }

    setLoading(true);

    try {
      const success = await autoSubscribeCreator(user.id);

      if (success) {
        Alert.alert(
          "Creator Subscription Activated!",
          "Welcome to CookCam Creator! You now have access to monetization tools with earnings from referrals (30%), tips (100%), and collections (70%).",
          [
            {
              text: "Get Started",
              onPress: () => navigation.navigate("Creator"),
            },
          ],
        );
      } else {
        Alert.alert(
          "Auto-Subscribe Failed",
          "Unable to activate Creator subscription. Please try manually subscribing.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      logger.error("Auto-subscribe failed:", error);
      Alert.alert("Error", "Something went wrong. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const restored = await restorePurchases();

      // restorePurchases returns void, so we'll just show success
      Alert.alert(
        "Restore Attempted",
        "Restore purchases has been initiated. Check your subscription status.",
        [{ text: "OK" }],
      );
    } catch (error) {
      logger.error("Restore failed:", error);
      Alert.alert(
        "Restore Failed",
        "Unable to restore purchases. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const getProductIcon = (tier: "regular" | "creator") => {
    return tier === "creator" ? Crown : Star;
  };

  const getProductColor = (tier: "regular" | "creator") => {
    return tier === "creator" ? "#FFD700" : "#007AFF";
  };

  const renderProduct = (product: SubscriptionProduct) => {
    const Icon = getProductIcon(product.tier);
    const color = getProductColor(product.tier);
    const isSelected = selectedProduct === product.productId;
    const isCurrentTier = state.currentSubscription?.tier_slug === product.tier;

    return (
      <TouchableOpacity
        key={product.productId}
        style={[
          styles.productCard,
          { borderColor: color },
          isCurrentTier && styles.currentTier,
        ]}
        onPress={() => handlePurchase(product.productId)}
        disabled={loading || isCurrentTier}
      >
        <View style={styles.productHeader}>
          <Icon size={32} color={color} />
          <View style={styles.productTitleContainer}>
            <Text style={[styles.productTitle, { color }]}>
              {product.title}
            </Text>
            <Text style={styles.productPrice}>
              {product.localizedPrice}/month
            </Text>
          </View>
          {product.tier === "creator" && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>CREATOR</Text>
            </View>
          )}
        </View>

        <Text style={styles.productDescription}>{product.description}</Text>

        <View style={styles.trialInfo}>
          <Shield size={16} color="#4CAF50" />
          <Text style={styles.trialText}>
            {product.freeTrialPeriod} free trial
          </Text>
        </View>

        {product.tier === "creator" && (
          <View style={styles.revenueShare}>
            <DollarSign size={16} color="#4CAF50" />
            <Text style={styles.revenueText}>
              Creator earnings: 30% referrals, 100% tips, 70% collections
            </Text>
          </View>
        )}

        <View style={styles.productFeatures}>
          {["Premium recipes", "Unlimited scans", "Ad-free experience"].map(
            (feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Zap size={14} color="#4CAF50" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ),
          )}
          {product.tier === "creator" && (
            <>
              <View style={styles.featureItem}>
                <TrendingUp size={14} color="#4CAF50" />
                <Text style={styles.featureText}>Analytics dashboard</Text>
              </View>
              <View style={styles.featureItem}>
                <Crown size={14} color="#4CAF50" />
                <Text style={styles.featureText}>Creator badge</Text>
              </View>
            </>
          )}
        </View>

        {isCurrentTier ? (
          <View style={[styles.subscribeButton, styles.currentButton]}>
            <Text style={styles.currentButtonText}>Current Plan</Text>
          </View>
        ) : (
          <View style={[styles.subscribeButton, { backgroundColor: color }]}>
            {isSelected && loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                Start {product.freeTrialPeriod} Free Trial
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock premium features and start creating amazing recipes
          </Text>
        </View>

        {/* Creator Auto-Subscribe Button */}
        {user?.isCreator && !isCreator() && (
          <TouchableOpacity
            style={styles.autoSubscribeButton}
            onPress={handleCreatorAutoSubscribe}
            disabled={loading}
          >
            <Crown size={20} color="#FFD700" />
            <Text style={styles.autoSubscribeText}>
              Auto-Subscribe to Creator Tier
            </Text>
            {loading && <ActivityIndicator color="#FFD700" size="small" />}
          </TouchableOpacity>
        )}

        <View style={styles.productsContainer}>
          {products.map(renderProduct)}
        </View>

        {/* Restore Purchases Button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            • Cancel anytime{"\n"}• No commitment{"\n"}• Secure payments via App
            Store/Google Play
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
  autoSubscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  autoSubscribeText: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "600",
  },
  productsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  productCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentTier: {
    backgroundColor: "#f0fdf4",
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  productTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  productPrice: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  popularBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  productDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  trialInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  trialText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  revenueShare: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  revenueText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  productFeatures: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  subscribeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  currentButton: {
    backgroundColor: "#e5e7eb",
  },
  currentButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginVertical: 20,
  },
  restoreButtonText: {
    color: "#007AFF",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default SubscriptionScreen;
