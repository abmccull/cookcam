import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle, Rect, Ellipse, Text as SvgText, Line } from 'react-native-svg';

interface ServingSizeIconProps {
  type: string;
  size?: number;
}

const ServingSizeIcon: React.FC<ServingSizeIconProps> = ({ 
  type, 
  size = 32 
}) => {
  const renderSVGIcon = () => {
    const viewBoxSize = 48;
    const scale = size / viewBoxSize;

    switch (type.toLowerCase()) {
      case 'just me':
      case 'myself':
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Single plate with portion */}
            <Circle cx="24" cy="26" r="14" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Circle cx="24" cy="26" r="8" fill="#4CAF50" opacity="0.2"/>
            
            {/* Fork and knife */}
            <Path d="M12 22V30" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M11 18V22M13 18V22" stroke="#4CAF50" strokeWidth="1" strokeLinecap="round"/>
            
            <Path d="M36 22V30" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M35 18L37 24L35 24Z" fill="#4CAF50"/>
            
            {/* Steam lines for hot food */}
            <Path d="M22 14C22 12 22 12 22 14M24 12C24 10 24 10 24 12M26 14C26 12 26 12 26 14" 
                  stroke="#FF9800" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
          </Svg>
        );
      
      case 'two people':
      case 'couple':
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Two plates side by side */}
            <Circle cx="18" cy="26" r="11" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Circle cx="18" cy="26" r="6" fill="#4CAF50" opacity="0.3"/>
            
            <Circle cx="30" cy="26" r="11" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Circle cx="30" cy="26" r="6" fill="#4CAF50" opacity="0.3"/>
            
            {/* Shared utensils in center */}
            <Path d="M24 18V22" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M23 14V18M25 14V18" stroke="#4CAF50" strokeWidth="1" strokeLinecap="round"/>
            
            <Path d="M24 32V36" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round"/>
            <Path d="M23 38L25 32L23 32Z" fill="#4CAF50"/>
            
            {/* Steam lines */}
            <Path d="M16 12C16 10 16 10 16 12M20 10C20 8 20 8 20 10" 
                  stroke="#FF9800" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            <Path d="M28 12C28 10 28 10 28 12M32 10C32 8 32 8 32 10" 
                  stroke="#FF9800" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
          </Svg>
        );

      case 'family':
      case 'family (4)':
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Large family serving dish */}
            <Ellipse cx="24" cy="26" rx="16" ry="12" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Ellipse cx="24" cy="26" rx="12" ry="8" fill="#4CAF50" opacity="0.2"/>
            
            {/* Food portions arranged in dish */}
            <Circle cx="18" cy="22" r="2.5" fill="#4CAF50" opacity="0.6"/>
            <Circle cx="30" cy="22" r="2.5" fill="#4CAF50" opacity="0.6"/>
            <Circle cx="18" cy="30" r="2.5" fill="#4CAF50" opacity="0.6"/>
            <Circle cx="30" cy="30" r="2.5" fill="#4CAF50" opacity="0.6"/>
            
            {/* Serving spoons on sides */}
            <Ellipse cx="6" cy="26" rx="2" ry="8" fill="#4CAF50" opacity="0.8"/>
            <Circle cx="6" cy="18" r="2" fill="#4CAF50"/>
            
            <Ellipse cx="42" cy="26" rx="2" ry="8" fill="#4CAF50" opacity="0.8"/>
            <Circle cx="42" cy="18" r="2" fill="#4CAF50"/>
            
            {/* Steam lines for hot family meal */}
            <Path d="M18 10C18 8 18 8 18 10M22 8C22 6 22 6 22 8M26 8C26 6 26 6 26 8M30 10C30 8 30 8 30 10" 
                  stroke="#FF9800" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            
            {/* Small "4" indicator */}
            <Circle cx="36" cy="16" r="6" fill="#FF9800" opacity="0.9"/>
            <SvgText x="36" y="20" textAnchor="middle" fill="white" fontFamily="Arial" fontSize="8" fontWeight="bold">4</SvgText>
          </Svg>
        );

      case 'large group':
      case 'large group (6)':
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Large buffet-style serving tray */}
            <Rect x="4" y="20" width="40" height="16" rx="8" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Rect x="8" y="24" width="32" height="8" rx="4" fill="#4CAF50" opacity="0.2"/>
            
            {/* Multiple food sections */}
            <Circle cx="12" cy="28" r="2" fill="#4CAF50" opacity="0.7"/>
            <Circle cx="20" cy="28" r="2" fill="#FF9800" opacity="0.7"/>
            <Circle cx="28" cy="28" r="2" fill="#4CAF50" opacity="0.7"/>
            <Circle cx="36" cy="28" r="2" fill="#FF9800" opacity="0.7"/>
            
            {/* Serving utensils at ends */}
            <Rect x="2" y="24" width="1.5" height="8" rx="0.5" fill="#4CAF50"/>
            <Circle cx="2.75" cy="20" r="1.5" fill="#4CAF50"/>
            
            <Rect x="44.5" y="24" width="1.5" height="8" rx="0.5" fill="#4CAF50"/>
            <Circle cx="45.25" cy="20" r="1.5" fill="#4CAF50"/>
            
            {/* Steam lines for large meal */}
            <Path d="M10 12C10 10 10 10 10 12M16 10C16 8 16 8 16 10M22 10C22 8 22 8 22 10M28 10C28 8 28 8 28 10M34 10C34 8 34 8 34 10M38 12C38 10 38 10 38 12" 
                  stroke="#FF9800" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            
            {/* Number indicator */}
            <Circle cx="38" cy="14" r="6" fill="#FF9800" opacity="0.9"/>
            <SvgText x="38" y="18" textAnchor="middle" fill="white" fontFamily="Arial" fontSize="8" fontWeight="bold">6</SvgText>
            
            {/* Small plates stacked indicator */}
            <Ellipse cx="10" cy="40" rx="4" ry="1" fill="#4CAF50" opacity="0.4"/>
            <Ellipse cx="10" cy="39" rx="4" ry="1" fill="#4CAF50" opacity="0.6"/>
            <Ellipse cx="10" cy="38" rx="4" ry="1" fill="#4CAF50" opacity="0.8"/>
          </Svg>
        );

      case 'custom':
      case 'custom amount':
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Measuring cup */}
            <Path d="M14 16L34 16L32 36L16 36Z" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Path d="M14 16L34 16L32 28L16 28Z" fill="#4CAF50" opacity="0.3"/>
            
            {/* Cup handle */}
            <Path d="M34 20C38 20 38 28 34 28" stroke="#4CAF50" strokeWidth="2" fill="none"/>
            
            {/* Measurement lines */}
            <Line x1="18" y1="20" x2="20" y2="20" stroke="#4CAF50" strokeWidth="1"/>
            <Line x1="18" y1="24" x2="22" y2="24" stroke="#4CAF50" strokeWidth="1"/>
            <Line x1="18" y1="28" x2="20" y2="28" stroke="#4CAF50" strokeWidth="1"/>
            <Line x1="18" y1="32" x2="22" y2="32" stroke="#4CAF50" strokeWidth="1"/>
            
            {/* Adjustable dial/slider */}
            <Circle cx="24" cy="10" r="8" fill="#FF9800" opacity="0.2" stroke="#FF9800" strokeWidth="2"/>
            <Circle cx="24" cy="10" r="3" fill="#FF9800"/>
            
            {/* Dial marks */}
            <Line x1="24" y1="2" x2="24" y2="6" stroke="#FF9800" strokeWidth="2"/>
            <Line x1="30" y1="4" x2="28" y2="6" stroke="#FF9800" strokeWidth="1.5"/>
            <Line x1="32" y1="10" x2="28" y2="10" stroke="#FF9800" strokeWidth="1.5"/>
            <Line x1="30" y1="16" x2="28" y2="14" stroke="#FF9800" strokeWidth="1.5"/>
            <Line x1="18" y1="4" x2="20" y2="6" stroke="#FF9800" strokeWidth="1.5"/>
            <Line x1="16" y1="10" x2="20" y2="10" stroke="#FF9800" strokeWidth="1.5"/>
            <Line x1="18" y1="16" x2="20" y2="14" stroke="#FF9800" strokeWidth="1.5"/>
            
            {/* Pointer on dial */}
            <Line x1="24" y1="10" x2="28" y2="8" stroke="#FF9800" strokeWidth="2" strokeLinecap="round"/>
            
            {/* Custom text indicator */}
            <Circle cx="8" cy="38" r="6" fill="#FF9800" opacity="0.9"/>
            <SvgText x="8" y="42" textAnchor="middle" fill="white" fontFamily="Arial" fontSize="6" fontWeight="bold">?</SvgText>
          </Svg>
        );

      default:
        return (
          <Svg height={size} viewBox="0 0 48 48" width={size}>
            {/* Default plate icon */}
            <Circle cx="24" cy="26" r="14" fill="#F5F5F5" stroke="#4CAF50" strokeWidth="2"/>
            <Circle cx="24" cy="26" r="8" fill="#4CAF50" opacity="0.2"/>
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {renderSVGIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ServingSizeIcon; 