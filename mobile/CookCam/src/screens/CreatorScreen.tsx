import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Share,
  Alert,
  Clipboard,
  Platform,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Users,
  DollarSign,
  Copy,
  Share2,
  ChefHat,
  Award,
  Lock,
  CheckCircle,
  Info,
  Star,
  Play,
  Target,
  BookOpen,
  Zap,
  Clock,
  ExternalLink,
  RefreshCw,
  Crown,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
  isSmallScreen,
} from "../utils/responsive";
import * as Haptics from "expo-haptics";
import ChefBadge from "../components/ChefBadge";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import logger from "../utils/logger";
import StripeConnectService from "../services/StripeConnectService";
import { cookCamApi } from "../services/cookCamApi";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";

interface CreatorTier {
  id: number;
  title: string;
  emoji: string;
  minSubscribers: number;
  maxSubscribers: number | null;
  revenueShare: number;
  color: string;
  unlocked: boolean;
}

interface CreatorTip {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: "content" | "growth" | "monetization";
}

interface CreatorAnalytics {
  revenue: {
    total_earnings: number;
    affiliate_earnings: number;
    tips_earnings: number;
    collections_earnings: number;
    active_referrals: number;
  };
  referrals: {
    total: number;
    active: number;
    data: any[];
  };
  recipes: any[];
  recentTips: any[];
  stripeAccount?: {
    isConnected: boolean;
    canReceivePayouts: boolean;
    accountId: string | null;
  };
}

interface CreatorEarnings {
  total_earnings: number;
  available_balance: number;
  pending_balance: number;
  last_payout_date: string | null;
  next_payout_date: string | null;
}

interface CreatorScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, "Creator">;
}

