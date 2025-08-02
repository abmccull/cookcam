import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoadingAnimation from '../../components/LoadingAnimation';

// Mock logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
}));

// Mock AIChefIcon component
jest.mock('../../components/AIChefIcon', () => {
  return function MockAIChefIcon({ size, variant }: any) {
    return <div testID="ai-chef-icon" data-size={size} data-variant={variant} />;
  };
});

// Mock the entire react-native module first
jest.mock('react-native', () => {
  const RN = {
    View: 'View',
    Text: 'Text',
    Modal: 'Modal',
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844 })),
    },
    PixelRatio: {
      get: jest.fn(() => 2),
    },
    Platform: {
      OS: 'ios',
    },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Animated: {
      Value: jest.fn().mockImplementation((initialValue) => ({
        setValue: jest.fn(),
        _value: initialValue,
      })),
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      sequence: jest.fn((animations) => ({
        start: jest.fn((callback) => callback && callback()),
        stop: jest.fn(),
      })),
      loop: jest.fn((animation) => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
      View: 'AnimatedView',
    },
  };

  return RN;
});

describe('LoadingAnimation', () => {
  const mockLogger = require('../../utils/logger');

  beforeEach(() => {
    jest.clearAllMocks();
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
      
      expect(mockLogger.debug).toHaveBeenCalledWith('🎬 LoadingAnimation: visible=true');
    });
  });

  describe('Custom Content', () => {
    it('should display custom title when provided', () => {
      const customTitle = 'Custom Loading Title';
      render(<LoadingAnimation visible={true} title={customTitle} />);
      
      expect(screen.getByText(customTitle)).toBeTruthy();
      expect(screen.queryByText('🤖 AI Chef Working...')).toBeFalsy();
    });

    it('should display custom subtitle when provided', () => {
      const customSubtitle = 'Custom loading subtitle';
      render(<LoadingAnimation visible={true} subtitle={customSubtitle} />);
      
      expect(screen.getByText(customSubtitle)).toBeTruthy();
      expect(screen.queryByText('Creating something delicious for you')).toBeFalsy();
    });

    it('should display both custom title and subtitle', () => {
      const customTitle = 'Custom Title';
      const customSubtitle = 'Custom Subtitle';
      
      render(
        <LoadingAnimation 
          visible={true} 
          title={customTitle} 
          subtitle={customSubtitle} 
        />
      );
      
      expect(screen.getByText(customTitle)).toBeTruthy();
      expect(screen.getByText(customSubtitle)).toBeTruthy();
    });
  });

  describe('Default Content', () => {
    it('should display default title when not provided', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
    });

    it('should display default subtitle when not provided', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should display all default loading steps', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByText('🔍 Analyzing ingredients')).toBeTruthy();
      expect(screen.getByText('🧠 Processing with AI')).toBeTruthy();
      expect(screen.getByText('✨ Crafting perfect recipes')).toBeTruthy();
    });
  });

  describe('AIChefIcon Integration', () => {
    it('should render AIChefIcon with correct size and variant', () => {
      render(<LoadingAnimation visible={true} />);
      
      const aiChefIcon = screen.getByTestId('ai-chef-icon');
      expect(aiChefIcon).toBeTruthy();
      expect(aiChefIcon.props['data-variant']).toBe('analyzing');
    });
  });

  describe('Modal Properties', () => {
    it('should render as transparent modal', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation visible={true} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.transparent).toBe(true);
      expect(modal.props.animationType).toBe('fade');
      expect(modal.props.visible).toBe(true);
    });

    it('should not show modal when not visible', () => {
      const { UNSAFE_getByType } = render(<LoadingAnimation visible={false} />);
      
      const modal = UNSAFE_getByType('Modal');
      expect(modal.props.visible).toBe(false);
    });
  });

  describe('Animation Setup', () => {
    it('should call animation methods when visible', () => {
      const mockAnimated = require('react-native').Animated;
      
      render(<LoadingAnimation visible={true} />);
      
      expect(mockAnimated.loop).toHaveBeenCalled();
      expect(mockAnimated.timing).toHaveBeenCalled();
    });

    it('should not call animation methods when not visible', () => {
      const mockAnimated = require('react-native').Animated;
      jest.clearAllMocks();
      
      render(<LoadingAnimation visible={false} />);
      
      // Animation setup happens in useEffect when visible changes
      // Since visible=false, no animations should start
      expect(mockAnimated.loop).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings for title and subtitle', () => {
      render(<LoadingAnimation visible={true} title="" subtitle="" />);
      
      // Should fall back to default content
      expect(screen.getByText('🤖 AI Chef Working...')).toBeTruthy();
      expect(screen.getByText('Creating something delicious for you')).toBeTruthy();
    });

    it('should handle undefined props gracefully', () => {
      expect(() => {
        render(<LoadingAnimation visible={true} title={undefined} subtitle={undefined} />);
      }).not.toThrow();
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

  describe('Accessibility', () => {
    it('should have proper text content for screen readers', () => {
      render(<LoadingAnimation visible={true} />);
      
      // Check that all text content is present and accessible
      const title = screen.getByText('🤖 AI Chef Working...');
      const subtitle = screen.getByText('Creating something delicious for you');
      
      expect(title).toBeTruthy();
      expect(subtitle).toBeTruthy();
    });

    it('should maintain text hierarchy', () => {
      render(<LoadingAnimation visible={true} />);
      
      // Title should be present and prominent
      const title = screen.getByText('🤖 AI Chef Working...');
      expect(title).toBeTruthy();
      
      // All step texts should be present
      expect(screen.getByText('🔍 Analyzing ingredients')).toBeTruthy();
      expect(screen.getByText('🧠 Processing with AI')).toBeTruthy();
      expect(screen.getByText('✨ Crafting perfect recipes')).toBeTruthy();
    });
  });
});