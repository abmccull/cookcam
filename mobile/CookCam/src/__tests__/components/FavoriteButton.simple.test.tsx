import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock react-native first with minimal setup
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
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
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    View: 'AnimatedView',
  },
}));

// Mock Lottie
jest.mock('lottie-react-native', () => 'LottieView');

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Heart: ({ color, size, fill }: any) => {
    const MockView = 'Heart';
    return MockView;
  },
}));

// Now import the component
import FavoriteButton from '../../components/FavoriteButton';

describe('FavoriteButton Simple Test', () => {
  it('should render without crashing', () => {
    const { toJSON } = render(<FavoriteButton recipeId="test-1" />);
    expect(toJSON()).toBeTruthy();
  });

  it('should handle press events', () => {
    const mockToggle = jest.fn();
    const { UNSAFE_getByType } = render(
      <FavoriteButton 
        recipeId="test-1" 
        onToggle={mockToggle}
      />
    );
    
    const button = UNSAFE_getByType('TouchableOpacity');
    fireEvent.press(button);
    
    expect(mockToggle).toHaveBeenCalledWith('test-1', true);
  });

  it('should respect initial favorited state', () => {
    const mockToggle = jest.fn();
    const { UNSAFE_getByType } = render(
      <FavoriteButton 
        recipeId="test-1" 
        initialFavorited={true}
        onToggle={mockToggle}
      />
    );
    
    const button = UNSAFE_getByType('TouchableOpacity');
    fireEvent.press(button);
    
    // Should toggle to false when initially true
    expect(mockToggle).toHaveBeenCalledWith('test-1', false);
  });

  it('should apply custom size', () => {
    const { UNSAFE_getByType } = render(
      <FavoriteButton recipeId="test-1" size={32} />
    );
    
    const button = UNSAFE_getByType('TouchableOpacity');
    expect(button.props.style).toEqual(
      expect.objectContaining({
        width: 32,
        height: 32,
      })
    );
  });
});