import { faker } from '@faker-js/faker';

// User factory
export const userFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  level: faker.number.int({ min: 1, max: 50 }),
  xp: faker.number.int({ min: 0, max: 10000 }),
  streak: faker.number.int({ min: 0, max: 365 }),
  subscription_tier: faker.helpers.arrayElement(['free', 'pro', 'premium']),
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  ...overrides,
});

// Recipe factory
export const recipeFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  ingredients: Array.from(
    { length: faker.number.int({ min: 3, max: 10 }) },
    () => ({
      name: faker.lorem.word(),
      amount: faker.number.int({ min: 1, max: 500 }),
      unit: faker.helpers.arrayElement(['g', 'ml', 'cups', 'tbsp', 'tsp']),
    })
  ),
  instructions: Array.from(
    { length: faker.number.int({ min: 3, max: 8 }) },
    () => faker.lorem.sentence()
  ),
  cook_time: faker.number.int({ min: 10, max: 120 }),
  prep_time: faker.number.int({ min: 5, max: 60 }),
  servings: faker.number.int({ min: 1, max: 8 }),
  difficulty: faker.helpers.arrayElement(['easy', 'medium', 'hard']),
  cuisine: faker.helpers.arrayElement(['Italian', 'Mexican', 'Asian', 'American', 'French']),
  dietary_tags: faker.helpers.arrayElements(
    ['vegan', 'gluten-free', 'keto', 'paleo', 'vegetarian', 'dairy-free'],
    faker.number.int({ min: 0, max: 3 })
  ),
  nutrition: {
    calories: faker.number.int({ min: 100, max: 800 }),
    protein: faker.number.int({ min: 5, max: 50 }),
    carbs: faker.number.int({ min: 10, max: 100 }),
    fat: faker.number.int({ min: 5, max: 40 }),
    fiber: faker.number.int({ min: 0, max: 15 }),
    sugar: faker.number.int({ min: 0, max: 30 }),
    sodium: faker.number.int({ min: 50, max: 2000 }),
  },
  rating: faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 }),
  review_count: faker.number.int({ min: 0, max: 500 }),
  image_url: faker.image.url(),
  created_by: faker.string.uuid(),
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  ...overrides,
});

// Subscription factory
export const subscriptionFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  plan: faker.helpers.arrayElement(['free', 'pro', 'premium']),
  status: faker.helpers.arrayElement(['active', 'canceled', 'past_due', 'trialing']),
  stripe_subscription_id: `sub_${faker.string.alphanumeric(14)}`,
  stripe_customer_id: `cus_${faker.string.alphanumeric(14)}`,
  current_period_start: faker.date.recent(),
  current_period_end: faker.date.future(),
  cancel_at_period_end: faker.datatype.boolean(),
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  ...overrides,
});

// Achievement factory
export const achievementFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  type: faker.helpers.arrayElement([
    'first_recipe',
    'week_streak',
    'month_streak',
    'master_chef',
    'recipe_creator',
    'social_butterfly',
    'nutrition_expert',
    'speed_cooker',
  ]),
  unlocked_at: faker.date.recent(),
  xp_earned: faker.number.int({ min: 50, max: 500 }),
  badge_url: faker.image.url(),
  ...overrides,
});

// Ingredient scan factory
export const ingredientScanFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  image_url: faker.image.url(),
  detected_ingredients: Array.from(
    { length: faker.number.int({ min: 2, max: 8 }) },
    () => ({
      name: faker.lorem.word(),
      confidence: faker.number.float({ min: 0.7, max: 1.0, precision: 0.01 }),
      category: faker.helpers.arrayElement(['vegetable', 'fruit', 'meat', 'dairy', 'grain']),
    })
  ),
  recipe_suggestions: Array.from(
    { length: faker.number.int({ min: 1, max: 5 }) },
    () => faker.string.uuid()
  ),
  scan_date: faker.date.recent(),
  xp_earned: faker.number.int({ min: 10, max: 50 }),
  ...overrides,
});

// Gamification event factory
export const gamificationEventFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  event_type: faker.helpers.arrayElement([
    'recipe_completed',
    'recipe_created',
    'recipe_shared',
    'daily_login',
    'streak_milestone',
    'achievement_unlocked',
    'level_up',
  ]),
  xp_gained: faker.number.int({ min: 10, max: 200 }),
  metadata: {
    recipe_id: faker.string.uuid(),
    streak_days: faker.number.int({ min: 1, max: 100 }),
    achievement_type: faker.lorem.word(),
  },
  created_at: faker.date.recent(),
  ...overrides,
});

