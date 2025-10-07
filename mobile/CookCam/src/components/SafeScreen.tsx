import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  includeTop?: boolean;
  includeBottom?: boolean;
  backgroundColor?: string;
}

const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  style,
  includeTop = true,
  includeBottom = true,
  backgroundColor = "#F8F8FF",
}) => {
  const insets = useSafeAreaInsets();

  const safeAreaStyle: ViewStyle = {
    paddingTop: includeTop ? insets.top : 0,
    paddingBottom: includeBottom ? insets.bottom : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View style={[styles.container, { backgroundColor }, safeAreaStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeScreen;
