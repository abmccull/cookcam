import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Rect, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';

interface ServingSizeIconProps {
  type: string;
  size?: number;
}

const ServingSizeIcon: React.FC<ServingSizeIconProps> = ({ 
  type, 
  size = 32 
}) => {
  const renderSVGIcon = () => {
    switch (type.toLowerCase()) {
      case 'just me':
      case 'myself':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="personGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#64B5F6" />
                <Stop offset="100%" stopColor="#1976D2" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#1565C0" strokeWidth="1.5">
              {/* Head */}
              <Circle cx="12" cy="8" r="3" fill="url(#personGrad)"/>
              {/* Body */}
              <Path d="M7 18 Q7 14 12 14 Q17 14 17 18 L17 20 L7 20 Z" fill="url(#personGrad)"/>
              {/* Arms */}
              <Path d="M8 16 L6 18" stroke="#1565C0" strokeWidth="2"/>
              <Path d="M16 16 L18 18" stroke="#1565C0" strokeWidth="2"/>
            </G>
          </Svg>
        );
      
      case 'two people':
      case 'couple':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="person1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#64B5F6" />
                <Stop offset="100%" stopColor="#1976D2" />
              </LinearGradient>
              <LinearGradient id="person2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F48FB1" />
                <Stop offset="100%" stopColor="#C2185B" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#1565C0" strokeWidth="1">
              {/* Person 1 */}
              <Circle cx="9" cy="7" r="2.5" fill="url(#person1Grad)"/>
              <Path d="M5 17 Q5 13 9 13 Q13 13 13 17 L13 19 L5 19 Z" fill="url(#person1Grad)"/>
              
              {/* Person 2 */}
              <Circle cx="15" cy="7" r="2.5" fill="url(#person2Grad)" stroke="#AD1457"/>
              <Path d="M11 17 Q11 13 15 13 Q19 13 19 17 L19 19 L11 19 Z" fill="url(#person2Grad)"/>
            </G>
          </Svg>
        );

      case 'family':
      case 'family (4)':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="dadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#64B5F6" />
                <Stop offset="100%" stopColor="#1976D2" />
              </LinearGradient>
              <LinearGradient id="momGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F48FB1" />
                <Stop offset="100%" stopColor="#C2185B" />
              </LinearGradient>
              <LinearGradient id="childGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#81C784" />
                <Stop offset="100%" stopColor="#388E3C" />
              </LinearGradient>
            </Defs>
            <G fill="none" strokeWidth="1">
              {/* Dad */}
              <Circle cx="6" cy="6" r="2" fill="url(#dadGrad)" stroke="#1565C0"/>
              <Path d="M3 15 Q3 12 6 12 Q9 12 9 15 L9 16 L3 16 Z" fill="url(#dadGrad)"/>
              
              {/* Mom */}
              <Circle cx="12" cy="6" r="2" fill="url(#momGrad)" stroke="#AD1457"/>
              <Path d="M9 15 Q9 12 12 12 Q15 12 15 15 L15 16 L9 16 Z" fill="url(#momGrad)"/>
              
              {/* Child 1 */}
              <Circle cx="18" cy="8" r="1.5" fill="url(#childGrad)" stroke="#2E7D32"/>
              <Path d="M16 16 Q16 14 18 14 Q20 14 20 16 L20 17 L16 17 Z" fill="url(#childGrad)"/>
              
              {/* Child 2 */}
              <Circle cx="21" cy="10" r="1.5" fill="url(#childGrad)" stroke="#2E7D32"/>
              <Path d="M19 18 Q19 16 21 16 Q23 16 23 18 L23 19 L19 19 Z" fill="url(#childGrad)"/>
            </G>
          </Svg>
        );

      case 'large group':
      case 'large group (6)':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="groupGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#64B5F6" />
                <Stop offset="100%" stopColor="#1976D2" />
              </LinearGradient>
              <LinearGradient id="groupGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#F48FB1" />
                <Stop offset="100%" stopColor="#C2185B" />
              </LinearGradient>
              <LinearGradient id="groupGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#81C784" />
                <Stop offset="100%" stopColor="#388E3C" />
              </LinearGradient>
              <LinearGradient id="groupGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFB74D" />
                <Stop offset="100%" stopColor="#F57C00" />
              </LinearGradient>
            </Defs>
            <G fill="none" strokeWidth="0.8">
              {/* Back row */}
              <Circle cx="4" cy="5" r="1.5" fill="url(#groupGrad1)" stroke="#1565C0"/>
              <Circle cx="8" cy="5" r="1.5" fill="url(#groupGrad2)" stroke="#AD1457"/>
              <Circle cx="12" cy="5" r="1.5" fill="url(#groupGrad3)" stroke="#2E7D32"/>
              
              {/* Front row */}
              <Circle cx="6" cy="9" r="1.5" fill="url(#groupGrad4)" stroke="#E65100"/>
              <Circle cx="10" cy="9" r="1.5" fill="url(#groupGrad1)" stroke="#1565C0"/>
              <Circle cx="14" cy="9" r="1.5" fill="url(#groupGrad2)" stroke="#AD1457"/>
              
              {/* Bodies (simplified) */}
              <Rect x="3" y="12" width="12" height="6" rx="2" fill="#E0E0E0" opacity="0.7"/>
              <Path d="M4 16 L6 16 L8 16 L10 16 L12 16 L14 16" stroke="#BDBDBD" strokeWidth="2"/>
            </G>
          </Svg>
        );

      case 'custom':
      case 'custom amount':
        return (
          <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Defs>
              <LinearGradient id="pencilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFD54F" />
                <Stop offset="100%" stopColor="#FF8F00" />
              </LinearGradient>
            </Defs>
            <G fill="none" stroke="#E65100" strokeWidth="1.5">
              {/* Pencil body */}
              <Rect x="8" y="3" width="3" height="14" rx="1" fill="url(#pencilGrad)"/>
              {/* Pencil tip */}
              <Path d="M8 17 L9.5 20 L11 17 Z" fill="#8D6E63"/>
              {/* Metal band */}
              <Rect x="8" y="15" width="3" height="2" fill="#9E9E9E"/>
              {/* Eraser */}
              <Rect x="8" y="3" width="3" height="2" rx="1" fill="#FF5722"/>
              {/* Writing line */}
              <Path d="M14 12 L18 8" stroke="#666" strokeWidth="2"/>
              <Path d="M16 14 L20 10" stroke="#666" strokeWidth="1"/>
            </G>
          </Svg>
        );

      default:
        return null;
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

  // Fallback to emoji if no SVG
  return (
    <Text style={[{ fontSize: size * 0.8 }, styles.emoji]}>
      📊
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

export default ServingSizeIcon; 