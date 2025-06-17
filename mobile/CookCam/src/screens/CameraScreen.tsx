import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import {
  Image as ImageIcon,
  X,
  Star,
  ChefHat,
  Zap,
  Flame,
  Camera as CameraIcon,
} from "lucide-react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useGamification, XP_VALUES } from "../context/GamificationContext";
import { useAuth } from "../context/AuthContext";
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from "expo-haptics";
import DailyCheckIn from "../components/DailyCheckIn";
import logger from "../utils/logger";


interface CameraScreenProps {
  navigation: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Simulator detection
const isSimulator = Platform.OS === "ios" && !Platform.isPad;

// Mock camera images for simulator testing
const MOCK_CAMERA_IMAGES = [
  require("../../assets/261038-1600x1030-homemade-raw-dog-food-recipes-grain-free.jpg"), // Local test image with raw meat and vegetables
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", // Mixed vegetables
  "https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", // Fresh produce
  "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", // Cooking ingredients
];

// 100 Fun Food Trivia Facts
const funFacts = [
  "🍯 Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
  "🍌 Bananas are berries, but strawberries aren't! Botanically speaking, berries must have seeds inside their flesh.",
  "🥕 Carrots were originally purple! Orange carrots were developed in the Netherlands in the 17th century.",
  "🍅 Tomatoes were once thought to be poisonous by wealthy Europeans because they ate off pewter plates, which caused lead poisoning.",
  "🥑 Avocados are fruits, not vegetables, and they're actually large berries with a single seed.",
  "🍍 Pineapples take about 18-20 months to grow and each plant only produces one pineapple at a time.",
  "🌶️ Capsaicin, the compound that makes peppers hot, doesn't actually cause physical damage - it just tricks your brain into feeling heat.",
  "🥒 Cucumbers are 96% water, making them one of the most hydrating foods you can eat.",
  "🍎 Apples float in water because they are 25% air by volume.",
  "🧄 Garlic is a natural antibiotic and was used by ancient civilizations to treat various ailments.",
];

// Responsive scaling function
const scale = (size: number) => (screenWidth / 375) * size; // 375 is iPhone X width
const verticalScale = (size: number) => (screenHeight / 812) * size; // 812 is iPhone X height
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const CameraScreen: React.FC<CameraScreenProps> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const { addXP, streak } = useGamification();
  const { user } = useAuth();
  const [hasCookedToday, setHasCookedToday] = useState(false);
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const xpBadgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      }),
    ).start();

    // Fade in content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate XP badge
    Animated.spring(xpBadgeScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Cycle through fun facts every 8 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % funFacts.length);
    }, 8000);

    return () => clearInterval(tipInterval);
  }, []);

  // Check camera permissions
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Handle camera focus - reinitialize camera when screen becomes focused
  useFocusEffect(
    React.useCallback(() => {
      logger.debug("📹 Camera screen focused - reinitializing camera");
      setIsCameraReady(false);
      
      // Small delay to ensure camera reinitializes properly
      const timer = setTimeout(() => {
        setIsCameraReady(true);
        logger.debug("📹 Camera reinitialized and ready");
      }, 100);

      return () => {
        clearTimeout(timer);
        logger.debug("📹 Camera screen unfocused - cleaning up");
      };
    }, [])
  );

  // Take actual photo for testing
  const handleTakePhoto = async () => {
    // Simulator detection and mock functionality
    if (isSimulator || !permission?.granted) {
      logger.debug(
        "📱 Simulator detected or no camera permission - using mock mode",
      );

      setIsProcessing(true);

      // Haptic feedback when button pressed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Simulate photo capture delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Use the first mock image (our test image)
      const mockImageUri = MOCK_CAMERA_IMAGES[0];
      setPhotoUri(mockImageUri);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      logger.debug("🎯 About to add XP for ingredient scan (simulator mode)...");
      await addXP(XP_VALUES.SCAN_INGREDIENTS, "SCAN_INGREDIENTS");
      logger.debug(
        "✅ XP addition completed for ingredient scan (simulator mode)",
      );

      navigation.navigate("IngredientReview", {
        imageUri: mockImageUri,
        isSimulator: false,
      });

      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    // Haptic feedback when button pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (camera.current) {
        // Take actual photo using Expo camera
        const photo = await camera.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        logger.debug("Photo taken:", photo.uri);
        setPhotoUri(photo.uri);

        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Award XP for scanning ingredients
        logger.debug("🎯 About to add XP for ingredient scan (real camera)...");
        await addXP(XP_VALUES.SCAN_INGREDIENTS, "SCAN_INGREDIENTS");
        logger.debug(
          "✅ XP addition completed for ingredient scan (real camera)",
        );

        // Navigate to ingredient review with actual image
        navigation.navigate("IngredientReview", {
          imageUri: photo.uri,
        });
      } else {
        // Camera ref not available - show error
        logger.error("Camera ref not available");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Camera Error",
          "Camera is not available. Please check permissions and try again.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      logger.error("Failed to take photo:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Show error message instead of fallback
      Alert.alert("Photo Error", "Failed to take photo. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Calculate responsive sizes
  const cameraPreviewSize = Math.min(screenWidth * 0.9, screenHeight * 0.45);
  const isSmallDevice = screenHeight < 700;

  // If no camera permission, show permission request
  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <CameraIcon size={64} color="#FF6B35" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            CookCam needs camera access to scan your ingredients and generate
            amazing recipes!
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Daily Check-In */}
        {showDailyCheckIn && (
          <View style={styles.dailyCheckInContainer}>
            <DailyCheckIn />
            <TouchableOpacity
              style={styles.closeDailyCheckIn}
              onPress={() => setShowDailyCheckIn(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Background decoration */}
        <Animated.View
          style={[
            styles.backgroundDecoration,
            {
              transform: [{ rotate: spin }],
              width: screenWidth * 0.6,
              height: screenWidth * 0.6,
            },
          ]}
        >
          <ChefHat size={screenWidth * 0.6} color="#FF6B35" />
        </Animated.View>

        <View style={styles.content}>
          {/* Header section */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text
              style={[
                styles.headerTitle,
                isSmallDevice && styles.headerTitleSmall,
              ]}
            >
              Ready to Cook? 🍳
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                isSmallDevice && styles.headerSubtitleSmall,
              ]}
            >
              Show me what you've got!
            </Text>
          </Animated.View>

          {/* Main content area */}
          <View style={styles.mainContent}>
            {/* Camera preview area */}
            <Animated.View
              style={[
                styles.cameraContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: fadeAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.cameraPreview,
                  {
                    width: cameraPreviewSize,
                    height: cameraPreviewSize,
                  },
                ]}
              >
                {/* Real Camera View */}
                {permission?.granted && !isSimulator && isCameraReady && (
                  <CameraView
                    ref={camera}
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                  />
                )}

                <View style={styles.cameraOverlay}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />

                  {/* Camera icon for simulator or overlay */}
                  {(isSimulator || !permission?.granted || !isCameraReady) && (
                    <>
                      <CameraIcon
                        size={moderateScale(48)}
                        color="#F8F8FF"
                        strokeWidth={1.5}
                      />
                      <Text style={styles.cameraText}>
                        {!isCameraReady ? "Initializing camera..." : "Tap to detect your ingredients"}
                      </Text>
                    </>
                  )}

                  {/* Fun animated elements */}
                  <Animated.View
                    style={[
                      styles.floatingEmoji,
                      styles.emoji1,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emojiText,
                        isSmallDevice && styles.emojiTextSmall,
                      ]}
                    >
                      🥕
                    </Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.floatingEmoji,
                      styles.emoji2,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emojiText,
                        isSmallDevice && styles.emojiTextSmall,
                      ]}
                    >
                      🧄
                    </Text>
                  </Animated.View>
                </View>
              </View>
            </Animated.View>

            {/* Capture button */}
            <Animated.View style={[styles.captureSection, { opacity: fadeAnim }]}>
              <View style={styles.captureRow}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    isProcessing && styles.captureButtonDisabled,
                  ]}
                  onPress={handleTakePhoto}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="large" color="#FFF" />
                  ) : (
                    <>
                      <View style={styles.captureButtonContent}>
                        <CameraIcon size={moderateScale(24)} color="#FFF" />
                        <Text style={styles.captureButtonText}>
                          Scan Ingredients
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Fun fact section */}
            <Animated.View
              style={[
                styles.tipSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.tipContainer}>
                <Zap size={moderateScale(20)} color="#FF6B35" />
                <Text style={styles.tipText}>{funFacts[currentTip]}</Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2D1B69",
  },
  backgroundDecoration: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    zIndex: 0,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    zIndex: 1,
    paddingTop: Platform.OS === 'android' ? verticalScale(50) : verticalScale(20), // Add safe area for Android status bar
  },
  header: {
    alignItems: "center",
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(30), // Increased space below header
  },
  headerTitle: {
    fontSize: moderateScale(28), // Slightly larger for better visibility
    fontWeight: "bold",
    color: "#F8F8FF",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  headerTitleSmall: {
    fontSize: moderateScale(24),
  },
  headerSubtitle: {
    fontSize: moderateScale(16), // Slightly larger
    color: "rgba(248, 248, 255, 0.8)", // Higher opacity for better readability
    textAlign: "center",
  },
  headerSubtitleSmall: {
    fontSize: moderateScale(14),
  },
  mainContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: verticalScale(10), // Reduced top padding
    paddingBottom: verticalScale(20), // Significantly reduced from 50 to 20 to move trivia higher
  },
  cameraContainer: {
    alignItems: "center",
    marginBottom: verticalScale(30), // More space below camera
  },
  cameraPreview: {
    backgroundColor: "rgba(248, 248, 255, 0.05)",
    borderRadius: moderateScale(24),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 107, 53, 0.3)",
    shadowColor: "#FF6B35",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: "10%",
    left: "10%",
    width: moderateScale(30),
    height: moderateScale(30),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FF6B35",
  },
  cornerTR: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: moderateScale(30),
    height: moderateScale(30),
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FF6B35",
  },
  cornerBL: {
    position: "absolute",
    bottom: "10%",
    left: "10%",
    width: moderateScale(30),
    height: moderateScale(30),
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FF6B35",
  },
  cornerBR: {
    position: "absolute",
    bottom: "10%",
    right: "10%",
    width: moderateScale(30),
    height: moderateScale(30),
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#FF6B35",
  },
  cameraText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: "#F8F8FF",
    opacity: 0.7,
    textAlign: "center",
  },
  floatingEmoji: {
    position: "absolute",
  },
  emoji1: {
    top: "15%",
    left: "15%",
  },
  emoji2: {
    top: "15%",
    right: "15%",
  },
  emojiText: {
    fontSize: moderateScale(32),
  },
  emojiTextSmall: {
    fontSize: moderateScale(28),
  },
  captureSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(15),
    marginBottom: verticalScale(15),
    width: "100%",
  },
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingHorizontal: scale(30),
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(30),
    shadowColor: "#FF6B35",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonOuter: {
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF6B35",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    backgroundColor: "#FF8B65",
    borderWidth: 3,
    borderColor: "#F8F8FF",
  },
  captureText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#F8F8FF",
    letterSpacing: 2,
  },
  processingContainer: {
    alignItems: "center",
  },
  processingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(16),
    color: "#F8F8FF",
  },
  streakReminder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(12),
    gap: scale(8),
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
    alignSelf: "center",
  },
  streakText: {
    color: "#FF6B35",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  xpBadge: {
    marginLeft: scale(20),
    backgroundColor: "#FFB800",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    shadowColor: "#FFB800",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    alignSelf: "flex-start",
    marginTop: verticalScale(-10),
  },
  xpBadgeText: {
    color: "#2D1B69",
    fontSize: moderateScale(12),
    fontWeight: "bold",
  },
  dailyCheckInContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  closeDailyCheckIn: {
    position: "absolute",
    top: verticalScale(60),
    right: scale(20),
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  simulatorBadge: {
    position: "absolute",
    top: "10%",
    left: "10%",
    backgroundColor: "rgba(255, 107, 53, 0.7)",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(16),
  },
  simulatorText: {
    color: "#FFFFFF",
    fontSize: moderateScale(12),
    fontWeight: "bold",
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(20),
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 248, 255, 0.95)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(20),
    borderWidth: 2,
    borderColor: "rgba(255, 107, 53, 0.4)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    flex: 1,
    minHeight: verticalScale(70),
    marginHorizontal: scale(15),
  },
  tipText: {
    marginLeft: scale(12),
    fontSize: moderateScale(14),
    color: "#2D1B69",
    fontWeight: "600",
    flex: 1,
    lineHeight: moderateScale(20),
    textAlign: "left",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#F8F8FF",
    marginBottom: verticalScale(16),
  },
  permissionText: {
    fontSize: moderateScale(16),
    color: "rgba(248, 248, 255, 0.7)",
    textAlign: "center",
    marginHorizontal: scale(20),
    marginBottom: verticalScale(24),
  },
  permissionButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(20),
  },
  permissionButtonText: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  captureButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: scale(8),
  },
  tipSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: Platform.OS === 'android' ? verticalScale(80) : verticalScale(60),
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#2D1B69",
  },
  captureButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CameraScreen;
