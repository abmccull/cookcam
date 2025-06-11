import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import {Camera, ChefHat, Heart, Trophy, Plus} from 'lucide-react-native';

// Import our subscription lifecycle components
import SubscriptionBanner from '../components/SubscriptionBanner';
import FeatureGate from '../components/FeatureGate';
import SubscriptionLifecycleService from '../services/SubscriptionLifecycleService';

interface MainScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  // Mock current user ID - replace with actual auth context
  const [currentUserId] = useState('user_123');
  const [subscriptionState, setSubscriptionState] = useState<any>(null);
  const lifecycleService = SubscriptionLifecycleService.getInstance();

  const loadSubscriptionData = useCallback(async () => {
    try {
      const state = await lifecycleService.getSubscriptionState(currentUserId);
      setSubscriptionState(state);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  }, [lifecycleService, currentUserId]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleScanPress = () => {
    // This will be handled by FeatureGate
    navigation.navigate('DemoOnboarding');
  };

  const handleCookModePress = () => {
    Alert.alert('Cook Mode', 'Starting guided cooking experience!');
  };

  const handleFavoritesPress = () => {
    Alert.alert('Favorites', 'Viewing your favorite recipes!');
  };

  const handleLeaderboardPress = () => {
    navigation.navigate('PlanSelection');
  };

  const handleCreateRecipePress = () => {
    Alert.alert('Create Recipe', 'Opening recipe creation tools!');
  };

  const handleUpgrade = () => {
    navigation.navigate('PlanSelection');
  };

  const handleReactivate = () => {
    Alert.alert('Reactivate', 'Redirecting to subscription management...');
    navigation.navigate('PlanSelection');
  };

  const handleUpdatePayment = () => {
    Alert.alert('Update Payment', 'Opening payment method update...');
  };

  const handleViewOffers = () => {
    Alert.alert('Special Offers', 'Viewing available comeback offers!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Subscription Banner - Shows contextual alerts */}
        <SubscriptionBanner
          userId={currentUserId}
          onReactivate={handleReactivate}
          onUpdatePayment={handleUpdatePayment}
          onViewOffers={handleViewOffers}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to CookCam</Text>
          {subscriptionState && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {subscriptionState.tier.toUpperCase()} •{' '}
                {subscriptionState.status}
              </Text>
            </View>
          )}
        </View>

        {/* Main Action - Scan Ingredients */}
        <FeatureGate
          feature="scan"
          userId={currentUserId}
          onUpgrade={handleUpgrade}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleScanPress}>
            <Camera size={32} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Scan Ingredients</Text>
            <Text style={styles.primaryActionSubtext}>
              Point your camera at ingredients
            </Text>
          </TouchableOpacity>
        </FeatureGate>

        {/* Feature Grid */}
        <View style={styles.featureGrid}>
          {/* Cook Mode - Premium Feature */}
          <FeatureGate
            feature="cook_mode"
            userId={currentUserId}
            onUpgrade={handleUpgrade}
            fallbackComponent={
              <TouchableOpacity
                style={[styles.featureCard, styles.lockedCard]}
                onPress={handleUpgrade}>
                <ChefHat size={24} color="#8E8E93" />
                <Text style={styles.lockedCardText}>Cook Mode</Text>
                <Text style={styles.upgradeHint}>🔒 Premium</Text>
              </TouchableOpacity>
            }>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={handleCookModePress}>
              <ChefHat size={24} color="#FF6B35" />
              <Text style={styles.featureCardText}>Cook Mode</Text>
            </TouchableOpacity>
          </FeatureGate>

          {/* Favorites - Premium Feature */}
          <FeatureGate
            feature="favorites"
            userId={currentUserId}
            onUpgrade={handleUpgrade}
            fallbackComponent={
              <TouchableOpacity
                style={[styles.featureCard, styles.lockedCard]}
                onPress={handleUpgrade}>
                <Heart size={24} color="#8E8E93" />
                <Text style={styles.lockedCardText}>Favorites</Text>
                <Text style={styles.upgradeHint}>🔒 Premium</Text>
              </TouchableOpacity>
            }>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={handleFavoritesPress}>
              <Heart size={24} color="#FF6B35" />
              <Text style={styles.featureCardText}>Favorites</Text>
            </TouchableOpacity>
          </FeatureGate>

          {/* Leaderboard - Usually Free */}
          <FeatureGate
            feature="leaderboard"
            userId={currentUserId}
            onUpgrade={handleUpgrade}>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={handleLeaderboardPress}>
              <Trophy size={24} color="#FF6B35" />
              <Text style={styles.featureCardText}>Leaderboard</Text>
            </TouchableOpacity>
          </FeatureGate>

          {/* Create Recipes - Creator Only */}
          <FeatureGate
            feature="create_recipes"
            userId={currentUserId}
            onUpgrade={handleUpgrade}
            fallbackComponent={
              <TouchableOpacity
                style={[styles.featureCard, styles.lockedCard]}
                onPress={handleUpgrade}>
                <Plus size={24} color="#8E8E93" />
                <Text style={styles.lockedCardText}>Create</Text>
                <Text style={styles.upgradeHint}>🔒 Creator</Text>
              </TouchableOpacity>
            }>
            <TouchableOpacity
              style={styles.featureCard}
              onPress={handleCreateRecipePress}>
              <Plus size={24} color="#FF6B35" />
              <Text style={styles.featureCardText}>Create</Text>
            </TouchableOpacity>
          </FeatureGate>
        </View>

        {/* Subscription Status Info */}
        {subscriptionState && (
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>Subscription Status</Text>
            <View style={styles.subscriptionDetails}>
              <Text style={styles.subscriptionText}>
                Tier:{' '}
                {subscriptionState.tier.charAt(0).toUpperCase() +
                  subscriptionState.tier.slice(1)}
              </Text>
              <Text style={styles.subscriptionText}>
                Status:{' '}
                {subscriptionState.status.charAt(0).toUpperCase() +
                  subscriptionState.status.slice(1)}
              </Text>
              {subscriptionState.isInGracePeriod &&
                subscriptionState.gracePeriodEnd && (
                  <Text style={styles.gracePeriodText}>
                    Grace period ends:{' '}
                    {subscriptionState.gracePeriodEnd.toLocaleDateString()}
                  </Text>
                )}
            </View>
          </View>
        )}

        {/* Demo Actions */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Actions</Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => navigation.navigate('PlanSelection')}>
            <Text style={styles.demoButtonText}>View Subscription Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={loadSubscriptionData}>
            <Text style={styles.demoButtonText}>
              Refresh Subscription State
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66BB6A',
  },
  primaryAction: {
    backgroundColor: '#FF6B35',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryActionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  primaryActionSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  featureCard: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginTop: 8,
  },
  lockedCard: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  lockedCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  upgradeHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  subscriptionInfo: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 12,
  },
  subscriptionDetails: {
    gap: 4,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  gracePeriodText: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '500',
  },
  demoSection: {
    marginHorizontal: 24,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 16,
  },
  demoButton: {
    backgroundColor: '#66BB6A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MainScreen;
