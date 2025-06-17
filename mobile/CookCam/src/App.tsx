import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, Heart, Trophy, User, Home } from 'lucide-react-native';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { GamificationProvider } from './context/GamificationContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { TempDataProvider } from './context/TempDataContext';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MainScreen from './screens/MainScreen';
import CameraScreen from './screens/CameraScreen';
import DemoOnboardingScreen from './screens/DemoOnboardingScreen';
import IngredientReviewScreen from './screens/IngredientReviewScreen';
import RecipeCardsScreen from './screens/RecipeCardsScreen';
import CookModeScreen from './screens/CookModeScreen';
import ProfileScreen from './screens/ProfileScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import CreatorScreen from './screens/CreatorScreen';
import CreatorOnboardingScreen from './screens/CreatorOnboardingScreen';
import CreatorKYCScreen from './screens/CreatorKYCScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import PlanSelectionSheet from './screens/PlanSelectionSheet';
import PlanPaywallScreen from './screens/PlanPaywallScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import EnhancedPreferencesScreen from './screens/EnhancedPreferencesScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import RecipeCarouselScreen from './screens/RecipeCarouselScreen';
import AccountGateScreen from './screens/AccountGateScreen';
import ExampleFeatureGateScreen from './screens/ExampleFeatureGateScreen';
import ColdOpenScreen from './screens/ColdOpenScreen';
import DeepLinkService from './services/DeepLinkService';

// Navigation Types
export type RootStackParamList = {
  // Auth Flow
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  
  // Main App Tabs
  MainTabs: undefined;
  
  // Stack Screens
  Main: undefined;
  Camera: undefined;
  DemoOnboarding: undefined;
  IngredientReview: {
    ingredients: Array<{
      id: string;
      name: string;
      confidence: number;
      quantity?: string;
    }>;
  };
  RecipeCards: {
    ingredients: string[];
    filters?: {
      cuisine?: string;
      maxTime?: number;
      difficulty?: string;
    };
  };
  CookMode: {
    recipeId: string;
    recipe: {
      id: string;
      title: string;
      description: string;
      ingredients: string[];
      steps: Array<{
        step: number;
        instruction: string;
        time?: number;
        temperature?: string;
      }>;
      totalTime: number;
      difficulty: string;
      servings: number;
    };
  };
  Profile: undefined;
  Favorites: undefined;
  Leaderboard: undefined;
  Creator: undefined;
  CreatorOnboarding: undefined;
  CreatorKYC: undefined;
  Subscription: undefined;
  PlanSelection: undefined;
  PlanPaywall: {
    source?: string;
    feature?: string;
  };
  Preferences: undefined;
  EnhancedPreferences: undefined;
  NotificationPreferences: undefined;
  Discover: undefined;
  RecipeCarousel: {
    recipes: Array<{
      id: string;
      title: string;
      image: string;
      time: number;
      difficulty: string;
    }>;
    initialIndex?: number;
  };
  AccountGate: {
    requiredFeature: string;
    onContinue: () => void;
  };
  ExampleFeatureGate: undefined;
  ColdOpen: undefined;
};

export type TabParamList = {
  Home: undefined;
  Camera: undefined;
  Favorites: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'Home') {
            IconComponent = Home;
          } else if (route.name === 'Camera') {
            IconComponent = Camera;
          } else if (route.name === 'Favorites') {
            IconComponent = Heart;
          } else if (route.name === 'Leaderboard') {
            IconComponent = Trophy;
          } else if (route.name === 'Profile') {
            IconComponent = User;
          }

          return IconComponent ? (
            <IconComponent 
              size={size} 
              color={focused ? '#FF6B35' : color} 
            />
          ) : null;
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={MainScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Navigator
function AuthNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  return (
    <Stack.Navigator 
      initialRouteName="MainTabs"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DemoOnboarding" component={DemoOnboardingScreen} />
      <Stack.Screen name="IngredientReview" component={IngredientReviewScreen} />
      <Stack.Screen name="RecipeCards" component={RecipeCardsScreen} />
      <Stack.Screen name="CookMode" component={CookModeScreen} />
      <Stack.Screen name="Creator" component={CreatorScreen} />
      <Stack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen} />
      <Stack.Screen name="CreatorKYC" component={CreatorKYCScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PlanSelection" component={PlanSelectionSheet} />
      <Stack.Screen name="PlanPaywall" component={PlanPaywallScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="EnhancedPreferences" component={EnhancedPreferencesScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="RecipeCarousel" component={RecipeCarouselScreen} />
      <Stack.Screen name="AccountGate" component={AccountGateScreen} />
      <Stack.Screen name="ExampleFeatureGate" component={ExampleFeatureGateScreen} />
      <Stack.Screen name="ColdOpen" component={ColdOpenScreen} />
    </Stack.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FF' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}

// Root Navigator Component
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    const deepLinkService = DeepLinkService.getInstance();
    deepLinkService.setNavigationRef(navigationRef);
    
    // Initialize deep link handling
    const initDeepLinks = async () => {
      await deepLinkService.initialize();
    };
    
    initDeepLinks();
  }, []);

  useEffect(() => {
    // Process any pending links after navigation is ready
    if (navigationRef.current) {
      const deepLinkService = DeepLinkService.getInstance();
      deepLinkService.processPendingLinks();
    }
  }, [user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const linking = {
    prefixes: ['cookcam://', 'https://cookcam.ai', 'https://www.cookcam.ai'],
    config: {
      screens: {
        Welcome: 'signup',
        Login: 'login',
        Signup: 'signup',
        MainTabs: 'main',
        CookMode: 'recipe/:recipeId',
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// Main App Component
const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GamificationProvider>
            <SubscriptionProvider>
              <TempDataProvider>
                <StatusBar style="auto" />
                <RootNavigator />
              </TempDataProvider>
            </SubscriptionProvider>
          </GamificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
