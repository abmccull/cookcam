module.exports = {
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/test/integration/**/*.test.ts',
    '<rootDir>/test/integration/**/*.test.js',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  globalSetup: '<rootDir>/test/integration/globalSetup.ts',
  globalTeardown: '<rootDir>/test/integration/globalTeardown.ts',
  maxWorkers: 1, // Run sequentially for database consistency
  testTimeout: 30000, // 30 seconds for integration tests
  collectCoverageFrom: [
    'backend/api/src/**/*.ts',
    'mobile/CookCam/src/services/**/*.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        lib: ['es2020'],
        esModuleInterop: true,
        skipLibCheck: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        strict: false,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/api/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@factories/(.*)$': '<rootDir>/test/factories/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
  bail: false,
  detectOpenHandles: true,
  forceExit: true,
};