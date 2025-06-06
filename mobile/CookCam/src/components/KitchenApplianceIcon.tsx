import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Rect } from 'react-native-svg';

interface KitchenApplianceIconProps {
  appliance: string;
  size?: number;
}

const KitchenApplianceIcon: React.FC<KitchenApplianceIconProps> = ({ 
  appliance, 
  size = 32 
}) => {
  const renderSVGIcon = () => {
    switch (appliance.toLowerCase()) {
      case 'oven':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="3" y="4" width="18" height="16" rx="2" fill="#E0E0E0"/>
              <Rect x="5" y="8" width="14" height="8" rx="1" fill="#FFE082"/>
              <Circle cx="19" cy="6" r="1" fill="#666"/>
              <Circle cx="19" cy="10" r="1" fill="#666"/>
            </G>
          </Svg>
        );
      
      case 'stove':
      case 'stovetop':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="2" y="8" width="20" height="10" rx="2" fill="#E0E0E0"/>
              <Circle cx="7" cy="13" r="2" fill="#FF5722"/>
              <Circle cx="17" cy="13" r="2" fill="#FF5722"/>
              <Circle cx="7" cy="5" r="1" fill="#666"/>
              <Circle cx="17" cy="5" r="1" fill="#666"/>
            </G>
          </Svg>
        );

      case 'microwave':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="2" y="6" width="20" height="12" rx="2" fill="#E0E0E0"/>
              <Rect x="4" y="8" width="12" height="8" rx="1" fill="#263238"/>
              <Circle cx="19" cy="10" r="1" fill="#666"/>
              <Circle cx="19" cy="14" r="1" fill="#666"/>
            </G>
          </Svg>
        );

      case 'toaster oven':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="3" y="8" width="18" height="10" rx="2" fill="#E0E0E0"/>
              <Rect x="5" y="10" width="12" height="6" rx="1" fill="#FFE082"/>
              <Circle cx="19" cy="12" r="1" fill="#666"/>
              <Circle cx="19" cy="15" r="1" fill="#666"/>
            </G>
          </Svg>
        );

      case 'grill':
      case 'outdoor grill':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="4" y="10" width="16" height="6" rx="1" fill="#424242"/>
              <Rect x="6" y="12" width="12" height="2" fill="#FF5722"/>
              <Path d="M8 8 L8 10" stroke="#666"/>
              <Path d="M12 8 L12 10" stroke="#666"/>
              <Path d="M16 8 L16 10" stroke="#666"/>
              <Circle cx="6" cy="18" r="2" fill="#666"/>
              <Circle cx="18" cy="18" r="2" fill="#666"/>
            </G>
          </Svg>
        );

      case 'slow cooker':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="6" y="8" width="12" height="10" rx="2" fill="#E0E0E0"/>
              <Rect x="8" y="12" width="8" height="4" fill="#FF8A65"/>
              <Circle cx="4" cy="12" r="1" fill="#666"/>
              <Rect x="6" y="6" width="12" height="2" rx="1" fill="#BDBDBD"/>
            </G>
          </Svg>
        );

      case 'blender':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Path d="M8 6 L16 6 L14 16 L10 16 Z" fill="#E0E0E0"/>
              <Rect x="10" y="8" width="4" height="6" fill="#4FC3F7"/>
              <Circle cx="12" cy="18" r="2" fill="#666"/>
              <Rect x="10" y="2" width="4" height="4" rx="1" fill="#BDBDBD"/>
            </G>
          </Svg>
        );

      case 'food processor':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <G fill="none" stroke="#666" strokeWidth="1.5">
              <Rect x="6" y="8" width="12" height="10" rx="2" fill="#E0E0E0"/>
              <Circle cx="12" cy="13" r="3" fill="#4FC3F7"/>
              <Circle cx="12" cy="13" r="1" fill="#666"/>
              <Rect x="10" y="4" width="4" height="4" rx="1" fill="#BDBDBD"/>
            </G>
          </Svg>
        );

      default:
        return null;
    }
  };

  const renderEmojiIcon = () => {
    switch (appliance.toLowerCase()) {
      case 'air fryer':
        return '🍟';
      case 'bbq smoker':
      case 'smoker':
        return '☁️'; // Cloud of smoke as requested
      case 'rice cooker':
        return '🍚';
      case 'pressure cooker':
        return '⚡';
      default:
        return '🔧'; // Generic appliance icon
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});

export default KitchenApplianceIcon; 