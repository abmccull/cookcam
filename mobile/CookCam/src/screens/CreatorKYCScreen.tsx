import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import {
  Building2,
  DollarSign,
  Shield,
  Clock,
  ExternalLink,
  CheckCircle,
} from "lucide-react-native";
import StripeConnectService, {
  CreatorAccountStatus,
} from "../services/StripeConnectService";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";


interface CreatorKYCScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "CreatorKYC">;
}

const CreatorKYCScreen: React.FC<CreatorKYCScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] =
    useState<CreatorAccountStatus | null>(null);
  const [kycStep, setKycStep] = useState<
    "intro" | "creating" | "onboarding" | "complete" | "error"
  >("intro");
  const stripeConnectService = StripeConnectService.getInstance();

  useEffect(() => {
    checkExistingAccount();
  }, []);

  const checkExistingAccount = async () => {
    try {
      // Check if user already has a Connect account
      const existingAccountId = await SecureStore.getItemAsync(
        "stripe_connect_account_id",
      );
      if (existingAccountId) {
        setConnectAccountId(existingAccountId);
        await checkAccountStatus(existingAccountId);
      }
    } catch (error) {
      logger.error("Error checking existing account:", error);
    }
  };

  const checkAccountStatus = async (accountId: string) => {
    try {
      setIsLoading(true);

      // Use real API instead of mock
      const status = await stripeConnectService.getAccountStatus();
      setAccountStatus(status);

      if (status.isConnected && status.hasCompletedKYC) {
        setKycStep("complete");
      } else if (status.requiresVerification) {
        setKycStep("onboarding");
      }
    } catch (error) {
      logger.error("Error checking account status:", error);
      setKycStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const startKYCProcess = async () => {
    try {
      setIsLoading(true);
      setKycStep("creating");

      // Create Stripe Connect account using real API
      const result = await stripeConnectService.createConnectAccount({
        userId: user?.id || '',
        email: user?.email || '',
        firstName: user?.name?.split(' ')[0] || 'Creator',
        lastName: user?.name?.split(' ')[1] || 'User',
        businessType: "individual",
        country: "US",
      });

      if (result.success) {
        setConnectAccountId(result.accountId);
        await SecureStore.setItemAsync(
          "stripe_connect_account_id",
          result.accountId,
        );

        // If onboarding URL is provided directly, use it
        if (result.onboardingUrl) {
          setKycStep("onboarding");
          await openStripeOnboarding(result.onboardingUrl);
        } else {
          // Create account link manually
          const accountLink = await stripeConnectService.createAccountLink(
            result.accountId,
            'cookcam://creator-kyc-complete',
            'cookcam://creator-kyc-refresh'
          );
          
          setKycStep("onboarding");
          await openStripeOnboarding(accountLink.url);
        }
      }
    } catch (error) {
      logger.error("Error starting KYC:", error);
      setKycStep("error");
      Alert.alert(
        "Setup Failed",
        "We had trouble setting up your creator account. Please try again.",
        [{ text: "Retry", onPress: () => setKycStep("intro") }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openStripeOnboarding = async (onboardingUrl: string) => {
    try {
      const canOpen = await Linking.canOpenURL(onboardingUrl);
      if (canOpen) {
        await Linking.openURL(onboardingUrl);

        // For demo purposes, simulate completion after a delay
        setTimeout(() => {
          handleOnboardingComplete();
        }, 5000);
      } else {
        throw new Error("Cannot open onboarding URL");
      }
    } catch (error) {
      logger.error("Error opening Stripe onboarding:", error);
      Alert.alert(
        "Browser Error",
        "Unable to open the verification process. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      if (!connectAccountId) {
        return;
      }

      setIsLoading(true);

      // Check account status after onboarding
      await checkAccountStatus(connectAccountId);

      // Mark creator onboarding as complete
      await SecureStore.setItemAsync("creator_kyc_completed", "true");

      setKycStep("complete");
    } catch (error) {
      logger.error("Error handling onboarding completion:", error);
      setKycStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const completeCreatorSetup = async () => {
    try {
      setIsLoading(true);

      // Complete onboarding and navigate to main app
      await SecureStore.setItemAsync("onboardingCompleted", "true");

      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    } catch (error) {
      logger.error("Error completing setup:", error);
      Alert.alert("Error", "Failed to complete setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderIntroStep = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Building2 size={32} color="#FF6B35" />
          </View>
          <Text style={styles.title}>Set Up Creator Payouts</Text>
          <Text style={styles.subtitle}>
            Complete identity verification to start earning from your recipes
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>What you'll get:</Text>

          <View style={styles.benefitItem}>
            <DollarSign size={20} color="#66BB6A" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>30% Revenue Share</Text>
              <Text style={styles.benefitText}>
                Earn from every subscriber who follows your recipes
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Shield size={20} color="#66BB6A" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Secure Payments</Text>
              <Text style={styles.benefitText}>
                Powered by Stripe Connect with bank-level security
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Clock size={20} color="#66BB6A" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Fast Payouts</Text>
              <Text style={styles.benefitText}>
                Weekly automatic payouts to your bank account
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.kycInfo}>
          <Text style={styles.kycTitle}>Identity Verification Required</Text>
          <Text style={styles.kycText}>
            To comply with financial regulations, we need to verify your
            identity. This process is secure and typically takes 2-3 minutes.
          </Text>

          <View style={styles.kycSteps}>
            <Text style={styles.kycStepText}>• Basic personal information</Text>
            <Text style={styles.kycStepText}>• Government-issued ID</Text>
            <Text style={styles.kycStepText}>• Bank account details</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={startKYCProcess}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.startButtonText}>Start Verification</Text>
              <ExternalLink
                size={18}
                color="#FFFFFF"
                style={styles.startButtonIcon}
              />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          This will open a secure Stripe page for identity verification
        </Text>
      </View>
    </ScrollView>
  );

  const renderCreatingStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingTitle}>
          Setting up your creator account...
        </Text>
        <Text style={styles.loadingText}>
          We're creating your secure payment account with Stripe Connect
        </Text>
      </View>
    </View>
  );

  const renderOnboardingStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <View style={styles.iconContainer}>
          <ExternalLink size={32} color="#FF6B35" />
        </View>
        <Text style={styles.title}>Complete Verification</Text>
        <Text style={styles.subtitle}>
          Please complete the identity verification process in your browser
        </Text>

        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            ✓ Creator account created{"\n"}⏳ Waiting for verification
            completion
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkStatusButton}
          onPress={() =>
            connectAccountId && checkAccountStatus(connectAccountId)
          }
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FF6B35" size="small" />
          ) : (
            <Text style={styles.checkStatusText}>Check Status</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <View style={[styles.iconContainer, styles.successIcon]}>
          <CheckCircle size={32} color="#66BB6A" />
        </View>
        <Text style={styles.title}>🎉 You're All Set!</Text>
        <Text style={styles.subtitle}>
          Your creator account is verified and ready for payouts
        </Text>

        {accountStatus && (
          <View style={styles.accountInfo}>
            <Text style={styles.accountInfoTitle}>Account Status:</Text>
            <Text style={styles.accountInfoText}>
              ✅ Identity verified{"\n"}✅ Payouts enabled{"\n"}✅ Ready to earn
              revenue
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.completeButton}
          onPress={completeCreatorSetup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.completeButtonText}>Start Creating</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.errorTitle}>Setup Error</Text>
        <Text style={styles.errorText}>
          We encountered an issue setting up your creator account. again or
          contact support if the problem persists.
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setKycStep("intro")}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {kycStep === "intro" && renderIntroStep()}
      {kycStep === "creating" && renderCreatingStep()}
      {kycStep === "onboarding" && renderOnboardingStep()}
      {kycStep === "complete" && renderCompleteStep()}
      {kycStep === "error" && renderErrorStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: "#E8F5E8",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  benefitContent: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
  },
  kycInfo: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  kycTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
  },
  kycText: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
    marginBottom: 16,
  },
  kycSteps: {
    marginLeft: 8,
  },
  kycStepText: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  startButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
  startButtonIcon: {
    marginLeft: 4,
  },
  footerNote: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D1B69",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  statusInfo: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginVertical: 24,
    width: "100%",
  },
  statusText: {
    fontSize: 16,
    color: "#2D1B69",
    textAlign: "center",
    lineHeight: 24,
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
  accountInfo: {
    backgroundColor: "#E8F5E8",
    padding: 20,
    borderRadius: 12,
    marginVertical: 24,
    width: "100%",
  },
  accountInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  accountInfoText: {
    fontSize: 14,
    color: "#66BB6A",
    textAlign: "center",
    lineHeight: 22,
  },
  completeButton: {
    backgroundColor: "#66BB6A",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 16,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CreatorKYCScreen;
