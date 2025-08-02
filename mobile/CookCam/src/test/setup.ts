import { server } from './server';
import '@testing-library/jest-native/extend-expect';

// Start MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock AsyncStorage
const mockAsyncStorage: { [key: string]: string } = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockAsyncStorage[key] || null);
  }),
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockAsyncStorage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockAsyncStorage).forEach(key => delete mockAsyncStorage[key]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockAsyncStorage))),
  multiGet: jest.fn((keys: string[]) => {
    return Promise.resolve(keys.map(key => [key, mockAsyncStorage[key] || null]));
  }),
  multiSet: jest.fn((pairs: Array<[string, string]>) => {
    pairs.forEach(([key, value]) => {
      mockAsyncStorage[key] = value;
    });
    return Promise.resolve();
  }),
}));

// Mock NetInfo - handle if not installed
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ 
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    })),
    addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  },
  fetch: jest.fn(() => Promise.resolve({ 
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  })),
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
}), { virtual: true });

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  RN.NativeModules.RNCNetInfo = {
    getCurrentState: jest.fn(() => Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    })),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  
  return RN;
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'mock-image-uri' }]
  })),
  launchCameraAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'mock-camera-uri' }]
  })),
  MediaTypeOptions: {
    Images: 'Images'
  },
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Global test utilities
global.testUtils = {
  clearAsyncStorage: () => {
    Object.keys(mockAsyncStorage).forEach(key => delete mockAsyncStorage[key]);
  },
  setAsyncStorage: (data: { [key: string]: any }) => {
    Object.entries(data).forEach(([key, value]) => {
      mockAsyncStorage[key] = typeof value === 'string' ? value : JSON.stringify(value);
    });
  },
  getAsyncStorage: () => mockAsyncStorage,
};

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});