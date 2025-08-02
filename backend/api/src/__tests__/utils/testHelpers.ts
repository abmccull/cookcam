import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

// Mock Supabase Client Factory
export const createMockSupabaseClient = (): jest.Mocked<SupabaseClient> => {
  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: '', error: null }),
  });

  const mockClient = {
    from: jest.fn().mockImplementation((table: string) => createMockQueryBuilder()),
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  } as any;

  return mockClient;
};

// Mock Express Request/Response Factory
export const createMockRequest = (overrides: any = {}): any => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ip: '127.0.0.1',
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

// Test Data Factories
export const createTestUser = (overrides: Partial<any> = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  total_xp: 100,
  level: 1,
  streak_count: 5,
  is_creator: false,
  subscription_tier: 'free',
  ...overrides,
});

export const createTestRecipe = (overrides: Partial<any> = {}) => ({
  id: 'test-recipe-id',
  title: 'Test Recipe',
  description: 'A test recipe description',
  instructions: ['Step 1', 'Step 2'],
  ingredients: ['ingredient 1', 'ingredient 2'],
  prep_time: 15,
  cook_time: 30,
  servings: 4,
  difficulty: 'medium',
  cuisine_type: 'italian',
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createTestSubscription = (overrides: Partial<any> = {}) => ({
  id: 'test-sub-id',
  user_id: 'test-user-id',
  tier: 'premium',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  stripe_subscription_id: 'sub_test123',
  ...overrides,
});

// Mock Payment Providers
export const createMockStripe = () => ({
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
    retrieve: jest.fn(),
  },
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  transfers: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
});

// Mock OpenAI
export const createMockOpenAI = () => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Generated Recipe',
              ingredients: ['ingredient 1', 'ingredient 2'],
              instructions: ['Step 1', 'Step 2'],
            }),
          },
        }],
      }),
    },
  },
});

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Database state helpers
export const cleanDatabase = async (supabase: SupabaseClient) => {
  // Clean up test data in reverse dependency order
  await supabase.from('user_progress').delete().neq('id', '');
  await supabase.from('subscriptions').delete().neq('id', '');
  await supabase.from('recipes').delete().neq('id', '');
  await supabase.from('users').delete().neq('id', '');
};

// Mock environment variables
export const mockEnvVars = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  OPENAI_API_KEY: 'test-openai-key',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_test123',
};

// Error simulation helpers
export const simulateSupabaseError = (error: string) => ({
  data: null,
  error: { message: error, code: 'test_error' },
});

export const simulateSupabaseSuccess = (data: any) => ({
  data,
  error: null,
});