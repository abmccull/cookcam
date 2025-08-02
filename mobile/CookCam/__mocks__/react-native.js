const React = require('react');
const RN = jest.requireActual('react-native');

// Mock PixelRatio for StyleSheet
const PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Override modules that cause issues in tests
module.exports = {
  ...RN,
  PixelRatio,
  StyleSheet: {
    ...RN.StyleSheet,
    create: (styles) => styles,
    flatten: (style) => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(s => s));
      }
      return style;
    },
    absoluteFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    absoluteFillObject: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    hairlineWidth: 1,
  },
  Platform: {
    ...RN.Platform,
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
    Version: 14,
    isTV: false,
    isTesting: true,
  },
  Dimensions: {
    get: (dim) => {
      if (dim === 'window') {
        return { width: 375, height: 812, scale: 2, fontScale: 1 };
      }
      if (dim === 'screen') {
        return { width: 375, height: 812, scale: 2, fontScale: 1 };
      }
      return { width: 375, height: 812 };
    },
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    set: jest.fn(),
  },
  Animated: {
    ...RN.Animated,
    timing: (value, config) => ({
      start: (callback) => {
        value.setValue(config.toValue);
        callback && callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    spring: (value, config) => ({
      start: (callback) => {
        value.setValue(config.toValue);
        callback && callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    Value: class {
      constructor(value) {
        this._value = value;
      }
      setValue(value) {
        this._value = value;
      }
      interpolate(config) {
        return this;
      }
      addListener(callback) {
        return '1';
      }
      removeListener(id) {}
      removeAllListeners() {}
      stopAnimation(callback) {
        callback && callback(this._value);
      }
      resetAnimation(callback) {
        callback && callback(this._value);
      }
      setOffset(offset) {}
      flattenOffset() {}
      extractOffset() {}
    },
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    createAnimatedComponent: (Component) => Component,
    parallel: (animations, config) => ({
      start: (callback) => {
        animations.forEach(anim => anim.start && anim.start());
        callback && callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    sequence: (animations) => ({
      start: (callback) => {
        animations.forEach(anim => anim.start && anim.start());
        callback && callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    loop: (animation) => ({
      start: (callback) => {
        animation.start && animation.start();
        callback && callback({ finished: true });
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }),
    event: () => jest.fn(),
    add: jest.fn(),
    subtract: jest.fn(),
    divide: jest.fn(),
    multiply: jest.fn(),
    modulo: jest.fn(),
    diffClamp: jest.fn(),
  },
  NativeModules: {
    ...RN.NativeModules,
    UIManager: {
      RCTView: {
        directEventTypes: {},
      },
    },
    PlatformConstants: {
      forceTouchAvailable: false,
    },
    RNCNetInfo: {
      getCurrentState: jest.fn(() => Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      })),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    StatusBarManager: {
      HEIGHT: 20,
      getHeight: jest.fn(),
      setColor: jest.fn(),
      setStyle: jest.fn(),
      setHidden: jest.fn(),
      setNetworkActivityIndicatorVisible: jest.fn(),
      setBackgroundColor: jest.fn(),
      setTranslucent: jest.fn(),
    },
    SettingsManager: {
      settings: {},
      setValues: jest.fn(),
      deleteValues: jest.fn(),
    },
    DeviceInfo: {
      Dimensions: {
        window: { width: 375, height: 812, scale: 2, fontScale: 1 },
        screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
      },
    },
  },
  TouchableOpacity: React.forwardRef((props, ref) =>
    React.createElement('TouchableOpacity', { ...props, ref })
  ),
  TouchableHighlight: React.forwardRef((props, ref) =>
    React.createElement('TouchableHighlight', { ...props, ref })
  ),
  TouchableWithoutFeedback: React.forwardRef((props, ref) =>
    React.createElement('TouchableWithoutFeedback', { ...props, ref })
  ),
  TouchableNativeFeedback: {
    SelectableBackground: jest.fn(),
    SelectableBackgroundBorderless: jest.fn(),
    Ripple: jest.fn(),
    canUseNativeForeground: jest.fn(),
  },
  View: React.forwardRef((props, ref) =>
    React.createElement('View', { ...props, ref })
  ),
  Text: React.forwardRef((props, ref) =>
    React.createElement('Text', { ...props, ref })
  ),
  Image: React.forwardRef((props, ref) =>
    React.createElement('Image', { ...props, ref })
  ),
  ScrollView: React.forwardRef((props, ref) =>
    React.createElement('ScrollView', { ...props, ref })
  ),
  TextInput: React.forwardRef((props, ref) =>
    React.createElement('TextInput', { ...props, ref })
  ),
  Modal: React.forwardRef((props, ref) =>
    React.createElement('Modal', { ...props, ref })
  ),
  FlatList: React.forwardRef((props, ref) =>
    React.createElement('FlatList', { ...props, ref })
  ),
  SectionList: React.forwardRef((props, ref) =>
    React.createElement('SectionList', { ...props, ref })
  ),
  VirtualizedList: React.forwardRef((props, ref) =>
    React.createElement('VirtualizedList', { ...props, ref })
  ),
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
    scheduleLayoutAnimation: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
  findNodeHandle: jest.fn(() => 1),
  unstable_batchedUpdates: (callback) => callback(),
};