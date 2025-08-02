module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts', '<rootDir>/src/test/setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|@react-navigation|react-native-vector-icons|@react-native-async-storage|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-native-picker|react-native-svg|react-native-image-picker|react-native-camera|expo-secure-store|expo-constants|expo-font|expo-haptics|lottie-react-native|lucide-react-native)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 25, // Significant increase for production readiness
      functions: 30, // Target higher function coverage
      lines: 35, // Target higher line coverage
      statements: 35, // Target higher statement coverage
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^.*/config/env$': '<rootDir>/src/__mocks__/config/env.ts',
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.ts',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'identity-obj-proxy',
  },
  globals: {
    __DEV__: true,
  },
};