import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  StatusBar,
  ActivityIndicator,
  View,
  StyleSheet,
  AppState,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {AuthProvider, useAuth} from './context/AuthContext';
import {GamificationProvider} from './context/GamificationContext';
import {SubscriptionProvider} from './context/SubscriptionContext';
import {TempDataProvider} from './context/TempDataContext';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import TabBar from './components/TabBar';
import XPNotificationProvider from './components/XPNotificationProvider';
import XPHeader from './components/XPHeader';
import {analyticsService} from './services/analyticsService';

// Import screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import CreatorOnboardingScreen from './screens/CreatorOnboardingScreen';
import CameraScreen from './screens/CameraScreen';
import IngredientReviewScreen from './screens/IngredientReviewScreen';
import EnhancedPreferencesScreen from './screens/EnhancedPreferencesScreen';
import RecipeCardsScreen from './screens/RecipeCardsScreen';
import CookModeScreen from './screens/CookModeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import CreatorScreen from './screens/CreatorScreen';
import ProfileScreen from './screens/ProfileScreen';

// New onboarding v2 screens
import WelcomeScreen from './screens/WelcomeScreen';
import ColdOpenScreen from './screens/ColdOpenScreen';
import DemoOnboardingScreen from './screens/DemoOnboardingScreen';
import RecipeCarouselScreen from './screens/RecipeCarouselScreen';
import PlanSelectionSheet from './screens/PlanSelectionSheet';
import AccountGateScreen from './screens/AccountGateScreen';
import PlanPaywallScreen from './screens/PlanPaywallScreen';
import CreatorKYCScreen from './screens/CreatorKYCScreen';

// Navigation types
export type RootStackParamList = {
  // New onboarding flow
  Welcome: undefined;
  ColdOpen: undefined;
  DemoOnboarding: undefined;
  RecipeCarousel: undefined;
  PlanSelection: undefined;
  AccountGate: {intendedPlan: string; tempData?: any};
  PlanPaywall: {selectedPlan: string; tempData?: any};
  CreatorKYC: undefined;
  PreferenceQuiz: {skipable: boolean};

  // Existing routes
  Auth: undefined;
  Main: undefined;
  Onboarding: {isCreator?: boolean}; // Legacy - will be deprecated
  CreatorOnboarding: {returnToTab?: string};
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Leaderboard: undefined;
  Discover: undefined;
  Creator: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  Camera: undefined;
  IngredientReview: {imageUri: string};
  Preferences: {ingredients: any[]; imageUri?: string};
  RecipeCards: {ingredients: any[]; imageUri?: string; preferences: any};
  CookMode: {recipe: any};
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// Home Stack Navigator
const HomeStackScreen = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#2D1B69',
      },
      headerTintColor: '#F8F8FF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      gestureEnabled: true,
      animation: 'slide_from_right',
    }}>
    <HomeStack.Screen
      name="Camera"
      component={CameraScreen}
      options={{
        title: 'CookCam',
        headerShown: false,
      }}
    />
    <HomeStack.Screen
      name="IngredientReview"
      component={IngredientReviewScreen as any}
      options={{
        title: 'Review Ingredients',
      }}
    />
    <HomeStack.Screen
      name="Preferences"
      component={EnhancedPreferencesScreen}
      options={{
        title: 'Your Preferences',
      }}
    />
    <HomeStack.Screen
      name="RecipeCards"
      component={RecipeCardsScreen}
      options={{
        title: 'AI Generated Recipes',
      }}
    />
    <HomeStack.Screen
      name="CookMode"
      component={CookModeScreen}
      options={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  </HomeStack.Navigator>
);

// Auth Stack Navigator
const AuthStackScreen = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

// Main Tab Navigator with improved styling
const MainTabs = () => {
  const {user} = useAuth();

  return (
    <>
      <XPHeader />
      <Tab.Navigator
        tabBar={props => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tab.Screen
          name="Home"
          component={HomeStackScreen}
          options={{
            tabBarLabel: 'Cook',
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{
            tabBarLabel: 'Saved',
            tabBarBadge:
              user?.favoriteCount && user.favoriteCount > 0
                ? user.favoriteCount
                : undefined,
          }}
        />
        <Tab.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            tabBarLabel: 'Compete',
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarLabel: 'Discover',
          }}
        />
        <Tab.Screen
          name="Creator"
          component={CreatorScreen}
          options={{
            tabBarLabel: 'Creator',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Me',
            tabBarBadge:
              user?.streak && user.streak > 0 ? `🔥${user.streak}` : undefined,
          }}
        />
      </Tab.Navigator>
    </>
  );
};

// Root Navigator with Auth Check
const RootNavigator = () => {
  const {user, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen
            name="CreatorOnboarding"
            component={CreatorOnboardingScreen as any}
          />
        </>
      ) : (
        <>
          {/* Start with splash screen first */}
          <RootStack.Screen name="ColdOpen" component={ColdOpenScreen} />
          
          {/* New welcome screen */}
          <RootStack.Screen name="Welcome" component={WelcomeScreen} />
          
          {/* New onboarding v2 flow */}
          <RootStack.Screen
            name="DemoOnboarding"
            component={DemoOnboardingScreen}
          />
          <RootStack.Screen
            name="RecipeCarousel"
            component={RecipeCarouselScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="PlanSelection"
            component={PlanSelectionSheet}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="AccountGate"
            component={AccountGateScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="PlanPaywall"
            component={PlanPaywallScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <RootStack.Screen
            name="CreatorKYC"
            component={CreatorKYCScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          {/* TODO: Add PreferenceQuiz screen */}

          {/* Legacy onboarding - keeping for fallback */}
          <RootStack.Screen name="Auth" component={AuthStackScreen} />
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          <RootStack.Screen
            name="CreatorOnboarding"
            component={CreatorOnboardingScreen as any}
          />
        </>
      )}
    </RootStack.Navigator>
  );
};

// Main App Component with Analytics Integration
const AppWithAnalytics = () => {
  useEffect(() => {
    // Track app lifecycle events
    const handleAppStateChange = (nextAppState: string) => {
      analyticsService.trackAppStateChange(
        nextAppState as 'active' | 'background' | 'inactive',
      );
    };

    // Set up app state listener
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // Track app launch
    analyticsService.track('app_launched');

    return () => {
      subscription.remove();
      analyticsService.destroy();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#2D1B69"
          translucent={false}
        />
        <TempDataProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <GamificationProvider>
                <XPNotificationProvider>
                  <NavigationContainer>
                    <RootNavigator />
                  </NavigationContainer>
                </XPNotificationProvider>
              </GamificationProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </TempDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8FF',
  },
});

const App: React.FC = () => {
  return <AppWithAnalytics />;
};

export default App;
