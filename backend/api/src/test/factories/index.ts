// Test Data Factories for Backend API Tests
// This file provides standardized test data and mock patterns

export interface MockUser {
  id: string;
  email: string;
  is_admin?: boolean;
  total_xp?: number;
  level?: number;
}

export interface MockRecipe {
  id: string;
  title: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  difficulty?: string;
  servings?: number;
  ingredients?: any[];
  instructions?: any[];
  nutrition?: any;
  user_id?: string;
}

export interface MockSession {
  id: string;
  user_id: string;
  input_data?: any;
  suggestions?: any[];
  created_at?: string;
}

// Standard Test Users
export const testUsers = {
  regularUser: (): MockUser => ({
    id: 'test-user-123',
    email: 'test@example.com',
    is_admin: false,
    total_xp: 100,
    level: 2,
  }),
  adminUser: (): MockUser => ({
    id: 'admin-user-456',
    email: 'admin@example.com', 
    is_admin: true,
    total_xp: 1000,
    level: 10,
  }),
  premiumUser: (): MockUser => ({
    id: 'premium-user-789',
    email: 'premium@example.com',
    is_admin: false,
    total_xp: 500,
    level: 5,
  }),
};

// Standard Test Recipes
export const testRecipes = {
  basicRecipe: (): MockRecipe => ({
    id: 'recipe-123',
    title: 'Test Recipe',
    description: 'A simple test recipe',
    prep_time: 15,
    cook_time: 30,
    difficulty: 'beginner',
    servings: 4,
    ingredients: [
      { name: 'chicken breast', quantity: 2, unit: 'pieces' },
      { name: 'salt', quantity: 1, unit: 'tsp' },
    ],
    instructions: [
      { step: 1, instruction: 'Season the chicken' },
      { step: 2, instruction: 'Cook for 30 minutes' },
    ],
    nutrition: {
      calories: 250,
      protein_g: 30,
      carbs_g: 5,
      fat_g: 10,
    },
  }),
  complexRecipe: (): MockRecipe => ({
    id: 'recipe-456',
    title: 'Complex Test Recipe',
    description: 'A more complex test recipe with special characters: àáâã & <>&',
    prep_time: 30,
    cook_time: 60,
    difficulty: 'intermediate',
    servings: 6,
    ingredients: [
      { name: 'ingredient with unicode: café', quantity: 100, unit: 'g' },
      { name: 'special ingredient', quantity: 2, unit: 'cups' },
    ],
    instructions: [
      { step: 1, instruction: 'Step with special chars: "quotes" & symbols' },
      { step: 2, instruction: 'Continue cooking' },
    ],
    nutrition: {
      calories: 350,
      protein_g: 25,
      carbs_g: 45,
      fat_g: 15,
    },
  }),
};

// Standard Test Sessions
export const testSessions = {
  basicSession: (): MockSession => ({
    id: 'session-123',
    user_id: 'test-user-123',
    input_data: {
      detectedIngredients: ['chicken', 'salt'],
      assumedStaples: ['salt', 'black pepper', 'olive oil', 'water'],
      dietaryTags: ['NONE'],
      cuisinePreferences: ['SURPRISE_ME'],
      timeAvailable: 'FLEXIBLE',
      skillLevel: 'SURPRISE_ME',
    },
    suggestions: [
      { title: 'Chicken Stir Fry', cuisine: 'Asian' },
      { title: 'Grilled Chicken', cuisine: 'American' },
    ],
    created_at: new Date().toISOString(),
  }),
};

// Standardized Mock Patterns

// Supabase Client Mock Factory
export const createMockSupabaseClient = () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  like: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  containedBy: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
});

// Authenticated Client Mock Factory
export const createMockAuthenticatedClient = (overrides?: any) => ({
  ...createMockSupabaseClient(),
  ...overrides,
});

// Standard Response Templates
export const successResponse = (data: any, error = null) => ({ data, error });
export const errorResponse = (error: string | Error, data = null) => ({
  data,
  error: typeof error === 'string' ? { message: error } : error,
});

// Standard Mock Implementations
export const mockImplementations = {
  // User data fetch success
  userDataSuccess: (user: MockUser = testUsers.regularUser()) =>
    jest.fn().mockResolvedValue(successResponse(user)),
  
  // User data fetch error  
  userDataError: (errorMsg = 'User not found') =>
    jest.fn().mockResolvedValue(errorResponse(errorMsg)),
  
  // Recipe fetch success
  recipeSuccess: (recipe: MockRecipe = testRecipes.basicRecipe()) =>
    jest.fn().mockResolvedValue(successResponse(recipe)),
  
  // Recipe fetch error
  recipeError: (errorMsg = 'Recipe not found') =>
    jest.fn().mockResolvedValue(errorResponse(errorMsg)),
  
  // Session creation success
  sessionSuccess: (session: MockSession = testSessions.basicSession()) =>
    jest.fn().mockResolvedValue(successResponse(session)),
  
  // Session creation error
  sessionError: (errorMsg = 'Session creation failed') =>
    jest.fn().mockResolvedValue(errorResponse(errorMsg)),
  
  // Generic success with custom data
  genericSuccess: (data: any) =>
    jest.fn().mockResolvedValue(successResponse(data)),
  
  // Generic error with custom message
  genericError: (errorMsg: string) =>
    jest.fn().mockResolvedValue(errorResponse(errorMsg)),
};

// Environment Variable Setup Helper
export const setupTestEnvironment = () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-key-for-testing',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      OPENAI_API_KEY: 'test-openai-key',
      NODE_ENV: 'test',
    };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });
};

// Logger Mock Setup Helper
export const setupLoggerMocks = () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all logger mocks
    Object.values(mockLogger).forEach(mock => mock.mockClear());
  });
  
  return mockLogger;
};

// Complete Test Setup Helper (combines common setups)
export const setupBackendTest = () => {
  setupTestEnvironment();
  const logger = setupLoggerMocks();
  
  return { logger };
};