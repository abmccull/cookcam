// This file runs before each test suite
// Set up test environment variables
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.API_BASE_URL = "https://test-api.cookcam.com";
process.env.OPENAI_API_KEY = "test-openai-key";

// Global PixelRatio mock
global.PixelRatio = {
  roundToNearestPixel: (value) => Math.round(value),
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size) => size * 2,
};

// Mock React Native early to ensure PixelRatio is available
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Override PixelRatio with our mock
  RN.PixelRatio = global.PixelRatio;
  
  return {
    ...RN,
    PixelRatio: global.PixelRatio,
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
      roundToNearestPixel: (value) => Math.round(value),
    },
    Platform: {
      OS: 'ios',
      select: (config) => config.ios || config.default,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock expo-constants before any imports
const mockConstants = {
  expoConfig: {
    extra: {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      API_BASE_URL: "https://test-api.cookcam.com",
      OPENAI_API_KEY: "test-openai-key",
      EXPO_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
  manifest: {
    extra: {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
      API_BASE_URL: "https://test-api.cookcam.com",
    },
  },
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: mockConstants,
  ...mockConstants,
}));

// Mock react-native-svg to avoid Mixin error
jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    Svg: ({ children, ...props }) => React.createElement("Svg", props, children),
    Circle: "Circle",
    Path: "Path",
    Rect: "Rect",
    Line: "Line",
    G: "G",
    Text: "Text",
    Defs: "Defs",
    ClipPath: "ClipPath",
    LinearGradient: "LinearGradient",
    Stop: "Stop",
    Polygon: "Polygon",
    Polyline: "Polyline",
    Ellipse: "Ellipse",
    Use: "Use",
    Image: "Image",
    Symbol: "Symbol",
    Mask: "Mask",
    Pattern: "Pattern",
  };
});

// Mock lucide-react-native icons
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const mockIcon = (name) => {
    return React.forwardRef((props, ref) => 
      React.createElement("MockIcon", { ...props, ref, testID: `${name}-icon` }, name)
    );
  };
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === "string") {
        return mockIcon(prop);
      }
      return undefined;
    },
  });
});

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(() => 
    Promise.resolve({
      cancelled: false,
      assets: [{ uri: "test-image-uri" }],
    })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: "granted" })
  ),
  MediaTypeOptions: {
    Images: "Images",
    Videos: "Videos",
    All: "All",
  },
  ImagePickerOptions: {},
}));