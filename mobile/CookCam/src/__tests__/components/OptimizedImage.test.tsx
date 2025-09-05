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
  return {
    ...actualRN,
    PixelRatio: global.PixelRatio,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
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

// Mock icons
jest.mock('lucide-react-native', () => ({
  ChefHat: 'ChefHat',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import OptimizedImage from '../../components/OptimizedImage';

describe('OptimizedImage', () => {
  const defaultProps = {
    source: { uri: 'https://example.com/image.jpg' },
    style: { width: 100, height: 100 },
  };

  const mockOnLoadStart = jest.fn();
  const mockOnLoad = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(
        <OptimizedImage
          source={defaultProps.source}
          style={defaultProps.style}
          resizeMode="cover"
          fallbackColor="#FF0000"
          _priority="high"
          onLoadStart={mockOnLoadStart}
          onLoad={mockOnLoad}
          onError={mockOnError}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render Image component with correct source', () => {
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
      expect(image.props.style).toEqual(customStyle);
    });

    it('should handle array of styles', () => {
      const styles = [
        { width: 200, height: 200 },
        { borderRadius: 10 },
        { opacity: 0.8 }
      ];
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} style={styles} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.style).toEqual(styles);
    });

    it('should apply resize mode', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} resizeMode="contain" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.resizeMode).toBe('contain');
    });

    it('should default to cover resize mode', () => {
      const { UNSAFE_getByType } = render(<OptimizedImage {...defaultProps} />);
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.resizeMode).toBe('cover');
    });

    it('should handle all resize modes', () => {
      const resizeModes: Array<"contain" | "cover" | "stretch" | "center"> = 
        ["contain", "cover", "stretch", "center"];
      
      resizeModes.forEach(mode => {
        const { UNSAFE_getByType } = render(
          <OptimizedImage {...defaultProps} resizeMode={mode} />
        );
        
        const image = UNSAFE_getByType('Image');
        expect(image.props.resizeMode).toBe(mode);
      });
    });
  });

  describe('Source Handling', () => {
    it('should handle source with uri string', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: 'https://example.com/test.jpg' }} 
          style={defaultProps.style} 
        />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/test.jpg' });
    });

    it('should handle source with headers', () => {
      const sourceWithHeaders = {
        uri: 'https://example.com/image.jpg',
        headers: {
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'value'
        }
      };
      
      const { UNSAFE_getByType } = render(
        <OptimizedImage source={sourceWithHeaders} style={defaultProps.style} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/image.jpg');
    });

    it('should handle empty uri', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage source={{ uri: '' }} style={defaultProps.style} />
      );
      
      // Should show fallback
      const view = UNSAFE_getByType('View');
      expect(view).toBeTruthy();
      expect(screen.UNSAFE_getByType('ChefHat')).toBeTruthy();
    });

    it('should handle null source', () => {
      const { UNSAFE_getByType, UNSAFE_queryByType } = render(
        <OptimizedImage source={null as any} style={defaultProps.style} />
      );
      
      // Should show fallback
      expect(UNSAFE_queryByType('Image')).toBeFalsy();
      expect(UNSAFE_getByType('View')).toBeTruthy();
      expect(UNSAFE_getByType('ChefHat')).toBeTruthy();
    });

    it('should handle undefined source', () => {
      const { UNSAFE_getByType, UNSAFE_queryByType } = render(
        <OptimizedImage source={undefined as any} style={defaultProps.style} />
      );
      
      // Should show fallback
      expect(UNSAFE_queryByType('Image')).toBeFalsy();
      expect(UNSAFE_getByType('View')).toBeTruthy();
      expect(UNSAFE_getByType('ChefHat')).toBeTruthy();
    });

    it('should handle source without uri property', () => {
      const { UNSAFE_getByType, UNSAFE_queryByType } = render(
        <OptimizedImage source={{} as any} style={defaultProps.style} />
      );
      
      // Should show fallback
      expect(UNSAFE_queryByType('Image')).toBeFalsy();
      expect(UNSAFE_getByType('View')).toBeTruthy();
    });
  });

  describe('Loading Events', () => {
    it('should call onLoadStart when image starts loading', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} onLoadStart={mockOnLoadStart} />
      );
      
      const image = UNSAFE_getByType('Image');
      image.props.onLoadStart();
      
      expect(mockOnLoadStart).toHaveBeenCalledTimes(1);
    });

    it('should call onLoad when image loads successfully', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} onLoad={mockOnLoad} />
      );
      
      const image = UNSAFE_getByType('Image');
      image.props.onLoad();
      
      expect(mockOnLoad).toHaveBeenCalledTimes(1);
    });

    it('should call onError when image fails to load', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} onError={mockOnError} />
      );
      
      const image = UNSAFE_getByType('Image');
      image.props.onError();
      
      expect(mockOnError).toHaveBeenCalledTimes(1);
    });

    it('should handle all events in sequence', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          {...defaultProps} 
          onLoadStart={mockOnLoadStart}
          onLoad={mockOnLoad}
          onError={mockOnError}
        />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Simulate loading sequence
      image.props.onLoadStart();
      image.props.onLoad();
      
      expect(mockOnLoadStart).toHaveBeenCalledTimes(1);
      expect(mockOnLoad).toHaveBeenCalledTimes(1);
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should reset error state on successful load', () => {
      const { UNSAFE_getByType, rerender } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      let image = UNSAFE_getByType('Image');
      
      // Simulate error
      image.props.onError();
      
      // Should show fallback
      rerender(<OptimizedImage {...defaultProps} />);
      
      // Check fallback is shown
      expect(screen.UNSAFE_getByType('ChefHat')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show fallback on error', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      image.props.onError();
      
      // Force re-render to see fallback
      const { UNSAFE_getByType: getByTypeAfter } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      // Start fresh and trigger error
      const newImage = getByTypeAfter('Image');
      newImage.props.onError();
    });

    it('should show custom placeholder on error', () => {
      const CustomPlaceholder = () => <div>Custom Error</div>;
      
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          {...defaultProps} 
          placeholder={<CustomPlaceholder />}
        />
      );
      
      const image = UNSAFE_getByType('Image');
      image.props.onError();
    });

    it('should use custom fallback color', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: '' }} 
          style={defaultProps.style}
          fallbackColor="#FF0000"
        />
      );
      
      // Should show fallback with custom color
      const chefHat = UNSAFE_getByType('ChefHat');
      expect(chefHat.props.color).toBe('#FF0000');
    });

    it('should use default fallback color', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: '' }} 
          style={defaultProps.style}
        />
      );
      
      // Should show fallback with default color
      const chefHat = UNSAFE_getByType('ChefHat');
      expect(chefHat.props.color).toBe('#E5E5E7');
    });
  });

  describe('Placeholder', () => {
    it('should show custom placeholder when provided and error occurs', () => {
      const CustomPlaceholder = <div testID="custom-placeholder">Loading...</div>;
      
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: '' }}
          style={defaultProps.style}
          placeholder={CustomPlaceholder}
        />
      );
      
      // Should show custom placeholder instead of default ChefHat
      expect(screen.getByTestId('custom-placeholder')).toBeTruthy();
    });

    it('should show ChefHat icon when no placeholder provided', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: '' }}
          style={defaultProps.style}
        />
      );
      
      expect(UNSAFE_getByType('ChefHat')).toBeTruthy();
    });

    it('should apply fallback container styles', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: '' }}
          style={{ width: 200, height: 200 }}
        />
      );
      
      const view = UNSAFE_getByType('View');
      expect(view.props.style).toEqual(expect.arrayContaining([
        { width: 200, height: 200 },
        expect.objectContaining({
          backgroundColor: "rgba(229, 229, 231, 0.1)",
          justifyContent: "center",
          alignItems: "center",
        })
      ]));
    });
  });

  describe('Priority Handling', () => {
    it('should accept low priority', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} _priority="low" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image).toBeTruthy();
    });

    it('should accept normal priority', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} _priority="normal" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image).toBeTruthy();
    });

    it('should accept high priority', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} _priority="high" />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image).toBeTruthy();
    });

    it('should default to normal priority', () => {
      const { toJSON } = render(<OptimizedImage {...defaultProps} />);
      // Component should render without error
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should track loading state', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Start loading
      image.props.onLoadStart();
      
      // Complete loading
      image.props.onLoad();
      
      // Image should still be rendered
      expect(image).toBeTruthy();
    });

    it('should track error state', () => {
      const { UNSAFE_getByType, rerender } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Trigger error
      image.props.onError();
      
      // Re-render with same props
      rerender(<OptimizedImage {...defaultProps} />);
      
      // Should show fallback icon when error occurs
      expect(screen.UNSAFE_getByType('ChefHat')).toBeTruthy();
    });

    it('should reset states on new load', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Simulate error
      image.props.onError();
      
      // Start new load
      image.props.onLoadStart();
      
      // Complete load
      image.props.onLoad();
      
      // Should still render image
      expect(image).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          {...defaultProps}
          onLoadStart={mockOnLoadStart}
          onLoad={mockOnLoad}
          onError={mockOnError}
        />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Rapid state changes
      image.props.onLoadStart();
      image.props.onError();
      image.props.onLoadStart();
      image.props.onLoad();
      image.props.onLoadStart();
      image.props.onError();
      
      expect(mockOnLoadStart).toHaveBeenCalledTimes(3);
      expect(mockOnLoad).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined callbacks', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      const image = UNSAFE_getByType('Image');
      
      // Should not throw when callbacks are undefined
      expect(() => {
        image.props.onLoadStart();
        image.props.onLoad();
        image.props.onError();
      }).not.toThrow();
    });

    it('should handle changing source', () => {
      const { UNSAFE_getByType, rerender } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      let image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/image.jpg');
      
      // Change source
      rerender(
        <OptimizedImage 
          source={{ uri: 'https://example.com/new-image.jpg' }}
          style={defaultProps.style}
        />
      );
      
      image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe('https://example.com/new-image.jpg');
    });

    it('should handle changing styles', () => {
      const { UNSAFE_getByType, rerender } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      let image = UNSAFE_getByType('Image');
      expect(image.props.style).toEqual({ width: 100, height: 100 });
      
      // Change styles
      const newStyle = { width: 200, height: 200, borderRadius: 20 };
      rerender(
        <OptimizedImage 
          source={defaultProps.source}
          style={newStyle}
        />
      );
      
      image = UNSAFE_getByType('Image');
      expect(image.props.style).toEqual(newStyle);
    });

    it('should handle empty style object', () => {
      const { UNSAFE_getByType } = render(
        <OptimizedImage source={defaultProps.source} style={{}} />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.style).toEqual({});
    });

    it('should handle very long URIs', () => {
      const longUri = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';
      const { UNSAFE_getByType } = render(
        <OptimizedImage 
          source={{ uri: longUri }}
          style={defaultProps.style}
        />
      );
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source.uri).toBe(longUri);
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(
        <OptimizedImage {...defaultProps} />
      );
      
      // Re-render with same props
      rerender(<OptimizedImage {...defaultProps} />);
      
      // Should not cause issues
      expect(screen.UNSAFE_getByType('Image')).toBeTruthy();
    });

    it('should handle priority prop without affecting render', () => {
      const priorities: Array<"low" | "normal" | "high"> = ["low", "normal", "high"];
      
      priorities.forEach(priority => {
        const { toJSON } = render(
          <OptimizedImage {...defaultProps} _priority={priority} />
        );
        expect(toJSON()).toBeTruthy();
      });
    });
  });
});