import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ChefHat, Sparkles, Star, Crown, Flame} from 'lucide-react-native';
import {scale, moderateScale, responsive} from '../utils/responsive';

interface ChefBadgeProps {
  tier: 1 | 2 | 3 | 4 | 5;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ChefBadge: React.FC<ChefBadgeProps> = ({tier, size = 'medium', showLabel = false}) => {
  const tiers = {
    1: {
      title: 'Sous Chef',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      borderColor: '#81C784',
      icon: ChefHat,
      stars: 1,
    },
    2: {
      title: 'Pastry Chef',
      color: '#2196F3',
      bgColor: '#E3F2FD',
      borderColor: '#64B5F6',
      icon: ChefHat,
      stars: 2,
    },
    3: {
      title: 'Head Chef',
      color: '#9C27B0',
      bgColor: '#F3E5F5',
      borderColor: '#BA68C8',
      icon: ChefHat,
      stars: 3,
    },
    4: {
      title: 'Executive Chef',
      color: '#FF6B35',
      bgColor: '#FFF3E0',
      borderColor: '#FFB74D',
      icon: Crown,
      stars: 4,
    },
    5: {
      title: 'Master Chef',
      color: '#FFB800',
      bgColor: '#FFFDE7',
      borderColor: '#FFD54F',
      icon: Crown,
      stars: 5,
    },
  };

  const currentTier = tiers[tier];
  const Icon = currentTier.icon;

  const sizes = {
    small: {
      container: moderateScale(32),
      icon: moderateScale(16),
      star: moderateScale(8),
      fontSize: responsive.fontSize.tiny,
      borderWidth: 2,
    },
    medium: {
      container: moderateScale(48),
      icon: moderateScale(24),
      star: moderateScale(12),
      fontSize: responsive.fontSize.small,
      borderWidth: 3,
    },
    large: {
      container: moderateScale(64),
      icon: moderateScale(32),
      star: moderateScale(16),
      fontSize: responsive.fontSize.regular,
      borderWidth: 4,
    },
  };

  const currentSize = sizes[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: currentSize.container,
            height: currentSize.container,
            backgroundColor: currentTier.bgColor,
            borderColor: currentTier.borderColor,
            borderWidth: currentSize.borderWidth,
          },
        ]}>
        {/* Special effects for higher tiers */}
        {tier >= 4 && (
          <View style={styles.glowEffect}>
            <Sparkles
              size={currentSize.star}
              color={currentTier.color}
              style={[styles.sparkle, styles.sparkleTopLeft]}
            />
            <Sparkles
              size={currentSize.star}
              color={currentTier.color}
              style={[styles.sparkle, styles.sparkleTopRight]}
            />
          </View>
        )}

        {/* Main Icon */}
        <Icon size={currentSize.icon} color={currentTier.color} strokeWidth={2.5} />

        {/* Star indicator at bottom */}
        <View style={styles.starContainer}>
          {[...Array(Math.min(currentTier.stars, 3))].map((_, i) => (
            <Star
              key={i}
              size={currentSize.star}
              color={currentTier.color}
              fill={currentTier.color}
              style={styles.star}
            />
          ))}
        </View>

        {/* Flame effect for Master Chef */}
        {tier === 5 && (
          <Flame
            size={currentSize.star}
            color="#FF6B35"
            style={styles.flame}
          />
        )}
      </View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: currentSize.fontSize,
              color: currentTier.color,
            },
          ]}>
          {currentTier.title}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(100),
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  glowEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleTopLeft: {
    top: -scale(4),
    left: -scale(4),
  },
  sparkleTopRight: {
    top: -scale(4),
    right: -scale(4),
  },
  starContainer: {
    position: 'absolute',
    bottom: scale(2),
    flexDirection: 'row',
    gap: scale(1),
  },
  star: {
    marginHorizontal: scale(0.5),
  },
  flame: {
    position: 'absolute',
    top: -scale(6),
    right: -scale(6),
  },
  label: {
    marginTop: scale(4),
    fontWeight: '600',
  },
});

export default ChefBadge; 