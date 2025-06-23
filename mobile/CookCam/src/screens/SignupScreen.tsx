import React, { useState } from "react";
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
  ScrollView,
  Switch,
} from "react-native";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ChevronLeft,
  DollarSign,
  Check,
  X,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import DeepLinkService from "../services/DeepLinkService";
import cookCamApi from "../services/cookCamApi";
import logger from "../utils/logger";


interface SignupScreenProps {
  navigation: any;
}

interface PasswordValidation {
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  minLength: boolean;
  isValid: boolean;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] =
    useState<PasswordValidation>({
      hasLowercase: false,
      hasUppercase: false,
      hasNumber: false,
      hasSpecialChar: false,
      minLength: false,
      isValid: false,
    });
  const { signup } = useAuth();

  // Password validation function that matches Supabase requirements
  const validatePassword = (pwd: string): PasswordValidation => {
    const hasLowercase = /[a-z]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    // Special characters allowed by Supabase
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(pwd);
    const minLength = pwd.length >= 8;

    const isValid =
      hasLowercase && hasUppercase && hasNumber && hasSpecialChar && minLength;

    return {
      hasLowercase,
      hasUppercase,
      hasNumber,
      hasSpecialChar,
      minLength,
      isValid,
    };
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordValidation(validatePassword(text));
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!passwordValidation.isValid) {
      Alert.alert(
        "Error",
        "Please ensure your password meets all requirements",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, name, isCreator);

      // Check for pending referral code and link user
      try {
        const referralCode =
          await DeepLinkService.getInstance().getPendingReferralCode();
        if (referralCode) {
          logger.debug("🔗 Linking user to referral code:", referralCode);
          await cookCamApi.linkUserToReferral("", referralCode); // User ID will be added by backend from JWT
          await DeepLinkService.getInstance().clearPendingReferralCode();
          logger.debug("✅ User successfully linked to referral");
        }
      } catch (referralError) {
        logger.debug(
          "⚠️ Failed to link referral, but signup successful:",
          referralError,
        );
        // Don't fail signup if referral linking fails
      }

      // Navigate to plan selection after successful signup
      navigation.navigate("PlanSelection");
    } catch (error: any) {
      logger.error("Signup error:", error);
      Alert.alert("Error", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const PasswordRequirement = ({
    isValid,
    text,
  }: {
    isValid: boolean;
    text: string;
  }) => (
    <View style={styles.passwordRequirement}>
      {isValid ? (
        <Check size={16} color="#66BB6A" />
      ) : (
        <X size={16} color="#FF5252" />
      )}
      <Text
        style={[
          styles.requirementText,
          { color: isValid ? "#66BB6A" : "#FF5252" },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#2D1B69" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          {/* Sign Up Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <User size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#8E8E93"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

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
                onChangeText={handlePasswordChange}
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

            {/* Password Requirements - Only show when user starts typing */}
            {password.length > 0 && (
              <View style={styles.passwordRequirementsContainer}>
                <Text style={styles.requirementsTitle}>
                  Password Requirements:
                </Text>
                <PasswordRequirement
                  isValid={passwordValidation.minLength}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  isValid={passwordValidation.hasLowercase}
                  text="One lowercase letter (a-z)"
                />
                <PasswordRequirement
                  isValid={passwordValidation.hasUppercase}
                  text="One uppercase letter (A-Z)"
                />
                <PasswordRequirement
                  isValid={passwordValidation.hasNumber}
                  text="One number (0-9)"
                />
                <PasswordRequirement
                  isValid={passwordValidation.hasSpecialChar}
                  text="One special character (!@#$%^&*)"
                />
              </View>
            )}

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Lock size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#8E8E93"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#8E8E93" />
                ) : (
                  <Eye size={20} color="#8E8E93" />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.passwordRequirement}>
                {password === confirmPassword ? (
                  <Check size={16} color="#66BB6A" />
                ) : (
                  <X size={16} color="#FF5252" />
                )}
                <Text
                  style={[
                    styles.requirementText,
                    {
                      color:
                        password === confirmPassword ? "#66BB6A" : "#FF5252",
                    },
                  ]}
                >
                  Passwords match
                </Text>
              </View>
            )}

            {/* Creator Program */}
            <View style={styles.creatorContainer}>
              <View style={styles.creatorContent}>
                <View style={styles.creatorHeader}>
                  <DollarSign size={20} color="#66BB6A" />
                  <Text style={styles.creatorTitle}>Join Creator Program</Text>
                </View>
                <Text style={styles.creatorDescription}>
                  Earn money by sharing CookCam with your audience
                </Text>
              </View>
              <Switch
                value={isCreator}
                onValueChange={setIsCreator}
                trackColor={{ false: "#E5E5E7", true: "#66BB6A" }}
                thumbColor={isCreator ? "#FFFFFF" : "#F8F8FF"}
              />
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signupButton,
                (loading ||
                  !passwordValidation.isValid ||
                  password !== confirmPassword) &&
                  styles.disabledButton,
              ]}
              onPress={handleSignup}
              disabled={
                loading ||
                !passwordValidation.isValid ||
                password !== confirmPassword
              }
            >
              {loading ? (
                <ActivityIndicator color="#F8F8FF" />
              ) : (
                <Text style={styles.signupButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By signing up, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login Link */}
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.loginContainer}
            >
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
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
  passwordRequirementsContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 12,
  },
  passwordRequirement: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "500",
  },
  creatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E7",
    padding: 16,
    marginBottom: 24,
  },
  creatorContent: {
    flex: 1,
    marginRight: 16,
  },
  creatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  creatorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1B69",
    marginLeft: 8,
  },
  creatorDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
  signupButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  termsText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 24,
  },
  termsLink: {
    color: "#FF6B35",
    textDecorationLine: "underline",
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
  loginContainer: {
    alignItems: "center",
  },
  loginText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  loginLink: {
    color: "#FF6B35",
    fontWeight: "600",
  },
});

export default SignupScreen;
