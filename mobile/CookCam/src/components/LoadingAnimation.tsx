import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Text, Modal, Animated } from "react-native";
import AIChefIcon from "./AIChefIcon";
import { moderateScale } from "../utils/responsive";
import logger from "../utils/logger";

interface LoadingAnimationProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
}

const getDefaultContent = () => ({
  title: "🤖 AI Chef Working...",
  subtitle: "Creating something delicious for you",
  steps: [
    { icon: "🔍", text: "Analyzing ingredients" },
    { icon: "🧠", text: "Processing with AI" },
    { icon: "✨", text: "Crafting perfect recipes" },
  ],
});

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  visible,
  title,
  subtitle,
}) => {
  const aiPulseAnim = useRef(new Animated.Value(1)).current;
  const aiOpacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    logger.debug(`🎬 LoadingAnimation: visible=${visible}`);
    
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

  const defaultContent = getDefaultContent();
  const content = {
    title: title || defaultContent.title,
    subtitle: subtitle || defaultContent.subtitle,
    steps: defaultContent.steps,
  };

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
              {content.steps.map((step: { icon: string; text: string }, index: number) => (
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
    elevation: 15,
    borderWidth: 2,
    borderColor: "#FFB800",
    maxWidth: '85%',
    minWidth: '70%',
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
