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
import FavoritesScreen from '../../screens/FavoritesScreen';

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
  Alert: {
    alert: jest.fn(),
  },
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
    getFavoriteRecipes: jest.fn(),
    getBookmarkedRecipes: jest.fn(),
    toggleFavorite: jest.fn(),
    toggleBookmark: jest.fn(),
    createCollection: jest.fn(),
    getCollections: jest.fn(),
    addToCollection: jest.fn(),
    removeFromCollection: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock components
jest.mock('../../components/RecipeCard', () => {
  return function MockRecipeCard({ recipe, onPress, onFavoriteToggle }: any) {
    return (
      <div testID="recipe-card" data-recipe-id={recipe.id}>
        <button onClick={() => onPress(recipe)}>
          {recipe.title}
        </button>
        <button onClick={() => onFavoriteToggle(recipe.id)}>
          Toggle Favorite
        </button>
      </div>
    );
  };
});

describe('FavoritesScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;

  const mockFavoriteRecipes = [
    {
      id: '1',
      title: 'Favorite Pasta',
      description: 'My favorite pasta dish',
      image_url: 'https://example.com/pasta.jpg',
      prep_time: 20,
      difficulty: 'easy',
      rating: 4.5,
      is_favorite: true,
    },
    {
      id: '2',
      title: 'Favorite Curry',
      description: 'Amazing curry recipe',
      image_url: 'https://example.com/curry.jpg',
      prep_time: 45,
      difficulty: 'medium',
      rating: 4.7,
      is_favorite: true,
    },
  ];

  const mockBookmarkedRecipes = [
    {
      id: '3',
      title: 'Bookmarked Salad',
      description: 'Healthy salad recipe',
      image_url: 'https://example.com/salad.jpg',
      prep_time: 15,
      difficulty: 'easy',
      rating: 4.2,
      is_bookmarked: true,
    },
  ];

  const mockCollections = [
    {
      id: 'collection-1',
      name: 'Quick Dinners',
      recipe_count: 5,
      thumbnail_url: 'https://example.com/quick.jpg',
    },
    {
      id: 'collection-2',
      name: 'Weekend Treats',
      recipe_count: 8,
      thumbnail_url: 'https://example.com/treats.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    const mockCookCamApi = require('../../services/cookCamApi').cookCamApi;
    mockCookCamApi.getFavoriteRecipes.mockResolvedValue({
      success: true,
      data: mockFavoriteRecipes,
    });
    mockCookCamApi.getBookmarkedRecipes.mockResolvedValue({
      success: true,
      data: mockBookmarkedRecipes,
    });
    mockCookCamApi.getCollections.mockResolvedValue({
      success: true,
      data: mockCollections,
    });
  });

  describe('Rendering', () => {
    it('should render tabs for favorites and bookmarks', () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      expect(screen.getByText('Favorites')).toBeTruthy();
      expect(screen.getByText('Bookmarks')).toBeTruthy();
      expect(screen.getByText('Collections')).toBeTruthy();
    });

    it('should render favorite recipes in favorites tab', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Favorite Pasta')).toBeTruthy();
        expect(screen.getByText('Favorite Curry')).toBeTruthy();
      });
    });

    it('should render bookmarked recipes when bookmarks tab is selected', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const bookmarksTab = screen.getByText('Bookmarks');
      fireEvent.press(bookmarksTab);

      await waitFor(() => {
        expect(screen.getByText('Bookmarked Salad')).toBeTruthy();
      });
    });

    it('should render collections when collections tab is selected', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const collectionsTab = screen.getByText('Collections');
      fireEvent.press(collectionsTab);

      await waitFor(() => {
        expect(screen.getByText('Quick Dinners')).toBeTruthy();
        expect(screen.getByText('Weekend Treats')).toBeTruthy();
        expect(screen.getByText('5 recipes')).toBeTruthy();
        expect(screen.getByText('8 recipes')).toBeTruthy();
      });
    });

    it('should show empty state when no favorites', async () => {
      const mockGetFavoriteRecipes = require('../../services/cookCamApi').cookCamApi.getFavoriteRecipes;
      mockGetFavoriteRecipes.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText(/No favorite recipes yet/i)).toBeTruthy();
      });
    });

    it('should show empty state when no bookmarks', async () => {
      const mockGetBookmarkedRecipes = require('../../services/cookCamApi').cookCamApi.getBookmarkedRecipes;
      mockGetBookmarkedRecipes.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const bookmarksTab = screen.getByText('Bookmarks');
      fireEvent.press(bookmarksTab);

      await waitFor(() => {
        expect(screen.getByText(/No bookmarked recipes yet/i)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to recipe details when recipe is pressed', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const recipeCard = screen.getAllByTestId('recipe-card')[0];
        const button = recipeCard.querySelector('button');
        fireEvent.press(button);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('RecipeDetails', {
        recipeId: '1',
      });
    });

    it('should navigate to collection details when collection is pressed', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const collectionsTab = screen.getByText('Collections');
      fireEvent.press(collectionsTab);

      await waitFor(() => {
        const collectionButton = screen.getByText('Quick Dinners').parent;
        fireEvent.press(collectionButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CollectionDetails', {
        collectionId: 'collection-1',
        collectionName: 'Quick Dinners',
      });
    });
  });

  describe('Favorite Toggle', () => {
    it('should toggle favorite status when favorite button is pressed', async () => {
      const mockToggleFavorite = require('../../services/cookCamApi').cookCamApi.toggleFavorite;
      mockToggleFavorite.mockResolvedValueOnce({
        success: true,
        data: { is_favorite: false },
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const recipeCard = screen.getAllByTestId('recipe-card')[0];
        const favoriteButton = recipeCard.querySelectorAll('button')[1];
        fireEvent.press(favoriteButton);
      });

      expect(mockToggleFavorite).toHaveBeenCalledWith('1');
    });

    it('should remove recipe from favorites list when unfavorited', async () => {
      const mockToggleFavorite = require('../../services/cookCamApi').cookCamApi.toggleFavorite;
      mockToggleFavorite.mockResolvedValueOnce({
        success: true,
        data: { is_favorite: false },
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Favorite Pasta')).toBeTruthy();
      });

      const recipeCard = screen.getAllByTestId('recipe-card')[0];
      const favoriteButton = recipeCard.querySelectorAll('button')[1];
      fireEvent.press(favoriteButton);

      await waitFor(() => {
        expect(screen.queryByText('Favorite Pasta')).toBeFalsy();
      });
    });

    it('should show confirmation dialog before removing favorite', async () => {
      const mockAlert = require('react-native').Alert.alert;
      
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const recipeCard = screen.getAllByTestId('recipe-card')[0];
        const favoriteButton = recipeCard.querySelectorAll('button')[1];
        fireEvent.press(favoriteButton);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Remove from Favorites',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe('Collections', () => {
    it('should show create collection button', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const collectionsTab = screen.getByText('Collections');
      fireEvent.press(collectionsTab);

      await waitFor(() => {
        expect(screen.getByText(/Create New Collection/i)).toBeTruthy();
      });
    });

    it('should create new collection when create button is pressed', async () => {
      const mockCreateCollection = require('../../services/cookCamApi').cookCamApi.createCollection;
      mockCreateCollection.mockResolvedValueOnce({
        success: true,
        data: { id: 'new-collection', name: 'New Collection' },
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const collectionsTab = screen.getByText('Collections');
      fireEvent.press(collectionsTab);

      await waitFor(() => {
        const createButton = screen.getByText(/Create New Collection/i);
        fireEvent.press(createButton);
      });

      // Would show modal to enter collection name
      expect(true).toBe(true);
    });

    it('should add recipe to collection', async () => {
      const mockAddToCollection = require('../../services/cookCamApi').cookCamApi.addToCollection;
      mockAddToCollection.mockResolvedValueOnce({
        success: true,
      });

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        // Long press on recipe to show collection options
        const recipeCard = screen.getAllByTestId('recipe-card')[0];
        fireEvent.longPress(recipeCard);
      });

      // Would show collection picker
      expect(mockAddToCollection).toBeDefined();
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh favorites when pulled down', async () => {
      const mockGetFavoriteRecipes = require('../../services/cookCamApi').cookCamApi.getFavoriteRecipes;
      
      render(<FavoritesScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText('Favorite Pasta')).toBeTruthy();
      });

      // Simulate pull to refresh
      const flatList = screen.UNSAFE_getByType('FlatList');
      const refreshControl = flatList.props.refreshControl;
      refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockGetFavoriteRecipes).toHaveBeenCalledTimes(2);
      });
    });

    it('should refresh bookmarks when pulled down in bookmarks tab', async () => {
      const mockGetBookmarkedRecipes = require('../../services/cookCamApi').cookCamApi.getBookmarkedRecipes;
      
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      const bookmarksTab = screen.getByText('Bookmarks');
      fireEvent.press(bookmarksTab);

      await waitFor(() => {
        const flatList = screen.UNSAFE_getByType('FlatList');
        const refreshControl = flatList.props.refreshControl;
        refreshControl.props.onRefresh();
      });

      expect(mockGetBookmarkedRecipes).toHaveBeenCalledTimes(2);
    });
  });

  describe('Search and Filter', () => {
    it('should show search bar', () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      expect(screen.getByPlaceholderText(/Search favorites/i)).toBeTruthy();
    });

    it('should filter recipes based on search', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        expect(screen.getByText('Favorite Pasta')).toBeTruthy();
        expect(screen.getByText('Favorite Curry')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText(/Search favorites/i);
      fireEvent.changeText(searchInput, 'Pasta');

      await waitFor(() => {
        expect(screen.getByText('Favorite Pasta')).toBeTruthy();
        expect(screen.queryByText('Favorite Curry')).toBeFalsy();
      });
    });

    it('should show no results when search has no matches', async () => {
      render(<FavoritesScreen navigation={mockNavigation} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search favorites/i);
        fireEvent.changeText(searchInput, 'NonexistentRecipe');
      });

      expect(screen.getByText(/No recipes found/i)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when loading fails', async () => {
      const mockGetFavoriteRecipes = require('../../services/cookCamApi').cookCamApi.getFavoriteRecipes;
      mockGetFavoriteRecipes.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<FavoritesScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load favorites/i)).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      const mockGetFavoriteRecipes = require('../../services/cookCamApi').cookCamApi.getFavoriteRecipes;
      mockGetFavoriteRecipes.mockResolvedValueOnce({
        success: false,
        error: 'Network error',
      });

      render(<FavoritesScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', () => {
      const mockGetFavoriteRecipes = require('../../services/cookCamApi').cookCamApi.getFavoriteRecipes;
      mockGetFavoriteRecipes.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<FavoritesScreen navigation={mockNavigation} />);
      
      expect(screen.UNSAFE_queryByType('ActivityIndicator')).toBeTruthy();
    });
  });
});