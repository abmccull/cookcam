import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, X } from 'lucide-react-native';

interface PlanPaywallScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PlanPaywall'>;
  route: RouteProp<RootStackParamList, 'PlanPaywall'>;
}

const PlanPaywallScreen: React.FC<PlanPaywallScreenProps> = ({ navigation, route }) => {
  const { selectedPlan = 'consumer', source, tempData } = route.params || {};
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const { purchaseSubscription, restorePurchases } = useSubscription();
  const { _user } = useAuth();

  useEffect(() => {
    analyticsService.track('paywall_viewed', {
      source: source || 'unknown',
      plan: selectedPlan,
      has_demo_data: !!tempData,
      billing_period: billingPeriod
    });
  }, []);

  const handleStartTrial = async () => {
    setIsLoading(true);
    analyticsService.track('trial_start_initiated', { 
      plan: selectedPlan, 
      billing_period: billingPeriod 
    });
    
    try {
      // Map to actual product IDs
      const productId = Platform.select({
        ios: billingPeriod === 'monthly' 
          ? (selectedPlan === 'creator' ? 'com.cookcam.creator.monthly' : 'com.cookcam.pro.monthly')
          : (selectedPlan === 'creator' ? 'com.cookcam.creator.yearly' : 'com.cookcam.pro.yearly'),
        android: billingPeriod === 'monthly'
          ? (selectedPlan === 'creator' ? 'cookcam_creator_monthly' : 'cookcam_pro_monthly')
          : (selectedPlan === 'creator' ? 'cookcam_creator_yearly' : 'cookcam_pro_yearly')
      }) || '';
      
      await purchaseSubscription(productId);
      
      analyticsService.track('trial_started', { 
        plan: selectedPlan, 
        billing_period: billingPeriod,
        trial_days: 7,
        product_id: productId
      });
      
      // Set onboarding complete
      await AsyncStorage.setItem('onboardingDone', 'true');
      
      // Navigate to main app
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      
    } catch (error: unknown) {
      analyticsService.track('trial_start_failed', { 
        error: error?.message || 'unknown',
        plan: selectedPlan 
      });
      Alert.alert(
        'Subscription Error', 
        'Could not start your trial. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaybeLater = async () => {
    analyticsService.track('paywall_dismissed', { method: 'maybe_later', plan: selectedPlan });
    analyticsService.track('free_tier_selected');
    
    // Set onboarding done flag
    await AsyncStorage.setItem('onboardingDone', 'true');
    
    // Navigate to main app with free tier
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const handleRestore = async () => {
    setIsLoading(true);
    analyticsService.track('restore_purchases_initiated');
    
    try {
      await restorePurchases();
      
      analyticsService.track('restore_purchases_success');
      Alert.alert(
        'Success!',
        'Your purchases have been restored. You now have access to all premium features.',
        [{ 
          text: 'OK', 
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        }]
      );
    } catch (error: unknown) {
      analyticsService.track('restore_purchases_failed', {
        error: error?.message || 'unknown'
      });
      Alert.alert(
        'Restore Failed',
        'No previous purchases found or there was an error. If you believe this is an error, please contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pricing logic with accurate savings calculation
  const monthlyPrice = selectedPlan === 'creator' ? 9.99 : 3.99;
  const yearlyPrice = selectedPlan === 'creator' ? 99.99 : 39.99;
  const monthlyCost = monthlyPrice * 12;
  const actualSavings = monthlyCost - yearlyPrice;
  const savingsPercentage = Math.round((actualSavings / monthlyCost) * 100);

  const price = selectedPlan === 'creator' 
    ? (billingPeriod === 'monthly' ? '$9.99' : '$99.99')
    : (billingPeriod === 'monthly' ? '$3.99' : '$39.99');

  const savings = billingPeriod === 'yearly' 
    ? `$${actualSavings.toFixed(2)}`
    : null;

  // Features by plan
  const features = selectedPlan === 'creator' ? [
    'Everything in Get Cooking',
    'Creator dashboard & analytics',
    'Publish premium recipes',
    'Earn 30% revenue share',
    'Referral tracking & bonuses',
    'Priority support'
  ] : [
    'Unlimited ingredient scanning',
    'AI recipe generation',
    'Step-by-step cook mode',
    'Save favorite recipes',
    'Nutrition information',
    'Ad-free experience'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleMaybeLater}
          accessible={true}
          accessibilityLabel="Close paywall and continue with free tier"
          accessibilityHint="Dismiss this screen and continue with 3 free scans per day"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#2D1B69" />
        </TouchableOpacity>

        {/* Hero section */}
        <View style={styles.hero}>
          <Text 
            style={styles.heroTitle}
            accessibilityRole="header"
            accessible={true}
          >
            {selectedPlan === 'creator' ? '🎨 Unlock Creator Tools' : '👨‍🍳 Start Cooking Smarter'}
          </Text>
          <Text style={styles.heroSubtitle}>
            Try free for 7 days, cancel anytime
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              billingPeriod === 'monthly' && styles.toggleButtonActive
            ]}
            onPress={() => setBillingPeriod('monthly')}
            accessibilityLabel="Select monthly billing"
            accessibilityState={{ selected: billingPeriod === 'monthly' }}
          >
            <Text style={[
              styles.toggleText, 
              billingPeriod === 'monthly' && styles.toggleTextActive
            ]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              billingPeriod === 'yearly' && styles.toggleButtonActive
            ]}
            onPress={() => setBillingPeriod('yearly')}
            accessibilityLabel="Select annual billing and save"
            accessibilityState={{ selected: billingPeriod === 'yearly' }}
          >
            <Text style={[
              styles.toggleText, 
              billingPeriod === 'yearly' && styles.toggleTextActive
            ]}>
              Annual
            </Text>
            {billingPeriod === 'yearly' && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save {savingsPercentage}%</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Price display */}
        <View style={styles.priceSection}>
          <Text style={styles.priceAmount}>{price}</Text>
          <Text style={styles.pricePeriod}>
            /{billingPeriod === 'monthly' ? 'month' : 'year'}
          </Text>
        </View>
        {billingPeriod === 'yearly' && savings && (
          <Text style={styles.savingsHighlight}>
            💰 Save {savings}/year vs monthly
          </Text>
        )}
        <Text style={styles.trialInfo}>
          after 7-day free trial
        </Text>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's included:</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={20} color="#66BB6A" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Social proof - Enhanced */}
        <View style={styles.socialProofContainer}>
          <View style={styles.socialProofCard}>
            <Text style={styles.socialProofEmoji}>⭐⭐⭐⭐⭐</Text>
            <Text style={styles.socialProofRating}>4.8 out of 5</Text>
            <Text style={styles.socialProofSubtext}>12,500+ reviews</Text>
          </View>
          
          <View style={styles.socialProofCard}>
            <Text style={styles.socialProofEmoji}>👨‍🍳</Text>
            <Text style={styles.socialProofRating}>50K+</Text>
            <Text style={styles.socialProofSubtext}>Active cooks</Text>
          </View>
          
          <View style={styles.socialProofCard}>
            <Text style={styles.socialProofEmoji}>📈</Text>
            <Text style={styles.socialProofRating}>98%</Text>
            <Text style={styles.socialProofSubtext}>Continue rate</Text>
          </View>
        </View>
        
        {/* Testimonial */}
        <View style={styles.testimonial}>
          <Text style={styles.testimonialQuote}>
            "CookCam helped me reduce food waste by 40% and discover amazing recipes I never would have tried!"
          </Text>
          <Text style={styles.testimonialAuthor}>— Sarah M., Home Cook</Text>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity 
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleStartTrial}
          disabled={isLoading}
          accessible={true}
          accessibilityLabel={`Start free 7-day trial for ${price} per ${billingPeriod === 'monthly' ? 'month' : 'year'}`}
          accessibilityHint="After trial, you'll be charged the selected plan price. Cancel anytime"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Start Free Trial</Text>
              <Text style={styles.primaryButtonSubtext}>
                Then {price}/{billingPeriod === 'monthly' ? 'month' : 'year'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary option */}
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleMaybeLater}
          accessible={true}
          accessibilityLabel="Maybe later, continue with 3 free scans per day"
          accessibilityHint="Skip the trial and use CookCam with limited free features"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>
            Maybe later (3 free scans/day)
          </Text>
        </TouchableOpacity>

        {/* Compliance footer */}
        <Text style={styles.disclaimer}>
          Your subscription starts after the 7-day free trial and renews automatically. 
          Cancel anytime in Settings. By continuing, you agree to our Terms of Service 
          and Privacy Policy. Subscription is billed to your App Store or Google Play account.
        </Text>

        {/* Terms & Privacy links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://cookcam.ai/terms-of-service.html')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}> • </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://cookcam.ai/privacy.html')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={handleRestore}
          accessible={true}
          accessibilityLabel="Restore previous purchase"
          accessibilityHint="Tap to restore your subscription if you've already purchased"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.restoreLink}>
            Already subscribed? Restore purchase
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF'},
  scrollContent: {
    padding: 24,
    paddingBottom: 40},
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8},
  hero: {
    alignItems: 'center',
    marginBottom: 24},
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: 8},
  heroSubtitle: {
    fontSize: 16,
    color: '#66BB6A',
    fontWeight: '600'},
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24},
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6},
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2},
  toggleText: {
    fontSize: 14,
    color: '#8E8E93'},
  toggleTextActive: {
    color: '#2D1B69',
    fontWeight: '600'},
  savingsBadge: {
    backgroundColor: '#66BB6A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4},
  savingsText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600'},
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 4},
  priceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D1B69'},
  pricePeriod: {
    fontSize: 18,
    color: '#8E8E93',
    marginLeft: 4},
  trialInfo: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32},
  savingsHighlight: {
    fontSize: 16,
    color: '#66BB6A',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4},
  featuresSection: {
    marginBottom: 24},
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 16},
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12},
  featureText: {
    fontSize: 16,
    color: '#2D1B69',
    marginLeft: 12,
    flex: 1},
  socialProofContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4},
  socialProofCard: {
    flex: 1,
    backgroundColor: '#F8F8FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0'},
  socialProofEmoji: {
    fontSize: 24,
    marginBottom: 8},
  socialProofRating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 4},
  socialProofSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center'},
  testimonial: {
    backgroundColor: '#FFF8F0',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35'},
  testimonialQuote: {
    fontSize: 15,
    color: '#2D1B69',
    lineHeight: 22,
    marginBottom: 12,
    fontStyle: 'italic'},
  testimonialAuthor: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600'},
  primaryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 18,
    minHeight: 56, // Ensures 44pt minimum touch target + padding
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4},
  buttonDisabled: {
    opacity: 0.6},
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'},
  primaryButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4},
  secondaryButton: {
    paddingVertical: 16,
    minHeight: 44, // Ensures 44pt minimum touch target
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center'},
  secondaryButtonText: {
    fontSize: 16,
    color: '#8E8E93'},
  disclaimer: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12},
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16},
  legalLink: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline'},
  legalSeparator: {
    fontSize: 12,
    color: '#8E8E93'},
  restoreLink: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    textDecorationLine: 'underline'}});

export default PlanPaywallScreen;

