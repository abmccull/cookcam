import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

interface ServingSizeIconProps {
  type: string;
  size?: number;
}

const ServingSizeIcon: React.FC<ServingSizeIconProps> = React.memo(
  ({ type, size = 48 }) => {
    // Memoize the icon content calculation
    const iconContent = useMemo(() => {
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
    }, [type]);

    // Memoize dynamic styles
    const containerStyle = useMemo(
      () => [styles.container, { width: size, height: size }],
      [size],
    );

    const iconContainerStyle = useMemo(
      () => [
        styles.iconContainer,
        { backgroundColor: `${iconContent.color}20` },
      ],
      [iconContent.color],
    );

    const iconStyle = useMemo(
      () => [styles.icon, { fontSize: size * 0.4 }],
      [size],
    );

    const numberBadgeStyle = useMemo(
      () => [styles.numberBadge, { backgroundColor: iconContent.color }],
      [iconContent.color],
    );

    const numberTextStyle = useMemo(
      () => [styles.numberText, { fontSize: size * 0.2 }],
      [size],
    );

    return (
      <View style={containerStyle}>
        <View style={iconContainerStyle}>
          <Text style={iconStyle}>{iconContent.icon}</Text>
        </View>
        <View style={numberBadgeStyle}>
          <Text style={numberTextStyle}>{iconContent.number}</Text>
        </View>
      </View>
    );
  },
);

// Add display name for debugging
ServingSizeIcon.displayName = "ServingSizeIcon";

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
