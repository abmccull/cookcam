// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LevelUpModal from '../../components/LevelUpModal';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Animated: {
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
      interpolate: jest.fn(() => initialValue),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    parallel: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    View: 'AnimatedView',
    Text: 'AnimatedText',
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    return React.forwardRef((props: any, ref: any) => 
      React.createElement('MockIcon', { ...props, ref, testID: `${name}-icon` }, name)
    );
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return mockIcon(prop);
      }
      return undefined;
    },
  });
});

describe('LevelUpModal', () => {
  const mockOnClose = jest.fn();

  const defaultProps = {
    visible: true,
    newLevel: 10,
    rewards: [
      'Master Chef Badge',
      'Premium Recipes Unlocked',
    ],
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when visible', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText(/Level 10/)).toBeTruthy();
    });

    it('should not render when not visible', () => {
      render(<LevelUpModal {...defaultProps} visible={false} />);
      
      expect(screen.queryByText(/Level 10/)).toBeFalsy();
    });

    it('should display level number', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText(/Level Up!/i)).toBeTruthy();
    });

    it('should display level text', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText(/You've reached level 10/i)).toBeTruthy();
    });

    it('should display achievement message', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText(/Amazing achievement/i)).toBeTruthy();
    });

    it('should display rewards', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText('Master Chef Badge')).toBeTruthy();
      expect(screen.getByText('Premium Recipes Unlocked')).toBeTruthy();
    });

    it('should show continue button', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should have close button', () => {
      const { UNSAFE_queryByType } = render(<LevelUpModal {...defaultProps} />);
      
      const touchables = UNSAFE_queryByType('TouchableOpacity');
      expect(touchables).toBeTruthy();
    });
  });

  describe('Animations', () => {
    it('should trigger entrance animations', () => {
      const mockAnimatedSpring = require('react-native').Animated.spring;
      
      render(<LevelUpModal {...defaultProps} />);
      
      expect(mockAnimatedSpring).toHaveBeenCalled();
    });

    it('should show Lottie animation', () => {
      const { UNSAFE_queryByType } = render(<LevelUpModal {...defaultProps} />);
      
      expect(UNSAFE_queryByType('LottieView')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when continue button is pressed', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle no rewards', () => {
      render(<LevelUpModal {...defaultProps} rewards={[]} />);
      
      expect(screen.queryByText('Master Chef Badge')).toBeFalsy();
    });

    it('should trigger haptic feedback on modal open', () => {
      const mockNotificationAsync = require('expo-haptics').notificationAsync;
      
      render(<LevelUpModal {...defaultProps} />);
      
      expect(mockNotificationAsync).toHaveBeenCalledWith('Success');
    });

    it('should trigger haptic feedback on button press', () => {
      const mockImpactAsync = require('expo-haptics').impactAsync;
      
      render(<LevelUpModal {...defaultProps} />);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);
      
      expect(mockImpactAsync).toHaveBeenCalled();
    });
  });

  describe('Different Levels', () => {
    it('should show level 5', () => {
      render(<LevelUpModal {...defaultProps} newLevel={5} />);
      
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('should show level 10', () => {
      render(<LevelUpModal {...defaultProps} newLevel={10} />);
      
      expect(screen.getByText('10')).toBeTruthy();
    });

    it('should show level 25', () => {
      render(<LevelUpModal {...defaultProps} newLevel={25} />);
      
      expect(screen.getByText('25')).toBeTruthy();
    });

    it('should show level 50', () => {
      render(<LevelUpModal {...defaultProps} newLevel={50} />);
      
      expect(screen.getByText('50')).toBeTruthy();
    });
  });

  describe('Visual Elements', () => {
    it('should show animated elements', () => {
      const { UNSAFE_queryByType } = render(<LevelUpModal {...defaultProps} />);
      
      const animatedViews = UNSAFE_queryByType('AnimatedView');
      expect(animatedViews).toBeTruthy();
    });

    it('should show modal overlay', () => {
      const { UNSAFE_queryByType } = render(<LevelUpModal {...defaultProps} />);
      
      const modal = UNSAFE_queryByType('Modal');
      expect(modal).toBeTruthy();
    });
  });

  describe('No Rewards', () => {
    it('should handle when no rewards are provided', () => {
      render(<LevelUpModal {...defaultProps} rewards={undefined} />);
      
      expect(screen.queryByText('Master Chef Badge')).toBeFalsy();
    });

    it('should handle empty rewards array', () => {
      render(<LevelUpModal {...defaultProps} rewards={[]} />);
      
      expect(screen.queryByText('Master Chef Badge')).toBeFalsy();
    });
  });

  describe('Special Effects', () => {
    it('should show high level', () => {
      render(<LevelUpModal {...defaultProps} newLevel={100} />);
      
      expect(screen.getByText('100')).toBeTruthy();
    });

    it('should show low level', () => {
      render(<LevelUpModal {...defaultProps} newLevel={2} />);
      
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      const modal = screen.UNSAFE_getByType('Modal');
      expect(modal.props.accessible).toBe(true);
    });

    it('should be accessible', () => {
      const { UNSAFE_queryByType } = render(<LevelUpModal {...defaultProps} />);
      
      const modal = UNSAFE_queryByType('Modal');
      expect(modal.props.transparent).toBe(true);
    });
  });
});