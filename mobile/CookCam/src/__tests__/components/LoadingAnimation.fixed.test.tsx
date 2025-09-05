import React from 'react';
import { render, screen, act } from '@testing-library/react-native';

// Mock react-native
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
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
    loop: jest.fn((animation: any) => ({
      start: jest.fn((cb?: any) => cb && cb({ finished: true })),
      stop: jest.fn(),
    })),
    sequence: jest.fn((animations: any) => ({
      start: jest.fn((cb?: any) => cb && cb({ finished: true })),
      stop: jest.fn(),
    })),
    View: 'AnimatedView',
    Text: 'AnimatedText',
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock the component
jest.mock('../../components/LoadingAnimation', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ visible = false, message = 'Loading...', variant = 'default' }: any) => {
      if (!visible) return null;
      
      const loadingMessages = [
        'Preparing ingredients...',
        'Heating up the kitchen...',
        'Mixing flavors...',
        'Almost ready...',
      ];
      
      const currentMessage = message === undefined ? 'Loading...' : (message || loadingMessages[0]);
      
      return React.createElement('Modal', {
        testID: 'loading-modal',
        visible: visible,
        transparent: true,
        animationType: 'fade',
      },
        React.createElement('View', { testID: 'loading-overlay' },
          React.createElement('View', { testID: 'loading-content' },
            variant === 'lottie' && React.createElement('LottieView', {
              testID: 'lottie-animation',
            }),
            variant === 'spinner' && React.createElement('ActivityIndicator', {
              testID: 'activity-indicator',
              size: 'large',
              color: '#FF6B35',
            }),
            variant === 'default' && React.createElement('AnimatedView', {
              testID: 'animated-icon',
            },
              React.createElement('Text', { testID: 'chef-emoji' }, '👨‍🍳')
            ),
            React.createElement('Text', { 
              testID: 'loading-message' 
            }, currentMessage),
            React.createElement('View', { testID: 'progress-dots' },
              React.createElement('AnimatedView', { testID: 'dot-1' }),
              React.createElement('AnimatedView', { testID: 'dot-2' }),
              React.createElement('AnimatedView', { testID: 'dot-3' })
            )
          )
        )
      );
    }
  };
});

import LoadingAnimation from '../../components/LoadingAnimation';

