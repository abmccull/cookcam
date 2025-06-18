import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Fingerprint, Scan, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import BiometricAuthService from '../services/biometricAuth';
import logger from '../utils/logger';

interface BiometricLoginProps {
  onSuccess: (credentials: { email: string; token: string; refreshToken?: string }) => void;
  onError?: (error: string) => void;
  style?: any;
  disabled?: boolean;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  refreshTrigger?: number; // When this changes, refresh availability
}

const BiometricLogin: React.FC<BiometricLoginProps> = ({
  onSuccess,
  onError,
  style,
  disabled = false,
  showLabel = true,
  size = 'medium',
  refreshTrigger,
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricMethod, setBiometricMethod] = useState('Biometric Authentication');
  const [biometricIcon, setBiometricIcon] = useState('🔐');
  
  const biometricService = BiometricAuthService.getInstance();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Refresh when refreshTrigger prop changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      checkBiometricAvailability();
    }
  }, [refreshTrigger]);

  // Add effect to re-check when app becomes active (e.g., returning from settings)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check again when app becomes active
        setTimeout(() => {
          checkBiometricAvailability();
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Check periodically while component is mounted
  useEffect(() => {
    const intervalId = setInterval(() => {
      checkBiometricAvailability();
    }, 10000); // Check every 10 seconds instead of 3

    return () => clearInterval(intervalId);
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      logger.debug('🔐 BiometricLogin: Checking availability...');
      
      const capabilities = await biometricService.checkBiometricCapabilities();
      const isEnabled = await biometricService.isBiometricEnabled();
      const hasCredentials = (await biometricService.getStoredCredentials()) !== null;
      
      logger.debug('🔐 BiometricLogin: Status check:', {
        hasHardware: capabilities.hasHardware,
        isEnrolled: capabilities.isEnrolled,
        isAvailable: capabilities.isAvailable,
        isEnabled,
        hasCredentials,
      });
      
      const canUse = capabilities.isAvailable && isEnabled && hasCredentials;
      setIsAvailable(canUse);
      
      if (canUse) {
        const method = await biometricService.getPrimaryBiometricMethod();
        const icon = await biometricService.getBiometricIcon();
        setBiometricMethod(method);
        setBiometricIcon(icon);
        logger.debug('✅ BiometricLogin: Available with method:', method);
      } else {
        logger.debug('❌ BiometricLogin: Not available', {
          reason: !capabilities.isAvailable ? 'No biometric hardware/enrollment' :
                  !isEnabled ? 'Not enabled in app' :
                  !hasCredentials ? 'No stored credentials' : 'Unknown'
        });
      }
    } catch (error) {
      logger.error('❌ Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isAvailable || disabled) return;

    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Authenticate with biometrics
      const authResult = await biometricService.authenticateWithBiometrics({
        promptMessage: `Sign in to CookCam with ${biometricMethod}`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (authResult.success) {
        // Get stored credentials
        const credentials = await biometricService.getStoredCredentials();
        
        if (credentials) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess(credentials);
        } else {
          throw new Error('No stored credentials found');
        }
      } else {
        if (authResult.warning) {
          // User cancelled - no need to show error
          logger.debug('🔐 Biometric authentication cancelled by user');
        } else {
          const errorMsg = authResult.error || 'Biometric authentication failed';
          logger.debug('❌ Biometric authentication error:', errorMsg);
          onError?.(errorMsg);
        }
      }
    } catch (error) {
      logger.error('❌ Biometric login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Biometric login failed';
      
      // Show user-friendly message for expired sessions
      if (errorMessage.includes('session has expired')) {
        onError?.('Please sign in with your password once to refresh biometric login');
      } else {
        onError?.(errorMessage);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricMethod.includes('Face ID')) {
      return <Scan size={getIconSize()} color="#2D1B69" />;
    } else if (biometricMethod.includes('Touch ID') || biometricMethod.includes('Fingerprint')) {
      return <Fingerprint size={getIconSize()} color="#2D1B69" />;
    } else {
      return <Shield size={getIconSize()} color="#2D1B69" />;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'medium': return 24;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return styles.buttonSmall;
      case 'medium': return styles.buttonMedium;
      case 'large': return styles.buttonLarge;
      default: return styles.buttonMedium;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return styles.textSmall;
      case 'medium': return styles.textMedium;
      case 'large': return styles.textLarge;
      default: return styles.textMedium;
    }
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, getButtonSize(), disabled && styles.disabled, style]}
      onPress={handleBiometricLogin}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#2D1B69" />
      ) : (
        getBiometricIcon()
      )}
      
      {showLabel && (
        <Text style={[styles.label, getTextSize(), disabled && styles.disabledText]}>
          {isLoading ? 'Authenticating...' : `Sign in with ${biometricMethod}`}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 27, 105, 0.2)',
    gap: 8,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  label: {
    color: '#2D1B69',
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  disabledText: {
    color: '#8E8E93',
  },
});

export default BiometricLogin; 