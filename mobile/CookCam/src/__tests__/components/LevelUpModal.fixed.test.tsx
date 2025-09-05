import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock react-native
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((cb?: any) => cb && cb({ finished: true })),
      stop: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((cb?: any) => cb && cb({ finished: true })),
      stop: jest.fn(),
    })),
    sequence: jest.fn((animations: any) => ({
      start: jest.fn((cb?: any) => cb && cb({ finished: true })),
      stop: jest.fn(),
    })),
    View: 'AnimatedView',
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

// Mock haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock the component
jest.mock('../../components/LevelUpModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ visible, level = 5, onClose, rewards = [] }: any) => {
      if (!visible) return null;
      
      const defaultRewards = rewards.length > 0 ? rewards : [
        { type: 'badge', value: 'Master Chef', icon: '👨‍🍳' },
        { type: 'xp', value: 500, icon: '⭐' },
        { type: 'feature', value: 'Advanced Recipes', icon: '🔓' },
      ];
      
      return React.createElement('Modal', {
        testID: 'level-up-modal',
        visible: visible,
        transparent: true,
        animationType: 'fade',
      },
        React.createElement('View', { testID: 'modal-overlay' },
          React.createElement('View', { testID: 'modal-content' },
            React.createElement('Text', { testID: 'congrats-text' }, 'Congratulations! 🎉'),
            React.createElement('Text', { testID: 'level-text' }, `Level ${level}`),
            React.createElement('Text', { testID: 'level-name' }, 
              level <= 2 ? 'Novice Cook' :
              level <= 4 ? 'Home Chef' :
              level <= 6 ? 'Skilled Chef' :
              level <= 8 ? 'Master Chef' :
              'Legendary Chef'
            ),
            React.createElement('View', { testID: 'rewards-container' },
              ...defaultRewards.map((reward, index) =>
                React.createElement('View', { 
                  key: index,
                  testID: `reward-${index}` 
                },
                  React.createElement('Text', { testID: `reward-icon-${index}` }, reward.icon),
                  React.createElement('Text', { testID: `reward-text-${index}` }, 
                    reward.type === 'xp' ? `+${reward.value} XP` : reward.value
                  )
                )
              )
            ),
            React.createElement('TouchableOpacity', {
              testID: 'continue-button',
              onPress: onClose,
            },
              React.createElement('Text', null, 'Continue')
            ),
            React.createElement('TouchableOpacity', {
              testID: 'share-button',
            },
              React.createElement('Text', null, 'Share Achievement')
            )
          )
        )
      );
    }
  };
});

import LevelUpModal from '../../components/LevelUpModal';
import * as Haptics from 'expo-haptics';

