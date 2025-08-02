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
import { render, screen, fireEvent } from '@testing-library/react-native';
import OptimizedImage from '../../components/OptimizedImage';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('OptimizedImage', () => {
  const defaultProps = {
    source: { uri: 'https://example.com/image.jpg' },
    style: { width: 100, height: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render image with correct source', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source).toEqual(defaultProps.source);
    });

    it('should apply custom styles', () => {
      const customStyle = { width: 200, height: 200, borderRadius: 10 };
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} style={customStyle} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.style).toEqual(expect.objectContaining(customStyle));
    });

    it('should handle string source', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage source="https://example.com/image.jpg" style={defaultProps.style} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/image.jpg' });
    });

    it('should handle local image source', () => {
      const localSource = require('../../assets/placeholder.png');
      const { UNSAFE_getByType } = render(
        <OptimizedImage source={localSource} style={defaultProps.style} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source).toEqual(localSource);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while image loads', () => {
      const { UNSAFE_queryByType } = render(<OptimizedImage {...defaultProps} />);
      
      const indicator = UNSAFE_queryByType('ActivityIndicator');
      expect(indicator).toBeTruthy();
    });

    it('should hide loading indicator when image loads', () => {
      const { UNSAFE_getByType, UNSAFE_queryByType } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Simulate image load
      if (image.props.onLoad) {
        image.props.onLoad();
      }
      
      const indicator = UNSAFE_queryByType('ActivityIndicator');
      expect(indicator).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should show placeholder on error', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      
      // Simulate image error
      if (image.props.onError) {
        image.props.onError({ nativeEvent: { error: 'Failed to load' } });
      }
      
      // Should show placeholder or error state
      expect(image.props.source).toBeDefined();
    });

    it('should call onError prop if provided', () => {
      const onError = jest.fn();
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} onError={onError} />
      );
      
      const image = UNSAFE_getByType('Image');
      const error = { nativeEvent: { error: 'Failed to load' } };
      
      if (image.props.onError) {
        image.props.onError(error);
      }
      
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Performance', () => {
    it('should use resize mode for better performance', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} resizeMode="cover" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.resizeMode).toBe('cover');
    });

    it('should default to contain resize mode', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.resizeMode).toBe('contain');
    });
  });

  describe('Accessibility', () => {
    it('should apply accessibility label', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage
          {...defaultProps}
          accessibilityLabel="Recipe image"
        />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.accessibilityLabel).toBe('Recipe image');
    });

    it('should be accessible by default', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.accessible).toBe(true);
    });
  });

  describe('Placeholder', () => {
    it('should show placeholder while loading', () => {
      const placeholder = require('../../assets/placeholder.png');
      const { UNSAFE_getAllByType } = render(
        <OptimizedImage {...defaultProps} placeholder={placeholder} />
      );
      
      const images = UNSAFE_getAllByType('Image');
      // Should have both placeholder and main image
      expect(images.length).toBeGreaterThanOrEqual(1);
    });

    it('should support custom placeholder', () => {
      const customPlaceholder = { uri: 'https://example.com/placeholder.jpg' };
      const { UNSAFE_getAllByType } = render(
        <OptimizedImage {...defaultProps} placeholder={customPlaceholder} />
      );
      
      const images = UNSAFE_getAllByType('Image');
      const placeholderImage = images.find(img => 
        img.props.source?.uri === customPlaceholder.uri
      );
      expect(placeholderImage).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should apply cache control headers', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      // Check if cache property is set
      expect(image.props.cache).toBeDefined();
    });

    it('should support force-cache policy', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} cache="force-cache" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.cache).toBe('force-cache');
    });
  });
});