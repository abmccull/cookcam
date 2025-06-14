import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Home, Heart, Trophy, Search, User, Plus} from 'lucide-react-native';
import {verticalScale, moderateScale, responsive} from '../utils/responsive';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TabBar: React.FC<TabBarProps> = ({state, descriptors, navigation}) => {
  const insets = useSafeAreaInsets();

  const icons: {[key: string]: any} = {
    Home: Home,
    Favorites: Heart,
    Leaderboard: Trophy,
    Discover: Search,
    Creator: Plus,
    Profile: User,
  };

  const colors: {[key: string]: string} = {
    Home: '#FF6B35',
    Favorites: '#E91E63',
    Leaderboard: '#FFB800',
    Discover: '#9C27B0',
    Creator: '#4CAF50',
    Profile: '#2196F3',
  };

  const iconSize = moderateScale(24);

  return (
    <View
      style={[
        styles.container,
        {paddingBottom: insets.bottom || verticalScale(10)},
      ]}>
      {state.routes.map((route: any, index: number) => {
        const {options} = descriptors[route.key];
        const label = options.tabBarLabel || route.name;
        const isFocused = state.index === index;
        const Icon = icons[route.name] || Home;
        const activeColor = colors[route.name] || '#FF6B35';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (!Icon) {
          console.warn(`Missing icon for tab: ${route.name}`);
          return null;
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.8}>
            <View
              style={[
                styles.iconContainer,
                isFocused && styles.activeIconContainer,
                isFocused && {backgroundColor: activeColor + '15'},
              ]}>
              <Icon
                size={iconSize}
                color={isFocused ? activeColor : '#8E8E93'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            </View>
            <Text
              style={[
                styles.label,
                isFocused && styles.activeLabel,
                isFocused && {color: activeColor},
              ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: verticalScale(4),
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: responsive.borderRadius.large,
    marginBottom: verticalScale(4),
  },
  activeIconContainer: {
    transform: [{scale: 1.05}],
  },
  label: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: verticalScale(2),
  },
  activeLabel: {
    fontWeight: '700',
  },
});

export default TabBar;
