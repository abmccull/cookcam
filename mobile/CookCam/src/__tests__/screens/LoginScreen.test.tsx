import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../screens/LoginScreen';

// Mock react-native modules BEFORE any other imports
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  TextInput: 'TextInput',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Alert: {
    alert: jest.fn(),
  },
  Animated: {
    createAnimatedComponent: jest.fn((component) => component),
  },
  UIManager: {
    getViewManagerConfig: jest.fn(() => ({})),
  },
  requireNativeComponent: jest.fn((name) => name),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Mail: ({ size, color }: any) => (
    <div testID="mail-icon" data-size={size} data-color={color} />
  ),
  Lock: ({ size, color }: any) => (
    <div testID="lock-icon" data-size={size} data-color={color} />
  ),
  Eye: ({ size, color }: any) => (
    <div testID="eye-icon" data-size={size} data-color={color} />
  ),
  EyeOff: ({ size, color }: any) => (
    <div testID="eye-off-icon" data-size={size} data-color={color} />
  ),
  ChefHat: ({ size, color }: any) => (
    <div testID="chef-hat-icon" data-size={size} data-color={color} />
  ),
}));

// Mock dependencies
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    enableBiometricLogin: jest.fn(),
  })),
}));

jest.mock('../../services/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../components/BiometricLogin', () => {
  const React = require('react');
  return function MockBiometricLogin({ onSuccess, onError, refreshTrigger }: any) {
    return React.createElement('View', { testID: 'biometric-login', 'data-refresh-trigger': refreshTrigger }, [
      React.createElement('TouchableOpacity', { 
        key: 'success',
        testID: 'biometric-success-button',
        onPress: () => onSuccess({ email: 'test@example.com', token: 'test-token' })
      }, React.createElement('Text', null, 'Biometric Success')),
      React.createElement('TouchableOpacity', { 
        key: 'error',
        testID: 'biometric-error-button',
        onPress: () => onError('Biometric error')
      }, React.createElement('Text', null, 'Biometric Error'))
    ]);
  };
});

jest.mock('../../components/BiometricEnablementModal', () => {
  const React = require('react');
  return function MockBiometricEnablementModal({ visible, onClose, onEnable, onSuccess }: any) {
    if (!visible) return null;
    return React.createElement('View', { testID: 'biometric-modal' }, [
      React.createElement('TouchableOpacity', { 
        key: 'enable',
        testID: 'enable-biometrics-button',
        onPress: onEnable
      }, React.createElement('Text', null, 'Enable Biometrics')),
      React.createElement('TouchableOpacity', { 
        key: 'close',
        testID: 'close-modal-button',
        onPress: onClose
      }, React.createElement('Text', null, 'Close Modal'))
    ]);
  };
});

