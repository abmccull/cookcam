import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Fingerprint, Scan, Shield, CheckCircle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import BiometricAuthService from '../services/biometricAuth';

interface BiometricEnablementModalProps {
  visible: boolean;
  onClose: () => void;
  onEnable: () => Promise<void>;
  onSuccess: () => void;
}

const { width } = Dimensions.get('window');

const BiometricEnablementModal: React.FC<BiometricEnablementModalProps> = ({
  visible,
  onClose,
  onEnable,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [biometricMethod, setBiometricMethod] = useState('Biometric Authentication');
  const [biometricIcon, setBiometricIcon] = useState('🔐');
  
  const slideAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const successScale = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      loadBiometricInfo();
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset states when modal closes
      setTimeout(() => {
        setShowSuccess(false);
        setIsLoading(false);
        successScale.setValue(0);
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    if (showSuccess) {
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 6,
      }).start();
    }
  }, [showSuccess]);

  const loadBiometricInfo = async () => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const method = await biometricService.getPrimaryBiometricMethod();
      const icon = await biometricService.getBiometricIcon();
      setBiometricMethod(method);
      setBiometricIcon(icon);
    } catch (error) {
      console.error('Error loading biometric info:', error);
    }
  };

  const handleEnable = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await onEnable();
      
      // Show success state
      setIsLoading(false);
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-close after showing success
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      
    } catch (error) {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Error will be handled by parent component
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const getBiometricIcon = () => {
    if (biometricMethod.includes('Face ID')) {
      return <Scan size={48} color="#FF6B35" />;
    } else if (biometricMethod.includes('Touch ID') || biometricMethod.includes('Fingerprint')) {
      return <Fingerprint size={48} color="#FF6B35" />;
    } else {
      return <Shield size={48} color="#FF6B35" />;
    }
  };

  const slideTransform = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouch} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modal,
            {
              transform: [
                { translateY: slideTransform },
                { scale: successScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.02],
                  extrapolate: 'clamp',
                }) }
              ],
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#8E8E93" />
          </TouchableOpacity>

          {showSuccess ? (
            // Success State
            <Animated.View style={[styles.content, { transform: [{ scale: successScale }] }]}>
              <View style={styles.successIconContainer}>
                <CheckCircle size={64} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Biometric Login Enabled!</Text>
              <Text style={styles.successMessage}>
                You can now use {biometricMethod} to sign in quickly and securely.
              </Text>
            </Animated.View>
          ) : (
            // Enablement State
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                {getBiometricIcon()}
              </View>
              
              <Text style={styles.title}>Enable {biometricMethod}</Text>
              <Text style={styles.message}>
                Use {biometricMethod} for faster and more secure login. Your biometric data stays on your device and is never shared.
              </Text>
              
              <View style={styles.benefits}>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>⚡</Text>
                  <Text style={styles.benefitText}>Lightning-fast login</Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>🔒</Text>
                  <Text style={styles.benefitText}>Enhanced security</Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>📱</Text>
                  <Text style={styles.benefitText}>Data stays on device</Text>
                </View>
              </View>
              
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Text style={styles.laterButtonText}>Maybe Later</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.enableButton, isLoading && styles.disabledButton]}
                  onPress={handleEnable}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.enableButtonText}>Enable {biometricMethod}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width - 48,
    maxWidth: 400,
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefits: {
    width: '100%',
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: '#2D1B69',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  laterButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  enableButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BiometricEnablementModal; 