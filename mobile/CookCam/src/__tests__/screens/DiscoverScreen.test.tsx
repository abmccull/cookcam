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
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import DiscoverScreen from '../../screens/DiscoverScreen';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  RefreshControl: 'RefreshControl',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios || config.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
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
    View: 'AnimatedView',
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name: string) => {
    return React.forwardRef((props: any, ref: any) => 
      React.createElement('MockIcon', { ...props, ref, testID: `${name}-icon` }, name)
    );
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return mockIcon(prop);
      }
      return undefined;
    },
  });
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Mock contexts
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id' },
  })),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    userStats: {
      level: 5,
      xp: 1200,
      nextLevelXp: 2000,
      streakDays: 7,
    },
    checkIn: jest.fn(),
    refreshUserStats: jest.fn(),
  })),
}));

// Mock services
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    getRecipes: jest.fn(),
    getFeaturedRecipes: jest.fn(),
    getCategories: jest.fn(),
    getRecommendations: jest.fn(),
    searchRecipes: jest.fn(),
    getTrendingRecipes: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock components
jest.mock('../../components/RecipeCard', () => {
  return function MockRecipeCard({ recipe, onPress }: any) {
    return (
      <div testID="recipe-card" data-recipe-id={recipe.id}>
        <button onClick={() => onPress(recipe)}>
          {recipe.title}
        </button>
      </div>
    );
  };
});

