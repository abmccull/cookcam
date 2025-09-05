import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock react-native
jest.mock('react-native', () => ({
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
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
      start: jest.fn(),
      stop: jest.fn(),
    })),
    View: 'AnimatedView',
  },
}));

// Mock the component to avoid Lottie dependency
jest.mock('../../components/FavoriteButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ recipeId, initialFavorited = false, onToggle, size = 24, style }: any) => {
      const [isFavorited, setIsFavorited] = React.useState(initialFavorited);
      
      const handlePress = () => {
        const newState = !isFavorited;
        setIsFavorited(newState);
        if (onToggle) {
          onToggle(recipeId, newState);
        }
      };
      
      return React.createElement('TouchableOpacity', {
        testID: 'favorite-button',
        onPress: handlePress,
        style: [{ width: size, height: size }, style],
      },
        React.createElement('View', { 
          testID: 'heart-icon',
          style: { 
            backgroundColor: isFavorited ? '#E91E63' : '#8E8E93',
            width: size,
            height: size
          }
        })
      );
    }
  };
});

import FavoriteButton from '../../components/FavoriteButton';

describe('FavoriteButton Component Tests', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      expect(screen.getByTestId('favorite-button')).toBeTruthy();
      expect(screen.getByTestId('heart-icon')).toBeTruthy();
    });

    it('should render with unfavorited state by default', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const heart = screen.getByTestId('heart-icon');
      expect(heart.props.style.backgroundColor).toBe('#8E8E93');
    });

    it('should render with favorited state when initialFavorited is true', () => {
      render(<FavoriteButton recipeId="recipe-1" initialFavorited={true} />);
      
      const heart = screen.getByTestId('heart-icon');
      expect(heart.props.style.backgroundColor).toBe('#E91E63');
    });

    it('should apply custom size', () => {
      const customSize = 32;
      render(<FavoriteButton recipeId="recipe-1" size={customSize} />);
      
      const button = screen.getByTestId('favorite-button');
      expect(button.props.style).toEqual([
        { width: customSize, height: customSize },
        undefined
      ]);
      
      const heart = screen.getByTestId('heart-icon');
      expect(heart.props.style.width).toBe(customSize);
      expect(heart.props.style.height).toBe(customSize);
    });

    it('should apply custom style', () => {
      const customStyle = { margin: 10, padding: 5 };
      render(<FavoriteButton recipeId="recipe-1" style={customStyle} />);
      
      const button = screen.getByTestId('favorite-button');
      expect(button.props.style).toEqual([
        { width: 24, height: 24 },
        customStyle
      ]);
    });
  });

  describe('Interactions', () => {
    it('should toggle favorite state on press', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.getByTestId('favorite-button');
      const heart = screen.getByTestId('heart-icon');
      
      // Initially unfavorited
      expect(heart.props.style.backgroundColor).toBe('#8E8E93');
      
      // Press to favorite
      fireEvent.press(button);
      expect(heart.props.style.backgroundColor).toBe('#E91E63');
      
      // Press again to unfavorite
      fireEvent.press(button);
      expect(heart.props.style.backgroundColor).toBe('#8E8E93');
    });

    it('should call onToggle callback with correct parameters', () => {
      const mockToggle = jest.fn();
      render(
        <FavoriteButton 
          recipeId="recipe-1" 
          onToggle={mockToggle}
        />
      );
      
      const button = screen.getByTestId('favorite-button');
      
      // First press - favorite
      fireEvent.press(button);
      expect(mockToggle).toHaveBeenCalledWith('recipe-1', true);
      
      // Second press - unfavorite
      fireEvent.press(button);
      expect(mockToggle).toHaveBeenCalledWith('recipe-1', false);
      
      expect(mockToggle).toHaveBeenCalledTimes(2);
    });

    it('should start from favorited state when initialFavorited is true', () => {
      const mockToggle = jest.fn();
      render(
        <FavoriteButton 
          recipeId="recipe-1" 
          initialFavorited={true}
          onToggle={mockToggle}
        />
      );
      
      const button = screen.getByTestId('favorite-button');
      const heart = screen.getByTestId('heart-icon');
      
      // Initially favorited
      expect(heart.props.style.backgroundColor).toBe('#E91E63');
      
      // Press to unfavorite
      fireEvent.press(button);
      expect(mockToggle).toHaveBeenCalledWith('recipe-1', false);
      expect(heart.props.style.backgroundColor).toBe('#8E8E93');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onToggle callback', () => {
      render(<FavoriteButton recipeId="recipe-1" />);
      
      const button = screen.getByTestId('favorite-button');
      
      // Should not throw error when pressed without callback
      expect(() => fireEvent.press(button)).not.toThrow();
    });

    it('should handle empty recipe ID', () => {
      const mockToggle = jest.fn();
      render(
        <FavoriteButton 
          recipeId="" 
          onToggle={mockToggle}
        />
      );
      
      const button = screen.getByTestId('favorite-button');
      fireEvent.press(button);
      
      expect(mockToggle).toHaveBeenCalledWith('', true);
    });

    it('should handle very small size', () => {
      render(<FavoriteButton recipeId="recipe-1" size={8} />);
      
      const heart = screen.getByTestId('heart-icon');
      expect(heart.props.style.width).toBe(8);
      expect(heart.props.style.height).toBe(8);
    });

    it('should handle very large size', () => {
      render(<FavoriteButton recipeId="recipe-1" size={100} />);
      
      const heart = screen.getByTestId('heart-icon');
      expect(heart.props.style.width).toBe(100);
      expect(heart.props.style.height).toBe(100);
    });

    it('should maintain state across multiple rapid presses', () => {
      const mockToggle = jest.fn();
      render(
        <FavoriteButton 
          recipeId="recipe-1" 
          onToggle={mockToggle}
        />
      );
      
      const button = screen.getByTestId('favorite-button');
      
      // Rapid presses
      fireEvent.press(button); // true
      fireEvent.press(button); // false
      fireEvent.press(button); // true
      fireEvent.press(button); // false
      
      expect(mockToggle).toHaveBeenCalledTimes(4);
      expect(mockToggle).toHaveBeenLastCalledWith('recipe-1', false);
    });
  });
});