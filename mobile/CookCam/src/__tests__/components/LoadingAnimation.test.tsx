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
  
  const mockSequence = jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  const mockLoop = jest.fn(() => ({
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
    Animated: {
      ...actualRN.Animated,
      Value: jest.fn(createMockAnimatedValue),
      timing: mockTiming,
      sequence: mockSequence,
      loop: mockLoop,
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

// Mock responsive utility
jest.mock('../../utils/responsive', () => ({
  moderateScale: (size) => size,
  scale: (size) => size,
  verticalScale: (size) => size,
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock AIChefIcon
jest.mock('../../components/AIChefIcon', () => 'AIChefIcon');

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoadingAnimation from '../../components/LoadingAnimation';
import logger from '../../utils/logger';
import { Animated } from 'react-native';

describe('LoadingAnimation', () => {
  const defaultProps = {
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(
        <LoadingAnimation
          visible={true}
          title="Custom Title"
          subtitle="Custom Subtitle"
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render modal when visible', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(true);
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('fade');
    });

    it('should not render when not visible', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation visible={false} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(false);
    });

    it('should render default title when none provided', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should render custom title when provided', () => {
      render(
        <LoadingAnimation {...defaultProps} title="Custom Loading Title" />
      );
      
      expect(screen.getByText('Custom Loading Title')).toBeTruthy();
    });

    it('should render default subtitle when none provided', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should render custom subtitle when provided', () => {
      render(
        <LoadingAnimation {...defaultProps} subtitle="Custom Loading Subtitle" />
      );
      
      expect(screen.getByText('Custom Loading Subtitle')).toBeTruthy();
    });

    it('should render all loading steps', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(screen.getByText('🔍 Analyzing ingredients')).toBeTruthy();
      expect(screen.getByText('🧠 Processing with AI')).toBeTruthy();
      expect(screen.getByText('✨ Crafting perfect recipes')).toBeTruthy();
    });

    it('should render AIChefIcon with correct props', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const aiChefIcon = UNSAFE_getByType('AIChefIcon');
      expect(aiChefIcon.props.size).toBe(64); // moderateScale(64) = 64 in mock
      expect(aiChefIcon.props.variant).toBe('analyzing');
    });

    it('should render animated views', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      expect(animatedViews.length).toBe(2); // Main modal and icon container
    });
  });

  describe('Visibility', () => {
    it('should render when visible is true', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation visible={false} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(false);
    });

    it('should log visibility state', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(logger.debug).toHaveBeenCalledWith('🎬 LoadingAnimation: visible=true');
    });
  });

  describe('Animation Behavior', () => {
    it('should create animated values on mount', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(Animated.Value).toHaveBeenCalledWith(1); // aiPulseAnim
      expect(Animated.Value).toHaveBeenCalledWith(0.7); // aiOpacityAnim
    });

    it('should start animations when visible becomes true', () => {
      const { rerender } = render(<LoadingAnimation visible={false} />);
      
      // Clear previous calls
      jest.clearAllMocks();
      
      rerender(<LoadingAnimation visible={true} />);
      
      expect(Animated.loop).toHaveBeenCalled();
      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalled();
    });

    it('should configure pulse animation correctly', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 1.1,
          duration: 1000,
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

    it('should configure opacity animation correctly', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        })
      );
    });

    it('should apply transform styles to animated views', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      
      // Main modal should have transform and opacity
      const mainModal = animatedViews[0];
      expect(mainModal.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transform: expect.arrayContaining([
              expect.objectContaining({ scale: expect.anything() })
            ]),
            opacity: expect.anything(),
          })
        ])
      );
      
      // Icon container should have transform
      const iconContainer = animatedViews[1];
      expect(iconContainer.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transform: expect.arrayContaining([
              expect.objectContaining({ scale: expect.anything() })
            ])
          })
        ])
      );
    });

    it('should not start animations when not visible', () => {
      jest.clearAllMocks();
      
      render(<LoadingAnimation visible={false} />);
      
      // Animation setup happens in useEffect when visible changes
      // Since visible=false, no animations should start
      expect(Animated.loop).not.toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log when visibility changes to true', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(logger.debug).toHaveBeenCalledWith('🎬 LoadingAnimation: visible=true');
    });

    it('should log when visibility changes to false', () => {
      render(<LoadingAnimation visible={false} />);
      
      expect(logger.debug).toHaveBeenCalledWith('🎬 LoadingAnimation: visible=false');
    });

    it('should log on visibility state changes', () => {
      const { rerender } = render(<LoadingAnimation visible={false} />);
      
      jest.clearAllMocks();
      
      rerender(<LoadingAnimation visible={true} />);
      
      expect(logger.debug).toHaveBeenCalledWith('🎬 LoadingAnimation: visible=true');
    });
  });

  describe('Content Management', () => {
    it('should use default content when no custom content provided', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should merge custom title with default content', () => {
      render(
        <LoadingAnimation {...defaultProps} title="Custom AI Processing" />
      );
      
      expect(screen.getByText('Custom AI Processing')).toBeTruthy();
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
      expect(screen.getByText('🔍 Analyzing ingredients')).toBeTruthy();
    });

    it('should merge custom subtitle with default content', () => {
      render(
        <LoadingAnimation {...defaultProps} subtitle="Working on your request" />
      );
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
      expect(screen.getByText('Working on your request')).toBeTruthy();
      expect(screen.getByText('🧠 Processing with AI')).toBeTruthy();
    });

    it('should handle both custom title and subtitle', () => {
      render(
        <LoadingAnimation
          {...defaultProps}
          title="Custom Title"
          subtitle="Custom Subtitle"
        />
      );
      
      expect(screen.getByText('Custom Title')).toBeTruthy();
      expect(screen.getByText('Custom Subtitle')).toBeTruthy();
      expect(screen.getByText('✨ Crafting perfect recipes')).toBeTruthy();
    });

    it('should always show all default steps regardless of custom content', () => {
      render(
        <LoadingAnimation
          {...defaultProps}
          title="Custom"
          subtitle="Custom"
        />
      );
      
      const steps = [
        '🔍 Analyzing ingredients',
        '🧠 Processing with AI',
        '✨ Crafting perfect recipes'
      ];
      
      steps.forEach(step => {
        expect(screen.getByText(step)).toBeTruthy();
      });
    });
  });

  describe('Style Application', () => {
    it('should apply overlay styles', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const views = UNSAFE_getAllByType('View');
      const overlay = views[0]; // First view should be overlay
      
      expect(overlay.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          backgroundColor: "rgba(139, 69, 19, 0.4)",
          justifyContent: "center",
          alignItems: "center",
        })
      );
    });

    it('should apply modal container styles', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      const modalView = animatedViews[0];
      
      expect(modalView.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 30,
            margin: 40,
            borderWidth: 2,
            borderColor: "#FFB800",
          })
        ])
      );
    });

    it('should apply text styles correctly', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      
      // Find title text
      const titleText = texts.find(text => 
        text.props.children === '🤖 AI Chef Working...'
      );
      expect(titleText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 22,
          fontWeight: "bold",
          color: "#2D1B69",
          textAlign: "center",
        })
      );
      
      // Find subtitle text
      const subtitleText = texts.find(text => 
        text.props.children === 'Creating something delicious for you'
      );
      expect(subtitleText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 16,
          color: "#8E8E93",
          textAlign: "center",
        })
      );
    });

    it('should apply step text styles', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      
      // Find step texts
      const stepText = texts.find(text => 
        text.props.children === '🔍 Analyzing ingredients'
      );
      expect(stepText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 14,
          color: "#2D1B69",
          fontWeight: "500",
        })
      );
    });
  });

  describe('Lifecycle Management', () => {
    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<LoadingAnimation {...defaultProps} />);
      
      expect(() => unmount()).not.toThrow();
    });

    it('should restart animations when visibility changes from false to true', () => {
      const { rerender } = render(<LoadingAnimation visible={false} />);
      
      jest.clearAllMocks();
      
      rerender(<LoadingAnimation visible={true} />);
      
      expect(Animated.loop).toHaveBeenCalled();
    });

    it('should handle multiple visibility toggles', () => {
      const { rerender } = render(<LoadingAnimation visible={true} />);
      
      rerender(<LoadingAnimation visible={false} />);
      rerender(<LoadingAnimation visible={true} />);
      rerender(<LoadingAnimation visible={false} />);
      
      // Should not throw errors
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title', () => {
      render(<LoadingAnimation {...defaultProps} title="" />);
      
      // Should fall back to default
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should handle empty string subtitle', () => {
      render(<LoadingAnimation {...defaultProps} subtitle="" />);
      
      // Should fall back to default
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should handle null title', () => {
      render(<LoadingAnimation {...defaultProps} title={null as any} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should handle undefined title', () => {
      render(<LoadingAnimation {...defaultProps} title={undefined} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should handle very long title text', () => {
      const longTitle = 'A'.repeat(100);
      const { toJSON } = render(
        <LoadingAnimation {...defaultProps} title={longTitle} />
      );
      
      expect(toJSON()).toBeTruthy();
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('should handle very long subtitle text', () => {
      const longSubtitle = 'B'.repeat(200);
      const { toJSON } = render(
        <LoadingAnimation {...defaultProps} subtitle={longSubtitle} />
      );
      
      expect(toJSON()).toBeTruthy();
      expect(screen.getByText(longSubtitle)).toBeTruthy();
    });

    it('should handle special characters in title', () => {
      const specialTitle = '🚀 AI Chef™ Working... ñáéíóú';
      render(<LoadingAnimation {...defaultProps} title={specialTitle} />);
      
      expect(screen.getByText(specialTitle)).toBeTruthy();
    });

    it('should handle special characters in subtitle', () => {
      const specialSubtitle = 'Créating sömething delicious für yøu';
      render(<LoadingAnimation {...defaultProps} subtitle={specialSubtitle} />);
      
      expect(screen.getByText(specialSubtitle)).toBeTruthy();
    });

    it('should handle visibility changes', () => {
      const { rerender, UNSAFE_getByType } = render(<LoadingAnimation visible={false} />);
      
      let modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(false);
      
      rerender(<LoadingAnimation visible={true} />);
      
      modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(true);
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<LoadingAnimation {...defaultProps} />);
      
      // Re-render with same props
      rerender(<LoadingAnimation {...defaultProps} />);
      
      // Should not cause issues
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should handle rapid visibility changes', () => {
      const { rerender } = render(<LoadingAnimation visible={true} />);
      
      // Rapid changes
      for (let i = 0; i < 10; i++) {
        rerender(<LoadingAnimation visible={i % 2 === 0} />);
      }
      
      // Should not throw errors
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should use native driver for animations', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      // Verify all animation calls use native driver
      const timingCalls = Animated.timing.mock.calls;
      timingCalls.forEach(call => {
        const config = call[1];
        expect(config.useNativeDriver).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible text content', () => {
      render(<LoadingAnimation {...defaultProps} />);
      
      // All text should be accessible
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
      expect(screen.getByText('🔍 Analyzing ingredients')).toBeTruthy();
    });

    it('should maintain text hierarchy', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(5); // Title + subtitle + 3 steps
    });

    it('should center align text content', () => {
      const { UNSAFE_getAllByType } = render(<LoadingAnimation {...defaultProps} />);
      
      const texts = UNSAFE_getAllByType('Text');
      
      // Title and subtitle should be center aligned
      const titleText = texts.find(text => 
        text.props.children === '🤖 AI Chef Working...'
      );
      expect(titleText.props.style.textAlign).toBe('center');
      
      const subtitleText = texts.find(text => 
        text.props.children === 'Creating something delicious for you'
      );
      expect(subtitleText.props.style.textAlign).toBe('center');
    });
  });
});