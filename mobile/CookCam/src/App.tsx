import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, Heart, Trophy, User, Home, DollarSign } from 'lucide-react-native';

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
import AppShell from './components/AppShell';
import XPNotificationProvider from './components/XPNotificationProvider';

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
    selectedPlan?: string;
    tempData?: any;
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
    requiredFeature?: string;
    onContinue?: () => void;
    intendedPlan?: string;
    tempData?: any;
  };
  ExampleFeatureGate: undefined;
  ColdOpen: undefined;
};

export type TabParamList = {
  HomeStack: undefined;
  Camera: undefined;
  Favorites: undefined;
  Leaderboard: undefined;
  Creator?: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  Main: undefined;
  RecipeCards: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// Home Stack Navigator (new)
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Main" component={MainScreen} />
      <HomeStack.Screen name="RecipeCards" component={RecipeCardsScreen} />
      {/* Add other screens from the home flow here if needed */}
    </HomeStack.Navigator>
  );
}

// Type for bottom tab screen props
type TabScreenProps = {
  navigation: any;
  route: any;
};

// Wrapped screen components that correctly pass navigation props
const WrappedHomeStack = (props: TabScreenProps) => <AppShell><HomeStackNavigator /></AppShell>;
const WrappedFavorites = (props: TabScreenProps) => <AppShell><FavoritesScreen navigation={props.navigation} /></AppShell>;
const WrappedLeaderboard = (props: TabScreenProps) => <AppShell><LeaderboardScreen /></AppShell>;
const WrappedProfile = (props: TabScreenProps) => <AppShell><ProfileScreen navigation={props.navigation} /></AppShell>;

// Wrapped Creator screen
const WrappedCreator = (props: TabScreenProps) => <AppShell><CreatorScreen navigation={props.navigation} /></AppShell>;

// Main Tab Navigator
function MainTabs() {
  const { user } = useAuth();
  const showCreatorTab = user?.isCreator || false;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          if (route.name === 'HomeStack') {
            IconComponent = Home;
          } else if (route.name === 'Camera') {
            IconComponent = Camera;
          } else if (route.name === 'Favorites') {
            IconComponent = Heart;
          } else if (route.name === 'Leaderboard') {
            IconComponent = Trophy;
          } else if (route.name === 'Creator') {
            IconComponent = DollarSign;
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
      <Tab.Screen
        name="HomeStack"
        component={WrappedHomeStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen name="Camera" component={CameraScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name="Favorites" component={WrappedFavorites} />
      <Tab.Screen name="Leaderboard" component={WrappedLeaderboard} />
      {showCreatorTab && (
        <Tab.Screen 
          name="Creator" 
          component={WrappedCreator}
          options={{ title: 'Creator' }}
        />
      )}
      <Tab.Screen name="Profile" component={WrappedProfile} />
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
      <Stack.Screen name="AccountGate" component={AccountGateScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="PlanSelection" component={PlanSelectionSheet} />
      <Stack.Screen name="PlanPaywall" component={PlanPaywallScreen} />
      <Stack.Screen name="CreatorKYC" component={CreatorKYCScreen} />
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
      <Stack.Screen name="IngredientReview" component={IngredientReviewScreen as any} />
      <Stack.Screen name="CookMode" component={CookModeScreen} />
      <Stack.Screen name="Creator" component={CreatorScreen} />
      <Stack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen} />
      <Stack.Screen name="CreatorKYC" component={CreatorKYCScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PlanSelection" component={PlanSelectionSheet} />
      <Stack.Screen name="PlanPaywall" component={PlanPaywallScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="EnhancedPreferences" component={EnhancedPreferencesScreen as any} />
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
      <XPNotificationProvider>
        {user ? <AppNavigator /> : <AuthNavigator />}
      </XPNotificationProvider>
    </NavigationContainer>
  );
}

// Main App Component
function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <GamificationProvider>
              <TempDataProvider>
                <RootNavigator />
              </TempDataProvider>
            </GamificationProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
