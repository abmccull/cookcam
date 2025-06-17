import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import AIChefIcon from "../components/AIChefIcon";
import { User, UserPlus } from "lucide-react-native";

interface WelcomeScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

const { height } = Dimensions.get("window");

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleSignIn = () => {
    navigation.navigate("Login");
  };

  const handleImNew = () => {
    navigation.navigate("Onboarding");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <AIChefIcon size={100} />
          <Text style={styles.appName}>CookCam</Text>
          <Text style={styles.tagline}>Your AI-powered cooking companion</Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* I'm New Button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleImNew}
            activeOpacity={0.9}
          >
            <UserPlus size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>I'm new</Text>
            <Text style={styles.buttonSubtext}>Start your cooking journey</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSignIn}
            activeOpacity={0.9}
          >
            <User size={24} color="#2D1B69" />
            <Text style={styles.secondaryButtonText}>Sign In</Text>
            <Text style={[styles.buttonSubtext, styles.secondarySubtext]}>
              Welcome back!
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.footerText}>
            Scan ingredients, get AI recipes, and level up your cooking skills
          </Text>
        </Animated.View>
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
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  logoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: height * 0.05,
  },
  appName: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 24,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "500",
  },
  actionsSection: {
    paddingBottom: 60,
  },
  button: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    minHeight: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D1B69",
    marginTop: 8,
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  secondarySubtext: {
    color: "#8E8E93",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
});

export default WelcomeScreen;
