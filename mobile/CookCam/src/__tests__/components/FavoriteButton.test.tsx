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
import { Animated } from 'react-native';
import FavoriteButton from '../../components/FavoriteButton';

// Mock react-native modules
jest.mock('react-native', () => ({
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    sequence: jest.fn((animations) => ({
      start: jest.fn((callback) => callback && callback()),
    })),
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 
  React.forwardRef((props: any, ref: any) => 
    React.createElement('LottieView', { ...props, ref })
  )
);

// Mock icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    return React.forwardRef((props: any, ref: any) => 
      React.createElement('MockIcon', { ...props, ref, testID: `${name}-icon` }, name)
    );
  };
  
  return {
    Heart: mockIcon('Heart'),
  };
});

describe('FavoriteButton', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      expect(screen.getByTestId('Heart-icon')).toBeTruthy();
    });

    it('should render with unfavorited state by default', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.color).toBe('#8E8E93');
      expect(heart.props.fill).toBe('transparent');
    });

    it('should render with favorited state when initialFavorited is true', () => {
      render(<FavoriteButton recipeId="recipe-1" initialFavorited={true} />);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.color).toBe('#FF6B35');
      expect(heart.props.fill).toBe('#FF6B35');
    });

    it('should render with custom size', () => {
      render(<FavoriteButton recipeId="recipe-1" size={32} />);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.size).toBe(32);
    });

    it('should apply custom style', () => {
      const customStyle = { margin: 10 };
      const { UNSAFE_queryByType } = render(
        <FavoriteButton recipeId="recipe-1" style={customStyle} />
      );
      
      const button = UNSAFE_queryByType('TouchableOpacity');
      expect(button.props.style).toContainEqual(customStyle);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from unfavorited to favorited', () => {
      render(<FavoriteButton recipeId="recipe-1" onToggle={mockOnToggle} />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.color).toBe('#FF6B35');
      expect(heart.props.fill).toBe('#FF6B35');
    });

    it('should toggle from favorited to unfavorited', () => {
      render(
        <FavoriteButton 
          recipeId="recipe-1" 
          initialFavorited={true} 
          onToggle={mockOnToggle} 
        />
      );
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.color).toBe('#8E8E93');
      expect(heart.props.fill).toBe('transparent');
    });

    it('should call onToggle with correct parameters when favoriting', () => {
      render(<FavoriteButton recipeId="recipe-123" onToggle={mockOnToggle} />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      expect(mockOnToggle).toHaveBeenCalledWith('recipe-123', true);
    });

    it('should call onToggle with correct parameters when unfavoriting', () => {
      render(
        <FavoriteButton 
          recipeId="recipe-456" 
          initialFavorited={true} 
          onToggle={mockOnToggle} 
        />
      );
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      expect(mockOnToggle).toHaveBeenCalledWith('recipe-456', false);
    });

    it('should work without onToggle callback', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      
      // Should not throw error
      expect(() => fireEvent.press(button)).not.toThrow();
    });
  });

  describe('Animations', () => {
    it('should trigger scale animation on press', () => {
      const mockSequence = Animated.sequence as jest.Mock;
      const mockTiming = Animated.timing as jest.Mock;
      
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      expect(mockSequence).toHaveBeenCalled();
      expect(mockTiming).toHaveBeenCalledTimes(3);
    });

    it('should show Lottie animation when favoriting', async () => {
      const { UNSAFE_queryByType } = render(
        <FavoriteButton recipeId="recipe-1" />
      );
      
      const button = UNSAFE_queryByType('TouchableOpacity');
      fireEvent.press(button);
      
      const lottie = UNSAFE_queryByType('LottieView');
      expect(lottie).toBeTruthy();
    });

    it('should hide Lottie animation after timeout', async () => {
      const { UNSAFE_queryByType } = render(
        <FavoriteButton recipeId="recipe-1" />
      );
      
      const button = UNSAFE_queryByType('TouchableOpacity');
      fireEvent.press(button);
      
      // Animation should be visible initially
      expect(UNSAFE_queryByType('LottieView')).toBeTruthy();
      
      // Fast-forward timers
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        expect(UNSAFE_queryByType('LottieView')).toBeFalsy();
      });
    });

    it('should not show Lottie animation when unfavoriting', () => {
      const { UNSAFE_queryByType } = render(
        <FavoriteButton recipeId="recipe-1" initialFavorited={true} />
      );
      
      const button = UNSAFE_queryByType('TouchableOpacity');
      fireEvent.press(button);
      
      const lottie = UNSAFE_queryByType('LottieView');
      expect(lottie).toBeFalsy();
    });

    it('should play Lottie animation when favoriting', () => {
      const mockPlay = jest.fn();
      const mockLottieRef = { current: { play: mockPlay } };
      
      jest.spyOn(React, 'useRef').mockReturnValueOnce(mockLottieRef as any);
      
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should maintain state across re-renders', () => {
      const { rerender } = render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      // State should be favorited
      let heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
      
      // Re-render with same props
      rerender(<FavoriteButton recipeId="recipe-1" />);
      
      // State should still be favorited
      heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
    });

    it('should reset state when recipeId changes', () => {
      const { rerender } = render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      // State should be favorited
      let heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
      
      // Change recipe ID
      rerender(<FavoriteButton recipeId="recipe-2" />);
      
      // State should reset to unfavorited
      heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('transparent');
    });

    it('should update state when initialFavorited prop changes', () => {
      const { rerender } = render(
        <FavoriteButton recipeId="recipe-1" initialFavorited={false} />
      );
      
      let heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('transparent');
      
      rerender(
        <FavoriteButton recipeId="recipe-1" initialFavorited={true} />
      );
      
      heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
    });
  });

  describe('Touch Feedback', () => {
    it('should have correct activeOpacity', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      expect(button.props.activeOpacity).toBe(0.7);
    });

    it('should respond to rapid taps', () => {
      render(<FavoriteButton recipeId="recipe-1" onToggle={mockOnToggle} />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      
      // Rapid taps
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      
      expect(mockOnToggle).toHaveBeenCalledTimes(3);
      
      // Should end up in favorited state (odd number of taps)
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recipeId', () => {
      render(<FavoriteButton recipeId="" />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      // Should still function normally
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.fill).toBe('#FF6B35');
    });

    it('should handle very long recipeId', () => {
      const longId = 'recipe-' + 'x'.repeat(1000);
      render(<FavoriteButton recipeId={longId} onToggle={mockOnToggle} />);
      
      const button = screen.UNSAFE_getByType('TouchableOpacity');
      fireEvent.press(button);
      
      expect(mockOnToggle).toHaveBeenCalledWith(longId, true);
    });

    it('should handle size of 0', () => {
      render(<FavoriteButton recipeId="recipe-1" size={0} />);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.size).toBe(0);
    });

    it('should handle very large size', () => {
      render(<FavoriteButton recipeId="recipe-1" size={200} />);
      
      const heart = screen.getByTestId('Heart-icon');
      expect(heart.props.size).toBe(200);
    });
  });
});