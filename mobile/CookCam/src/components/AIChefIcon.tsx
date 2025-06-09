import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Rect, Path, Ellipse, Line, Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';

// Hot reload trigger - Professional robot chef mascot icon

interface AIChefIconProps {
  size?: number;
  variant?: 'default' | 'analyzing' | 'cooking';
}

const AIChefIcon: React.FC<AIChefIconProps> = ({ 
  size = 48, 
  variant = 'default' 
}) => {
  const renderAIChefIcon = () => {
    switch (variant) {
      case 'analyzing':
        return (
          <Svg height={size} viewBox="0 0 80 80" width={size}>
            <Defs>
              <LinearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#6B73FF" />
                <Stop offset="100%" stopColor="#4A5568" />
              </LinearGradient>
              <LinearGradient id="chefHatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="100%" stopColor="#F7FAFC" />
              </LinearGradient>
            </Defs>
            
            {/* Chef Hat */}
            <Ellipse cx="40" cy="22" rx="22" ry="10" fill="url(#chefHatGrad)" stroke="#E2E8F0" strokeWidth="2"/>
            <Rect x="18" y="22" width="44" height="15" fill="url(#chefHatGrad)" stroke="#E2E8F0" strokeWidth="2"/>
            <Ellipse cx="40" cy="37" rx="22" ry="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2"/>
            
            {/* Chef Hat Details */}
            <Circle cx="35" cy="18" r="2" fill="#E2E8F0"/>
            <Circle cx="45" cy="16" r="2" fill="#E2E8F0"/>
            <Circle cx="40" cy="12" r="2.5" fill="#E2E8F0"/>
            
            {/* Robot Head/Body - Rounded friendly design */}
            <Ellipse cx="40" cy="52" rx="18" ry="20" fill="url(#robotBodyGrad)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Friendly Analyzing Eyes - Cyan glow */}
            <Circle cx="34" cy="48" r="4" fill="#00E5FF" opacity="0.9"/>
            <Circle cx="46" cy="48" r="4" fill="#00E5FF" opacity="0.9"/>
            <Circle cx="34" cy="48" r="2" fill="#FFFFFF"/>
            <Circle cx="46" cy="48" r="2" fill="#FFFFFF"/>
            
            {/* Processing indicator with pulse effect */}
            <Rect x="32" y="56" width="16" height="3" rx="1.5" fill="#00E5FF" opacity="0.8"/>
            <Rect x="34" y="56" width="12" height="3" rx="1.5" fill="#40E0D0"/>
            
            {/* Analysis data streams */}
            <Circle cx="15" cy="30" r="2" fill="#00E5FF" opacity="0.6"/>
            <Circle cx="65" cy="35" r="2" fill="#40E0D0" opacity="0.6"/>
            <Circle cx="10" cy="45" r="1.5" fill="#6B73FF" opacity="0.7"/>
            <Circle cx="70" cy="50" r="1.5" fill="#00E5FF" opacity="0.7"/>
            
            {/* Floating analysis particles */}
            <Path d="M8 35 Q12 33 16 35 Q20 37 24 35" stroke="#00E5FF" strokeWidth="2" fill="none" opacity="0.5"/>
            <Path d="M56 35 Q60 37 64 35 Q68 33 72 35" stroke="#40E0D0" strokeWidth="2" fill="none" opacity="0.5"/>
            
            {/* Robot arms holding utensils */}
            <Circle cx="20" cy="58" r="6" fill="url(#robotBodyGrad)" stroke="#2D3748" strokeWidth="2"/>
            <Circle cx="60" cy="58" r="6" fill="url(#robotBodyGrad)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Spatula */}
            <Line x1="20" y1="52" x2="15" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Ellipse cx="13" cy="42" rx="3" ry="6" fill="#FFB74D"/>
            
            {/* Spoon */}
            <Line x1="60" y1="52" x2="65" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Circle cx="67" cy="42" r="3" fill="#FFB74D"/>
          </Svg>
        );
        
      case 'cooking':
        return (
          <Svg height={size} viewBox="0 0 80 80" width={size}>
            <Defs>
              <LinearGradient id="robotBodyGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#6B73FF" />
                <Stop offset="100%" stopColor="#4A5568" />
              </LinearGradient>
              <LinearGradient id="chefHatGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="100%" stopColor="#F7FAFC" />
              </LinearGradient>
            </Defs>
            
            {/* Chef Hat with steam */}
            <Ellipse cx="40" cy="22" rx="22" ry="10" fill="url(#chefHatGrad2)" stroke="#E2E8F0" strokeWidth="2"/>
            <Rect x="18" y="22" width="44" height="15" fill="url(#chefHatGrad2)" stroke="#E2E8F0" strokeWidth="2"/>
            <Ellipse cx="40" cy="37" rx="22" ry="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2"/>
            
            {/* Steam from cooking */}
            <Path d="M35 8C35 6 35 6 35 8M40 4C40 2 40 2 40 4M45 8C45 6 45 6 45 8" 
                  stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            
            {/* Robot Head/Body */}
            <Ellipse cx="40" cy="52" rx="18" ry="20" fill="url(#robotBodyGrad2)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Happy Cooking Eyes - Green success */}
            <Circle cx="34" cy="48" r="4" fill="#4ADE80"/>
            <Circle cx="46" cy="48" r="4" fill="#4ADE80"/>
            <Circle cx="34" cy="48" r="2" fill="#FFFFFF"/>
            <Circle cx="46" cy="48" r="2" fill="#FFFFFF"/>
            
            {/* Happy smile */}
            <Path d="M32 56 Q40 60 48 56" stroke="#4ADE80" strokeWidth="3" fill="none" strokeLinecap="round"/>
            
            {/* Robot arms */}
            <Circle cx="20" cy="58" r="6" fill="url(#robotBodyGrad2)" stroke="#2D3748" strokeWidth="2"/>
            <Circle cx="60" cy="58" r="6" fill="url(#robotBodyGrad2)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Cooking utensils */}
            <Line x1="20" y1="52" x2="15" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Ellipse cx="13" cy="42" rx="3" ry="6" fill="#FFB74D"/>
            
            <Line x1="60" y1="52" x2="65" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Circle cx="67" cy="42" r="3" fill="#FFB74D"/>
            
            {/* Success sparkles */}
            <Circle cx="25" cy="35" r="1.5" fill="#FFD700" opacity="0.8"/>
            <Circle cx="55" cy="40" r="1.5" fill="#FFD700" opacity="0.8"/>
            <Circle cx="15" cy="50" r="1" fill="#4ADE80" opacity="0.7"/>
            <Circle cx="65" cy="45" r="1" fill="#4ADE80" opacity="0.7"/>
          </Svg>
        );
        
      default:
        return (
          <Svg height={size} viewBox="0 0 80 80" width={size}>
            <Defs>
              <LinearGradient id="robotBodyGradDefault" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#6B73FF" />
                <Stop offset="100%" stopColor="#4A5568" />
              </LinearGradient>
              <LinearGradient id="chefHatGradDefault" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" />
                <Stop offset="100%" stopColor="#F7FAFC" />
              </LinearGradient>
            </Defs>
            
            {/* Chef Hat */}
            <Ellipse cx="40" cy="22" rx="22" ry="10" fill="url(#chefHatGradDefault)" stroke="#E2E8F0" strokeWidth="2"/>
            <Rect x="18" y="22" width="44" height="15" fill="url(#chefHatGradDefault)" stroke="#E2E8F0" strokeWidth="2"/>
            <Ellipse cx="40" cy="37" rx="22" ry="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2"/>
            
            {/* Chef Hat polka dots */}
            <Circle cx="35" cy="18" r="2" fill="#E2E8F0"/>
            <Circle cx="45" cy="16" r="2" fill="#E2E8F0"/>
            <Circle cx="40" cy="12" r="2.5" fill="#E2E8F0"/>
            
            {/* Robot Head/Body - Rounded mascot style */}
            <Ellipse cx="40" cy="52" rx="18" ry="20" fill="url(#robotBodyGradDefault)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Friendly Cyan Eyes */}
            <Circle cx="34" cy="48" r="4" fill="#40E0D0"/>
            <Circle cx="46" cy="48" r="4" fill="#40E0D0"/>
            <Circle cx="34" cy="48" r="2" fill="#FFFFFF"/>
            <Circle cx="46" cy="48" r="2" fill="#FFFFFF"/>
            
            {/* Friendly smile */}
            <Path d="M32 56 Q40 58 48 56" stroke="#40E0D0" strokeWidth="2" fill="none" strokeLinecap="round"/>
            
            {/* Robot chest panel */}
            <Rect x="35" y="60" width="10" height="6" rx="2" fill="#40E0D0" opacity="0.3"/>
            <Circle cx="40" cy="63" r="2" fill="#40E0D0"/>
            
            {/* Robot arms */}
            <Circle cx="20" cy="58" r="6" fill="url(#robotBodyGradDefault)" stroke="#2D3748" strokeWidth="2"/>
            <Circle cx="60" cy="58" r="6" fill="url(#robotBodyGradDefault)" stroke="#2D3748" strokeWidth="2"/>
            
            {/* Cooking utensils like in the mascot */}
            <Line x1="20" y1="52" x2="15" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Ellipse cx="13" cy="42" rx="3" ry="6" fill="#FFB74D"/>
            
            <Line x1="60" y1="52" x2="65" y2="45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round"/>
            <Circle cx="67" cy="42" r="3" fill="#FFB74D"/>
            
            {/* AI indicator antenna */}
            <Line x1="40" y1="37" x2="40" y2="32" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round"/>
            <Circle cx="40" cy="30" r="2" fill="#FFB74D"/>
            <Circle cx="40" cy="30" r="1" fill="#FF9800"/>
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: 'rgba(255, 0, 0, 0.2)', borderWidth: 2, borderColor: 'blue' }]}>
      <Text style={{ fontSize: 16, color: 'green', fontWeight: 'bold' }}>🤖</Text>
      {renderAIChefIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIChefIcon; 