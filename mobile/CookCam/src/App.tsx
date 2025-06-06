import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar, ActivityIndicator, View, StyleSheet, Text, SafeAreaView, AppState} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Home, Heart, Trophy, Search, User, PlusCircle} from 'lucide-react-native';
import {AuthProvider, useAuth} from './context/AuthContext';
import {GamificationProvider} from './context/GamificationContext';
import {SubscriptionProvider} from './context/SubscriptionContext';
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
import PreferencesScreen from './screens/PreferencesScreen';
import RecipeCardsScreen from './screens/RecipeCardsScreen';
import CookModeScreen from './screens/CookModeScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import CreatorScreen from './screens/CreatorScreen';
import ProfileScreen from './screens/ProfileScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: {isCreator?: boolean};
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
      component={PreferencesScreen}
      options={{
        title: 'Your Preferences',
      }}
    />
    <HomeStack.Screen
      name="RecipeCards"
      component={RecipeCardsScreen}
      options={{
        title: 'Recipe Suggestions',
      }}
    />
    <HomeStack.Screen
      name="CookMode"
      component={CookModeScreen}
      options={{
        title: 'Cook Mode',
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
            tabBarBadge: user?.favoriteCount && user.favoriteCount > 0 ? user.favoriteCount : undefined,
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
            tabBarBadge: user?.streak && user.streak > 0 ? `🔥${user.streak}` : undefined,
          }}
        />
      </Tab.Navigator>
    </>
  );
};

// Root Navigator with Auth Check
const RootNavigator = () => {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        <>
          <RootStack.Screen name="Main" component={MainTabs} />
          <RootStack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen as any} />
        </>
      ) : (
        <>
          <RootStack.Screen name="Auth" component={AuthStackScreen} />
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          <RootStack.Screen name="CreatorOnboarding" component={CreatorOnboardingScreen as any} />
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
      analyticsService.trackAppStateChange(nextAppState as 'active' | 'background' | 'inactive');
    };

    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

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
