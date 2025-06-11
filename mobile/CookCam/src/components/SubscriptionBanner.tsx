import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {AlertTriangle, CreditCard, Gift, X} from 'lucide-react-native';
import SubscriptionLifecycleService, {
  SubscriptionState,
} from '../services/SubscriptionLifecycleService';

interface SubscriptionBannerProps {
  userId: string;
  onReactivate?: () => void;
  onUpdatePayment?: () => void;
  onViewOffers?: () => void;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  userId,
  onReactivate,
  onUpdatePayment,
  onViewOffers,
}) => {
  const [subscriptionState, setSubscriptionState] =
    useState<SubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const lifecycleService = SubscriptionLifecycleService.getInstance();

  useEffect(() => {
    loadSubscriptionState();
  }, [userId]);

  useEffect(() => {
    if (subscriptionState && !isDismissed) {
      const prompt =
        lifecycleService.shouldShowReengagementPrompt(subscriptionState);
      if (prompt.show) {
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [subscriptionState, isDismissed]);

  const loadSubscriptionState = async () => {
    try {
      setIsLoading(true);
      const state = await lifecycleService.getSubscriptionState(userId);
      setSubscriptionState(state);
    } catch (error) {
      console.error('Error loading subscription state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!subscriptionState) {
      return;
    }

    try {
      setIsLoading(true);

      // Check for win-back offers
      const offer = await lifecycleService.getWinBackOffer(
        userId,
        subscriptionState,
      );

      if (offer.hasOffer) {
        Alert.alert(
          'Special Offer!',
          offer.offerText || 'We have a special offer for you!',
          [
            {text: 'Not Now', style: 'cancel'},
            {
              text: 'Accept Offer',
              onPress: () =>
                processReactivation(offer.discountPercent?.toString()),
            },
          ],
        );
      } else {
        await processReactivation();
      }
    } catch (error) {
      console.error('Error handling reactivation:', error);
      Alert.alert('Error', 'Failed to process reactivation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processReactivation = async (offerCode?: string) => {
    try {
      const result = await lifecycleService.reactivateSubscription(
        userId,
        offerCode,
      );

      if (result.success) {
        Alert.alert('Success!', result.message);
        setIsDismissed(true);
        onReactivate?.();
        await loadSubscriptionState(); // Refresh state
      } else {
        Alert.alert('Failed', result.message);
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      Alert.alert(
        'Error',
        'Failed to reactivate subscription. Please try again.',
      );
    }
  };

  const handleUpdatePayment = () => {
    onUpdatePayment?.();
  };

  const handleViewOffers = () => {
    onViewOffers?.();
  };

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDismissed(true);
    });
  };

  if (isLoading || !subscriptionState || isDismissed) {
    return null;
  }

  const prompt =
    lifecycleService.shouldShowReengagementPrompt(subscriptionState);

  if (!prompt.show) {
    return null;
  }

  const getBannerStyle = () => {
    switch (prompt.type) {
      case 'payment_failed':
        return {
          backgroundColor: '#FFE5E5',
          borderColor: '#FF3B30',
          iconColor: '#FF3B30',
          icon: CreditCard,
        };
      case 'grace_period':
        return {
          backgroundColor: '#FFF3CD',
          borderColor: '#FF8C00',
          iconColor: '#FF8C00',
          icon: AlertTriangle,
        };
      case 'win_back':
        return {
          backgroundColor: '#E8F5E8',
          borderColor: '#66BB6A',
          iconColor: '#66BB6A',
          icon: Gift,
        };
      default:
        return {
          backgroundColor: '#F0F8FF',
          borderColor: '#007AFF',
          iconColor: '#007AFF',
          icon: AlertTriangle,
        };
    }
  };

  const bannerStyle = getBannerStyle();
  const IconComponent = bannerStyle.icon;

  const getActionHandler = () => {
    switch (prompt.type) {
      case 'payment_failed':
        return handleUpdatePayment;
      case 'grace_period':
        return handleReactivate;
      case 'win_back':
        return handleViewOffers;
      default:
        return handleReactivate;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bannerStyle.backgroundColor,
          borderColor: bannerStyle.borderColor,
          opacity: fadeAnim,
        },
      ]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconComponent size={20} color={bannerStyle.iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.message, {color: bannerStyle.iconColor}]}>
            {prompt.message}
          </Text>

          {subscriptionState.isInGracePeriod &&
            subscriptionState.gracePeriodEnd && (
              <Text style={styles.subMessage}>
                Grace period ends{' '}
                {subscriptionState.gracePeriodEnd.toLocaleDateString()}
              </Text>
            )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {backgroundColor: bannerStyle.iconColor},
            ]}
            onPress={getActionHandler()}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>{prompt.cta}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}>
            <X size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subMessage: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 4,
  },
});

export default SubscriptionBanner;
