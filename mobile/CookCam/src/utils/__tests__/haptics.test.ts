import { Platform } from 'react-native';
import { haptics } from '../haptics';
import logger from '../logger';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock logger
jest.mock('../logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock react-native-haptic-feedback
const mockHapticFeedback = {
  trigger: jest.fn()
};

jest.mock('react-native-haptic-feedback', () => mockHapticFeedback);

const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Haptics Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset Platform OS to iOS
    (Platform as any).OS = 'ios';
    
    // Reset haptic feedback mock
    mockHapticFeedback.trigger.mockClear();
  });

  describe('Initialization', () => {
    it('should initialize successfully when native module is available', () => {
      expect(haptics.isSupported()).toBe(true);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '✅ HapticFeedback: Native module loaded successfully'
      );
    });

    it('should handle missing native module gracefully', () => {
      // Create a new haptics instance that will fail to load the module
      jest.doMock('react-native-haptic-feedback', () => {
        throw new Error('Module not found');
      });

      // Simulate module import failure
      const hapticFeedbackClass = require('../haptics');
      const failedHaptics = new hapticFeedbackClass.haptics.constructor();

      expect(failedHaptics.isSupported()).toBe(false);
    });
  });

  describe('Platform Support', () => {
    it('should support haptics on iOS', () => {
      (Platform as any).OS = 'ios';
      expect(haptics.isSupported()).toBe(true);
    });

    it('should support haptics on Android', () => {
      (Platform as any).OS = 'android';
      expect(haptics.isSupported()).toBe(true);
    });

    it('should not support haptics on web', () => {
      (Platform as any).OS = 'web';
      expect(haptics.isSupported()).toBe(false);
    });

    it('should not support haptics on unknown platforms', () => {
      (Platform as any).OS = 'windows';
      expect(haptics.isSupported()).toBe(false);
    });
  });

  describe('Basic Trigger Method', () => {
    it('should trigger haptic feedback with default options', () => {
      haptics.trigger('impactMedium');

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false
        }
      );

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '✨ HapticFeedback: Triggered impactMedium'
      );
    });

    it('should trigger haptic feedback with custom options', () => {
      const customOptions = {
        enableVibrateFallback: false,
        ignoreAndroidSystemSettings: true
      };

      haptics.trigger('notificationSuccess', customOptions);

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        customOptions
      );
    });

    it('should merge custom options with defaults', () => {
      const partialOptions = {
        enableVibrateFallback: false
      };

      haptics.trigger('selection', partialOptions);

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'selection',
        {
          enableVibrateFallback: false,
          ignoreAndroidSystemSettings: false
        }
      );
    });

    it('should handle trigger failures gracefully', () => {
      const error = new Error('Haptic trigger failed');
      mockHapticFeedback.trigger.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        haptics.trigger('impactLight');
      }).not.toThrow();

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        '⚠️ HapticFeedback: Failed to trigger impactLight:',
        error
      );
    });

    it('should skip triggering when module is not available', () => {
      // Create instance with unavailable module
      const HapticFeedbackClass = require('../haptics').default.constructor;
      const unavailableHaptics = new HapticFeedbackClass();
      unavailableHaptics.isAvailable = false;
      unavailableHaptics.nativeModule = null;

      unavailableHaptics.trigger('impactMedium');

      expect(mockHapticFeedback.trigger).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    describe('success()', () => {
      it('should trigger notification success haptic', () => {
        haptics.success();

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'notificationSuccess',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });

      it('should accept custom options', () => {
        const options = { enableVibrateFallback: false };
        haptics.success(options);

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'notificationSuccess',
          {
            enableVibrateFallback: false,
            ignoreAndroidSystemSettings: false
          }
        );
      });
    });

    describe('warning()', () => {
      it('should trigger notification warning haptic', () => {
        haptics.warning();

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'notificationWarning',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });
    });

    describe('error()', () => {
      it('should trigger notification error haptic', () => {
        haptics.error();

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'notificationError',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });
    });

    describe('impact()', () => {
      it('should trigger medium impact by default', () => {
        haptics.impact();

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'impactMedium',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });

      it('should trigger light impact', () => {
        haptics.impact('light');

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'impactLight',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });

      it('should trigger heavy impact', () => {
        haptics.impact('heavy');

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'impactHeavy',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });

      it('should accept custom options with intensity', () => {
        const options = { ignoreAndroidSystemSettings: true };
        haptics.impact('heavy', options);

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'impactHeavy',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: true
          }
        );
      });
    });

    describe('selection()', () => {
      it('should trigger selection haptic', () => {
        haptics.selection();

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          'selection',
          {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          }
        );
      });
    });
  });

  describe('All Haptic Types', () => {
    const hapticTypes = [
      'impactLight',
      'impactMedium',
      'impactHeavy',
      'notificationSuccess',
      'notificationWarning',
      'notificationError',
      'selection'
    ] as const;

    hapticTypes.forEach(type => {
      it(`should handle ${type} haptic type`, () => {
        haptics.trigger(type);

        expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
          type,
          expect.any(Object)
        );

        expect(mockedLogger.debug).toHaveBeenCalledWith(
          `✨ HapticFeedback: Triggered ${type}`
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null options gracefully', () => {
      haptics.trigger('impactMedium', undefined);

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false
        }
      );
    });

    it('should handle empty options object', () => {
      haptics.trigger('selection', {});

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'selection',
        {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false
        }
      );
    });

    it('should log when skipping due to unavailable module', () => {
      // Mock unavailable state
      const HapticFeedbackClass = require('../haptics').default.constructor;
      const unavailableHaptics = new HapticFeedbackClass();
      unavailableHaptics.isAvailable = false;
      unavailableHaptics.nativeModule = null;

      unavailableHaptics.trigger('impactLight');

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔇 HapticFeedback: Skipping impactLight (module not available)'
      );
    });

    it('should handle module import errors during initialization', () => {
      // This test verifies the error handling in the constructor
      jest.doMock('react-native-haptic-feedback', () => {
        throw new Error('Native module error');
      });

      // The warn should be logged during construction
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        '⚠️ HapticFeedback: Native module not available:',
        expect.any(Error)
      );
    });

    it('should handle synchronous trigger errors', () => {
      mockHapticFeedback.trigger.mockImplementation(() => {
        throw new TypeError('Invalid haptic type');
      });

      haptics.impact('medium');

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        '⚠️ HapticFeedback: Failed to trigger impactMedium:',
        expect.any(TypeError)
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should not impact performance when module is unavailable', () => {
      const HapticFeedbackClass = require('../haptics').default.constructor;
      const unavailableHaptics = new HapticFeedbackClass();
      unavailableHaptics.isAvailable = false;

      const start = performance.now();
      
      // Call haptics many times
      for (let i = 0; i < 1000; i++) {
        unavailableHaptics.trigger('impactLight');
      }
      
      const end = performance.now();
      const duration = end - start;

      // Should complete quickly even when unavailable
      expect(duration).toBeLessThan(100);
      expect(mockHapticFeedback.trigger).not.toHaveBeenCalled();
    });

    it('should handle rapid successive calls', () => {
      const calls = [];
      mockHapticFeedback.trigger.mockImplementation((type, options) => {
        calls.push({ type, options });
      });

      // Rapid calls
      haptics.impact('light');
      haptics.success();
      haptics.selection();
      haptics.impact('heavy');

      expect(calls).toHaveLength(4);
      expect(calls[0].type).toBe('impactLight');
      expect(calls[1].type).toBe('notificationSuccess');
      expect(calls[2].type).toBe('selection');
      expect(calls[3].type).toBe('impactHeavy');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should work for button press feedback', () => {
      const onButtonPress = () => {
        haptics.impact('light');
      };

      onButtonPress();

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactLight',
        expect.any(Object)
      );
    });

    it('should work for form validation feedback', () => {
      const showFormError = () => {
        haptics.error();
      };

      const showFormSuccess = () => {
        haptics.success();
      };

      showFormError();
      showFormSuccess();

      expect(mockHapticFeedback.trigger).toHaveBeenCalledTimes(2);
      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationError',
        expect.any(Object)
      );
      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.any(Object)
      );
    });

    it('should work for list item selection', () => {
      const onItemSelect = () => {
        haptics.selection();
      };

      onItemSelect();

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'selection',
        expect.any(Object)
      );
    });

    it('should work for swipe gestures', () => {
      const onSwipeComplete = () => {
        haptics.impact('medium');
      };

      onSwipeComplete();

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        expect.any(Object)
      );
    });

    it('should work for notification-like feedback', () => {
      const showNotification = (type: 'success' | 'warning' | 'error') => {
        switch (type) {
          case 'success':
            haptics.success();
            break;
          case 'warning':
            haptics.warning();
            break;
          case 'error':
            haptics.error();
            break;
        }
      };

      showNotification('success');
      showNotification('warning');
      showNotification('error');

      expect(mockHapticFeedback.trigger).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cross-platform Behavior', () => {
    it('should work the same on iOS and Android', () => {
      // Test iOS
      (Platform as any).OS = 'ios';
      haptics.impact('heavy');
      
      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactHeavy',
        expect.any(Object)
      );

      mockHapticFeedback.trigger.mockClear();

      // Test Android
      (Platform as any).OS = 'android';
      haptics.impact('heavy');
      
      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactHeavy',
        expect.any(Object)
      );
    });

    it('should respect Android system settings by default', () => {
      (Platform as any).OS = 'android';
      
      haptics.impact('medium');

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        expect.objectContaining({
          ignoreAndroidSystemSettings: false
        })
      );
    });

    it('should allow ignoring Android system settings when specified', () => {
      (Platform as any).OS = 'android';
      
      haptics.impact('medium', { ignoreAndroidSystemSettings: true });

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'impactMedium',
        expect.objectContaining({
          ignoreAndroidSystemSettings: true
        })
      );
    });

    it('should enable vibrate fallback by default', () => {
      haptics.success();

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.objectContaining({
          enableVibrateFallback: true
        })
      );
    });

    it('should allow disabling vibrate fallback', () => {
      haptics.success({ enableVibrateFallback: false });

      expect(mockHapticFeedback.trigger).toHaveBeenCalledWith(
        'notificationSuccess',
        expect.objectContaining({
          enableVibrateFallback: false
        })
      );
    });
  });

  describe('Singleton Behavior', () => {
    it('should export the same instance', () => {
      const haptics1 = require('../haptics').haptics;
      const haptics2 = require('../haptics').default;

      expect(haptics1).toBe(haptics2);
    });

    it('should maintain state across imports', () => {
      const isSupported1 = haptics.isSupported();
      
      // Import again
      const { haptics: haptics2 } = require('../haptics');
      const isSupported2 = haptics2.isSupported();

      expect(isSupported1).toBe(isSupported2);
    });
  });
});