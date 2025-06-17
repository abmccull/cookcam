import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Text, Modal, Animated } from "react-native";
import AIChefIcon from "./AIChefIcon";
import { moderateScale } from "../utils/responsive";

export type LoadingVariant = "scanning" | "previews" | "detailed";

interface LoadingAnimationProps {
  visible: boolean;
  variant: LoadingVariant;
}

const getContentForVariant = (variant: LoadingVariant) => {
  switch (variant) {
    case "scanning":
      return {
        title: "AI Chef Analyzing...",
        subtitle: "Identifying ingredients with computer vision",
        steps: [
          { icon: "🔍", text: "Scanning image patterns" },
          { icon: "🧠", text: "Processing with neural networks" },
          { icon: "✨", text: "Matching to ingredient database" },
        ],
      };
    case "previews":
      return {
        title: "👨‍🍳 Crafting Recipe Ideas...",
        subtitle: "Creating 3 unique dishes just for you",
        steps: [
          { icon: "🥘", text: "Exploring flavor combinations" },
          { icon: "🌟", text: "Personalizing to your taste" },
          { icon: "🎯", text: "Curating diverse options" },
        ],
      };
    case "detailed":
      return {
        title: "📝 Perfecting Your Recipe...",
        subtitle: "Crafting step-by-step cooking instructions",
        steps: [
          { icon: "⏱️", text: "Calculating optimal timing" },
          { icon: "🔥", text: "Detailing cooking techniques" },
          { icon: "📋", text: "Organizing clear steps" },
        ],
      };
    default:
      return getContentForVariant("scanning");
  }
};

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  visible,
  variant,
}) => {
  const aiPulseAnim = useRef(new Animated.Value(1)).current;
  const aiOpacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      // Start pulsing animation when loading
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(aiPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(aiPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );

      const opacity = Animated.loop(
        Animated.sequence([
          Animated.timing(aiOpacityAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(aiOpacityAnim, {
            toValue: 0.7,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );

      pulse.start();
      opacity.start();

      return () => {
        pulse.stop();
        opacity.stop();
      };
    }
  }, [visible]);

  const content = getContentForVariant(variant);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: aiPulseAnim }],
              opacity: aiOpacityAnim,
            },
          ]}
        >
          <View style={styles.content}>
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: aiPulseAnim }] },
              ]}
            >
              <AIChefIcon size={moderateScale(64)} variant="analyzing" />
            </Animated.View>

            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>

            <View style={styles.stepsContainer}>
              {content.steps.map((step, index) => (
                <Text key={index} style={styles.stepText}>
                  {step.icon} {step.text}
                </Text>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(139, 69, 19, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    margin: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FFB800",
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 20,
    textAlign: "center",
  },
  stepsContainer: {
    alignItems: "flex-start",
  },
  stepText: {
    fontSize: 14,
    color: "#2D1B69",
    marginBottom: 5,
    fontWeight: "500",
  },
});

export default LoadingAnimation;
