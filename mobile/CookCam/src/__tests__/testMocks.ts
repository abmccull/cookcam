// Shared test mocks for CookCam tests

// Mock environment config - must be called before any imports
export const mockEnvConfig = () => {
  jest.mock('../config/env', () => ({
    __esModule: true,
    default: () => ({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      API_BASE_URL: "https://test-api.cookcam.com",
    }),
  }));
};

// Mock styles tokens
export const mockStyleTokens = () => {
  jest.mock('../styles', () => ({
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
        },
        difficulty: {
          easy: '#4CAF50',
          medium: '#FF9800',
          hard: '#F44336',
        },
        rating: '#FFD700',
        border: '#E0E0E0',
      },
      spacing: {
        xs: 4,
        s: 8,
        sm: 12,
        m: 16,
        md: 16,
        l: 24,
        xl: 32,
      },
      typography: {
        h3: { fontSize: 20, fontWeight: 'bold' },
        body: { fontSize: 14 },
        caption: { fontSize: 12 },
      },
      fontSize: {
        xs: 10,
        sm: 12,
        base: 14,
        md: 16,
        lg: 18,
        xl: 20,
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        m: 8,
        l: 12,
      },
    },
    mixins: {
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      cards: {
        base: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
        },
      },
      layout: {
        flex1: {
          flex: 1,
        },
        flexRow: {
          flexDirection: 'row',
        },
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
      truncate: {
        overflow: 'hidden',
      },
    },
  }));
};

// Common API service mocks
export const mockCookCamApi = () => {
  jest.mock('../services/cookCamApi', () => ({
    cookCamApi: {
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
      loginWithBiometrics: jest.fn(),
      enableBiometricLogin: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
      refreshToken: jest.fn(),
      getRecipes: jest.fn(),
      getFeaturedRecipes: jest.fn(),
      getRecommendations: jest.fn(),
      getRecipeDetails: jest.fn(),
      toggleFavorite: jest.fn(),
      toggleBookmark: jest.fn(),
      analyzeImage: jest.fn(),
      createRecipeFromImage: jest.fn(),
      updateUserProfile: jest.fn(),
      uploadAvatar: jest.fn(),
      getUserRecipes: jest.fn(),
      getUserStats: jest.fn(),
    },
  }));
};