jest.mock('../../components/FilterDrawer', () => {
  return function MockFilterDrawer({ visible, onClose, onApply }: any) {
    if (!visible) return null;
    return (
      <div testID="filter-drawer">
        <button onClick={() => onApply({ difficulty: 'easy' })}>Apply Filters</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('DiscoverScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;

  const mockRecipes = [
    {
      id: '1',
      title: 'Pasta Carbonara',
      description: 'Classic Italian pasta',
      image_url: 'https://example.com/pasta.jpg',
      prep_time: 20,
      difficulty: 'easy',
      rating: 4.5,
    },
    {
      id: '2',
      title: 'Chicken Tikka Masala',
      description: 'Indian curry dish',
      image_url: 'https://example.com/tikka.jpg',
      prep_time: 45,
      difficulty: 'medium',
      rating: 4.7,
    },
  ];

  const mockCategories = [
    { id: '1', name: 'Italian', icon: '🍝' },
    { id: '2', name: 'Indian', icon: '🍛' },
    { id: '3', name: 'Mexican', icon: '🌮' },
    { id: '4', name: 'Chinese', icon: '🥟' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    const mockCookCamApi = require('../../services/cookCamApi').cookCamApi;
    mockCookCamApi.getFeaturedRecipes.mockResolvedValue({
      success: true,
      data: mockRecipes,
    });
    mockCookCamApi.getCategories.mockResolvedValue({
      success: true,
      data: mockCategories,
    });
    mockCookCamApi.getRecommendations.mockResolvedValue({
      success: true,
      data: mockRecipes,
    });
    mockCookCamApi.getTrendingRecipes.mockResolvedValue({
      success: true,
      data: mockRecipes,
    });
  });

  describe('Rendering', () => {
    it('should render search bar', () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      expect(screen.getByPlaceholderText(/Search recipes/i)).toBeTruthy();
    });

    it('should render categories section', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Categories')).toBeTruthy();
        expect(screen.getByText('Italian')).toBeTruthy();
        expect(screen.getByText('Indian')).toBeTruthy();
      });
    });

    it('should render featured recipes section', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Featured Recipes')).toBeTruthy();
        expect(screen.getByText('Pasta Carbonara')).toBeTruthy();
      });
    });

    it('should render trending recipes section', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Trending Now')).toBeTruthy();
      });
    });

    it('should render recommendations section', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Recommended for You')).toBeTruthy();
      });
    });

    it('should show filter button', () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      expect(screen.getByTestId('Filter-icon')).toBeTruthy();
    });
  });

  describe('Search', () => {
    it('should search recipes when search text is entered', async () => {
      const mockSearchRecipes = require('../../services/cookCamApi').cookCamApi.searchRecipes;
      mockSearchRecipes.mockResolvedValueOnce({
        success: true,
        data: [mockRecipes[0]],
      });

      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const searchInput = screen.getByPlaceholderText(/Search recipes/i);
      fireEvent.changeText(searchInput, 'Pasta');

      await waitFor(() => {
        expect(mockSearchRecipes).toHaveBeenCalledWith('Pasta', expect.any(Object));
      });
    });

    it('should show search results', async () => {
      const mockSearchRecipes = require('../../services/cookCamApi').cookCamApi.searchRecipes;
      mockSearchRecipes.mockResolvedValueOnce({
        success: true,
        data: [mockRecipes[0]],
      });

      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const searchInput = screen.getByPlaceholderText(/Search recipes/i);
      fireEvent.changeText(searchInput, 'Pasta');

      await waitFor(() => {
        expect(screen.getByText('Search Results')).toBeTruthy();
      });
    });

    it('should clear search when clear button is pressed', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const searchInput = screen.getByPlaceholderText(/Search recipes/i);
      fireEvent.changeText(searchInput, 'Pasta');

      await waitFor(() => {
        const clearButton = screen.getByTestId('X-icon');
        fireEvent.press(clearButton.parent);
      });

      expect(searchInput.props.value).toBe('');
    });

    it('should show no results message when search returns empty', async () => {
      const mockSearchRecipes = require('../../services/cookCamApi').cookCamApi.searchRecipes;
      mockSearchRecipes.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const searchInput = screen.getByPlaceholderText(/Search recipes/i);
      fireEvent.changeText(searchInput, 'NonexistentRecipe');

      await waitFor(() => {
        expect(screen.getByText(/No recipes found/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to recipe details when recipe is pressed', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const recipeCard = screen.getAllByTestId('recipe-card')[0];
        const button = recipeCard.querySelector('button');
        fireEvent.press(button);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('RecipeDetails', {
        recipeId: '1',
      });
    });

    it('should navigate to category screen when category is pressed', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const categoryButton = screen.getByText('Italian').parent;
        fireEvent.press(categoryButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Category', {
        categoryId: '1',
        categoryName: 'Italian',
      });
    });

    it('should navigate to see all featured recipes', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const seeAllButton = screen.getAllByText('See All')[0];
        fireEvent.press(seeAllButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('RecipeList', {
        type: 'featured',
      });
    });
  });

  describe('Filters', () => {
    it('should open filter drawer when filter button is pressed', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const filterButton = screen.getByTestId('Filter-icon').parent;
      fireEvent.press(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('filter-drawer')).toBeTruthy();
      });
    });

    it('should apply filters when apply button is pressed', async () => {
      const mockGetRecipes = require('../../services/cookCamApi').cookCamApi.getRecipes;
      mockGetRecipes.mockResolvedValueOnce({
        success: true,
        data: [mockRecipes[0]],
      });

      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const filterButton = screen.getByTestId('Filter-icon').parent;
      fireEvent.press(filterButton);

      await waitFor(() => {
        const applyButton = screen.getByText('Apply Filters');
        fireEvent.press(applyButton);
      });

      expect(mockGetRecipes).toHaveBeenCalledWith(expect.objectContaining({
        difficulty: 'easy',
      }));
    });

    it('should close filter drawer when close button is pressed', async () => {
      render(<DiscoverScreen navigation={mockNavigation} />);
      
      const filterButton = screen.getByTestId('Filter-icon').parent;
      fireEvent.press(filterButton);

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.press(closeButton);
      });

      expect(screen.queryByTestId('filter-drawer')).toBeFalsy();
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data when pulled down', async () => {
      const mockGetFeaturedRecipes = require('../../services/cookCamApi').cookCamApi.getFeaturedRecipes;
      
      render(<DiscoverScreen navigation={mockNavigation} />);

      // Simulate pull to refresh
      const scrollView = screen.UNSAFE_getByType('ScrollView');
      const refreshControl = scrollView.props.refreshControl;
      refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockGetFeaturedRecipes).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', () => {
      const mockGetFeaturedRecipes = require('../../services/cookCamApi').cookCamApi.getFeaturedRecipes;
      mockGetFeaturedRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DiscoverScreen navigation={mockNavigation} />);
      
      expect(screen.UNSAFE_queryByType('ActivityIndicator')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when recipe loading fails', async () => {
      const mockGetFeaturedRecipes = require('../../services/cookCamApi').cookCamApi.getFeaturedRecipes;
      mockGetFeaturedRecipes.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<DiscoverScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load recipes/i)).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      const mockGetFeaturedRecipes = require('../../services/cookCamApi').cookCamApi.getFeaturedRecipes;
      mockGetFeaturedRecipes.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<DiscoverScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });

    it('should retry loading when retry button is pressed', async () => {
      const mockGetFeaturedRecipes = require('../../services/cookCamApi').cookCamApi.getFeaturedRecipes;
      mockGetFeaturedRecipes.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<DiscoverScreen navigation={mockNavigation} />);

      await waitFor(() => {
        const retryButton = screen.getByText('Retry');
        fireEvent.press(retryButton);
      });

      expect(mockGetFeaturedRecipes).toHaveBeenCalledTimes(2);
    });
  });
});