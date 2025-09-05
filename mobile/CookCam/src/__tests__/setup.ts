import "react-native-gesture-handler/jestSetup";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "MockedIonicons",
  MaterialIcons: "MockedMaterialIcons",
  FontAwesome: "MockedFontAwesome",
  AntDesign: "MockedAntDesign",
}));

// Mock react-native-svg first to avoid Mixin error
jest.mock("react-native-svg", () => {
  const React = require("react");
  return {
    Svg: ({ children, ...props }: any) => React.createElement("Svg", props, children),
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
  const mockIcon = (name: string) => {
    return React.forwardRef((props: any, ref: any) => 
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

// Mock Expo modules
jest.mock("expo-constants", () => ({
  default: {
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
  },
}));

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-camera
jest.mock("expo-camera", () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
    getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  },
}));

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

// Mock expo-local-authentication
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock specific React Native modules to avoid conflicts
jest.mock("react-native/Libraries/Utilities/Dimensions", () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: 'ios',
  select: jest.fn((config) => config.ios || config.default),
}));

jest.mock("react-native/Libraries/Utilities/PixelRatio", () => ({
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
}));

// Mock Supabase client
jest.mock('../services/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: {
      signUp: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  },
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Global test utilities
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Simple test to satisfy Jest requirement
describe('Test Setup', () => {
  it('should have all mocks configured', () => {
    expect(true).toBe(true);
  });
});
