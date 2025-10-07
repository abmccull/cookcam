// Production-Ready Jest Configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/node_modules/**',
    // Focus on critical production paths
    'src/services/**/*.ts',
    'src/routes/**/*.ts',
    'src/middleware/**/*.ts',
    'src/utils/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  // Production-ready coverage thresholds (gradually increasing)
  coverageThreshold: {
    global: {
      branches: 13,
      functions: 15,
      lines: 14,
      statements: 15
    },
    // Critical service thresholds (higher requirements)
    './src/services/subscription*.ts': {
      branches: 50,
      functions: 70,
      lines: 60,
      statements: 60
    },
    './src/routes/auth.ts': {
      branches: 40,
      functions: 60,
      lines: 50,
      statements: 50
    },
    './src/middleware/auth.ts': {
      branches: 45,
      functions: 65,
      lines: 55,
      statements: 55
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts'
  ],
  testTimeout: 10000,
  verbose: true,
  // Test result processors for better reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      suiteName: 'CookCam API Tests'
    }]
  ],
  // Performance optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '.jest-cache',
  // Clear mocks between tests for reliability
  clearMocks: true,
  restoreMocks: true,
  // Test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleDirectories: ['node_modules', 'src'],
  // Environment variables for testing
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  // Global test setup
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts'
};