// Creator profile factory
export const creatorProfileFactory = (overrides: Partial<any> = {}) => ({
  id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  bio: faker.lorem.paragraph(),
  specialty: faker.helpers.arrayElement(['Italian', 'Vegan', 'Baking', 'Quick Meals', 'Healthy']),
  verified: faker.datatype.boolean(),
  stripe_account_id: `acct_${faker.string.alphanumeric(16)}`,
  onboarding_complete: faker.datatype.boolean(),
  follower_count: faker.number.int({ min: 0, max: 10000 }),
  recipe_count: faker.number.int({ min: 0, max: 500 }),
  total_earnings: faker.number.float({ min: 0, max: 10000, precision: 0.01 }),
  commission_rate: faker.number.float({ min: 0.1, max: 0.3, precision: 0.01 }),
  created_at: faker.date.past(),
  updated_at: faker.date.recent(),
  ...overrides,
});

// Batch creation helpers
export const createBatch = {
  users: (count = 10, overrides: Partial<any> = {}) => 
    Array.from({ length: count }, () => userFactory(overrides)),
  
  recipes: (count = 20, userId?: string) =>
    Array.from({ length: count }, () => 
      recipeFactory(userId ? { created_by: userId } : {})
    ),
  
  subscriptions: (users: any[]) =>
    users.map(user => 
      subscriptionFactory({ user_id: user.id })
    ),
    
  achievements: (userId: string, count = 5) =>
    Array.from({ length: count }, () =>
      achievementFactory({ user_id: userId })
    ),
    
  gamificationEvents: (userId: string, count = 10) =>
    Array.from({ length: count }, () =>
      gamificationEventFactory({ user_id: userId })
    ),
};

// Relationship helpers
export const createUserWithFullData = () => {
  const user = userFactory();
  const recipes = createBatch.recipes(5, user.id);
  const subscription = subscriptionFactory({ user_id: user.id });
  const achievements = createBatch.achievements(user.id, 3);
  const gamificationEvents = createBatch.gamificationEvents(user.id, 10);
  const creatorProfile = user.subscription_tier === 'premium' 
    ? creatorProfileFactory({ user_id: user.id })
    : null;
  
  return { 
    user, 
    recipes, 
    subscription, 
    achievements, 
    gamificationEvents,
    creatorProfile 
  };
};

// Mock data for API responses
export const mockApiResponses = {
  loginSuccess: (user = userFactory()) => ({
    token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    })).toString('base64')}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      level: user.level,
      xp: user.xp,
      streak: user.streak,
      subscription_tier: user.subscription_tier,
    },
    refresh_token: faker.string.alphanumeric(32),
  }),
  
  recipeListResponse: (count = 10) => ({
    recipes: createBatch.recipes(count),
    total: count,
    page: 1,
    per_page: 20,
  }),
  
  subscriptionResponse: (subscription = subscriptionFactory()) => ({
    subscription,
    features: {
      max_recipes: subscription.plan === 'free' ? 10 : subscription.plan === 'pro' ? 100 : -1,
      ai_chef_enabled: subscription.plan !== 'free',
      advanced_nutrition: subscription.plan === 'premium',
      creator_tools: subscription.plan === 'premium',
    },
  }),
  
  gamificationStatsResponse: (userId: string) => ({
    user_id: userId,
    total_xp: faker.number.int({ min: 0, max: 10000 }),
    current_level: faker.number.int({ min: 1, max: 50 }),
    next_level_xp: faker.number.int({ min: 100, max: 1000 }),
    current_streak: faker.number.int({ min: 0, max: 365 }),
    longest_streak: faker.number.int({ min: 0, max: 500 }),
    achievements_unlocked: faker.number.int({ min: 0, max: 50 }),
    leaderboard_rank: faker.number.int({ min: 1, max: 1000 }),
  }),
};

// Test data scenarios
export const testScenarios = {
  newUser: () => {
    const user = userFactory({
      level: 1,
      xp: 0,
      streak: 0,
      subscription_tier: 'free',
      created_at: new Date(),
    });
    return { user, recipes: [], subscription: null, achievements: [] };
  },
  
  premiumUser: () => {
    const user = userFactory({
      level: faker.number.int({ min: 20, max: 50 }),
      xp: faker.number.int({ min: 5000, max: 10000 }),
      streak: faker.number.int({ min: 30, max: 100 }),
      subscription_tier: 'premium',
    });
    const recipes = createBatch.recipes(50, user.id);
    const subscription = subscriptionFactory({
      user_id: user.id,
      plan: 'premium',
      status: 'active',
    });
    const achievements = createBatch.achievements(user.id, 20);
    const creatorProfile = creatorProfileFactory({ user_id: user.id });
    
    return { user, recipes, subscription, achievements, creatorProfile };
  },
  
  trialUser: () => {
    const user = userFactory({
      subscription_tier: 'pro',
    });
    const subscription = subscriptionFactory({
      user_id: user.id,
      plan: 'pro',
      status: 'trialing',
      current_period_end: faker.date.soon({ days: 7 }),
    });
    
    return { user, subscription };
  },
};