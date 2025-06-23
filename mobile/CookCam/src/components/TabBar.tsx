import React, { useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Heart, Trophy, Search, User, Plus } from "lucide-react-native";
import { verticalScale, moderateScale, responsive } from "../utils/responsive";
import logger from "../utils/logger";

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TabBar: React.FC<TabBarProps> = React.memo(({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  // Memoize static configuration objects
  const icons = useMemo(() => ({
    Home: Home,
    Favorites: Heart,
    Leaderboard: Trophy,
    Discover: Search,
    Creator: Plus,
    Profile: User,
  }), []);

  const colors = useMemo(() => ({
    Home: "#FF6B35",
    Favorites: "#E91E63",
    Leaderboard: "#FFB800",
    Discover: "#9C27B0",
    Creator: "#4CAF50",
    Profile: "#2196F3",
  }), []);

  const iconSize = useMemo(() => moderateScale(24), []);

  // Memoize container style to prevent recalculation
  const containerStyle = useMemo(() => [
    styles.container,
    { paddingBottom: Math.max(insets.bottom || 0, verticalScale(50)) },
  ], [insets.bottom]);

  // Memoized navigation handler factory
  const createOnPressHandler = useCallback((route: any, isFocused: boolean) => {
    return () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };
  }, [navigation]);

  // Memoize tab rendering logic
  const renderTab = useCallback((route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel || route.name;
    const isFocused = state.index === index;
    const Icon = icons[route.name as keyof typeof icons] || Home;
    const activeColor = colors[route.name as keyof typeof colors] || "#FF6B35";

    if (!Icon) {
      logger.warn(`Missing icon for tab: ${route.name}`);
      return null;
    }

    const onPress = createOnPressHandler(route, isFocused);

    // Memoize dynamic styles
    const iconContainerStyle = useMemo(() => [
      styles.iconContainer,
      isFocused && styles.activeIconContainer,
      isFocused && { backgroundColor: activeColor + "15" },
    ], [isFocused, activeColor]);

    const labelStyle = useMemo(() => [
      styles.label,
      isFocused && styles.activeLabel,
      isFocused && { color: activeColor },
    ], [isFocused, activeColor]);

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        activeOpacity={0.8}
      >
        <View style={iconContainerStyle}>
          <Icon
            size={iconSize}
            color={isFocused ? activeColor : "#8E8E93"}
            strokeWidth={isFocused ? 2.5 : 2}
          />
        </View>
        <Text style={labelStyle}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [state.index, descriptors, icons, colors, iconSize, createOnPressHandler]);

  // Memoize the entire tabs array
  const tabs = useMemo(() => 
    state.routes.map(renderTab), 
    [state.routes, renderTab]
  );

  return (
    <View style={containerStyle}>
      {tabs}
    </View>
  );
});

// Add display name for debugging
TabBar.displayName = 'TabBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
    shadowColor: "#000",
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
    alignItems: "center",
    paddingTop: verticalScale(4),
  },
  iconContainer: {
    width: moderateScale(48),
    height: moderateScale(32),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: responsive.borderRadius.large,
    marginBottom: verticalScale(4),
  },
  activeIconContainer: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: responsive.fontSize.small,
    color: "#8E8E93",
    fontWeight: "500",
    marginBottom: verticalScale(2),
  },
  activeLabel: {
    fontWeight: "700",
  },
});

export default TabBar;
