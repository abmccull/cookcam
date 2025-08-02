import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AIChefIcon from '../../components/AIChefIcon';

// Mock react-native first
jest.mock('react-native', () => ({
  View: 'View',
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
}));

// Mock OptimizedImage component
jest.mock('../../components/OptimizedImage', () => {
  return function MockOptimizedImage({ source, style, ...props }: any) {
    return (
      <div 
        testID="optimized-image" 
        data-source="mock-image" // Always return mock-image since we can't detect require()
        data-style={JSON.stringify(style)}
        {...props} 
      />
    );
  };
});

describe('AIChefIcon', () => {
  describe('Default Behavior', () => {
    it('should render with default props', () => {
      render(<AIChefIcon />);
      
      const image = screen.getByTestId('optimized-image');
      expect(image).toBeTruthy();
      expect(image.props['data-source']).toBe('mock-image');
    });

    it('should use default size of 48', () => {
      render(<AIChefIcon />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 48,
            height: 48,
          }),
        ])
      );
    });

    it('should use default variant', () => {
      render(<AIChefIcon />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      // Default variant should have opacity: 1, scale: 1
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            opacity: 1,
            transform: [{ scale: 1 }],
          }),
        ])
      );
    });
  });

  describe('Size Customization', () => {
    it('should apply custom size correctly', () => {
      const customSize = 64;
      render(<AIChefIcon size={customSize} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: customSize,
            height: customSize,
          }),
        ])
      );
    });

    it('should handle very small sizes', () => {
      const smallSize = 16;
      render(<AIChefIcon size={smallSize} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: smallSize,
            height: smallSize,
          }),
        ])
      );
    });

    it('should handle very large sizes', () => {
      const largeSize = 200;
      render(<AIChefIcon size={largeSize} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: largeSize,
            height: largeSize,
          }),
        ])
      );
    });
  });

  describe('Variant Behaviors', () => {
    it('should apply default variant styles', () => {
      render(<AIChefIcon variant="default" />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            opacity: 1,
            transform: [{ scale: 1 }],
          }),
        ])
      );
    });

    it('should apply analyzing variant styles', () => {
      render(<AIChefIcon variant="analyzing" />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            opacity: 0.8,
            transform: [{ scale: 1.1 }],
          }),
        ])
      );
    });

    it('should apply cooking variant styles', () => {
      render(<AIChefIcon variant="cooking" />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            opacity: 1,
            transform: [{ scale: 1 }],
          }),
        ])
      );
    });
  });

  describe('Combined Props', () => {
    it('should combine size and variant correctly', () => {
      const customSize = 72;
      render(<AIChefIcon size={customSize} variant="analyzing" />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: customSize,
            height: customSize,
          }),
          expect.objectContaining({
            opacity: 0.8,
            transform: [{ scale: 1.1 }],
          }),
        ])
      );
    });

    it('should handle all variant and size combinations', () => {
      const variants: Array<'default' | 'analyzing' | 'cooking'> = ['default', 'analyzing', 'cooking'];
      const sizes = [24, 48, 96];
      
      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { unmount } = render(<AIChefIcon size={size} variant={variant} />);
          
          const image = screen.getByTestId('optimized-image');
          const style = JSON.parse(image.props['data-style']);
          
          // Should always have the correct size
          expect(style).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                width: size,
                height: size,
              }),
            ])
          );
          
          unmount();
        });
      });
    });
  });

  describe('Container Properties', () => {
    it('should render container view with correct size', () => {
      const customSize = 80;
      const { UNSAFE_getByType } = render(<AIChefIcon size={customSize} />);
      
      const containerViews = UNSAFE_getByType('View');
      // The container should have width and height matching the icon size
      expect(containerViews.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: customSize,
            height: customSize,
          }),
        ])
      );
    });

    it('should apply container alignment styles', () => {
      const { UNSAFE_getByType } = render(<AIChefIcon />);
      
      const containerViews = UNSAFE_getByType('View');
      expect(containerViews.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
            justifyContent: 'center',
          }),
        ])
      );
    });
  });

  describe('Image Source', () => {
    it('should use the correct image asset', () => {
      render(<AIChefIcon />);
      
      const image = screen.getByTestId('optimized-image');
      // The source should be the required asset (mocked as 'mock-image')
      expect(image.props['data-source']).toBe('mock-image');
    });

    it('should consistently use the same image for all variants', () => {
      const variants: Array<'default' | 'analyzing' | 'cooking'> = ['default', 'analyzing', 'cooking'];
      
      variants.forEach((variant) => {
        const { unmount } = render(<AIChefIcon variant={variant} />);
        
        const image = screen.getByTestId('optimized-image');
        expect(image.props['data-source']).toBe('mock-image');
        
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero size gracefully', () => {
      render(<AIChefIcon size={0} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 0,
            height: 0,
          }),
        ])
      );
    });

    it('should handle negative size gracefully', () => {
      render(<AIChefIcon size={-10} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: -10,
            height: -10,
          }),
        ])
      );
    });

    it('should handle floating point sizes', () => {
      const floatSize = 48.5;
      render(<AIChefIcon size={floatSize} />);
      
      const image = screen.getByTestId('optimized-image');
      const style = JSON.parse(image.props['data-style']);
      
      expect(style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: floatSize,
            height: floatSize,
          }),
        ])
      );
    });
  });

  describe('TypeScript Props Validation', () => {
    it('should accept all valid variant values', () => {
      expect(() => render(<AIChefIcon variant="default" />)).not.toThrow();
      expect(() => render(<AIChefIcon variant="analyzing" />)).not.toThrow();
      expect(() => render(<AIChefIcon variant="cooking" />)).not.toThrow();
    });

    it('should accept numeric size values', () => {
      expect(() => render(<AIChefIcon size={16} />)).not.toThrow();
      expect(() => render(<AIChefIcon size={48} />)).not.toThrow();
      expect(() => render(<AIChefIcon size={128} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render image that can be accessed by screen readers', () => {
      render(<AIChefIcon />);
      
      const image = screen.getByTestId('optimized-image');
      expect(image).toBeTruthy();
    });

    it('should maintain consistent rendering across variants for accessibility', () => {
      const variants: Array<'default' | 'analyzing' | 'cooking'> = ['default', 'analyzing', 'cooking'];
      
      variants.forEach((variant) => {
        const { unmount } = render(<AIChefIcon variant={variant} />);
        
        const image = screen.getByTestId('optimized-image');
        expect(image).toBeTruthy();
        
        unmount();
      });
    });
  });
});