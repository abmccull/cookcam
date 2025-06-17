import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import { Apple, Mail } from "lucide-react-native";
import logger from "../utils/logger";


interface AccountGateScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, "AccountGate">;
}

const AccountGateScreen: React.FC<AccountGateScreenProps> = ({
  navigation,
  route,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "apple" | "google" | "email" | null
  >(null);
  const { intendedPlan, tempData } = route.params;

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setLoadingType("apple");

      // TODO: Implement Apple Sign-In
      // 1. Apple Sign-In → Get Apple ID + email
      // 2. Create Supabase account with Apple auth
      // 3. Start Apple subscription trial
      // 4. Merge temp data

      logger.debug("🍎 Apple Sign-In for plan:", intendedPlan);

      // For now, simulate the flow
      setTimeout(() => {
        navigation.navigate("PlanPaywall", {
          selectedPlan: intendedPlan,
          tempData,
        });
        setIsLoading(false);
        setLoadingType(null);
      }, 2000);
    } catch (error) {
      logger.error("Apple Sign-In error:", error);
      setIsLoading(false);
      setLoadingType(null);
      Alert.alert(
        "Sign-In Failed",
        "Please try again or use a different method.",
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setLoadingType("google");

      // TODO: Implement Google Sign-In
      // Similar flow to Apple but with Google

      logger.debug("🔍 Google Sign-In for plan:", intendedPlan);

      // For now, simulate the flow
      setTimeout(() => {
        navigation.navigate("PlanPaywall", {
          selectedPlan: intendedPlan,
          tempData,
        });
        setIsLoading(false);
        setLoadingType(null);
      }, 2000);
    } catch (error) {
      logger.error("Google Sign-In error:", error);
      setIsLoading(false);
      setLoadingType(null);
      Alert.alert(
        "Sign-In Failed",
        "Please try again or use a different method.",
      );
    }
  };

  const handleEmailSignUp = () => {
    // Navigate to existing signup screen with plan context
    Alert.alert(
      "Email Signup",
      "Email signup flow would go to existing signup screen with plan context.",
      [{ text: "OK", onPress: () => logger.debug("Email signup selected") }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>
            Create your account to start your{" "}
            <Text style={styles.planText}>
              {intendedPlan === "creator" ? "Creator" : "Cooking"}
            </Text>{" "}
            trial
          </Text>
        </View>

        <View style={styles.authOptions}>
          <TouchableOpacity
            style={[styles.authButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={isLoading}
          >
            {loadingType === "apple" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Apple size={24} color="#FFFFFF" />
                <Text style={styles.authButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authButton, styles.googleButton]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            {loadingType === "google" ? (
              <ActivityIndicator color="#2D1B69" size="small" />
            ) : (
              <>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={[styles.authButtonText, styles.googleText]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authButton, styles.emailButton]}
            onPress={handleEmailSignUp}
            disabled={isLoading}
          >
            {loadingType === "email" ? (
              <ActivityIndicator color="#2D1B69" size="small" />
            ) : (
              <>
                <Mail size={24} color="#2D1B69" />
                <Text style={[styles.authButtonText, styles.emailText]}>
                  Continue with Email
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.planReminder}>
          <Text style={styles.planReminderText}>
            {intendedPlan === "creator" ? (
              <>
                You selected: <Text style={styles.boldText}>Creator Plan</Text>{" "}
                - $9.99/mo + 30% revenue share
              </>
            ) : (
              <>
                You selected: <Text style={styles.boldText}>Get Cooking</Text> -
                $3.99/mo
              </>
            )}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            {"\n"}Start your 3-day free trial, cancel anytime.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  planText: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  authOptions: {
    marginBottom: 32,
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 56,
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  emailButton: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    color: "#FFFFFF",
  },
  googleText: {
    color: "#2D1B69",
  },
  emailText: {
    color: "#2D1B69",
  },
  googleIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#4285F4",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  planReminder: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  planReminderText: {
    fontSize: 14,
    color: "#2D1B69",
    textAlign: "center",
  },
  boldText: {
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default AccountGateScreen;