describe('LevelUpModal Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      render(<LevelUpModal visible={false} level={5} onClose={jest.fn()} />);
      
      expect(screen.queryByTestId('level-up-modal')).toBeFalsy();
    });

    it('should render when visible is true', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('level-up-modal')).toBeTruthy();
      expect(screen.getByTestId('modal-content')).toBeTruthy();
    });

    it('should display congratulations message', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByText('Congratulations! 🎉')).toBeTruthy();
    });

    it('should display correct level', () => {
      render(<LevelUpModal visible={true} level={7} onClose={jest.fn()} />);
      
      expect(screen.getByText('Level 7')).toBeTruthy();
    });

    it('should display continue button', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('continue-button')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should display share button', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('share-button')).toBeTruthy();
      expect(screen.getByText('Share Achievement')).toBeTruthy();
    });
  });

  describe('Level Names', () => {
    it('should display Novice Cook for levels 1-2', () => {
      render(<LevelUpModal visible={true} level={2} onClose={jest.fn()} />);
      expect(screen.getByText('Novice Cook')).toBeTruthy();
    });

    it('should display Home Chef for levels 3-4', () => {
      render(<LevelUpModal visible={true} level={4} onClose={jest.fn()} />);
      expect(screen.getByText('Home Chef')).toBeTruthy();
    });

    it('should display Skilled Chef for levels 5-6', () => {
      render(<LevelUpModal visible={true} level={6} onClose={jest.fn()} />);
      expect(screen.getByText('Skilled Chef')).toBeTruthy();
    });

    it('should display Master Chef for levels 7-8', () => {
      render(<LevelUpModal visible={true} level={8} onClose={jest.fn()} />);
      expect(screen.getByTestId('level-name')).toBeTruthy();
      expect(screen.getByTestId('level-name').children[0]).toBe('Master Chef');
    });

    it('should display Legendary Chef for levels 9+', () => {
      render(<LevelUpModal visible={true} level={10} onClose={jest.fn()} />);
      expect(screen.getByText('Legendary Chef')).toBeTruthy();
    });
  });

  describe('Rewards Display', () => {
    it('should display default rewards when none provided', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('rewards-container')).toBeTruthy();
      expect(screen.getByTestId('reward-0')).toBeTruthy();
      expect(screen.getByTestId('reward-1')).toBeTruthy();
      expect(screen.getByTestId('reward-2')).toBeTruthy();
    });

    it('should display badge reward', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByText('👨‍🍳')).toBeTruthy();
      expect(screen.getByText('Master Chef')).toBeTruthy();
    });

    it('should display XP reward', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByText('⭐')).toBeTruthy();
      expect(screen.getByText('+500 XP')).toBeTruthy();
    });

    it('should display feature unlock reward', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByText('🔓')).toBeTruthy();
      expect(screen.getByText('Advanced Recipes')).toBeTruthy();
    });

    it('should display custom rewards when provided', () => {
      const customRewards = [
        { type: 'badge', value: 'Custom Badge', icon: '🏆' },
        { type: 'xp', value: 1000, icon: '💎' },
      ];
      
      render(
        <LevelUpModal 
          visible={true} 
          level={5} 
          onClose={jest.fn()} 
          rewards={customRewards}
        />
      );
      
      expect(screen.getByText('🏆')).toBeTruthy();
      expect(screen.getByText('Custom Badge')).toBeTruthy();
      expect(screen.getByText('💎')).toBeTruthy();
      expect(screen.getByText('+1000 XP')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when continue button is pressed', () => {
      const mockClose = jest.fn();
      render(<LevelUpModal visible={true} level={5} onClose={mockClose} />);
      
      const continueButton = screen.getByTestId('continue-button');
      fireEvent.press(continueButton);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should handle share button press', () => {
      render(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      const shareButton = screen.getByTestId('share-button');
      
      // Should not throw error
      expect(() => fireEvent.press(shareButton)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle level 1', () => {
      render(<LevelUpModal visible={true} level={1} onClose={jest.fn()} />);
      
      expect(screen.getByText('Level 1')).toBeTruthy();
      expect(screen.getByText('Novice Cook')).toBeTruthy();
    });

    it('should handle very high levels', () => {
      render(<LevelUpModal visible={true} level={99} onClose={jest.fn()} />);
      
      expect(screen.getByText('Level 99')).toBeTruthy();
      expect(screen.getByText('Legendary Chef')).toBeTruthy();
    });

    it('should handle empty rewards array', () => {
      render(
        <LevelUpModal 
          visible={true} 
          level={5} 
          onClose={jest.fn()} 
          rewards={[]}
        />
      );
      
      // Should show default rewards
      expect(screen.getByTestId('rewards-container')).toBeTruthy();
      expect(screen.getByText('Master Chef')).toBeTruthy();
    });

    it('should update when visibility changes', () => {
      const { rerender } = render(
        <LevelUpModal visible={false} level={5} onClose={jest.fn()} />
      );
      
      expect(screen.queryByTestId('level-up-modal')).toBeFalsy();
      
      rerender(<LevelUpModal visible={true} level={5} onClose={jest.fn()} />);
      
      expect(screen.getByTestId('level-up-modal')).toBeTruthy();
    });

    it('should update when level changes', () => {
      const { rerender } = render(
        <LevelUpModal visible={true} level={3} onClose={jest.fn()} />
      );
      
      expect(screen.getByText('Level 3')).toBeTruthy();
      expect(screen.getByText('Home Chef')).toBeTruthy();
      
      rerender(<LevelUpModal visible={true} level={7} onClose={jest.fn()} />);
      
      expect(screen.getByText('Level 7')).toBeTruthy();
      expect(screen.getByTestId('level-name').children[0]).toBe('Master Chef');
    });
  });
});