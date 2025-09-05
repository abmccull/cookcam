// Set up global mocks
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Mock React Native
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  actualRN.PixelRatio = global.PixelRatio;
  
  // Mock Animated
  const createMockAnimatedValue = (initialValue) => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    interpolate: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    _value: initialValue,
  });
  
  const mockTiming = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  const mockSpring = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  const mockParallel = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  const mockSequence = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  const mockDelay = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  return {
    ...actualRN,
    PixelRatio: global.PixelRatio,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    Animated: {
      ...actualRN.Animated,
      Value: jest.fn(createMockAnimatedValue),
      timing: mockTiming,
      spring: mockSpring,
      parallel: mockParallel,
      sequence: mockSequence,
      delay: mockDelay,
      View: 'AnimatedView',
    },
  };
});

// Mock environment config
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  Trophy: 'Trophy',
  Star: 'Star',
  Gift: 'Gift',
  ChevronRight: 'ChevronRight',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import LevelUpModal from '../../components/LevelUpModal';

describe('LevelUpModal', () => {
  const defaultProps = {
    visible: true,
    newLevel: 5,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(
        <LevelUpModal
          visible={true}
          newLevel={10}
          rewards={['New Badge', 'Extra XP Bonus']}
          onClose={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render modal when visible', () => {
      const { UNSAFE_getByType } = render(<LevelUpModal {...defaultProps} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(true);
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('none');
    });

    it('should not render when not visible', () => {
      const { UNSAFE_getByType } = render(
        <LevelUpModal {...defaultProps} visible={false} />
      );
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(false);
    });

    it('should render level up text', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText('LEVEL UP!')).toBeTruthy();
      expect(screen.getByText('You\'ve reached')).toBeTruthy();
      expect(screen.getByText('Level 5')).toBeTruthy();
    });

    it('should render custom level number', () => {
      render(<LevelUpModal {...defaultProps} newLevel={25} />);
      
      expect(screen.getByText('Level 25')).toBeTruthy();
    });

    it('should render trophy icon', () => {
      const { UNSAFE_getByType } = render(<LevelUpModal {...defaultProps} />);
      
      const trophy = UNSAFE_getByType('Trophy');
      expect(trophy.props.size).toBe(80);
      expect(trophy.props.color).toBe('#FFD700');
    });

    it('should render continue button', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.getByText('Continue')).toBeTruthy();
      expect(screen.UNSAFE_getByType('ChevronRight')).toBeTruthy();
    });

    it('should render animated views', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      expect(animatedViews.length).toBeGreaterThan(0); // Main container + stars + trophy
    });

    it('should render star animations', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const stars = UNSAFE_getAllByType('Star');
      expect(stars.length).toBe(8); // 8 stars as per component
    });
  });

  describe('Rewards Display', () => {
    it('should not render rewards section when no rewards provided', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(screen.queryByText('Rewards Unlocked')).toBeFalsy();
      expect(screen.UNSAFE_queryByType('Gift')).toBeFalsy();
    });

    it('should not render rewards section when empty rewards array', () => {
      render(<LevelUpModal {...defaultProps} rewards={[]} />);
      
      expect(screen.queryByText('Rewards Unlocked')).toBeFalsy();
    });

    it('should render rewards section when rewards provided', () => {
      const rewards = ['New Badge Earned', 'XP Multiplier Unlocked'];
      render(<LevelUpModal {...defaultProps} rewards={rewards} />);
      
      expect(screen.getByText('Rewards Unlocked')).toBeTruthy();
      expect(screen.UNSAFE_getByType('Gift')).toBeTruthy();
    });

    it('should render all reward items', () => {
      const rewards = ['Achievement Badge', 'Double XP Weekend', 'Special Title'];
      render(<LevelUpModal {...defaultProps} rewards={rewards} />);
      
      rewards.forEach(reward => {
        expect(screen.getByText(reward)).toBeTruthy();
      });
    });

    it('should render gift icon with correct props', () => {
      const { UNSAFE_getByType } = render(
        <LevelUpModal {...defaultProps} rewards={['Test Reward']} />
      );
      
      const gift = UNSAFE_getByType('Gift');
      expect(gift.props.size).toBe(20);
      expect(gift.props.color).toBe('#FF6B35');
    });

    it('should handle single reward', () => {
      render(<LevelUpModal {...defaultProps} rewards={['Single Reward']} />);
      
      expect(screen.getByText('Single Reward')).toBeTruthy();
    });

    it('should handle multiple rewards', () => {
      const manyRewards = [
        'First Reward',
        'Second Reward', 
        'Third Reward',
        'Fourth Reward',
        'Fifth Reward'
      ];
      render(<LevelUpModal {...defaultProps} rewards={manyRewards} />);
      
      manyRewards.forEach(reward => {
        expect(screen.getByText(reward)).toBeTruthy();
      });
    });
  });

  describe('Animation Behavior', () => {
    it('should create animated values on mount', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(Animated.Value).toHaveBeenCalledWith(0); // scaleAnim
      expect(Animated.Value).toHaveBeenCalledWith(0); // rotateAnim
      // Plus 8 stars * 3 animations each = 24 more calls
    });

    it('should start animations when visible becomes true', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} visible={false} />);
      
      jest.clearAllMocks();
      
      rerender(<LevelUpModal {...defaultProps} visible={true} />);
      
      expect(Animated.parallel).toHaveBeenCalled();
      expect(Animated.spring).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalled();
    });

    it('should configure trophy animations correctly', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(Animated.spring).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        })
      );
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
    });

    it('should configure star animations correctly', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.delay).toHaveBeenCalled();
    });

    it('should use native driver for animations', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      const springCalls = Animated.spring.mock.calls;
      const timingCalls = Animated.timing.mock.calls;
      
      springCalls.forEach(call => {
        const config = call[1];
        expect(config.useNativeDriver).toBe(true);
      });
      
      timingCalls.forEach(call => {
        const config = call[1];
        expect(config.useNativeDriver).toBe(true);
      });
    });

    it('should interpolate rotation correctly', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      // Trophy container should have rotation transform
      const trophyContainer = animatedViews.find(view =>
        view.props.style && 
        Array.isArray(view.props.style) &&
        view.props.style.some(style => 
          style && style.transform && 
          style.transform.some(transform => transform.rotate)
        )
      );
      
      expect(trophyContainer).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger success haptic when modal becomes visible', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} visible={false} />);
      
      jest.clearAllMocks();
      
      rerender(<LevelUpModal {...defaultProps} visible={true} />);
      
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('should not trigger haptic when modal is not visible', () => {
      render(<LevelUpModal {...defaultProps} visible={false} />);
      
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when continue button is pressed', () => {
      const mockOnClose = jest.fn();
      render(<LevelUpModal {...defaultProps} onClose={mockOnClose} />);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton.parent.parent);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should animate out when closing', () => {
      const mockOnClose = jest.fn();
      render(<LevelUpModal {...defaultProps} onClose={mockOnClose} />);
      
      jest.clearAllMocks();
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton.parent.parent);
      
      expect(Animated.parallel).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalled();
    });

    it('should call onClose when modal requests close', () => {
      const mockOnClose = jest.fn();
      const { UNSAFE_getByType } = render(
        <LevelUpModal {...defaultProps} onClose={mockOnClose} />
      );
      
      const modal = UNSAFE_getByType('Modal');
      modal.props.onRequestClose();
      
      expect(Animated.parallel).toHaveBeenCalled();
    });

    it('should reset animations after close animation completes', () => {
      const mockOnClose = jest.fn();
      render(<LevelUpModal {...defaultProps} onClose={mockOnClose} />);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton.parent.parent);
      
      // Animation completion should trigger onClose
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Style Application', () => {
    it('should apply overlay styles', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const views = UNSAFE_getAllByType('View');
      const overlay = views[0]; // First view should be overlay
      
      expect(overlay.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          justifyContent: "center",
          alignItems: "center",
        })
      );
    });

    it('should apply container styles with screen width calculation', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      const containerView = animatedViews[0]; // First animated view should be main container
      
      expect(containerView.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 32,
            alignItems: "center",
            width: 375 * 0.85, // screenWidth * 0.85
            maxWidth: 350,
            position: "relative",
          })
        ])
      );
    });

    it('should apply text styles correctly', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      
      // Title text
      const titleText = texts.find(text => 
        text.props.children === 'LEVEL UP!'
      );
      expect(titleText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 32,
          fontWeight: "bold",
          color: "#FFD700",
          letterSpacing: 2,
        })
      );
      
      // Level number text
      const levelNumberText = texts.find(text => 
        text.props.children === 'Level 5'
      );
      expect(levelNumberText.props.style).toEqual(
        expect.objectContaining({
          fontWeight: "bold",
          fontSize: 22,
          color: "#FF6B35",
        })
      );
    });

    it('should apply continue button styles', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      const continueButton = touchables[0]; // Should be the continue button
      
      expect(continueButton.props.style).toEqual(
        expect.objectContaining({
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FF6B35",
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 24,
          gap: 8,
        })
      );
    });

    it('should apply reward container styles when rewards present', () => {
      const { UNSAFE_getAllByType } = render(
        <LevelUpModal {...defaultProps} rewards={['Test Reward']} />
      );
      
      const views = UNSAFE_getAllByType('View');
      const rewardContainer = views.find(view =>
        view.props.style && 
        (Array.isArray(view.props.style) 
          ? view.props.style.some(s => s && s.backgroundColor === "#FFF9F7")
          : view.props.style.backgroundColor === "#FFF9F7")
      );
      
      expect(rewardContainer).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero level', () => {
      render(<LevelUpModal {...defaultProps} newLevel={0} />);
      
      expect(screen.getByText('Level 0')).toBeTruthy();
    });

    it('should handle very high level numbers', () => {
      render(<LevelUpModal {...defaultProps} newLevel={9999} />);
      
      expect(screen.getByText('Level 9999')).toBeTruthy();
    });

    it('should handle negative level numbers', () => {
      render(<LevelUpModal {...defaultProps} newLevel={-5} />);
      
      expect(screen.getByText('Level -5')).toBeTruthy();
    });

    it('should handle undefined onClose', () => {
      const { toJSON } = render(
        <LevelUpModal 
          visible={true} 
          newLevel={5} 
          onClose={undefined as any} 
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle null rewards', () => {
      const { toJSON } = render(
        <LevelUpModal {...defaultProps} rewards={null as any} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle undefined rewards', () => {
      const { toJSON } = render(
        <LevelUpModal {...defaultProps} rewards={undefined} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle empty string rewards', () => {
      render(<LevelUpModal {...defaultProps} rewards={['', 'Valid Reward', '']} />);
      
      expect(screen.getByText('Valid Reward')).toBeTruthy();
      // Empty strings should still render as empty text elements
    });

    it('should handle very long reward text', () => {
      const longReward = 'A'.repeat(200);
      render(<LevelUpModal {...defaultProps} rewards={[longReward]} />);
      
      expect(screen.getByText(longReward)).toBeTruthy();
    });

    it('should handle special characters in rewards', () => {
      const specialReward = '🎉 Special Reward with émojis & symbols! 🏆';
      render(<LevelUpModal {...defaultProps} rewards={[specialReward]} />);
      
      expect(screen.getByText(specialReward)).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<LevelUpModal {...defaultProps} />);
      
      expect(() => unmount()).not.toThrow();
    });

    it('should handle visibility changes correctly', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} visible={false} />);
      
      rerender(<LevelUpModal {...defaultProps} visible={true} />);
      rerender(<LevelUpModal {...defaultProps} visible={false} />);
      rerender(<LevelUpModal {...defaultProps} visible={true} />);
      
      // Should not throw errors
      expect(screen.getByText('LEVEL UP!')).toBeTruthy();
    });

    it('should handle prop changes', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} newLevel={5} />);
      
      rerender(<LevelUpModal {...defaultProps} newLevel={10} />);
      
      expect(screen.getByText('Level 10')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} />);
      
      // Re-render with same props
      rerender(<LevelUpModal {...defaultProps} />);
      
      // Should not cause issues
      expect(screen.getByText('LEVEL UP!')).toBeTruthy();
    });

    it('should handle rapid visibility toggles', () => {
      const { rerender } = render(<LevelUpModal {...defaultProps} visible={true} />);
      
      // Rapid toggles
      for (let i = 0; i < 10; i++) {
        rerender(<LevelUpModal {...defaultProps} visible={i % 2 === 0} />);
      }
      
      // Should not throw errors
      expect(screen.UNSAFE_queryByType('Modal')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible text content', () => {
      render(<LevelUpModal {...defaultProps} />);
      
      // All text should be accessible
      expect(screen.getByText('LEVEL UP!')).toBeTruthy();
      expect(screen.getByText('You\'ve reached')).toBeTruthy();
      expect(screen.getByText('Level 5')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should maintain text hierarchy', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBeGreaterThanOrEqual(3); // Title, level text, continue
    });

    it('should provide meaningful content for screen readers', () => {
      render(<LevelUpModal {...defaultProps} newLevel={15} />);
      
      expect(screen.getByText('LEVEL UP!')).toBeTruthy();
      expect(screen.getByText('Level 15')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
    });

    it('should have touchable continue button', () => {
      const { UNSAFE_getAllByType } = render(<LevelUpModal {...defaultProps} />);
      
      const touchables = UNSAFE_getAllByType('TouchableOpacity');
      expect(touchables.length).toBe(1); // Continue button
    });
  });
});