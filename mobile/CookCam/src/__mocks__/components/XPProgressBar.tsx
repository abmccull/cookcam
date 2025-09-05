import React from 'react';
import { View, Text } from 'react-native';

interface XPProgressBarProps {
  showLabels?: boolean;
  height?: number;
  style?: any;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  showLabels = true,
  height = 24,
  style,
}) => {
  return (
    <View testID="xp-progress-bar" style={[{ height }, style]}>
      {showLabels && (
        <View testID="xp-labels">
          <Text testID="level-text">Level 2</Text>
          <Text testID="xp-text">150 / 250 XP</Text>
        </View>
      )}
      <View testID="progress-bar" style={{ height }}>
        <View testID="progress-fill" style={{ width: '60%' }} />
      </View>
    </View>
  );
};

export default XPProgressBar;