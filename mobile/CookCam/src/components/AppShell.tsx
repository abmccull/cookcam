import React from 'react';
import { View, StyleSheet } from 'react-native';
import SafeScreen from './SafeScreen';
import XPHeader from './XPHeader';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <SafeScreen style={styles.shell}>
      <XPHeader />
      <View style={styles.content}>
        {children}
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#F8F9FA', // A neutral background color
  },
  content: {
    flex: 1,
  },
});

export default AppShell; 