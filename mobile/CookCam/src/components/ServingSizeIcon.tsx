import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ServingSizeIconProps {
  type: string;
  size?: number;
}

const ServingSizeIcon: React.FC<ServingSizeIconProps> = ({
  type,
  size = 48,
}) => {
  const getIconContent = () => {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case "individual":
      case "individual (1)":
      case "single":
        return { icon: "👤", number: "1", color: "#4CAF50" };

      case "couple":
      case "couple (2)":
      case "small":
        return { icon: "👥", number: "2", color: "#2196F3" };

      case "family":
      case "family (4)":
      case "medium":
        return { icon: "👨‍👩‍👧‍👦", number: "4", color: "#FF9800" };

      case "large group":
      case "large group (6)":
      case "large":
        return { icon: "👨‍👩‍👧‍👦", number: "6+", color: "#9C27B0" };

      case "custom":
      case "custom amount":
        return { icon: "⚙️", number: "?", color: "#607D8B" };

      default:
        return { icon: "🍽️", number: "1", color: "#4CAF50" };
    }
  };

  const { icon, number, color } = getIconContent();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.icon, { fontSize: size * 0.4 }]}>{icon}</Text>
      </View>
      <View style={[styles.numberBadge, { backgroundColor: color }]}>
        <Text style={[styles.numberText, { fontSize: size * 0.2 }]}>
          {number}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  icon: {
    textAlign: "center",
  },
  numberBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  numberText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default ServingSizeIcon;
