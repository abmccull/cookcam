import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import {RootStackParamList} from '../App';
import { Scan, X } from "lucide-react-native";
import { useTempData } from "../context/TempDataContext";
import logger from "../utils/logger";

interface DemoOnboardingScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

const DemoOnboardingScreen: React.FC<DemoOnboardingScreenProps> = ({
  navigation,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasValidDevice, setHasValidDevice] = useState(true); // Always true for expo-camera
  const cameraRef = useRef<CameraView>(null);
  const { setTempScanData } = useTempData();

  React.useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        setHasValidDevice(true);
      } else {
        const { status: newStatus } =
          await Camera.requestCameraPermissionsAsync();
        if (newStatus === "granted") {
          setHasPermission(true);
          setHasValidDevice(true);
        } else {
          // Permission denied
          Alert.alert(
            "Camera Permission Denied",
            "Camera access is required for ingredient scanning.",
            [
              {
                text: "Skip Demo",
                onPress: () => navigation.navigate("PlanSelection", {}),
              },
              { text: "Use Mock Demo", onPress: () => handleMockScan() },
              { text: "Try Again", onPress: checkCameraPermission },
            ],
          );
        }
      }
    } catch (error) {
      logger.error("Camera permission error:", error);
      // Fallback for simulator or camera issues
      Alert.alert(
        "Camera Error",
        "Camera functionality not available. Would you like to try a mock demo instead?",
        [
          {
            text: "Skip Demo",
            onPress: () => navigation.navigate("PlanSelection", {}),
          },
          { text: "Mock Demo", onPress: () => handleMockScan() },
        ],
      );
    }
  };

  const handleScan = async () => {
    if (!cameraRef.current || isScanning) {
      return;
    }

    try {
      setIsScanning(true);

      // Take photo for scanning
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });

      // Mock ingredient detection for demo
      const mockIngredients = [
        { name: "Tomatoes", confidence: 0.95 },
        { name: "Onions", confidence: 0.87 },
        { name: "Garlic", confidence: 0.92 },
        { name: "Bell Peppers", confidence: 0.78 },
      ];

      // Store scan data in temp context
      const scanData = {
        imageUrl: photo.uri,
        ingredients: mockIngredients,
        scanDate: new Date(),
      };

      setTempScanData(scanData);

      // Navigate to recipe carousel
      navigation.navigate("RecipeCarousel");
    } catch (error) {
      logger.error("Scan error:", error);
      Alert.alert("Scan Failed", "Please try again or skip the demo.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleMockScan = () => {
    // Mock scan without camera for testing/simulator
    const mockIngredients = [
      { name: "Tomatoes", confidence: 0.95 },
      { name: "Onions", confidence: 0.87 },
      { name: "Garlic", confidence: 0.92 },
      { name: "Bell Peppers", confidence: 0.78 },
      { name: "Carrots", confidence: 0.89 },
    ];

    // Store scan data in temp context
    const scanData = {
      imageUrl: "mock://demo-ingredients.jpg",
      ingredients: mockIngredients,
      scanDate: new Date(),
    };

    setTempScanData(scanData);

    // Navigate to recipe carousel
    navigation.navigate("RecipeCarousel");
  };

  const handleSkip = () => {
    navigation.navigate("PlanSelection", {});
  };

  if (!hasPermission || !hasValidDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Demo</Text>
          <Text style={styles.permissionText}>
            CookCam uses your camera to identify ingredients and suggest amazing
            recipes.
            {!hasValidDevice &&
              "\n\nSimulator detected - try the mock demo below!"}
          </Text>
          {hasValidDevice && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={checkCameraPermission}
            >
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.mockButton} onPress={handleMockScan}>
            <Text style={styles.mockButtonText}>Try Mock Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip Demo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {hasValidDevice && (
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      )}

      {!hasValidDevice && (
        <View style={[styles.camera, styles.mockCameraView]}>
          <Text style={styles.mockCameraText}>📱 Camera Preview</Text>
          <Text style={styles.mockCameraSubtext}>Simulator Mode</Text>
        </View>
      )}

      {/* Semi-transparent overlay */}
      <View style={styles.overlay}>
        {/* Skip button */}
        <TouchableOpacity style={styles.topSkipButton} onPress={handleSkip}>
          <X size={24} color="#F8F8FF" />
        </TouchableOpacity>

        {/* Guidance text */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.guidanceTitle}>Point at today's ingredients</Text>
          <Text style={styles.guidanceSubtitle}>
            Our AI will identify what you have
          </Text>
        </View>

        {/* Scan button */}
        <View style={styles.scanContainer}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonScanning]}
            onPress={handleScan}
            disabled={isScanning}
          >
            <Scan size={32} color="#F8F8FF" />
          </TouchableOpacity>
          <Text style={styles.scanText}>
            {isScanning ? "Scanning..." : "Tap to scan"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  mockCameraView: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  mockCameraText: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  mockCameraSubtext: {
    fontSize: 16,
    color: "#888888",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "space-between",
    padding: 20,
  },
  topSkipButton: {
    alignSelf: "flex-end",
    marginTop: 10,
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  guidanceContainer: {
    alignItems: "center",
    marginTop: 100,
  },
  guidanceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F8F8FF",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  guidanceSubtitle: {
    fontSize: 16,
    color: "#F8F8FF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scanContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonScanning: {
    backgroundColor: "#666",
  },
  scanText: {
    fontSize: 16,
    color: "#F8F8FF",
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D1B69",
    textAlign: "center",
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  mockButton: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 16,
  },
  mockButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F8FF",
  },
  skipButton: {
    padding: 16,
  },
  skipButtonText: {
    fontSize: 16,
    color: "#8E8E93",
  },
});

export default DemoOnboardingScreen;
