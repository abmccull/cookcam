import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  G,
  Path,
  Circle,
  Rect,
  Ellipse,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

interface KitchenApplianceIconProps {
  appliance: string;
  size?: number;
}

const KitchenApplianceIcon: React.FC<KitchenApplianceIconProps> = ({
  appliance,
  size = 32,
}) => {
  const renderSVGIcon = () => {
    switch (appliance.toLowerCase()) {
      case "oven":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="ovenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#BDBDBD" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                fill="url(#ovenGrad)"
              />
              <Rect x="5" y="8" width="14" height="8" rx="1" fill="#FFB74D" />
              <Circle cx="19" cy="6" r="1" fill="#FF5722" />
              <Circle cx="19" cy="10" r="1" fill="#2196F3" />
            </G>
          </Svg>
        );

      case "stove":
      case "stovetop":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="stoveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#BDBDBD" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Rect
                x="2"
                y="8"
                width="20"
                height="10"
                rx="2"
                fill="url(#stoveGrad)"
              />
              <Circle cx="7" cy="13" r="2.5" fill="#FF5722" />
              <Circle cx="17" cy="13" r="2.5" fill="#FF5722" />
              <Circle cx="7" cy="13" r="1" fill="#FF8A65" />
              <Circle cx="17" cy="13" r="1" fill="#FF8A65" />
              <Circle cx="7" cy="5" r="1" fill="#424242" />
              <Circle cx="17" cy="5" r="1" fill="#424242" />
            </G>
          </Svg>
        );

      case "microwave":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="microwaveGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#BDBDBD" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Rect
                x="2"
                y="6"
                width="20"
                height="12"
                rx="2"
                fill="url(#microwaveGrad)"
              />
              <Rect x="4" y="8" width="12" height="8" rx="1" fill="#263238" />
              <Circle cx="19" cy="10" r="1" fill="#4CAF50" />
              <Circle cx="19" cy="14" r="1" fill="#FF5722" />
              <Rect x="4" y="18" width="16" height="1" fill="#9E9E9E" />
            </G>
          </Svg>
        );

      case "toaster oven":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="toasterGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#BDBDBD" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Rect
                x="3"
                y="8"
                width="18"
                height="10"
                rx="2"
                fill="url(#toasterGrad)"
              />
              <Rect x="5" y="10" width="12" height="6" rx="1" fill="#FFB74D" />
              <Circle cx="19" cy="12" r="1" fill="#2196F3" />
              <Circle cx="19" cy="15" r="1" fill="#FF5722" />
              <Rect x="3" y="18" width="18" height="1" fill="#9E9E9E" />
            </G>
          </Svg>
        );

      case "grill":
      case "outdoor grill":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="grillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#616161" />
                <Stop offset="100%" stopColor="#424242" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#212121" strokeWidth="1.5">
              <Rect
                x="4"
                y="10"
                width="16"
                height="6"
                rx="1"
                fill="url(#grillGrad)"
              />
              <Rect x="6" y="12" width="12" height="2" fill="#FF5722" />
              <Path d="M8 8 L8 10" stroke="#795548" strokeWidth="2" />
              <Path d="M12 8 L12 10" stroke="#795548" strokeWidth="2" />
              <Path d="M16 8 L16 10" stroke="#795548" strokeWidth="2" />
              <Circle cx="6" cy="18" r="2" fill="#616161" />
              <Circle cx="18" cy="18" r="2" fill="#616161" />
              <Rect x="6" y="4" width="12" height="2" rx="1" fill="#8D6E63" />
            </G>
          </Svg>
        );

      case "slow cooker":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="slowCookerGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#8D6E63" />
                <Stop offset="100%" stopColor="#5D4037" />
              </LinearGradient>
              <LinearGradient id="glassCover" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#E3F2FD" />
                <Stop offset="100%" stopColor="#BBDEFB" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              {/* Oval base */}
              <Ellipse
                cx="12"
                cy="14"
                rx="8"
                ry="6"
                fill="url(#slowCookerGrad)"
              />
              {/* Food inside */}
              <Ellipse cx="12" cy="15" rx="6" ry="4" fill="#FF8A65" />
              {/* Glass lid */}
              <Ellipse
                cx="12"
                cy="11"
                rx="7"
                ry="3"
                fill="url(#glassCover)"
                opacity="0.8"
              />
              {/* Handle on lid */}
              <Circle cx="12" cy="11" r="1" fill="#9E9E9E" />
              {/* Control knob */}
              <Circle cx="4" cy="14" r="1.5" fill="#424242" />
              <Circle cx="4" cy="14" r="0.5" fill="#4CAF50" />
            </G>
          </Svg>
        );

      case "blender":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="blenderGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#E0E0E0" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Path d="M8 6 L16 6 L14 16 L10 16 Z" fill="url(#blenderGrad)" />
              <Rect x="10" y="8" width="4" height="6" fill="#4FC3F7" />
              <Circle cx="12" cy="18" r="2" fill="#616161" />
              <Rect x="10" y="2" width="4" height="4" rx="1" fill="#E0E0E0" />
              <Circle cx="12" cy="11" r="1" fill="#2196F3" />
            </G>
          </Svg>
        );

      case "food processor":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="processorGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#E0E0E0" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              <Rect
                x="6"
                y="8"
                width="12"
                height="10"
                rx="2"
                fill="url(#processorGrad)"
              />
              <Circle cx="12" cy="13" r="3" fill="#4FC3F7" />
              <Circle cx="12" cy="13" r="1" fill="#2196F3" />
              <Rect x="10" y="4" width="4" height="4" rx="1" fill="#E0E0E0" />
              <Path d="M10 13 L14 13" stroke="#FFF" strokeWidth="1" />
              <Path d="M12 11 L12 15" stroke="#FFF" strokeWidth="1" />
            </G>
          </Svg>
        );

      case "pressure cooker":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="pressureGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#E8EAF6" />
                <Stop offset="100%" stopColor="#C5CAE9" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              {/* Main pot body */}
              <Rect
                x="5"
                y="10"
                width="14"
                height="8"
                rx="2"
                fill="url(#pressureGrad)"
              />
              {/* Pressure lid */}
              <Ellipse cx="12" cy="10" rx="7" ry="2" fill="#BDBDBD" />
              {/* Steam release valve */}
              <Rect x="11" y="6" width="2" height="4" rx="1" fill="#FF5722" />
              {/* Pressure gauge */}
              <Circle cx="16" cy="8" r="1.5" fill="#FFC107" />
              <Circle cx="16" cy="8" r="0.5" fill="#FF5722" />
              {/* Handles */}
              <Path
                d="M4 12 Q2 12 2 14 Q2 16 4 16"
                stroke="#424242"
                fill="none"
              />
              <Path
                d="M20 12 Q22 12 22 14 Q22 16 20 16"
                stroke="#424242"
                fill="none"
              />
              {/* Steam coming out */}
              <Circle cx="12" cy="4" r="1" fill="#E3F2FD" opacity="0.6" />
              <Circle cx="11" cy="2" r="0.5" fill="#E3F2FD" opacity="0.4" />
              <Circle cx="13" cy="2" r="0.5" fill="#E3F2FD" opacity="0.4" />
            </G>
          </Svg>
        );

      case "air fryer":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="airFryerGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#263238" />
                <Stop offset="100%" stopColor="#37474F" />
              </LinearGradient>
              <LinearGradient id="basketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFE082" />
                <Stop offset="100%" stopColor="#FFB74D" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#212121" strokeWidth="1.5">
              {/* Main body */}
              <Rect
                x="6"
                y="8"
                width="12"
                height="12"
                rx="3"
                fill="url(#airFryerGrad)"
              />
              {/* Display panel */}
              <Rect x="8" y="10" width="8" height="3" rx="1" fill="#1A237E" />
              {/* Control buttons */}
              <Circle cx="10" cy="15" r="1" fill="#4CAF50" />
              <Circle cx="14" cy="15" r="1" fill="#FF5722" />
              {/* Air vents */}
              <Path d="M7 18 L11 18" stroke="#9E9E9E" />
              <Path d="M13 18 L17 18" stroke="#9E9E9E" />
              <Path d="M7 19 L11 19" stroke="#9E9E9E" />
              <Path d="M13 19 L17 19" stroke="#9E9E9E" />
              {/* Basket handle */}
              <Rect x="11" y="6" width="2" height="2" rx="1" fill="#616161" />
              {/* Food basket */}
              <Rect
                x="8"
                y="16"
                width="8"
                height="2"
                rx="1"
                fill="url(#basketGrad)"
                opacity="0.7"
              />
            </G>
          </Svg>
        );

      case "bbq smoker":
      case "smoker":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="smokerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#424242" />
                <Stop offset="100%" stopColor="#212121" />
              </LinearGradient>
              <LinearGradient
                id="fireboxGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#8D6E63" />
                <Stop offset="100%" stopColor="#5D4037" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#212121" strokeWidth="1.2">
              {/* Main smoking chamber - larger and more proportional */}
              <Ellipse cx="10" cy="15" rx="7" ry="4" fill="url(#smokerGrad)" />
              {/* Firebox - better proportioned */}
              <Rect
                x="17"
                y="13"
                width="5"
                height="4"
                rx="1"
                fill="url(#fireboxGrad)"
              />
              {/* Chimney - taller and more realistic */}
              <Rect x="2" y="6" width="2" height="7" rx="0.5" fill="#424242" />
              {/* Temperature gauge */}
              <Circle cx="8" cy="14" r="1" fill="#FFC107" />
              <Circle cx="8" cy="14" r="0.5" fill="#FF5722" />
              {/* Door handle */}
              <Circle cx="15" cy="15" r="0.8" fill="#9E9E9E" />
              {/* Legs - more realistic spacing */}
              <Path d="M5 19 L5 22" stroke="#424242" strokeWidth="2" />
              <Path d="M10 19 L10 22" stroke="#424242" strokeWidth="2" />
              <Path d="M15 19 L15 22" stroke="#424242" strokeWidth="2" />
              <Path d="M20 17 L20 22" stroke="#424242" strokeWidth="2" />
              {/* Improved smoke clouds */}
              <Circle cx="3" cy="4" r="1.2" fill="#E0E0E0" opacity="0.8" />
              <Circle cx="1.5" cy="2" r="1" fill="#E0E0E0" opacity="0.6" />
              <Circle cx="4.5" cy="1.5" r="1.5" fill="#E0E0E0" opacity="0.5" />
              <Circle cx="2" cy="5.5" r="0.8" fill="#E0E0E0" opacity="0.7" />
              <Circle cx="5" cy="3" r="1" fill="#E0E0E0" opacity="0.6" />
            </G>
          </Svg>
        );

      case "stand mixer":
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient
                id="mixerBodyGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F5F5F5" />
                <Stop offset="100%" stopColor="#E0E0E0" />
              </LinearGradient>
              <LinearGradient
                id="mixerBowlGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#E8EAF6" />
                <Stop offset="100%" stopColor="#C5CAE9" />
              </LinearGradient>
              <LinearGradient
                id="mixerArmGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#ECEFF1" />
                <Stop offset="100%" stopColor="#CFD8DC" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#424242" strokeWidth="1.5">
              {/* Main body/motor */}
              <Path
                d="M8 4 L16 4 Q18 4 18 6 L18 10 Q18 12 16 12 L8 12 Q6 12 6 10 L6 6 Q6 4 8 4 Z"
                fill="url(#mixerBodyGrad)"
              />
              {/* Mixing arm */}
              <Path
                d="M12 12 Q14 14 14 16 Q14 18 12 18"
                fill="none"
                stroke="url(#mixerArmGrad)"
                strokeWidth="3"
              />
              {/* Mixing bowl */}
              <Path
                d="M8 16 Q8 22 12 22 Q16 22 16 16 L16 18 Q16 20 12 20 Q8 20 8 18 Z"
                fill="url(#mixerBowlGrad)"
              />
              {/* Control knobs */}
              <Circle cx="10" cy="8" r="1" fill="#4CAF50" />
              <Circle cx="14" cy="8" r="1" fill="#FF5722" />
              {/* Speed dial */}
              <Circle cx="12" cy="6" r="1.5" fill="#FFC107" />
              <Circle cx="12" cy="6" r="0.5" fill="#FF8F00" />
              {/* Beater attachment */}
              <Path d="M12 18 L11 19 L13 19 Z" fill="#9E9E9E" />
              <Path d="M11.5 19 L11.5 20.5" stroke="#9E9E9E" strokeWidth="1" />
              <Path d="M12.5 19 L12.5 20.5" stroke="#9E9E9E" strokeWidth="1" />
              {/* Base */}
              <Ellipse cx="12" cy="22" rx="6" ry="1" fill="#BDBDBD" />
            </G>
          </Svg>
        );

      default:
        return null;
    }
  };

  const renderEmojiIcon = () => {
    switch (appliance.toLowerCase()) {
      case "rice cooker":
        return "🍚";
      default:
        return "🔧"; // Generic appliance icon
    }
  };

  const svgIcon = renderSVGIcon();

  if (svgIcon) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        {svgIcon}
      </View>
    );
  }

  return (
    <Text style={[{ fontSize: size * 0.8 }, styles.emoji]}>
      {renderEmojiIcon()}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    textAlign: "center",
  },
});

export default KitchenApplianceIcon;