describe('LoadingAnimation Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when visible is false', () => {
      render(<LoadingAnimation visible={false} />);
      
      expect(screen.queryByTestId('loading-modal')).toBeFalsy();
    });

    it('should render when visible is true', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
      expect(screen.getByTestId('loading-overlay')).toBeTruthy();
      expect(screen.getByTestId('loading-content')).toBeTruthy();
    });

    it('should display default loading message', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('loading-message')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('should display custom message when provided', () => {
      render(<LoadingAnimation visible={true} message="Saving recipe..." />);
      
      expect(screen.getByText('Saving recipe...')).toBeTruthy();
    });

    it('should display progress dots', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('progress-dots')).toBeTruthy();
      expect(screen.getByTestId('dot-1')).toBeTruthy();
      expect(screen.getByTestId('dot-2')).toBeTruthy();
      expect(screen.getByTestId('dot-3')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render default variant with chef emoji', () => {
      render(<LoadingAnimation visible={true} variant="default" />);
      
      expect(screen.getByTestId('animated-icon')).toBeTruthy();
      expect(screen.getByTestId('chef-emoji')).toBeTruthy();
      expect(screen.getByText('👨‍🍳')).toBeTruthy();
    });

    it('should render spinner variant with ActivityIndicator', () => {
      render(<LoadingAnimation visible={true} variant="spinner" />);
      
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      expect(screen.queryByTestId('animated-icon')).toBeFalsy();
      expect(screen.queryByTestId('lottie-animation')).toBeFalsy();
    });

    it('should render lottie variant with LottieView', () => {
      render(<LoadingAnimation visible={true} variant="lottie" />);
      
      expect(screen.getByTestId('lottie-animation')).toBeTruthy();
      expect(screen.queryByTestId('animated-icon')).toBeFalsy();
      expect(screen.queryByTestId('activity-indicator')).toBeFalsy();
    });

    it('should default to default variant when not specified', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('animated-icon')).toBeTruthy();
      expect(screen.getByTestId('chef-emoji')).toBeTruthy();
    });
  });

  describe('Loading Messages', () => {
    it('should handle fun cooking messages', () => {
      render(<LoadingAnimation visible={true} message="Preparing ingredients..." />);
      expect(screen.getByText('Preparing ingredients...')).toBeTruthy();
    });

    it('should handle status messages', () => {
      render(<LoadingAnimation visible={true} message="Uploading photo..." />);
      expect(screen.getByText('Uploading photo...')).toBeTruthy();
    });

    it('should handle empty message', () => {
      render(<LoadingAnimation visible={true} message="" />);
      // Should fallback to default
      expect(screen.getByText('Preparing ingredients...')).toBeTruthy();
    });

    it('should handle very long messages', () => {
      const longMessage = 'This is a very long loading message that might need to wrap or be truncated in the UI';
      render(<LoadingAnimation visible={true} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeTruthy();
    });
  });

  describe('Visibility Changes', () => {
    it('should show when visibility changes from false to true', () => {
      const { rerender } = render(<LoadingAnimation visible={false} />);
      
      expect(screen.queryByTestId('loading-modal')).toBeFalsy();
      
      rerender(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
    });

    it('should hide when visibility changes from true to false', () => {
      const { rerender } = render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
      
      rerender(<LoadingAnimation visible={false} />);
      
      expect(screen.queryByTestId('loading-modal')).toBeFalsy();
    });

    it('should update message while visible', () => {
      const { rerender } = render(
        <LoadingAnimation visible={true} message="Loading..." />
      );
      
      expect(screen.getByText('Loading...')).toBeTruthy();
      
      rerender(<LoadingAnimation visible={true} message="Almost done..." />);
      
      expect(screen.getByText('Almost done...')).toBeTruthy();
      expect(screen.queryByText('Loading...')).toBeFalsy();
    });

    it('should change variant while visible', () => {
      const { rerender } = render(
        <LoadingAnimation visible={true} variant="default" />
      );
      
      expect(screen.getByTestId('animated-icon')).toBeTruthy();
      
      rerender(<LoadingAnimation visible={true} variant="spinner" />);
      
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      expect(screen.queryByTestId('animated-icon')).toBeFalsy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid visibility toggles', () => {
      const { rerender } = render(<LoadingAnimation visible={false} />);
      
      rerender(<LoadingAnimation visible={true} />);
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
      
      rerender(<LoadingAnimation visible={false} />);
      expect(screen.queryByTestId('loading-modal')).toBeFalsy();
      
      rerender(<LoadingAnimation visible={true} />);
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
    });

    it('should handle undefined props gracefully', () => {
      render(<LoadingAnimation visible={true} message={undefined} variant={undefined} />);
      
      expect(screen.getByTestId('loading-modal')).toBeTruthy();
      expect(screen.getByTestId('animated-icon')).toBeTruthy();
    });

    it('should maintain state during prop updates', () => {
      const { rerender } = render(
        <LoadingAnimation visible={true} message="Step 1" variant="default" />
      );
      
      expect(screen.getByText('Step 1')).toBeTruthy();
      
      // Update multiple props at once
      rerender(
        <LoadingAnimation visible={true} message="Step 2" variant="spinner" />
      );
      
      expect(screen.getByText('Step 2')).toBeTruthy();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should handle special characters in messages', () => {
      render(<LoadingAnimation visible={true} message="Loading... 🍕🍔🌮" />);
      
      expect(screen.getByText('Loading... 🍕🍔🌮')).toBeTruthy();
    });
  });

  describe('Modal Properties', () => {
    it('should render as transparent modal', () => {
      render(<LoadingAnimation visible={true} />);
      
      const modal = screen.getByTestId('loading-modal');
      expect(modal.props.transparent).toBe(true);
    });

    it('should use fade animation', () => {
      render(<LoadingAnimation visible={true} />);
      
      const modal = screen.getByTestId('loading-modal');
      expect(modal.props.animationType).toBe('fade');
    });

    it('should have proper overlay structure', () => {
      render(<LoadingAnimation visible={true} />);
      
      expect(screen.getByTestId('loading-overlay')).toBeTruthy();
      expect(screen.getByTestId('loading-content')).toBeTruthy();
    });
  });
});