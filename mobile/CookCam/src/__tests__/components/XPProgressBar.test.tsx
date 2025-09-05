import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock react-native first
jest.mock('react-native', () => {
  const createMockAnimatedValue = (initialValue: number) => ({
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
    start: jest.fn((callback?: (result: any) => void) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));

  return {
    View: 'View',
    Text: 'Text',
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
      Value: jest.fn(createMockAnimatedValue),
      timing: mockTiming,
      View: 'AnimatedView',
    },
  };
});

// Mock GamificationContext before component import
const mockGamificationContext = {
  xp: 150,
  level: 2,
  levelProgress: 60,
  nextLevelXP: 250,
  addXP: jest.fn(),
  levelUp: jest.fn(),
  checkAchievements: jest.fn(),
  achievements: [],
  streakCount: 0,
  lastCheckIn: null,
  canCheckIn: true,
  performCheckIn: jest.fn(),
  weeklyStreak: 0,
  isLoading: false,
  error: null,
};

jest.mock('../../context/GamificationContext', () => ({
  useGamification: () => mockGamificationContext,
}));

// Now import the component after all mocks are set up
import XPProgressBar from '../../components/XPProgressBar';

describe('XPProgressBar', () => {
  const defaultProps = {};

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock gamification context to default values
    mockGamificationContext.xp = 150;
    mockGamificationContext.level = 2;
    mockGamificationContext.levelProgress = 60;
    mockGamificationContext.nextLevelXP = 250;
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(
        <XPProgressBar 
          showLabels={true}
          height={32}
          style={{ margin: 10 }}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with default props', () => {
      render(<XPProgressBar />);

      expect(screen.getByText('Level 2')).toBeTruthy();
      expect(screen.getByText('150 / 250 XP')).toBeTruthy();
      expect(screen.getByText('60%')).toBeTruthy();
    });

    it('should render without labels when showLabels is false', () => {
      render(<XPProgressBar showLabels={false} />);

      expect(screen.queryByText('Level 2')).toBeFalsy();
      expect(screen.queryByText('150 / 250 XP')).toBeFalsy();
      expect(screen.queryByText('60%')).toBeFalsy();
    });

    it('should render animated views for progress bar', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      expect(animatedViews.length).toBe(2); // Progress fill and shimmer
    });

    it('should apply custom height', () => {
      const customHeight = 32;
      const { UNSAFE_getAllByType } = render(
        <XPProgressBar height={customHeight} />
      );
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      animatedViews.forEach(view => {
        expect(view.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ height: customHeight })
          ])
        );
      });
    });

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red', margin: 10 };
      const { UNSAFE_getAllByType } = render(
        <XPProgressBar style={customStyle} />
      );
      
      const views = UNSAFE_getAllByType('View');
      const containerView = views[0];
      expect(containerView.props.style).toEqual(
        expect.arrayContaining([customStyle])
      );
    });
  });

  describe('Gamification Context Integration', () => {
    it('should display correct level from context', () => {
      mockGamificationContext.level = 5;
      render(<XPProgressBar />);

      expect(screen.getByText('Level 5')).toBeTruthy();
    });

    it('should display correct XP values from context', () => {
      mockGamificationContext.xp = 350;
      mockGamificationContext.nextLevelXP = 500;
      render(<XPProgressBar />);

      expect(screen.getByText('350 / 500 XP')).toBeTruthy();
    });

    it('should display correct progress percentage from context', () => {
      mockGamificationContext.levelProgress = 75;
      render(<XPProgressBar />);

      expect(screen.getByText('75%')).toBeTruthy();
    });

    it('should handle zero values from context', () => {
      mockGamificationContext.xp = 0;
      mockGamificationContext.level = 1;
      mockGamificationContext.levelProgress = 0;
      mockGamificationContext.nextLevelXP = 100;
      
      render(<XPProgressBar />);

      expect(screen.getByText('Level 1')).toBeTruthy();
      expect(screen.getByText('0 / 100 XP')).toBeTruthy();
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('should handle high values from context', () => {
      mockGamificationContext.xp = 999999;
      mockGamificationContext.level = 999;
      mockGamificationContext.levelProgress = 100;
      mockGamificationContext.nextLevelXP = 1000000;
      
      render(<XPProgressBar />);

      expect(screen.getByText('Level 999')).toBeTruthy();
      expect(screen.getByText('999999 / 1000000 XP')).toBeTruthy();
      expect(screen.getByText('100%')).toBeTruthy();
    });
  });

  describe('Animation Behavior', () => {
    it('should create animated value on mount', () => {
      render(<XPProgressBar />);
      
      expect(Animated.Value).toHaveBeenCalledWith(0);
    });

    it('should start animation with correct progress value', () => {
      mockGamificationContext.levelProgress = 80;
      render(<XPProgressBar />);
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 80,
          duration: 1000,
          useNativeDriver: false,
        })
      );
    });

    it('should animate when progress changes', () => {
      const { rerender } = render(<XPProgressBar />);
      
      jest.clearAllMocks();
      
      // Change progress
      mockGamificationContext.levelProgress = 90;
      rerender(<XPProgressBar />);
      
      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 90,
          duration: 1000,
          useNativeDriver: false,
        })
      );
    });

    it('should use native driver false for width animations', () => {
      render(<XPProgressBar />);
      
      const timingCalls = Animated.timing.mock.calls;
      timingCalls.forEach(call => {
        const config = call[1];
        expect(config.useNativeDriver).toBe(false);
      });
    });

    it('should interpolate animated width correctly', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      animatedViews.forEach(view => {
        expect(view.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              width: expect.anything()
            })
          ])
        );
      });
    });
  });

  describe('Style Application', () => {
    it('should apply container styles', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const views = UNSAFE_getAllByType('View');
      const containerView = views[0];
      
      expect(containerView.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: "100%"
          })
        ])
      );
    });

    it('should apply label container styles when labels shown', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar showLabels={true} />);
      
      const views = UNSAFE_getAllByType('View');
      const labelContainer = views[1]; // Second view should be label container
      
      expect(labelContainer.props.style).toEqual(
        expect.objectContaining({
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        })
      );
    });

    it('should apply progress bar styles', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const views = UNSAFE_getAllByType('View');
      // Find progress bar view (has backgroundColor: "#E5E5E7")
      const progressBarView = views.find(view => 
        view.props.style && 
        (Array.isArray(view.props.style) 
          ? view.props.style.some(s => s && s.backgroundColor === "#E5E5E7")
          : view.props.style.backgroundColor === "#E5E5E7")
      );
      
      expect(progressBarView).toBeTruthy();
    });

    it('should apply text styles correctly', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const texts = UNSAFE_getAllByType('Text');
      
      // Level text
      const levelText = texts.find(text => 
        text.props.children === 'Level 2'
      );
      expect(levelText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 16,
          fontWeight: "bold",
          color: "#2D1B69",
        })
      );
      
      // XP text
      const xpText = texts.find(text => 
        text.props.children === '150 / 250 XP'
      );
      expect(xpText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 14,
          color: "#8E8E93",
        })
      );
      
      // Progress text
      const progressText = texts.find(text => 
        text.props.children === '60%'
      );
      expect(progressText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
          color: "#8E8E93",
          textAlign: "center",
          marginTop: 4,
        })
      );
    });
  });

  describe('Progress Calculation', () => {
    it('should handle decimal progress values', () => {
      mockGamificationContext.levelProgress = 66.67;
      render(<XPProgressBar />);

      expect(screen.getByText('67%')).toBeTruthy(); // Math.round(66.67) = 67
    });

    it('should handle progress exactly at 0%', () => {
      mockGamificationContext.levelProgress = 0;
      render(<XPProgressBar />);

      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('should handle progress exactly at 100%', () => {
      mockGamificationContext.levelProgress = 100;
      render(<XPProgressBar />);

      expect(screen.getByText('100%')).toBeTruthy();
    });

    it('should handle progress values over 100%', () => {
      mockGamificationContext.levelProgress = 120;
      render(<XPProgressBar />);

      expect(screen.getByText('120%')).toBeTruthy(); // Component shows raw percentage
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small progress values', () => {
      mockGamificationContext.levelProgress = 0.1;
      render(<XPProgressBar />);

      expect(screen.getByText('0%')).toBeTruthy(); // Math.round(0.1) = 0
    });

    it('should handle negative progress values', () => {
      mockGamificationContext.levelProgress = -5;
      render(<XPProgressBar />);

      expect(screen.getByText('-5%')).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      mockGamificationContext.xp = 999999999;
      mockGamificationContext.nextLevelXP = 1000000000;
      mockGamificationContext.level = 9999;
      
      render(<XPProgressBar />);

      expect(screen.getByText('Level 9999')).toBeTruthy();
      expect(screen.getByText('999999999 / 1000000000 XP')).toBeTruthy();
    });

    it('should handle zero XP and nextLevelXP', () => {
      mockGamificationContext.xp = 0;
      mockGamificationContext.nextLevelXP = 0;
      mockGamificationContext.levelProgress = 0;
      
      render(<XPProgressBar />);

      expect(screen.getByText('0 / 0 XP')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('should handle undefined style prop', () => {
      const { toJSON } = render(<XPProgressBar style={undefined} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle null style prop', () => {
      const { toJSON } = render(<XPProgressBar style={null} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle array of styles', () => {
      const styles = [
        { backgroundColor: 'red' },
        { margin: 10 },
        { padding: 5 }
      ];
      
      const { UNSAFE_getAllByType } = render(<XPProgressBar style={styles} />);
      
      const views = UNSAFE_getAllByType('View');
      const containerView = views[0];
      expect(containerView.props.style).toEqual(
        expect.arrayContaining(styles)
      );
    });

    it('should handle zero height', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar height={0} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      animatedViews.forEach(view => {
        expect(view.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ height: 0 })
          ])
        );
      });
    });

    it('should handle negative height', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar height={-10} />);
      
      const animatedViews = UNSAFE_getAllByType('AnimatedView');
      animatedViews.forEach(view => {
        expect(view.props.style).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ height: -10 })
          ])
        );
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with minimal re-renders', () => {
      const { rerender } = render(<XPProgressBar />);
      
      // Re-render with same props
      rerender(<XPProgressBar />);
      
      // Should not cause issues
      expect(screen.getByText('Level 2')).toBeTruthy();
    });

    it('should handle rapid prop changes', () => {
      const { rerender } = render(<XPProgressBar showLabels={true} />);
      
      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<XPProgressBar showLabels={i % 2 === 0} />);
      }
      
      // Should not throw errors
      expect(screen.UNSAFE_queryByType('View')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible text content', () => {
      render(<XPProgressBar />);
      
      // All text should be accessible
      expect(screen.getByText('Level 2')).toBeTruthy();
      expect(screen.getByText('150 / 250 XP')).toBeTruthy();
      expect(screen.getByText('60%')).toBeTruthy();
    });

    it('should maintain text hierarchy', () => {
      const { UNSAFE_getAllByType } = render(<XPProgressBar />);
      
      const texts = UNSAFE_getAllByType('Text');
      expect(texts.length).toBe(3); // Level, XP, Progress percentage
    });

    it('should provide meaningful text content for screen readers', () => {
      mockGamificationContext.level = 5;
      mockGamificationContext.xp = 780;
      mockGamificationContext.nextLevelXP = 1000;
      mockGamificationContext.levelProgress = 78;
      
      render(<XPProgressBar />);
      
      expect(screen.getByText('Level 5')).toBeTruthy();
      expect(screen.getByText('780 / 1000 XP')).toBeTruthy();
      expect(screen.getByText('78%')).toBeTruthy();
    });
  });
});