jest.mock('../../services/biometricAuth', () => ({
  default: {
    getInstance: () => ({
      checkBiometricCapabilities: jest.fn().mockResolvedValue({
        isAvailable: true,
        hasHardware: true,
        isEnrolled: true,
        fingerprintAvailable: true,
        faceIdAvailable: false,
      }),
      isBiometricEnabled: jest.fn().mockResolvedValue(true),
      getStoredCredentials: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        refreshToken: 'test-refresh-token',
      }),
    }),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

describe('LoginScreen', () => {
  const mockNavigate = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
  } as any;

  const mockLogin = jest.fn();
  const mockLoginWithBiometrics = jest.fn();
  const mockEnableBiometricLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
    
    // Reset mocks for auth context
    const mockAuthContext = require('../../context/AuthContext');
    mockAuthContext.useAuth.mockReturnValue({
      login: mockLogin,
      loginWithBiometrics: mockLoginWithBiometrics,
      enableBiometricLogin: mockEnableBiometricLogin,
    });
  });

  const renderWithNavigation = () => {
    return render(<LoginScreen navigation={mockNavigation} />);
  };


  describe('Rendering', () => {
    it('should render all main components', () => {
      renderWithNavigation();

      // Check header elements
      expect(screen.getByTestId('chef-hat-icon')).toBeTruthy();
      expect(screen.getByText('CookCam')).toBeTruthy();
      expect(screen.getByText('Turn ingredients into delicious meals')).toBeTruthy();

      // Check form inputs
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('Password')).toBeTruthy();

      // Check icons
      expect(screen.getByTestId('mail-icon')).toBeTruthy();
      expect(screen.getByTestId('lock-icon')).toBeTruthy();
      expect(screen.getByTestId('eye-icon')).toBeTruthy();
    });

    it('should render biometric login component', () => {
      renderWithNavigation();

      expect(screen.getByTestId('biometric-login')).toBeTruthy();
    });

    it('should render correct icon properties', () => {
      renderWithNavigation();

      // Check ChefHat icon
      const chefHatIcon = screen.getByTestId('chef-hat-icon');
      expect(chefHatIcon.props['data-size']).toBe(60);
      expect(chefHatIcon.props['data-color']).toBe('#FF6B35');

      // Check input icons
      const mailIcon = screen.getByTestId('mail-icon');
      expect(mailIcon.props['data-size']).toBe(20);
      expect(mailIcon.props['data-color']).toBe('#8E8E93');
    });
  });

  describe('Form Interactions', () => {
    it('should update email input value', () => {
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should update password input value', () => {
      renderWithNavigation();

      const passwordInput = screen.getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'password123');

      expect(passwordInput.props.value).toBe('password123');
    });

    it('should toggle password visibility', () => {
      renderWithNavigation();

      const passwordInput = screen.getByPlaceholderText('Password');
      expect(passwordInput.props.secureTextEntry).toBe(true);

      // Find and press the eye icon
      const eyeIcon = screen.getByTestId('eye-icon').parent;
      fireEvent.press(eyeIcon);

      // Should now show eye-off icon and password should be visible
      expect(screen.queryByTestId('eye-icon')).toBeFalsy();
      expect(screen.getByTestId('eye-off-icon')).toBeTruthy();
      expect(passwordInput.props.secureTextEntry).toBe(false);
    });

    it('should have correct input properties', () => {
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      expect(emailInput.props.keyboardType).toBe('email-address');
      expect(emailInput.props.autoCapitalize).toBe('none');
      expect(emailInput.props.autoCorrect).toBe(false);

      const passwordInput = screen.getByPlaceholderText('Password');
      expect(passwordInput.props.autoCapitalize).toBe('none');
    });
  });

  describe('Login Functionality', () => {
    it('should show error alert when fields are empty', async () => {
      renderWithNavigation();

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error alert when only email is filled', async () => {
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('should call login with email and password', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show error alert on login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Login failed. Please check your credentials and try again.'
        );
      });
    });

    it('should show biometric modal after successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      // Wait for login to complete and modal to show
      await waitFor(() => {
        expect(screen.getByTestId('biometric-modal')).toBeTruthy();
      }, { timeout: 2000 });
    });
  });

  describe('Biometric Login', () => {
    it('should handle successful biometric login', async () => {
      mockLoginWithBiometrics.mockResolvedValueOnce(undefined);
      renderWithNavigation();

      const biometricSuccessButton = screen.getByTestId('biometric-success-button');
      fireEvent.press(biometricSuccessButton);

      await waitFor(() => {
        expect(mockLoginWithBiometrics).toHaveBeenCalledWith({
          email: 'test@example.com',
          token: 'test-token',
        });
      });
    });

    it('should handle biometric login error', async () => {
      renderWithNavigation();

      const biometricErrorButton = screen.getByTestId('biometric-error-button');
      fireEvent.press(biometricErrorButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Authentication Error', 'Biometric error');
      });
    });

    it('should handle biometric login failure with error message', async () => {
      mockLoginWithBiometrics.mockRejectedValueOnce(new Error('Biometric authentication failed'));
      renderWithNavigation();

      const biometricSuccessButton = screen.getByTestId('biometric-success-button');
      fireEvent.press(biometricSuccessButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Biometric Login Failed',
          'Biometric authentication failed'
        );
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Signup screen', () => {
      renderWithNavigation();

      const signupButton = screen.getByText("Don't have an account? Sign Up").parent;
      fireEvent.press(signupButton);

      expect(mockNavigate).toHaveBeenCalledWith('Signup');
    });

    it('should show forgot password alert', () => {
      renderWithNavigation();

      const forgotPasswordButton = screen.getByText('Forgot Password?');
      fireEvent.press(forgotPasswordButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Forgot Password',
        'Password reset functionality will be available soon. Please contact support if you need help accessing your account.'
      );
    });
  });

  describe('Biometric Enablement', () => {
    it('should handle enabling biometric login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      mockEnableBiometricLogin.mockResolvedValueOnce(undefined);
      
      renderWithNavigation();

      // Login first
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      // Wait for modal to appear (modal shows after 1 second delay)
      await waitFor(
        () => {
          expect(screen.getByTestId('biometric-modal')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Enable biometrics
      const enableButton = screen.getByTestId('enable-biometrics-button');
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(mockEnableBiometricLogin).toHaveBeenCalledWith('test@example.com', '');
      });
    });

    it.skip('should handle biometric enablement error', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      
      renderWithNavigation();
      
      // Set up the mock to reject after render
      mockEnableBiometricLogin.mockImplementation(() => 
        Promise.reject(new Error('Failed to enable biometrics'))
      );

      // Login first
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      // Wait for modal (modal shows after 1 second delay)
      await waitFor(
        () => {
          expect(screen.getByTestId('biometric-modal')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Try to enable biometrics
      const enableButton = screen.getByTestId('enable-biometrics-button');
      fireEvent.press(enableButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to enable biometrics. You can enable it later in settings.'
        );
      });
    });

    it('should close biometric modal', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderWithNavigation();

      // Login first
      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      // Wait for modal (modal shows after 1 second delay)
      await waitFor(
        () => {
          expect(screen.getByTestId('biometric-modal')).toBeTruthy();
        },
        { timeout: 2000 }
      );

      // Close modal
      const closeButton = screen.getByTestId('close-modal-button');
      fireEvent.press(closeButton);

      // Modal should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('biometric-modal')).toBeFalsy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during login', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      renderWithNavigation();

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = screen.getByText('Log In').parent;
      fireEvent.press(loginButton);

      // Check for loading indicator
      await waitFor(() => {
        const activityIndicators = screen.UNSAFE_getAllByType('ActivityIndicator');
        expect(activityIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Platform Specific Behavior', () => {
    it('should use correct KeyboardAvoidingView behavior for iOS', () => {
      renderWithNavigation();

      const keyboardAvoidingView = screen.UNSAFE_getByType('KeyboardAvoidingView');
      expect(keyboardAvoidingView.props.behavior).toBe('padding');
    });

    it('should use correct KeyboardAvoidingView behavior for Android', () => {
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'android';

      renderWithNavigation();

      const keyboardAvoidingView = screen.UNSAFE_getByType('KeyboardAvoidingView');
      expect(keyboardAvoidingView.props.behavior).toBe('height');

      // Reset to iOS for other tests
      mockPlatform.OS = 'ios';
    });
  });
});