const CreatorScreen = ({ navigation }: CreatorScreenProps) => {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const { state: subscriptionState, isCreator } = useSubscription();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Real API data state
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Static creator tips (these can remain hardcoded as educational content)
  const creatorTips: CreatorTip[] = [
    {
      id: "1",
      title: "Post at Peak Times",
      description:
        "Share recipes between 6-8 PM when most users are planning dinner",
      icon: Clock,
      category: "growth",
    },
    {
      id: "2",
      title: "Use Trending Ingredients",
      description: "Recipes with trending ingredients get 3x more views",
      icon: Star,
      category: "content",
    },
    {
      id: "3",
      title: "Engage with Comments",
      description: "Responding to comments increases follower retention by 45%",
      icon: Users,
      category: "growth",
    },
    {
      id: "4",
      title: "Create Recipe Series",
      description: "Series keep viewers coming back for more",
      icon: BookOpen,
      category: "content",
    },
  ];

  // Chef-themed tiers with 30% flat revenue share + gamified benefits
  const tiers: CreatorTier[] = [
    {
      id: 1,
      title: "Sous Chef",
      emoji: "👨‍🍳",
      minSubscribers: 0,
      maxSubscribers: 100,
      revenueShare: 30, // Flat 30% for all tiers
      color: "#4CAF50",
      unlocked: true,
    },
    {
      id: 2,
      title: "Pastry Chef",
      emoji: "🧁",
      minSubscribers: 100,
      maxSubscribers: 1000,
      revenueShare: 30, // Flat 30% for all tiers
      color: "#2196F3",
      unlocked: (analytics?.referrals.active || 0) >= 100,
    },
    {
      id: 3,
      title: "Head Chef",
      emoji: "👨‍🍳",
      minSubscribers: 1000,
      maxSubscribers: 10000,
      revenueShare: 30, // Flat 30% for all tiers
      color: "#9C27B0",
      unlocked: (analytics?.referrals.active || 0) >= 1000,
    },
    {
      id: 4,
      title: "Executive Chef",
      emoji: "⭐",
      minSubscribers: 10000,
      maxSubscribers: 100000,
      revenueShare: 30, // Flat 30% for all tiers
      color: "#FF6B35",
      unlocked: (analytics?.referrals.active || 0) >= 10000,
    },
    {
      id: 5,
      title: "Master Chef",
      emoji: "🏆",
      minSubscribers: 100000,
      maxSubscribers: null,
      revenueShare: 30, // Flat 30% for all tiers
      color: "#FFB800",
      unlocked: (analytics?.referrals.active || 0) >= 100000,
    },
  ];

  // Calculate current tier based on real subscriber count
  const getCurrentTier = () => {
    const subscriberCount = analytics?.referrals.active || 0;
    return tiers.find(tier => 
      subscriberCount >= tier.minSubscribers && 
      (tier.maxSubscribers === null || subscriberCount < tier.maxSubscribers)
    ) || tiers[0];
  };

  const currentTierData = getCurrentTier();
  const nextTier = tiers.find((t) => t.id === currentTierData.id + 1);

  // Calculate progress to next tier
  const progressToNext = nextTier && analytics
    ? Math.min(((analytics.referrals.active - currentTierData.minSubscribers) /
        (nextTier.minSubscribers - currentTierData.minSubscribers)) *
      100, 100)
    : 100;

  // Generate proper shareable creator link
  const getCreatorShareableLink = () => {
    const creatorCode = `CHEF_${user?.id?.slice(-8)?.toUpperCase()}`;
    return `https://cookcam.ai/ref/${creatorCode}`;
  };

  // Load creator data from APIs
  const loadCreatorData = async () => {
    try {
      setError(null);
      logger.debug("📊 Loading creator analytics and earnings");

      // Load analytics and earnings separately with individual error handling
      try {
        const analyticsResponse = await cookCamApi.getCreatorAnalytics();
        if (analyticsResponse.success && analyticsResponse.data) {
          setAnalytics(analyticsResponse.data);
          logger.debug("✅ Creator analytics loaded", analyticsResponse.data);
        } else {
          logger.warn("⚠️ Failed to load analytics", analyticsResponse);
        }
      } catch (analyticsError) {
        logger.error("❌ Analytics error:", analyticsError);
      }

      // Handle earnings separately to avoid failing if Stripe is not available
      try {
        const earningsResponse = await StripeConnectService.getInstance().getCreatorEarnings();
        if (earningsResponse) {
          setEarnings({
            total_earnings: earningsResponse.totalEarnings,
            available_balance: earningsResponse.currentBalance,
            pending_balance: earningsResponse.pendingBalance,
            last_payout_date: earningsResponse.lastPayoutDate?.toISOString() || null,
            next_payout_date: earningsResponse.nextPayoutDate?.toISOString() || null,
          });
          logger.debug("✅ Creator earnings loaded", earningsResponse);
        }
      } catch (earningsError) {
        logger.error("❌ Earnings error (Stripe may not be configured):", earningsError);
        // Set default earnings state instead of failing completely
        setEarnings({
          total_earnings: 0,
          available_balance: 0,
          pending_balance: 0,
          last_payout_date: null,
          next_payout_date: null,
        });
      }

    } catch (error) {
      logger.error("❌ Failed to load creator data:", error);
      setError("Failed to load creator data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.isCreator && hasCreatorSubscription) {
      loadCreatorData();
    }

    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar to actual value
    if (progressToNext !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progressToNext,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }

    // Pulse effect for tier card
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [analytics, progressToNext]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCreatorData();
  };

  const handleCopyCode = () => {
    const shareableLink = getCreatorShareableLink();
    Clipboard.setString(shareableLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Your creator link has been copied to clipboard.");
  };

  const handleShare = async () => {
    try {
      const shareableLink = getCreatorShareableLink();
      const creatorCode = `CHEF_${user?.id?.slice(-8)?.toUpperCase()}`;
      
      await Share.share({
        message: `Join me on CookCam AI! 🍳✨ Get AI-powered recipes from your ingredients and discover amazing dishes. Use my creator link to get started: ${shareableLink}`,
        url: shareableLink,
        title: `Join ${user?.name || 'me'} on CookCam AI!`,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      logger.error("Share error:", error);
    }
  };

  const handleBecomeCreator = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("CreatorOnboarding");
  };

  const handleOpenStripeConnect = async () => {
    try {
      logger.debug("📊 Getting Stripe dashboard URL");
      const dashboardResponse = await StripeConnectService.getInstance().getDashboardUrl();
      
      if (dashboardResponse.success && dashboardResponse.dashboardUrl) {
        await Linking.openURL(dashboardResponse.dashboardUrl);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Alert.alert("Setup Required", "Please complete your Stripe Connect setup first.");
        navigation.navigate("CreatorOnboarding");
      }
    } catch (error) {
      logger.error("Failed to open Stripe dashboard:", error);
      Alert.alert("Error", "Failed to open dashboard. Please try again.");
    }
  };

  const calculateConversionRate = () => {
    if (!analytics?.referrals.total || analytics.referrals.total === 0) {
      return "0";
    }
    return ((analytics.referrals.active / analytics.referrals.total) * 100).toFixed(1);
  };

  const calculateActiveRate = () => {
    if (!analytics?.referrals.total || analytics.referrals.total === 0) {
      return "0";
    }
    return ((analytics.referrals.active / analytics.referrals.total) * 100).toFixed(1);
  };

  // Check subscription access first
  const hasCreatorSubscription = isCreator() || subscriptionState.currentSubscription?.tier_slug === "creator";

  // If no creator subscription, show upgrade prompt
  if (!hasCreatorSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Crown size={moderateScale(48)} color="#FFB800" />
              <Text style={styles.headerTitle}>Creator Subscription Required</Text>
              <Text style={styles.headerSubtitle}>
                Unlock creator features and start earning
              </Text>
            </View>

            {/* Subscription Required Card */}
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <Sparkles size={moderateScale(32)} color="#FF6B35" />
                <Text style={styles.subscriptionTitle}>Upgrade to Creator Plan</Text>
                <Text style={styles.subscriptionDescription}>
                  Access all creator features and start earning revenue from your recipes
                </Text>
              </View>

              <View style={styles.subscriptionBenefits}>
                <Text style={styles.benefitsTitle}>What you get with Creator:</Text>
                
                <View style={styles.benefitItem}>
                  <CheckCircle size={moderateScale(20)} color="#4CAF50" />
                  <Text style={styles.benefitText}>Publish premium recipes</Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <CheckCircle size={moderateScale(20)} color="#4CAF50" />
                  <Text style={styles.benefitText}>Earn 30% revenue share</Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <CheckCircle size={moderateScale(20)} color="#4CAF50" />
                  <Text style={styles.benefitText}>Creator analytics dashboard</Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <CheckCircle size={moderateScale(20)} color="#4CAF50" />
                  <Text style={styles.benefitText}>Build your follower base</Text>
                </View>
                
                <View style={styles.benefitItem}>
                  <CheckCircle size={moderateScale(20)} color="#4CAF50" />
                  <Text style={styles.benefitText}>Professional creator tools</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate("Subscription")}
              >
                <Crown size={moderateScale(20)} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Upgrade to Creator</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.learnMoreButton}
                onPress={() => navigation.navigate("CreatorOnboarding")}
              >
                <Text style={styles.learnMoreText}>Learn More About Creating</Text>
              </TouchableOpacity>
            </View>

            {/* Success Stories */}
            <View style={styles.successSection}>
              <Text style={styles.sectionTitle}>Creator Success Stories 🌟</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.successCard}>
                  <TrendingUp size={moderateScale(24)} color="#4CAF50" />
                  <Text style={styles.successQuote}>
                    "I went from 0 to 5K subscribers in 3 months!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Sarah</Text>
                  <Text style={styles.successStats}>💰 $1,250/month</Text>
                </View>
                <View style={styles.successCard}>
                  <Star size={moderateScale(24)} color="#FFB800" />
                  <Text style={styles.successQuote}>
                    "My pasta recipes went viral and changed my life!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Marco</Text>
                  <Text style={styles.successStats}>👥 15K subscribers</Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // If not a creator, show the journey start
  if (!user?.isCreator) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Become a Creator 🚀</Text>
              <Text style={styles.headerSubtitle}>
                Turn your recipes into revenue
              </Text>
            </View>

            {/* Hero Card */}
            <Animated.View
              style={[styles.heroCard, { transform: [{ scale: pulseAnim }] }]}
            >
              <ChefHat size={moderateScale(64)} color="#FF6B35" />
              <Text style={styles.heroTitle}>Start Your Creator Journey</Text>
              <Text style={styles.heroSubtitle}>
                Share your culinary creativity and earn money doing what you
                love!
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleBecomeCreator}
              >
                <Play size={moderateScale(20)} color="#F8F8FF" />
                <Text style={styles.startButtonText}>Become a Creator</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.sectionTitle}>Creator Benefits ✨</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <DollarSign size={moderateScale(24)} color="#4CAF50" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Earn Revenue</Text>
                    <Text style={styles.benefitDescription}>
                      Get 30% commission on all subscribers
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Target size={moderateScale(24)} color="#FF6B35" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>
                      Performance Insights
                    </Text>
                    <Text style={styles.benefitDescription}>
                      AI-powered predictions for your recipes
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Zap size={moderateScale(24)} color="#FFB800" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Creator Tools</Text>
                    <Text style={styles.benefitDescription}>
                      Exclusive features to grow your audience
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Star size={moderateScale(24)} color="#9C27B0" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Recognition</Text>
                    <Text style={styles.benefitDescription}>
                      Chef badges and tier progression
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Success Stories */}
            <View style={styles.successSection}>
              <Text style={styles.sectionTitle}>
                Creator Success Stories 🌟
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.successCard}>
                  <Text style={styles.successQuote}>
                    "I went from 0 to 5K subscribers in 3 months!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Sarah</Text>
                  <Text style={styles.successStats}>💰 $1,250/month</Text>
                </View>
                <View style={styles.successCard}>
                  <Text style={styles.successQuote}>
                    "My pasta recipes went viral and changed my life!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Marco</Text>
                  <Text style={styles.successStats}>👥 15K subscribers</Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Creator dashboard for existing creators
  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#4CAF50"]}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Dashboard 💚</Text>
          <Text style={styles.headerSubtitle}>Welcome back, Creator!</Text>
          {loading && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          )}
        </View>

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <RefreshCw size={moderateScale(16)} color="#4CAF50" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current Tier Card */}
        <Animated.View
          style={[
            styles.tierCard,
            { borderColor: currentTierData.color, opacity: fadeAnim },
          ]}
        >
          <View style={styles.tierHeader}>
            <View style={styles.tierInfo}>
              <ChefBadge
                tier={currentTierData.id as 1 | 2 | 3 | 4 | 5}
                size="large"
              />
              <View style={styles.tierTextInfo}>
                <Text style={styles.tierTitle}>{currentTierData.title}</Text>
                <Text
                  style={[styles.tierRevenue, { color: currentTierData.color }]}
                >
                  Revenue Share • {currentTierData.title}
                </Text>
              </View>
            </View>
            <View style={styles.subscriberBadge}>
              <Users size={moderateScale(16)} color="#666" />
              <Text style={styles.subscriberCount}>
                {analytics?.referrals.active?.toLocaleString() || "0"}
              </Text>
            </View>
          </View>

          {/* Progress to next tier */}
          {nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Progress to {nextTier.title}
                </Text>
                <Text style={styles.progressText}>
                  {analytics?.referrals.active?.toLocaleString() || "0"} / {nextTier.minSubscribers}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: nextTier.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressHint}>
                {nextTier.minSubscribers - (analytics?.referrals.active || 0)} more
                subscribers to unlock {nextTier.title} tier and exclusive benefits!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Creator Link Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Your Creator Link 🔗</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>
              Share this link with your audience:
            </Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{getCreatorShareableLink()}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                <Copy size={moderateScale(18)} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={moderateScale(18)} color="#F8F8FF" />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payout Status Section */}
        <View style={styles.payoutSection}>
          <Text style={styles.sectionTitle}>Payout Status 💳</Text>
          <View style={styles.payoutCard}>
            <View style={styles.payoutStatus}>
              <View style={styles.payoutStatusIcon}>
                <CheckCircle size={20} color="#66BB6A" />
              </View>
              <View style={styles.payoutStatusText}>
                <Text style={styles.payoutStatusTitle}>
                  {analytics?.stripeAccount?.isConnected ? "Bank Account Connected" : "Setup Required"}
                </Text>
                <Text style={styles.payoutStatusSubtitle}>
                  {earnings?.next_payout_date 
                    ? `Next payout: ${new Date(earnings.next_payout_date).toLocaleDateString()}`
                    : "Complete Stripe setup to enable payouts"
                  }
                </Text>
                {earnings?.available_balance && earnings.available_balance > 0 && (
                  <Text style={styles.availableBalance}>
                    Available: ${earnings.available_balance.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.manageBankButton}
              onPress={handleOpenStripeConnect}
            >
              <ExternalLink size={16} color="#007AFF" />
              <Text style={styles.manageBankText}>
                {analytics?.stripeAccount?.isConnected ? "Manage" : "Setup"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Analytics Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Your Performance 📊</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <ExternalLink size={moderateScale(20)} color="#FF6B35" />
                <Text style={styles.statLabel}>Total Clicks</Text>
              </View>
              <Text style={styles.statValue}>
                {analytics?.referrals.total?.toLocaleString() || "0"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Users size={moderateScale(20)} color="#9C27B0" />
                <Text style={styles.statLabel}>Sign-ups</Text>
              </View>
              <Text style={styles.statValue}>
                {analytics?.referrals.active?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.statSubtext}>
                {calculateConversionRate()}% conversion
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Award size={moderateScale(20)} color="#4CAF50" />
                <Text style={styles.statLabel}>Active Subs</Text>
              </View>
              <Text style={styles.statValue}>
                {analytics?.referrals.active?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.statSubtext}>
                {calculateActiveRate()}% active
              </Text>
            </View>
            <View style={[styles.statCard, styles.revenueCard]}>
              <View style={styles.statHeader}>
                <DollarSign size={moderateScale(20)} color="#FFB800" />
                <Text style={styles.statLabel}>Monthly Revenue</Text>
              </View>
              <Text style={[styles.statValue, styles.revenueValue]}>
                ${earnings?.total_earnings?.toFixed(2) || "0.00"}
              </Text>
              <Text style={styles.statSubtext}>This month</Text>
            </View>
          </View>
        </View>

        {/* All Tiers Section */}
        <View style={styles.tiersSection}>
          <View style={styles.tiersHeader}>
            <Text style={styles.sectionTitle}>Chef Tiers 👨‍🍳</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Creator Tier System",
                  "All creators earn 30% commission on subscribers! Tiers unlock recognition, badges, exclusive features, and special perks as you grow your audience.",
                )
              }
            >
              <Info size={moderateScale(20)} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {tiers.map((tier, index) => (
            <View
              key={tier.id}
              style={[
                styles.tierItem,
                tier.id === currentTierData.id && styles.currentTierItem,
                !tier.unlocked && styles.lockedTierItem,
              ]}
            >
              <View style={styles.tierItemLeft}>
                <ChefBadge tier={tier.id as 1 | 2 | 3 | 4 | 5} size="small" />
                <View style={styles.tierItemInfo}>
                  <Text style={styles.tierItemTitle}>{tier.title}</Text>
                  <Text style={styles.tierItemRange}>
                    {tier.minSubscribers.toLocaleString()}
                    {tier.maxSubscribers
                      ? `-${tier.maxSubscribers.toLocaleString()}`
                      : "+"}{" "}
                    subscribers
                  </Text>
                </View>
              </View>
              <View style={styles.tierItemRight}>
                {tier.id === currentTierData.id ? (
                  <CheckCircle size={moderateScale(20)} color={tier.color} />
                ) : !tier.unlocked ? (
                  <Lock size={moderateScale(20)} color="#C7C7CC" />
                ) : (
                  <Text style={[styles.tierUnlockedText, { color: tier.color }]}>
                    Unlocked
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Creator Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>
            Creator Tips & Best Practices 💡
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {creatorTips.map((tip) => (
              <View key={tip.id} style={styles.tipCard}>
                <tip.icon size={moderateScale(24)} color="#FF6B35" />
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  header: {
    paddingHorizontal: responsive.spacing.m,
    paddingTop: responsive.spacing.m,
    paddingBottom: responsive.spacing.m,
  },
  headerTitle: {
    fontSize: responsive.fontSize.xxlarge,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: responsive.fontSize.medium,
    color: "#8E8E93",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
  },
  loadingText: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
    marginLeft: scale(8),
  },
  errorContainer: {
    backgroundColor: "#FFF5F5",
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
    padding: responsive.spacing.m,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  errorText: {
    fontSize: responsive.fontSize.medium,
    color: "#DC2626",
    marginBottom: verticalScale(8),
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  retryText: {
    fontSize: responsive.fontSize.small,
    color: "#4CAF50",
    marginLeft: scale(4),
    fontWeight: "500",
  },
  heroCard: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.xlarge,
    padding: responsive.spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: responsive.fontSize.medium,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: responsive.spacing.l,
    lineHeight: moderateScale(22),
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(14),
    borderRadius: responsive.borderRadius.large,
    gap: scale(8),
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: responsive.fontSize.large,
    fontWeight: "bold",
    color: "#F8F8FF",
  },
  benefitsSection: {
    marginBottom: responsive.spacing.l,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: "700",
    color: "#2D1B69",
    paddingHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
  },
  benefitsList: {
    paddingHorizontal: responsive.spacing.m,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: responsive.spacing.m,
    gap: scale(16),
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: verticalScale(4),
  },
  benefitDescription: {
    fontSize: responsive.fontSize.regular,
    color: "#8E8E93",
    lineHeight: moderateScale(20),
  },
  successSection: {
    marginBottom: responsive.spacing.xl,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    marginLeft: responsive.spacing.m,
    marginRight: responsive.spacing.s,
    width: scale(250),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  successQuote: {
    fontSize: responsive.fontSize.medium,
    color: "#2D1B69",
    fontStyle: "italic",
    marginBottom: responsive.spacing.s,
    lineHeight: moderateScale(22),
  },
  successAuthor: {
    fontSize: responsive.fontSize.regular,
    color: "#FF6B35",
    fontWeight: "600",
    marginBottom: responsive.spacing.s,
  },
  successStats: {
    fontSize: responsive.fontSize.regular,
    color: "#666",
  },

  tierCard: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.xlarge,
    padding: responsive.spacing.m,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(16),
  },
  tierTextInfo: {
    flex: 1,
  },
  tierEmoji: {
    fontSize: responsive.fontSize.xxxlarge + scale(8),
  },
  tierTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: verticalScale(4),
  },
  tierRevenue: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
  },
  subscriberBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: responsive.borderRadius.large,
    gap: scale(6),
  },
  subscriberCount: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
  },
  progressSection: {
    marginTop: responsive.spacing.m,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(8),
  },
  progressLabel: {
    fontSize: responsive.fontSize.regular,
    color: "#666",
  },
  progressText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "600",
    color: "#2D1B69",
  },
  progressBar: {
    height: verticalScale(8),
    backgroundColor: "#E5E5E7",
    borderRadius: responsive.borderRadius.small / 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: responsive.borderRadius.small / 2,
  },
  progressHint: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
    marginTop: verticalScale(8),
    textAlign: "center",
  },
  codeSection: {
    marginBottom: responsive.spacing.l,
  },
  codeCard: {
    marginHorizontal: responsive.spacing.m,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  codeLabel: {
    fontSize: responsive.fontSize.regular,
    color: "#666",
    marginBottom: verticalScale(12),
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    marginBottom: verticalScale(12),
  },
  codeText: {
    flex: 1,
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyButton: {
    padding: scale(8),
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingVertical: verticalScale(12),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
  },
  shareButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  analyticsSection: {
    marginBottom: responsive.spacing.l,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: responsive.spacing.m,
    gap: scale(12),
  },
  statCard: {
    flex: 1,
    minWidth: scale(150),
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueCard: {
    minWidth: scale(312),
    backgroundColor: "#FFF9F7",
    borderWidth: 1,
    borderColor: "#FFE5DC",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  statLabel: {
    fontSize: responsive.fontSize.regular,
    color: "#666",
  },
  statValue: {
    fontSize: responsive.fontSize.xlarge + scale(4),
    fontWeight: "bold",
    color: "#2D1B69",
  },
  revenueValue: {
    color: "#FF6B35",
  },
  statSubtext: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
    marginTop: verticalScale(4),
  },
  tiersSection: {
    marginBottom: responsive.spacing.l,
  },
  tiersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
  },
  tierItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    paddingRight: responsive.spacing.xl,
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  currentTierItem: {
    borderColor: "#FF6B35",
    borderWidth: 2,
    backgroundColor: "#FFF9F7",
  },
  lockedTierItem: {
    opacity: 0.6,
  },
  tierItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(16),
    flex: 1,
  },
  tierItemInfo: {
    flex: 1,
  },
  tierItemTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
  },
  tierItemRange: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
    marginTop: verticalScale(2),
  },
  tierItemRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale(32),
  },
  tierItemRevenue: {
    fontSize: responsive.fontSize.large,
    fontWeight: "bold",
  },
  tierUnlockedText: {
    fontSize: responsive.fontSize.small,
    fontWeight: "600",
    marginTop: verticalScale(2),
  },
  tipsSection: {
    paddingHorizontal: responsive.spacing.m,
    paddingBottom: verticalScale(100),
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    marginRight: responsive.spacing.s,
    width: scale(200),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tipTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
    marginTop: responsive.spacing.s,
    marginBottom: responsive.spacing.xs,
    textAlign: "center",
  },
  tipDescription: {
    fontSize: responsive.fontSize.regular,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  // Payout Section Styles
  payoutSection: {
    marginBottom: responsive.spacing.l,
  },
  payoutCard: {
    marginHorizontal: responsive.spacing.m,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payoutStatus: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  payoutStatusIcon: {
    marginRight: responsive.spacing.s,
  },
  payoutStatusText: {
    flex: 1,
  },
  payoutStatusTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: verticalScale(2),
  },
  payoutStatusSubtitle: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
  },
  availableBalance: {
    fontSize: responsive.fontSize.small,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: verticalScale(2),
  },
  manageBankButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: responsive.spacing.s,
    paddingVertical: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.medium,
    gap: scale(4),
  },
  manageBankText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: "600",
    color: "#007AFF",
  },
  // Subscription Protection Styles
  subscriptionCard: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: "#FFFFFF",
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.l,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  subscriptionHeader: {
    alignItems: "center",
    marginBottom: responsive.spacing.l,
  },
  subscriptionTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: "bold",
    color: "#2D1B69",
    textAlign: "center",
    marginTop: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
  },
  subscriptionDescription: {
    fontSize: responsive.fontSize.medium,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  subscriptionBenefits: {
    marginBottom: responsive.spacing.l,
  },
  benefitsTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: responsive.spacing.m,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    borderRadius: responsive.borderRadius.large,
    paddingVertical: responsive.spacing.m,
    paddingHorizontal: responsive.spacing.l,
    marginBottom: responsive.spacing.m,
    gap: scale(8),
  },
  upgradeButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  learnMoreButton: {
    alignItems: "center",
    paddingVertical: responsive.spacing.s,
  },
  learnMoreText: {
    fontSize: responsive.fontSize.medium,
    color: "#FF6B35",
    fontWeight: "500",
  },
});

export default CreatorScreen;
