import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path, Ellipse, Line, Polygon, Text as SvgText } from 'react-native-svg';

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
          <Svg height={size} viewBox="0 0 64 64" width={size}>
            {/* Chef Hat - Main part */}
            <Ellipse cx="32" cy="20" rx="18" ry="8" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Rect x="14" y="20" width="36" height="12" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Ellipse cx="32" cy="32" rx="18" ry="4" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* AI Robot Head */}
            <Rect x="20" y="32" width="24" height="20" rx="4" fill="#4A90E2" stroke="#2D5AA0" strokeWidth="2"/>
            
            {/* Digital Circuit Patterns on Head */}
            <Line x1="22" y1="36" x2="26" y2="36" stroke="#00D4AA" strokeWidth="1.5"/>
            <Line x1="26" y1="36" x2="26" y2="40" stroke="#00D4AA" strokeWidth="1.5"/>
            <Line x1="38" y1="36" x2="42" y2="36" stroke="#00D4AA" strokeWidth="1.5"/>
            <Line x1="38" y1="36" x2="38" y2="40" stroke="#00D4AA" strokeWidth="1.5"/>
            
            {/* Digital Eyes with analyzing effect */}
            <Rect x="25" y="40" width="5" height="4" rx="1" fill="#00D4AA"/>
            <Rect x="34" y="40" width="5" height="4" rx="1" fill="#00D4AA"/>
            <Circle cx="27" cy="42" r="1" fill="#FFFFFF" opacity="0.8"/>
            <Circle cx="36" cy="42" r="1" fill="#FFFFFF" opacity="0.8"/>
            
            {/* Processing indicator */}
            <Rect x="28" y="46" width="8" height="2" rx="1" fill="#FFB800"/>
            <Rect x="30" y="46" width="4" height="2" rx="1" fill="#FF9800"/>
            
            {/* Chef's Apron/Robe */}
            <Path d="M18 52 L20 58 L44 58 L46 52 L42 52 L42 50 L22 50 L22 52 Z" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* Apron Ties */}
            <Line x1="22" y1="50" x2="18" y2="48" stroke="#4CAF50" strokeWidth="2"/>
            <Line x1="42" y1="50" x2="46" y2="48" stroke="#4CAF50" strokeWidth="2"/>
            
            {/* AI Analysis Particles */}
            <Circle cx="12" cy="25" r="1.5" fill="#00D4AA" opacity="0.6"/>
            <Circle cx="52" cy="28" r="1.5" fill="#FFB800" opacity="0.6"/>
            <Circle cx="8" cy="35" r="1" fill="#4A90E2" opacity="0.7"/>
            <Circle cx="56" cy="38" r="1" fill="#FF9800" opacity="0.7"/>
            
            {/* Data Stream Lines */}
            <Path d="M4 30 Q8 32 12 30 Q16 28 20 30" stroke="#00D4AA" strokeWidth="1.5" fill="none" opacity="0.5"/>
            <Path d="M44 30 Q48 28 52 30 Q56 32 60 30" stroke="#FFB800" strokeWidth="1.5" fill="none" opacity="0.5"/>
          </Svg>
        );
        
      case 'cooking':
        return (
          <Svg height={size} viewBox="0 0 64 64" width={size}>
            {/* Chef Hat with steam */}
            <Ellipse cx="32" cy="20" rx="18" ry="8" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Rect x="14" y="20" width="36" height="12" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Ellipse cx="32" cy="32" rx="18" ry="4" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* Steam from cooking */}
            <Path d="M28 12C28 10 28 10 28 12M32 8C32 6 32 6 32 8M36 12C36 10 36 10 36 12" 
                  stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
            
            {/* AI Robot Head */}
            <Rect x="20" y="32" width="24" height="20" rx="4" fill="#4A90E2" stroke="#2D5AA0" strokeWidth="2"/>
            
            {/* Digital Eyes - content/happy */}
            <Rect x="25" y="40" width="5" height="4" rx="1" fill="#4CAF50"/>
            <Rect x="34" y="40" width="5" height="4" rx="1" fill="#4CAF50"/>
            <Circle cx="27" cy="42" r="1" fill="#FFFFFF"/>
            <Circle cx="36" cy="42" r="1" fill="#FFFFFF"/>
            
            {/* Happy digital mouth */}
            <Path d="M28 46 Q32 48 36 46" stroke="#4CAF50" strokeWidth="2" fill="none"/>
            
            {/* Chef's Apron */}
            <Path d="M18 52 L20 58 L44 58 L46 52 L42 52 L42 50 L22 50 L22 52 Z" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* Cooking Utensils in hands */}
            <Line x1="16" y1="54" x2="12" y2="52" stroke="#8D6E63" strokeWidth="3"/>
            <Circle cx="12" cy="50" r="2" fill="#FFB800"/>
            
            <Line x1="48" y1="54" x2="52" y2="52" stroke="#8D6E63" strokeWidth="3"/>
            <Path d="M52 48 L54 52 L50 52 Z" fill="#E0E0E0"/>
          </Svg>
        );
        
      default:
        return (
          <Svg height={size} viewBox="0 0 64 64" width={size}>
            {/* Chef Hat */}
            <Ellipse cx="32" cy="20" rx="18" ry="8" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Rect x="14" y="20" width="36" height="12" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            <Ellipse cx="32" cy="32" rx="18" ry="4" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* Chef Hat Details */}
            <Circle cx="28" cy="24" r="1.5" fill="#E0E0E0"/>
            <Circle cx="36" cy="26" r="1.5" fill="#E0E0E0"/>
            
            {/* AI Robot Head */}
            <Rect x="20" y="32" width="24" height="20" rx="4" fill="#4A90E2" stroke="#2D5AA0" strokeWidth="2"/>
            
            {/* Digital Circuit Patterns */}
            <Line x1="22" y1="36" x2="26" y2="36" stroke="#00D4AA" strokeWidth="1"/>
            <Line x1="26" y1="36" x2="26" y2="38" stroke="#00D4AA" strokeWidth="1"/>
            <Line x1="38" y1="36" x2="42" y2="36" stroke="#00D4AA" strokeWidth="1"/>
            <Line x1="38" y1="36" x2="38" y2="38" stroke="#00D4AA" strokeWidth="1"/>
            
            {/* Digital Eyes */}
            <Rect x="25" y="40" width="5" height="4" rx="1" fill="#FFB800"/>
            <Rect x="34" y="40" width="5" height="4" rx="1" fill="#FFB800"/>
            <Circle cx="27" cy="42" r="1" fill="#2D5AA0"/>
            <Circle cx="36" cy="42" r="1" fill="#2D5AA0"/>
            
            {/* Digital mouth */}
            <Rect x="29" y="46" width="6" height="2" rx="1" fill="#00D4AA"/>
            
            {/* Chef's Apron/Body */}
            <Path d="M18 52 L20 58 L44 58 L46 52 L42 52 L42 50 L22 50 L22 52 Z" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="2"/>
            
            {/* Apron Bow */}
            <Polygon points="30,50 34,50 32,52" fill="#4CAF50"/>
            <Circle cx="32" cy="52" r="2" fill="#4CAF50"/>
            
            {/* AI Antenna */}
            <Line x1="32" y1="32" x2="32" y2="28" stroke="#00D4AA" strokeWidth="2"/>
            <Circle cx="32" cy="28" r="2" fill="#FFB800"/>
            <Circle cx="32" cy="28" r="1" fill="#FF9800"/>
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
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