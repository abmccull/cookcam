import React from "react";
import { View, StyleSheet } from "react-native";
import OptimizedImage from "./OptimizedImage";

interface AIChefIconProps {
  size?: number;
  variant?: "default" | "analyzing" | "cooking";
}

const AIChefIcon: React.FC<AIChefIconProps> = ({
  size = 48,
  variant = "default",
}) => {
  // For now, we'll use the same mascot image for all variants
  // You can add different effects like opacity changes for different states
  const getImageStyle = () => {
    switch (variant) {
      case "analyzing":
        return {
          opacity: 0.8,
          transform: [{ scale: 1.1 }],
        };
      case "cooking":
        return {
          opacity: 1,
          transform: [{ scale: 1 }],
        };
      default:
        return {
          opacity: 1,
          transform: [{ scale: 1 }],
        };
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <OptimizedImage
        source={require("../../assets/robot-chef-holding-spatula-spoon-mascot-illustration-288841450.webp")}
        style={[
          {
            width: size,
            height: size,
          },
          getImageStyle(),
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AIChefIcon;
