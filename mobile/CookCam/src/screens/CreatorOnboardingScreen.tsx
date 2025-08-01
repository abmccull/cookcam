import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import {
  ChefHat,
  Users,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Camera,
  Target,
  Star,
  Trophy,
  Share2,
  Heart,
  TrendingUp,
  Clock,
  Shield,
  ExternalLink,
  Building2,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import { authService } from "../services/api";
import StripeConnectService from "../services/StripeConnectService";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import logger from "../utils/logger";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CreatorOnboardingScreenProps {
  navigation: any;
  route: {
    params?: {
      returnToTab?: string;
    };
  };
}

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  requirement?: string;
}

const CreatorOnboardingScreen: React.FC<CreatorOnboardingScreenProps> = ({
  navigation,
  route,
}) => {
  const { user, updateUser } = useAuth();
  const { addXP, unlockBadge } = useGamification();
  const [currentStep, setCurrentStep] = useState(0);
  const [creatorName, setCreatorName] = useState(user?.name || "");
  const [creatorBio, setCreatorBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<
    "none" | "creating" | "onboarding" | "complete" | "error"
  >("none");

  const stripeConnectService = StripeConnectService.getInstance();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 0,
      title: "Welcome to Creator Program! 🎉",
      subtitle: "Your culinary journey starts here",
      description:
        "Join thousands of creators sharing recipes and earning revenue through CookCam",
      icon: ChefHat,
      color: "#FF6B35",
    },
    {
      id: 1,
      title: "Build Your Audience 👥",
      subtitle: "Share recipes that inspire",
      description:
        "Create engaging content that brings people together around food and cooking",
      icon: Users,
      color: "#66BB6A",
    },
    {
      id: 2,
      title: "Earn Real Money 💰",
      subtitle: "Get paid for your passion",
      description:
        "Earn up to 30% commission on subscribers you bring to CookCam",
      icon: DollarSign,
      color: "#2196F3",
    },
    {
      id: 3,
      title: "Setup Your Profile 📝",
      subtitle: "Tell your story",
      description:
        "Let people know who you are and what makes your cooking special",
      icon: Star,
      color: "#9C27B0",
    },
    {
      id: 4,
      title: "Setup Payouts 💳",
      subtitle: "Connect your bank account",
      description:
        "Verify your identity and connect a bank account to receive your creator earnings",
      icon: Building2,
      color: "#2196F3",
    },
    {
      id: 5,
      title: "You're All Set! 🚀",
      subtitle: "Ready to create amazing content",
      description:
        "Your creator account is now active. Start sharing recipes and building your community!",
      icon: Trophy,
      color: "#FFB800",
    },
  ];

  const specialties = [
    "International Cuisine",
    "Healthy Cooking",
    "Desserts & Baking",
    "Quick & Easy Meals",
    "Vegan Cooking",
    "Traditional Family Recipes",
    "Gourmet Cooking",
    "Comfort Food",
    "Diet-Specific Cooking",
  ];

  useEffect(() => {
    startAnimations();
  }, [currentStep]);

  const startAnimations = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: ((currentStep + 1) / onboardingSteps.length) * 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentStep === 4) {
      // Step 4 is Stripe Connect KYC - handle this specially
      await startStripeKYC();
    } else if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const startStripeKYC = async () => {
    try {
      setLoading(true);
      setKycStatus("creating");

      // Check if already has Stripe account
      const stripeService = StripeConnectService.getInstance();

      try {
        const existingStatus = await stripeService.getAccountStatus();
        if (existingStatus.isConnected) {
          // Already connected, skip to completion
          setKycStatus("complete");
          setLoading(false);
          return;
        }
      } catch (error) {
        // No existing account, continue with creation
        logger.debug("No existing Stripe account found, creating new one");
      }

      // Create new Stripe Connect account
      const result = await stripeService.createConnectAccount({
        userId: user?.id || "",
        email: user?.email || "",
        country: "US",
      });

      if (!result.success) {
        throw new Error("Failed to create Stripe account");
      }

      // Store account ID for status checking
      setStripeAccountId(result.accountId);

      // If we got an onboarding URL directly, use it
      if (result.onboardingUrl) {
        setKycStatus("onboarding");

        // Open onboarding URL in browser
        await Linking.openURL(result.onboardingUrl);

        // Start polling for completion
        const pollInterval = setInterval(async () => {
          try {
            const status = await stripeService.getAccountStatus();
            if (status.isConnected) {
              clearInterval(pollInterval);
              setKycStatus("complete");
              setLoading(false);

              // Show success and auto-advance
              setTimeout(() => {
                handleNext();
              }, 2000);
            }
          } catch (error) {
            logger.error("Error polling Stripe status:", error);
          }
        }, 3000); // Poll every 3 seconds

        // Stop polling after 10 minutes
        setTimeout(
          () => {
            clearInterval(pollInterval);
            if (kycStatus !== "complete") {
              setKycStatus("error");
              setLoading(false);
            }
          },
          10 * 60 * 1000,
        );
      } else {
        // Fallback: Create account link manually
        setKycStatus("onboarding");

        const accountLink = await stripeService.createAccountLink(
          result.accountId,
          "cookcam://creator-onboarding-complete",
          "cookcam://creator-onboarding-refresh",
        );

        await Linking.openURL(accountLink.url);
      }
    } catch (error: unknown) {
      logger.error("Stripe KYC setup failed:", error);
      setKycStatus("error");
      setLoading(false);

      Alert.alert(
        "Setup Failed",
        error instanceof Error
          ? error.message
          : "Failed to setup Stripe account. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  const handleSkip = async () => {
    // Allow skipping to profile setup (step 3) or completion
    if (currentStep < 3) {
      setCurrentStep(3);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update user to creator status
      const updateData = {
        is_creator: true,
        creator_bio:
          creatorBio ||
          `Passionate cook specializing in ${specialty || "delicious recipes"}`,
        creator_specialty: specialty || "General Cooking",
        creator_tier: 1, // Start at Sous Chef level
        onboarding_completed: true,
      };

      // Call API to update user
      const response = await authService.updateProfile(updateData);

      if (response.success) {
        // Update local user state
        await updateUser({
          ...user,
          isCreator: true,
          creatorTier: 1,
        });

        // Award massive XP for becoming a creator
        await addXP(XP_VALUES.BECOME_CREATOR || 500, "BECOME_CREATOR");

        // Unlock creator badge
        await unlockBadge("creator_activated");

        setCompleted(true);

        // Show success and navigate
        setTimeout(() => {
          Alert.alert(
            "🎉 Welcome, Creator!",
            "Your creator account is now active! You can start sharing recipes and earning revenue.",
            [
              {
                text: "Start Creating!",
                onPress: () => {
                  const returnTab = route.params?.returnToTab || "Creator";
                  navigation.navigate("Main", {
                    screen: returnTab,
                    params: { newCreator: true },
                  });
                },
              },
            ],
          );
        }, 1500);
      } else {
        // Check if this is a development environment issue
        const isDevelopmentError =
          response.error &&
          (response.error.includes("subscription") ||
            response.error.includes("billing") ||
            response.error.includes("payment"));

        if (isDevelopmentError) {
          logger.debug(
            "🧪 Development Mode: Bypassing subscription requirement for creator activation",
          );

          // In development, proceed with local-only creator activation
          await updateUser({
            ...user,
            isCreator: true,
            creatorTier: 1,
          });

          // Award XP locally
          await addXP(XP_VALUES.BECOME_CREATOR || 500, "BECOME_CREATOR");
          await unlockBadge("creator_activated");

          setCompleted(true);

          // Show development success message
          setTimeout(() => {
            Alert.alert(
              "🎉 Welcome, Creator! (Dev Mode)",
              "Your creator account is active locally for development. Full subscription features will be available in production.",
              [
                {
                  text: "Start Creating!",
                  onPress: () => {
                    const returnTab = route.params?.returnToTab || "Creator";
                    navigation.navigate("Main", {
                      screen: returnTab,
                      params: { newCreator: true },
                    });
                  },
                },
              ],
            );
          }, 1500);
        } else {
          throw new Error("Failed to activate creator account");
        }
      }
    } catch (error: unknown) {
      logger.error("Creator onboarding error:", error);

      // Enhanced error handling for development vs production
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isDevelopmentContext =
        __DEV__ || errorMessage.includes("subscription");

      if (isDevelopmentContext) {
        Alert.alert(
          "Development Mode Notice",
          "Creator activation requires subscription setup. In production, this will be handled by Apple IAP. For development, you can continue with limited creator features.",
          [
            {
              text: "Continue in Dev Mode",
              onPress: async () => {
                // Local-only activation for development
                await updateUser({
                  ...user,
                  isCreator: true,
                  creatorTier: 1,
                });
                setCompleted(true);
                navigation.navigate("Main", {
                  screen: "Creator",
                  params: { newCreator: true, devMode: true },
                });
              },
            },
            { text: "Go Back", onPress: () => navigation.goBack() },
          ],
        );
      } else {
        Alert.alert(
          "Setup Error",
          "There was a problem activating your creator account. Please try again.",
          [
            { text: "Retry", onPress: () => setLoading(false) },
            { text: "Skip for Now", onPress: () => navigation.goBack() },
          ],
        );
      }
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentStep + 1} of {onboardingSteps.length}
      </Text>
    </View>
  );

  const renderProfileSetup = () => (
    <View style={styles.profileSetupContainer}>
      <Text style={styles.profileSetupTitle}>
        Complete Your Creator Profile
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Creator Name</Text>
        <TextInput
          style={styles.textInput}
          value={creatorName}
          onChangeText={setCreatorName}
          placeholder="How should fans know you?"
          placeholderTextColor="#8E8E93"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Bio (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.bioInput]}
          value={creatorBio}
          onChangeText={setCreatorBio}
          placeholder="Tell people about your cooking style..."
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Specialty</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specialtyScroll}
        >
          {specialties.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.specialtyChip,
                specialty === item && styles.specialtyChipSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSpecialty(item);
              }}
            >
              <Text
                style={[
                  styles.specialtyChipText,
                  specialty === item && styles.specialtyChipTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderStripeKYC = () => (
    <View style={styles.kycContainer}>
      <Text style={styles.kycTitle}>Setup Creator Payouts</Text>

      {kycStatus === "none" && (
        <>
          <View style={styles.kycBenefits}>
            <View style={styles.benefitRow}>
              <DollarSign size={20} color="#66BB6A" />
              <Text style={styles.benefitText}>
                30% revenue share on subscriptions
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <Shield size={20} color="#66BB6A" />
              <Text style={styles.benefitText}>
                Secure payments via Stripe Connect
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <Clock size={20} color="#66BB6A" />
              <Text style={styles.benefitText}>Weekly automatic payouts</Text>
            </View>
          </View>

          <View style={styles.kycInfo}>
            <Text style={styles.kycInfoTitle}>What's Required:</Text>
            <Text style={styles.kycInfoText}>
              • Basic personal information{"\n"}• Government-issued ID{"\n"}•
              Bank account details
            </Text>
          </View>
        </>
      )}

      {kycStatus === "creating" && (
        <View style={styles.kycLoading}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.kycLoadingText}>
            Setting up your payout account...
          </Text>
        </View>
      )}

      {kycStatus === "onboarding" && (
        <View style={styles.kycOnboarding}>
          <ExternalLink size={32} color="#FF6B35" />
          <Text style={styles.kycOnboardingTitle}>Complete Verification</Text>
          <Text style={styles.kycOnboardingText}>
            Please complete the identity verification process in your browser
          </Text>
          <TouchableOpacity
            style={styles.checkStatusButton}
            onPress={async () => {
              if (stripeAccountId) {
                setLoading(true);
                try {
                  const stripeService = StripeConnectService.getInstance();
                  const status = await stripeService.getAccountStatus();
                  if (status.isConnected) {
                    setKycStatus("complete");
                  } else {
                    setKycStatus("onboarding");
                  }
                } catch (error) {
                  logger.error("Error checking status:", error);
                  setKycStatus("error");
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FF6B35" size="small" />
            ) : (
              <Text style={styles.checkStatusText}>Check Status</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {kycStatus === "complete" && (
        <View style={styles.kycComplete}>
          <CheckCircle size={32} color="#66BB6A" />
          <Text style={styles.kycCompleteTitle}>Verification Complete!</Text>
          <Text style={styles.kycCompleteText}>
            Your payout account is ready to receive earnings
          </Text>
        </View>
      )}

      {kycStatus === "error" && (
        <View style={styles.kycError}>
          <Text style={styles.kycErrorTitle}>Setup Error</Text>
          <Text style={styles.kycErrorText}>
            We encountered an issue setting up your payout account. Please try
            again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setKycStatus("none")}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const currentStepData = onboardingSteps[currentStep];

  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completedContainer}>
          <Animated.View
            style={[
              styles.completedIcon,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <CheckCircle size={80} color="#66BB6A" />
          </Animated.View>
          <Text style={styles.completedTitle}>
            Creator Account Activated! 🎉
          </Text>
          <Text style={styles.completedSubtitle}>
            You're now part of the CookCam Creator community!
          </Text>
          <View style={styles.completedFeatures}>
            <View style={styles.featureItem}>
              <DollarSign size={24} color="#66BB6A" />
              <Text style={styles.featureText}>Start earning revenue</Text>
            </View>
            <View style={styles.featureItem}>
              <Users size={24} color="#66BB6A" />
              <Text style={styles.featureText}>Build your audience</Text>
            </View>
            <View style={styles.featureItem}>
              <Trophy size={24} color="#66BB6A" />
              <Text style={styles.featureText}>Unlock creator tools</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressBar()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.stepContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: currentStepData.color + "20" },
            ]}
          >
            <currentStepData.icon size={64} color={currentStepData.color} />
          </View>

          {/* Content */}
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
          <Text style={styles.stepDescription}>
            {currentStepData.description}
          </Text>

          {/* Profile setup form for step 3 */}
          {currentStep === 3 && renderProfileSetup()}

          {/* Stripe KYC setup for step 4 */}
          {currentStep === 4 && renderStripeKYC()}

          {/* Features showcase for relevant steps */}
          {currentStep === 1 && (
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <Camera size={24} color="#66BB6A" />
                <Text style={styles.featureText}>Share recipe photos</Text>
              </View>
              <View style={styles.featureRow}>
                <Heart size={24} color="#66BB6A" />
                <Text style={styles.featureText}>Build loyal followers</Text>
              </View>
              <View style={styles.featureRow}>
                <TrendingUp size={24} color="#66BB6A" />
                <Text style={styles.featureText}>Track engagement</Text>
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.earningsContainer}>
              <View style={styles.tierShowcase}>
                <Text style={styles.tierTitle}>Sous Chef (Tier 1)</Text>
                <Text style={styles.tierRevenue}>10% Revenue Share</Text>
                <Text style={styles.tierDescription}>
                  Your starting tier - grow to unlock higher rates!
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        {currentStep > 0 && currentStep < onboardingSteps.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: currentStepData.color },
            loading && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === onboardingSteps.length - 1
              ? "Activate Account"
              : "Continue"}
          </Text>
          {currentStep < onboardingSteps.length - 1 && (
            <ArrowRight size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  progressBackground: {
    height: 4,
    backgroundColor: "#E5E5E7",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B35",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  profileSetupContainer: {
    width: "100%",
    marginTop: 16,
  },
  profileSetupTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2D1B69",
  },
  bioInput: {
    height: 80,
    textAlignVertical: "top",
  },
  specialtyScroll: {
    marginTop: 8,
  },
  specialtyChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  specialtyChipSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  specialtyChipText: {
    fontSize: 14,
    color: "#2D1B69",
    fontWeight: "500",
  },
  specialtyChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  featuresContainer: {
    width: "100%",
    marginTop: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: "#2D1B69",
    fontWeight: "500",
  },
  earningsContainer: {
    width: "100%",
    marginTop: 16,
  },
  tierShowcase: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 4,
  },
  tierRevenue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
  },
  tierDescription: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  bottomNavigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "600",
  },
  nextButton: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  completedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  completedIcon: {
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 12,
  },
  completedSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  completedFeatures: {
    width: "100%",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  // KYC Styles
  kycContainer: {
    width: "100%",
    marginTop: 16,
  },
  kycTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 24,
    textAlign: "center",
  },
  kycBenefits: {
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: "#2D1B69",
    fontWeight: "500",
  },
  kycInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  kycInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
  },
  kycInfoText: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
  },
  kycLoading: {
    alignItems: "center",
    padding: 32,
  },
  kycLoadingText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 16,
    textAlign: "center",
  },
  kycOnboarding: {
    alignItems: "center",
    padding: 32,
  },
  kycOnboardingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  kycOnboardingText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  checkStatusButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FF6B35",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  checkStatusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  kycComplete: {
    alignItems: "center",
    padding: 32,
  },
  kycCompleteTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#66BB6A",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  kycCompleteText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  kycError: {
    alignItems: "center",
    padding: 32,
  },
  kycErrorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
    textAlign: "center",
  },
  kycErrorText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CreatorOnboardingScreen;
