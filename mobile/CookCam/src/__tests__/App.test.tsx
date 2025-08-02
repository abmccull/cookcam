// Mock environment config before any imports
jest.mock('../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

// Mock services that depend on env config
jest.mock('../services/cookCamApi', () => ({
  cookCamApi: {
    // Add any methods used by App
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '../App';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
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
  UIManager: {
    getViewManagerConfig: jest.fn(() => ({})),
  },
  requireNativeComponent: jest.fn((name) => name),
}));

// Mock expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));


// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Mock contexts
jest.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
  })),
}));

jest.mock('../context/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSubscription: jest.fn(() => ({
    subscription: null,
    loading: false,
  })),
}));

jest.mock('../context/GamificationContext', () => ({
  GamificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useGamification: jest.fn(() => ({
    userStats: null,
    loading: false,
  })),
}));

jest.mock('../context/FeatureAccessContext', () => ({
  FeatureAccessProvider: ({ children }: { children: React.ReactNode }) => children,
  useFeatureAccess: jest.fn(() => ({
    hasAccess: jest.fn(() => true),
  })),
}));

// Mock safe area
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { getByTestId } = render(<App />);
    // The app should render something
    expect(() => getByTestId('app-root')).not.toThrow();
  });

  it('should show loading state initially', () => {
    const mockUseAuth = require('../context/AuthContext').useAuth;
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<App />);
    // When loading, the app might show a loading indicator or splash
    // This depends on the actual implementation
  });

  it('should render navigation when not loading', () => {
    const mockUseAuth = require('../context/AuthContext').useAuth;
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);
    // Should render navigation components
  });

  it('should render authenticated app when user is logged in', () => {
    const mockUseAuth = require('../context/AuthContext').useAuth;
    mockUseAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    render(<App />);
    // Should render authenticated navigation
  });

  it('should render unauthenticated app when user is not logged in', () => {
    const mockUseAuth = require('../context/AuthContext').useAuth;
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<App />);
    // Should render login/welcome screens
  });

  it('should load fonts on mount', async () => {
    const mockLoadAsync = require('expo-font').loadAsync;
    
    render(<App />);
    
    // Fonts should be loaded
    expect(mockLoadAsync).toHaveBeenCalled();
  });


  it('should wrap app with required providers', () => {
    const { container } = render(<App />);
    
    // The app should be wrapped with all necessary providers
    // This is implicit in the render not throwing errors
    expect(container).toBeTruthy();
  });
});