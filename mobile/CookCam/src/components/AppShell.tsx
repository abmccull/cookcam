import React from 'react';
import { View, StyleSheet } from 'react-native';
import SafeScreen from './SafeScreen';
import XPHeader from './XPHeader';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = React.memo(({ children }) => {
  return (
    <SafeScreen style={styles.container}>
      <XPHeader />
      <View style={styles.content}>
        {children}
      </View>
    </SafeScreen>
  );
});

// Add display name for debugging
AppShell.displayName = 'AppShell';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default AppShell; 