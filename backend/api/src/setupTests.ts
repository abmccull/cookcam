// Setup file for Jest tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for integration tests
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Generate a valid JWT token for testing
  generateTestToken: (_userId: string = 'test-user-id') => {
    return 'test-jwt-token';
  },
  
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    level: 1,
    xp: 0,
    ...overrides,
  }),
  
  // Generate test recipe data
  generateTestRecipe: (overrides = {}) => ({
    id: 'test-recipe-id',
    title: 'Test Recipe',
    description: 'A test recipe',
    cuisine: 'Italian',
    totalTimeMinutes: 30,
    difficulty: 'Beginner',
    ingredients: ['ingredient1', 'ingredient2'],
    steps: [
      { order: 1, instruction: 'Step 1' },
      { order: 2, instruction: 'Step 2' },
    ],
    ...overrides,
  }),
};

// Extend global namespace for TypeScript
declare global {
  var testUtils: {
    generateTestToken: (userId?: string) => string;
    generateTestUser: (overrides?: any) => any;
    generateTestRecipe: (overrides?: any) => any;
  };
}