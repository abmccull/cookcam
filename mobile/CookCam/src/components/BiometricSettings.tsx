import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Fingerprint, Scan, Shield, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import BiometricAuthService from '../services/biometricAuth';
import { useAuth } from '../context/AuthContext';
import { secureStorage } from '../services/secureStorage';
import logger from '../utils/logger';

interface BiometricSettingsProps {
  style?: any;
}

const BiometricSettings: React.FC<BiometricSettingsProps> = ({ style }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricMethod, setBiometricMethod] = useState('Biometric Authentication');
  const [capabilities, setCapabilities] = useState<any>(null);
  
  const { user, enableBiometricLogin, disableBiometricLogin } = useAuth();
  const biometricService = BiometricAuthService.getInstance();

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const caps = await biometricService.checkBiometricCapabilities();
      const enabled = await biometricService.isBiometricEnabled();
      const method = await biometricService.getPrimaryBiometricMethod();
      
      setCapabilities(caps);
      setIsAvailable(caps.isAvailable);
      setIsEnabled(enabled);
      setBiometricMethod(method);
      
      logger.debug('🔐 Biometric status:', {
        available: caps.isAvailable,
        enabled,
        method,
      });
    } catch (error) {
      logger.error('❌ Error checking biometric status:', error);
      setIsAvailable(false);
      setIsEnabled(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!user) return;

    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (value) {
        // Enable biometric authentication
        if (!capabilities?.isAvailable) {
          Alert.alert(
            "Not Available",
            !capabilities?.hasHardware 
              ? "This device doesn't support biometric authentication."
              : "Please set up biometric authentication (fingerprint or face recognition) in your device settings first."
          );
          return;
        }

        // Test biometric authentication first
        const authResult = await biometricService.authenticateWithBiometrics({
          promptMessage: `Set up ${biometricMethod} for CookCam`,
          cancelLabel: 'Cancel',
        });

        if (authResult.success) {
          // Get current session token
          const token = await secureStorage.getSecureItem('access_token');
          if (token) {
            await enableBiometricLogin(user.email, token);
            setIsEnabled(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Success!",
              `${biometricMethod} has been enabled for your account. You can now use it to sign in quickly.`
            );
          } else {
            throw new Error('No valid session token found');
          }
        } else {
          // Authentication failed or was cancelled
          logger.debug('Biometric setup cancelled or failed');
        }
      } else {
        // Disable biometric authentication
        Alert.alert(
          "Disable Biometric Login",
          `Are you sure you want to disable ${biometricMethod} for signing in?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Disable",
              style: "destructive",
              onPress: async () => {
                try {
                  await disableBiometricLogin();
                  setIsEnabled(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Disabled", "Biometric login has been disabled.");
                } catch (error) {
                  Alert.alert("Error", "Failed to disable biometric login.");
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      logger.error('❌ Error toggling biometric authentication:', error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update biometric settings."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (biometricMethod.includes('Face ID')) {
      return <Scan size={24} color="#2D1B69" />;
    } else if (biometricMethod.includes('Touch ID') || biometricMethod.includes('Fingerprint')) {
      return <Fingerprint size={24} color="#2D1B69" />;
    } else {
      return <Shield size={24} color="#2D1B69" />;
    }
  };

  const getBiometricDescription = () => {
    if (!capabilities?.isAvailable) {
      if (!capabilities?.hasHardware) {
        return "Biometric authentication is not supported on this device.";
      } else {
        return "Please set up biometric authentication in your device settings first.";
      }
    }
    
    return `Use ${biometricMethod} to sign in quickly and securely.`;
  };

  if (!capabilities?.hasHardware) {
    return null; // Don't show the setting if hardware isn't available
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.settingRow}>
        <View style={styles.leftContent}>
          {getBiometricIcon()}
          <View style={styles.textContent}>
            <Text style={styles.title}>{biometricMethod}</Text>
            <Text style={[
              styles.description,
              !isAvailable && styles.disabledText
            ]}>
              {getBiometricDescription()}
            </Text>
          </View>
        </View>
        
        <Switch
          value={isEnabled}
          onValueChange={handleToggleBiometric}
          disabled={!isAvailable || isLoading}
          trackColor={{ false: '#E0E0E0', true: 'rgba(45, 27, 105, 0.3)' }}
          thumbColor={isEnabled ? '#2D1B69' : '#F4F3F4'}
        />
      </View>

      {!isAvailable && capabilities?.hasHardware && (
        <View style={styles.infoRow}>
          <Info size={16} color="#FF6B35" />
          <Text style={styles.infoText}>
            {capabilities.isEnrolled 
              ? "Biometric authentication is available but not configured for this app."
              : "Set up biometric authentication in your device settings to enable this feature."
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  textContent: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  disabledText: {
    color: '#C7C7CC',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoText: {
    fontSize: 13,
    color: '#FF6B35',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default BiometricSettings; 