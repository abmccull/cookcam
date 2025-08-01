import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Mail, Lock, Eye, EyeOff, ChefHat } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { secureStorage } from "../services/secureStorage";
import BiometricLogin from "../components/BiometricLogin";
import BiometricEnablementModal from "../components/BiometricEnablementModal";
import BiometricAuthService from "../services/biometricAuth";
import logger from "../utils/logger";
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withRepeat,
//   withSequence,
// } from 'react-native-reanimated';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricRefreshTrigger, setBiometricRefreshTrigger] = useState(0);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const { login, loginWithBiometrics, enableBiometricLogin } = useAuth();

  // Animation for the chef hat - TEMPORARILY DISABLED
  // const rotation = useSharedValue(0);

  // React.useEffect(() => {
  //   rotation.value = withRepeat(
  //     withSequence(
  //       withSpring(-10),
  //       withSpring(10),
  //       withSpring(0)
  //     ),
  //     -1,
  //     true
  //   );
  // }, []);

  // const animatedStyle = useAnimatedStyle(() => {
  //   return {
  //     transform: [{rotate: `${rotation.value}deg`}],
  //   };
  // });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);

      // After successful login, offer to enable biometric authentication
      // This will be shown only once per session
      setTimeout(() => {
        setShowBiometricModal(true);
      }, 1000);

      // Navigation will be handled by the auth state change in App.tsx
    } catch (error) {
      Alert.alert(
        "Error",
        "Login failed. Please check your credentials and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async (credentials: {
    email: string;
    token: string;
  }) => {
    try {
      setLoading(true);
      logger.debug("🔐 Starting biometric login process...");
      await loginWithBiometrics(credentials);
      logger.debug("✅ Biometric login process completed successfully");
      // Navigation will be handled by the auth state change in App.tsx
    } catch (error) {
      logger.error("❌ Biometric login failed:", error);
      Alert.alert(
        "Biometric Login Failed",
        error instanceof Error
          ? error.message
          : "Please try logging in with your password.",
      );
    } finally {
      setLoading(false);
      logger.debug("🔐 Biometric login loading state cleared");
    }
  };

  const handleBiometricError = (error: string) => {
    Alert.alert("Authentication Error", error);
  };

  const handleEnableBiometric = async () => {
    try {
      logger.debug("🔐 User clicked Enable biometric login");

      // Use the enableBiometricLogin method which gets the session directly
      // We don't need to manually get the token
      await enableBiometricLogin(email, ""); // Empty token since enableBiometricLogin gets session internally

      // Trigger refresh of biometric component
      setBiometricRefreshTrigger((prev) => prev + 1);

      logger.debug("✅ Biometric login setup completed successfully");
    } catch (error) {
      logger.error("❌ Failed to enable biometric login:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to enable biometric login";
      Alert.alert(
        "Error",
        `${errorMessage}. You can enable it later in settings.`,
      );
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleBiometricModalSuccess = () => {
    // Called when biometric setup is successful
    logger.debug("✅ Biometric modal success callback");
  };

  const handleCloseBiometricModal = () => {
    setShowBiometricModal(false);
  };

  // Debug function to check biometric status
  const debugBiometricStatus = async () => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const capabilities = await biometricService.checkBiometricCapabilities();
      const isEnabled = await biometricService.isBiometricEnabled();
      const credentials = await biometricService.getStoredCredentials();

      logger.debug("🔍 Biometric Debug Status:", {
        capabilities: {
          isAvailable: capabilities.isAvailable,
          hasHardware: capabilities.hasHardware,
          isEnrolled: capabilities.isEnrolled,
          fingerprintAvailable: capabilities.fingerprintAvailable,
          faceIdAvailable: capabilities.faceIdAvailable,
        },
        isEnabled,
        hasStoredCredentials: !!credentials,
        credentialsEmail: credentials?.email,
        hasRefreshToken: !!credentials?.refreshToken,
      });
    } catch (error) {
      logger.error("❌ Debug biometric status error:", error);
    }
  };

  // Debug biometric status on screen load
  useEffect(() => {
    debugBiometricStatus();
  }, []);

  const handleSignup = () => {
    navigation.navigate("Signup");
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password reset functionality will be available soon. Please contact support if you need help accessing your account.",
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Logo and Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <ChefHat size={60} color="#FF6B35" />
          </View>
          <Text style={styles.title}>CookCam</Text>
          <Text style={styles.subtitle}>
            Turn ingredients into delicious meals
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Mail size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8E8E93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Lock size={20} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color="#8E8E93" />
              ) : (
                <Eye size={20} color="#8E8E93" />
              )}
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F8F8FF" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Login */}
          <BiometricLogin
            onSuccess={handleBiometricLogin}
            onError={handleBiometricError}
            disabled={loading}
            style={styles.biometricButton}
            refreshTrigger={biometricRefreshTrigger}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={handleSignup}
            style={styles.signupContainer}
          >
            <Text style={styles.signupText}>
              Don't have an account?{" "}
              <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Biometric Enablement Modal */}
      <BiometricEnablementModal
        visible={showBiometricModal}
        onClose={handleCloseBiometricModal}
        onEnable={handleEnableBiometric}
        onSuccess={handleBiometricModalSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  form: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E7",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#2D1B69",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#FF6B35",
  },
  loginButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E7",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#8E8E93",
  },
  signupContainer: {
    alignItems: "center",
  },
  signupText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  signupLink: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  biometricButton: {
    marginBottom: 24,
  },
});

export default LoginScreen;
