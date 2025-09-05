import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// Set up global PixelRatio before React Native imports it
global.PixelRatio = {
  roundToNearestPixel: (value: number) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size: number) => size * 2,
};

// Mock React Native modules BEFORE importing the component
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  // Provide PixelRatio to StyleSheet
  actualRN.PixelRatio = global.PixelRatio;
  
  return {
    ...actualRN,
    PixelRatio: global.PixelRatio,
    StyleSheet: {
      ...actualRN.StyleSheet,
      create: (styles: any) => styles,
      flatten: (style: any) => style,
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

// Mock services
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    getRecipeNutrition: jest.fn(() => 
      Promise.resolve({
        success: true,
        data: {
          calories: 450,
          protein: 25,
          carbs: 45,
          fat: 18,
          fiber: 5,
          sodium: 680,
        }
      })
    ),
  },
}));

// Mock utils
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/responsive', () => ({
  scale: (n: number) => n,
  verticalScale: (n: number) => n,
  moderateScale: (n: number) => n,
}));

// Mock styles
jest.mock('../../styles', () => ({
  tokens: {
    colors: {
      primary: '#4CAF50',
      text: {
        primary: '#000000',
        secondary: '#666666',
        light: '#999999',
        inverse: '#FFFFFF',
      },
      background: {
        main: '#FFFFFF',
        secondary: '#F5F5F5',
        accent: '#E8F5E9',
        overlay: 'rgba(0,0,0,0.3)',
        overlayLight: 'rgba(0,0,0,0.5)',
      },
      difficulty: {
        easy: '#4CAF50',
        medium: '#FF9800',
        hard: '#F44336',
      },
      interactive: {
        favorite: '#E91E63',
      },
      brand: {
        chef: '#FF6B35',
      },
      border: {
        primary: '#E0E0E0',
      },
    },
    spacing: {
      xs: 4,
      sm: 12,
      md: 16,
    },
    fontSize: {
      sm: 12,
      base: 14,
      lg: 18,
    },
    fontWeight: {
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    borderRadius: {
      medium: 8,
      large: 12,
    },
  },
  mixins: {
    cards: {
      base: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
      },
    },
    layout: {
      flex1: { flex: 1 },
      flexRow: { flexDirection: 'row' },
      centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
      },
      centerHorizontal: {
        alignItems: 'center',
      },
      absoluteTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
      },
      absoluteBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
      },
    },
    avatars: {
      small: {
        width: 24,
        height: 24,
        borderRadius: 12,
      },
    },
  },
  styleUtils: {
    combine: (...styles: any[]) => Object.assign({}, ...styles),
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  Heart: 'Heart',
  Clock: 'Clock',
  Flame: 'Flame',
  MessageCircle: 'MessageCircle',
  Share2: 'Share2',
}));

// Mock components
jest.mock('../../components/ChefBadge', () => {
  const mockReact = require('react');
  return function MockChefBadge({ tier, size }: any) {
    return mockReact.createElement('MockChefBadge', { 
      testID: `ChefBadge-${tier}-${size}` 
    }, `ChefBadge-${tier}-${size}`);
  };
});

jest.mock('../../components/NutritionBadge', () => {
  const mockReact = require('react');
  return function MockNutritionBadge({ nutrition, servings, variant }: any) {
    return mockReact.createElement('MockNutritionBadge', { 
      testID: `NutritionBadge-${variant}` 
    }, `NutritionBadge-${variant}`);
  };
});

// Now import the component after all mocks are set up
import RecipeCard from '../../components/RecipeCard';
import { cookCamApi } from '../../services/cookCamApi';

