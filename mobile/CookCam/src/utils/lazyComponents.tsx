import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { tokens } from '../styles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

// Generic screen props type
type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: NativeStackNavigationProp<RootStackParamList, T>;
  route: any;
};

// Simple loading component
const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={tokens.colors.brand.primary} />
  </View>
);

// Lazy-loaded screens (heaviest components)
export const LazyCreatorScreen = lazy(() => import('../screens/CreatorScreen'));
export const LazyIngredientReviewScreen = lazy(() => import('../screens/IngredientReviewScreen'));
export const LazyProfileScreen = lazy(() => import('../screens/ProfileScreen'));
export const LazyCreatorOnboardingScreen = lazy(() => import('../screens/CreatorOnboardingScreen'));
export const LazyCameraScreen = lazy(() => import('../screens/CameraScreen'));
export const LazyPreferencesScreen = lazy(() => import('../screens/PreferencesScreen'));
export const LazyFavoritesScreen = lazy(() => import('../screens/FavoritesScreen'));
export const LazyLeaderboardScreen = lazy(() => import('../screens/LeaderboardScreen'));
export const LazyDiscoverScreen = lazy(() => import('../screens/DiscoverScreen'));

// Wrapped components with Suspense
export const CreatorScreen = (props: ScreenProps<'Creator'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCreatorScreen {...props} />
  </Suspense>
);

export const IngredientReviewScreen = (props: ScreenProps<'Camera'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyIngredientReviewScreen {...props} />
  </Suspense>
);

export const ProfileScreen = (props: ScreenProps<'Profile'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyProfileScreen {...props} />
  </Suspense>
);

export const CreatorOnboardingScreen = (props: ScreenProps<'CreatorOnboarding'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCreatorOnboardingScreen {...props} />
  </Suspense>
);

export const CameraScreen = (props: ScreenProps<'Camera'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCameraScreen {...props} />
  </Suspense>
);

export const PreferencesScreen = (props: ScreenProps<'Preferences'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyPreferencesScreen {...props} />
  </Suspense>
);

export const FavoritesScreen = (props: ScreenProps<'Favorites'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyFavoritesScreen {...props} />
  </Suspense>
);

export const LeaderboardScreen = (props: ScreenProps<'Leaderboard'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyLeaderboardScreen />
  </Suspense>
);

export const DiscoverScreen = (props: ScreenProps<'Discover'>) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyDiscoverScreen {...props} />
  </Suspense>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.background.tertiary,
    minHeight: 200,
  },
});

export { LoadingFallback }; 