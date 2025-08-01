import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Share,
  Alert,
  Clipboard,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  Crown,
  Sparkles,
  CheckCircle,
  Info,
  Lock,
  ChefHat,
  Play,
  RefreshCw,
  TrendingUp,
  Star,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import * as Haptics from "expo-haptics";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import logger from "../utils/logger";
import StripeConnectService from "../services/StripeConnectService";
import { useCreatorData } from "../hooks/useCreatorData";
import {
  getCurrentTier,
  getNextTier,
  calculateProgressToNext,
  getCreatorShareableLink,
  creatorTips,
  successStories,
  getCreatorTiers,
} from "../data/creatorData";
import {
  CreatorTierCard,
  CreatorLinkSection,
  PayoutSection,
  AnalyticsSection,
  CreatorTipsSection,
} from "../components/creator";
import { CreatorScreenProps } from "../types/creator";
import { tokens, mixins } from "../styles";

const OptimizedCreatorScreen: React.FC<CreatorScreenProps> = React.memo(
  ({ navigation }) => {
    const { user } = useAuth();
    const { addXP } = useGamification();
    const { state: subscriptionState, isCreator } = useSubscription();

    // Animation refs
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Creator data hook
    const { analytics, earnings, loading, refreshing, error, handleRefresh } =
      useCreatorData(user?.isCreator || false);

    // Calculate tier data
    const activeSubscribers = analytics?.referrals.active || 0;
    const currentTierData = getCurrentTier(activeSubscribers);
    const nextTier = getNextTier(currentTierData.id, activeSubscribers);
    const progressToNext = calculateProgressToNext(
      currentTierData,
      nextTier,
      activeSubscribers,
    );
    const tiers = getCreatorTiers(activeSubscribers);

    // Check subscription access
    const hasCreatorSubscription =
      isCreator() ||
      subscriptionState.currentSubscription?.tier_slug === "creator";

    // Event handlers
    const handleCopyCode = useCallback(() => {
      const shareableLink = getCreatorShareableLink(user?.id);
      Clipboard.setString(shareableLink);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "Your creator link has been copied to clipboard.");
    }, [user?.id]);

    const handleShare = useCallback(async () => {
      try {
        const shareableLink = getCreatorShareableLink(user?.id);

        await Share.share({
          message: `Join me on CookCam AI! 🍳✨ Get AI-powered recipes from your ingredients and discover amazing dishes. Use my creator link to get started: ${shareableLink}`,
          url: shareableLink,
          title: `Join ${user?.name || "me"} on CookCam AI!`,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        logger.error("Share error:", error);
      }
    }, [user?.id, user?.name]);

    const handleBecomeCreator = useCallback(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("CreatorOnboarding", {
        returnToTab: "Creator",
      });
    }, [navigation]);

    const handleOpenStripeConnect = useCallback(async () => {
      try {
        logger.debug("📊 Getting Stripe dashboard URL");
        const dashboardResponse =
          await StripeConnectService.getInstance().getDashboardUrl();

        if (dashboardResponse.success && dashboardResponse.dashboardUrl) {
          await Linking.openURL(dashboardResponse.dashboardUrl);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Alert.alert(
            "Setup Required",
            "Please complete your Stripe Connect setup first.",
          );
          navigation.navigate("CreatorOnboarding");
        }
      } catch (error) {
        logger.error("Failed to open Stripe dashboard:", error);
        Alert.alert("Error", "Failed to open dashboard. Please try again.");
      }
    }, [navigation]);

    // Animation effects
    useEffect(() => {
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
    }, [
      analytics,
      progressToNext,
      fadeAnim,
      slideAnim,
      progressAnim,
      pulseAnim,
    ]);

    // Main creator dashboard
    return (
      <View style={mixins.containers.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[tokens.colors.brand.primary]}
              tintColor={tokens.colors.brand.primary}
            />
          }
        >
          {/* Header */}
          <View style={[mixins.containers.sectionPadded, { paddingBottom: 0 }]}>
            <Text style={mixins.text.h2}>Creator Dashboard 💚</Text>
            <Text
              style={[
                mixins.text.bodySecondary,
                { marginTop: tokens.spacing.sm },
              ]}
            >
              Welcome back, Creator!
            </Text>
            {loading && (
              <View
                style={[
                  mixins.layout.flexRow,
                  { marginTop: tokens.spacing.xs },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={tokens.colors.brand.primary}
                />
                <Text
                  style={[
                    mixins.text.caption,
                    {
                      color: tokens.colors.text.tertiary,
                      marginLeft: tokens.spacing.xs,
                    },
                  ]}
                >
                  Loading analytics...
                </Text>
              </View>
            )}
          </View>

          {/* Error State */}
          {error && !loading && (
            <View
              style={[
                {
                  backgroundColor: "#FFF5F5",
                  marginHorizontal: tokens.spacing.md,
                  marginBottom: tokens.spacing.md,
                  padding: tokens.spacing.md,
                  borderRadius: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: tokens.colors.status.error,
                },
              ]}
            >
              <Text
                style={[
                  mixins.text.body,
                  {
                    color: "#DC2626",
                    marginBottom: tokens.spacing.xs,
                  },
                ]}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={[mixins.layout.flexRow, { alignSelf: "flex-start" }]}
                onPress={handleRefresh}
              >
                <RefreshCw size={16} color={tokens.colors.brand.primary} />
                <Text
                  style={[
                    mixins.text.caption,
                    {
                      color: tokens.colors.brand.primary,
                      marginLeft: tokens.spacing.xs / 2,
                      fontWeight: "500",
                    },
                  ]}
                >
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Creator Tier Card */}
          <CreatorTierCard
            currentTier={currentTierData}
            nextTier={nextTier}
            analytics={analytics}
            progressToNext={progressToNext}
            progressAnim={progressAnim}
            fadeAnim={fadeAnim}
          />

          {/* Creator Link Section */}
          <CreatorLinkSection
            userId={user?.id}
            onCopyCode={handleCopyCode}
            onShare={handleShare}
          />

          {/* Payout Status Section */}
          <PayoutSection
            analytics={analytics}
            earnings={earnings}
            onOpenStripeConnect={handleOpenStripeConnect}
          />

          {/* Analytics Section */}
          <AnalyticsSection analytics={analytics} earnings={earnings} />

          {/* Creator Tips Section */}
          <CreatorTipsSection tips={creatorTips} />
        </ScrollView>
      </View>
    );
  },
);

OptimizedCreatorScreen.displayName = "OptimizedCreatorScreen";

export default OptimizedCreatorScreen;