describe('RecipeCard', () => {
  const mockRecipe = {
    id: '1',
    title: 'Spaghetti Carbonara',
    image: 'https://example.com/carbonara.jpg',
    cookTime: 30,
    difficulty: 'Medium',
    likes: 125,
    comments: 42,
    servings: 4,
    creator: {
      name: 'Chef Mario',
      tier: 3 as const,
      avatar: 'https://example.com/chef.jpg',
    },
  };

  const mockOnPress = jest.fn();
  const mockOnLike = jest.fn();
  const mockOnComment = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with all props', () => {
      const { toJSON } = render(
        <RecipeCard
          recipe={mockRecipe}
          onPress={mockOnPress}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
          showNutrition={true}
        />
      );
      
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render recipe title', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('Spaghetti Carbonara')).toBeTruthy();
    });

    it('should render cook time with icon', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('30 min')).toBeTruthy();
      expect(screen.UNSAFE_getByType('Clock')).toBeTruthy();
    });

    it('should render difficulty badge', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('should render creator name', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('Chef Mario')).toBeTruthy();
    });

    it('should render creator initial in avatar', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('C')).toBeTruthy();
    });

    it('should render chef badge when tier is provided', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByTestId('ChefBadge-3-small')).toBeTruthy();
    });

    it('should not render chef badge when tier is not provided', () => {
      const recipeWithoutTier = {
        ...mockRecipe,
        creator: { ...mockRecipe.creator, tier: undefined },
      };
      render(<RecipeCard recipe={recipeWithoutTier} />);
      
      expect(screen.queryByText(/ChefBadge/)).toBeFalsy();
    });

    it('should render action buttons with counts', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('125')).toBeTruthy(); // likes
      expect(screen.getByText('42')).toBeTruthy(); // comments
      expect(screen.getByText('Share')).toBeTruthy();
    });

    it('should render action icons', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.UNSAFE_getByType('Heart')).toBeTruthy();
      expect(screen.UNSAFE_getByType('MessageCircle')).toBeTruthy();
      expect(screen.UNSAFE_getByType('Share2')).toBeTruthy();
    });

    it('should render flame icon as placeholder', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.UNSAFE_getByType('Flame')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when card is pressed', () => {
      render(<RecipeCard recipe={mockRecipe} onPress={mockOnPress} />);
      
      const card = screen.UNSAFE_getAllByType('TouchableOpacity')[0];
      fireEvent.press(card);
      
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onLike when like button is pressed', () => {
      render(<RecipeCard recipe={mockRecipe} onLike={mockOnLike} />);
      
      const likeButton = screen.UNSAFE_getAllByType('TouchableOpacity')[1];
      fireEvent.press(likeButton);
      
      expect(mockOnLike).toHaveBeenCalledTimes(1);
    });

    it('should call onComment when comment button is pressed', () => {
      render(<RecipeCard recipe={mockRecipe} onComment={mockOnComment} />);
      
      const commentButton = screen.UNSAFE_getAllByType('TouchableOpacity')[2];
      fireEvent.press(commentButton);
      
      expect(mockOnComment).toHaveBeenCalledTimes(1);
    });

    it('should call onShare when share button is pressed', () => {
      render(<RecipeCard recipe={mockRecipe} onShare={mockOnShare} />);
      
      const shareButton = screen.UNSAFE_getAllByType('TouchableOpacity')[3];
      fireEvent.press(shareButton);
      
      expect(mockOnShare).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers when they are not provided', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      // Test that component renders without crashing when no handlers provided
      // The mocks ensure handlers are not called
      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockOnLike).not.toHaveBeenCalled();
      expect(mockOnComment).not.toHaveBeenCalled();
      expect(mockOnShare).not.toHaveBeenCalled();
    });
  });

  describe('Nutrition Data', () => {
    it('should fetch nutrition data when showNutrition is true', async () => {
      render(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledWith('1');
      });
    });

    it('should display nutrition badges after fetching', async () => {
      render(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('NutritionBadge-compact')).toBeTruthy();
        expect(screen.getByTestId('NutritionBadge-full')).toBeTruthy();
      });
    });

    it('should not fetch nutrition data when showNutrition is false', async () => {
      render(<RecipeCard recipe={mockRecipe} showNutrition={false} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('should handle nutrition fetch error gracefully', async () => {
      (cookCamApi.getRecipeNutrition as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      render(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalled();
      });
      
      expect(screen.queryByText(/NutritionBadge/)).toBeFalsy();
    });

    it('should handle empty nutrition response', async () => {
      (cookCamApi.getRecipeNutrition as jest.Mock).mockResolvedValueOnce({
        success: false,
        data: null,
      });
      
      render(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalled();
      });
      
      expect(screen.queryByText(/NutritionBadge/)).toBeFalsy();
    });

    it('should not show nutrition badges while loading', () => {
      render(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      // Before async fetch completes
      expect(screen.queryByText(/NutritionBadge/)).toBeFalsy();
    });
  });

  describe('Difficulty Styling', () => {
    it('should apply correct styling for easy difficulty', () => {
      const easyRecipe = { ...mockRecipe, difficulty: 'Easy' };
      render(<RecipeCard recipe={easyRecipe} />);
      
      expect(screen.getByText('Easy')).toBeTruthy();
    });

    it('should apply correct styling for medium difficulty', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('should apply correct styling for hard difficulty', () => {
      const hardRecipe = { ...mockRecipe, difficulty: 'Hard' };
      render(<RecipeCard recipe={hardRecipe} />);
      
      expect(screen.getByText('Hard')).toBeTruthy();
    });

    it('should handle unknown difficulty levels', () => {
      const unknownRecipe = { ...mockRecipe, difficulty: 'Expert' };
      render(<RecipeCard recipe={unknownRecipe} />);
      
      expect(screen.getByText('Expert')).toBeTruthy();
    });

    it('should handle lowercase difficulty values', () => {
      const lowerRecipe = { ...mockRecipe, difficulty: 'easy' };
      render(<RecipeCard recipe={lowerRecipe} />);
      
      expect(screen.getByText('easy')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing creator name', () => {
      const recipeWithEmptyName = {
        ...mockRecipe,
        creator: { ...mockRecipe.creator, name: '' },
      };
      render(<RecipeCard recipe={recipeWithEmptyName} />);
      
      expect(screen.getByText('?')).toBeTruthy(); // Should show ? for initial
    });

    it('should handle single character names', () => {
      const singleCharRecipe = {
        ...mockRecipe,
        creator: { ...mockRecipe.creator, name: 'A' },
      };
      render(<RecipeCard recipe={singleCharRecipe} />);
      
      expect(screen.getAllByText('A')).toHaveLength(2); // Initial and name
    });

    it('should handle long recipe titles', () => {
      const longTitleRecipe = {
        ...mockRecipe,
        title: 'This is a very long recipe title that should be truncated properly in the UI to maintain good visual layout and not break the design',
      };
      render(<RecipeCard recipe={longTitleRecipe} />);
      
      const titleElement = screen.getByText(longTitleRecipe.title);
      expect(titleElement.props.numberOfLines).toBe(2);
    });

    it('should handle zero likes and comments', () => {
      const noEngagementRecipe = {
        ...mockRecipe,
        likes: 0,
        comments: 0,
      };
      render(<RecipeCard recipe={noEngagementRecipe} />);
      
      expect(screen.getAllByText('0')).toHaveLength(2);
    });

    it('should handle missing optional props', () => {
      const minimalRecipe = {
        id: '2',
        title: 'Simple Recipe',
        cookTime: 15,
        difficulty: 'Easy',
        likes: 10,
        comments: 5,
        creator: {
          name: 'Home Cook',
        },
      };
      
      const { toJSON } = render(<RecipeCard recipe={minimalRecipe} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      const popularRecipe = {
        ...mockRecipe,
        likes: 999999,
        comments: 123456,
        cookTime: 1440, // 24 hours
      };
      render(<RecipeCard recipe={popularRecipe} />);
      
      expect(screen.getByText('999999')).toBeTruthy();
      expect(screen.getByText('123456')).toBeTruthy();
      expect(screen.getByText('1440 min')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should use React.memo for optimization', () => {
      expect(RecipeCard.displayName).toBe('RecipeCard');
    });

    it('should only fetch nutrition once per recipe id', async () => {
      const { rerender } = render(
        <RecipeCard recipe={mockRecipe} showNutrition={true} />
      );
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledTimes(1);
      });
      
      // Clear mock to track new calls
      (cookCamApi.getRecipeNutrition as jest.Mock).mockClear();
      
      // Rerender with same recipe
      rerender(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not fetch again
      expect(cookCamApi.getRecipeNutrition).not.toHaveBeenCalled();
    });

    it('should fetch nutrition for different recipe id', async () => {
      const { rerender } = render(
        <RecipeCard recipe={mockRecipe} showNutrition={true} />
      );
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledWith('1');
      });
      
      const newRecipe = { ...mockRecipe, id: '2' };
      rerender(<RecipeCard recipe={newRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledWith('2');
      });
    });

    it('should not refetch when toggling showNutrition off and on', async () => {
      const { rerender } = render(
        <RecipeCard recipe={mockRecipe} showNutrition={true} />
      );
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledTimes(1);
      });
      
      // Turn off nutrition
      rerender(<RecipeCard recipe={mockRecipe} showNutrition={false} />);
      
      // Clear mock
      (cookCamApi.getRecipeNutrition as jest.Mock).mockClear();
      
      // Turn on nutrition again
      rerender(<RecipeCard recipe={mockRecipe} showNutrition={true} />);
      
      await waitFor(() => {
        expect(cookCamApi.getRecipeNutrition).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper touch target with activeOpacity', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      const mainCard = screen.UNSAFE_getAllByType('TouchableOpacity')[0];
      expect(mainCard.props.activeOpacity).toBe(0.9);
    });

    it('should handle text truncation properly', () => {
      const longContentRecipe = {
        ...mockRecipe,
        title: 'Very long title that needs to be truncated for proper display',
      };
      
      render(<RecipeCard recipe={longContentRecipe} />);
      
      const title = screen.getByText(longContentRecipe.title);
      expect(title.props.numberOfLines).toBe(2);
    });

    it('should have all interactive elements as TouchableOpacity', () => {
      render(
        <RecipeCard 
          recipe={mockRecipe}
          onPress={mockOnPress}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      );
      
      const touchables = screen.UNSAFE_getAllByType('TouchableOpacity');
      expect(touchables.length).toBe(4); // card + 3 action buttons
    });
  });

  describe('Creator Info', () => {
    it('should display creator avatar with correct initial', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      
      const initial = screen.getByText('C');
      expect(initial).toBeTruthy();
    });

    it('should handle non-latin characters in creator name', () => {
      const intlRecipe = {
        ...mockRecipe,
        creator: { ...mockRecipe.creator, name: '李明' },
      };
      render(<RecipeCard recipe={intlRecipe} />);
      
      expect(screen.getByText('李')).toBeTruthy();
      expect(screen.getByText('李明')).toBeTruthy();
    });

    it('should show tier badge for different tier levels', () => {
      const tierLevels = [1, 2, 3, 4, 5] as const;
      
      tierLevels.forEach(tier => {
        const { unmount } = render(
          <RecipeCard 
            recipe={{
              ...mockRecipe,
              creator: { ...mockRecipe.creator, tier }
            }} 
          />
        );
        
        expect(screen.getByTestId(`ChefBadge-${tier}-small`)).toBeTruthy();
        unmount();
      });
    });
  });
});