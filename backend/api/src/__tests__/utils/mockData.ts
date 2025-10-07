// Comprehensive mock data for testing

export const mockUsers = {
  free: {
    id: 'user-free-123',
    email: 'free@example.com',
    total_xp: 150,
    level: 2,
    streak_count: 3,
    is_creator: false,
    subscription_tier: 'free',
    created_at: '2024-01-01T00:00:00Z',
  },
  premium: {
    id: 'user-premium-456',
    email: 'premium@example.com',
    total_xp: 1200,
    level: 8,
    streak_count: 15,
    is_creator: false,
    subscription_tier: 'premium',
    created_at: '2024-01-01T00:00:00Z',
  },
  creator: {
    id: 'user-creator-789',
    email: 'creator@example.com',
    total_xp: 2500,
    level: 15,
    streak_count: 30,
    is_creator: true,
    subscription_tier: 'creator',
    stripe_account_id: 'acct_test123',
    created_at: '2024-01-01T00:00:00Z',
  },
};

export const mockRecipes = {
  basic: {
    id: 'recipe-basic-123',
    title: 'Simple Pasta',
    description: 'A quick and easy pasta dish',
    instructions: [
      'Boil water in a large pot',
      'Add pasta and cook for 8-10 minutes',
      'Drain and serve with sauce',
    ],
    ingredients: [
      { name: 'Pasta', amount: '1 lb', category: 'grains' },
      { name: 'Tomato sauce', amount: '2 cups', category: 'condiments' },
      { name: 'Olive oil', amount: '2 tbsp', category: 'oils' },
    ],
    prep_time: 10,
    cook_time: 15,
    servings: 4,
    difficulty: 'easy',
    cuisine_type: 'italian',
    created_by: mockUsers.free.id,
  },
  premium: {
    id: 'recipe-premium-456',
    title: 'Gourmet Risotto',
    description: 'Creamy mushroom risotto with truffle oil',
    instructions: [
      'Heat stock in a saucepan',
      'Sauté onions in butter',
      'Add rice and toast for 2 minutes',
      'Add stock gradually while stirring',
      'Finish with parmesan and truffle oil',
    ],
    ingredients: [
      { name: 'Arborio rice', amount: '1.5 cups', category: 'grains' },
      { name: 'Mushrooms', amount: '8 oz', category: 'vegetables' },
      { name: 'Parmesan cheese', amount: '1 cup', category: 'dairy' },
      { name: 'Truffle oil', amount: '1 tbsp', category: 'oils' },
    ],
    prep_time: 20,
    cook_time: 45,
    servings: 4,
    difficulty: 'hard',
    cuisine_type: 'italian',
    created_by: mockUsers.creator.id,
    is_premium: true,
  },
};

export const mockSubscriptions = {
  active: {
    id: 'sub-active-123',
    user_id: mockUsers.premium.id,
    tier: 'premium',
    status: 'active',
    stripe_subscription_id: 'sub_test_active',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-02-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
  canceled: {
    id: 'sub-canceled-456',
    user_id: 'user-canceled-789',
    tier: 'premium',
    status: 'canceled',
    stripe_subscription_id: 'sub_test_canceled',
    current_period_start: '2024-01-01T00:00:00Z',
    current_period_end: '2024-01-15T00:00:00Z',
    canceled_at: '2024-01-15T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  },
};

export const mockAnalyticsEvents = {
  recipeView: {
    user_id: mockUsers.free.id,
    event_type: 'recipe_view',
    event_data: {
      recipe_id: mockRecipes.basic.id,
      source: 'discover',
    },
    xp_gained: 5,
    timestamp: new Date().toISOString(),
  },
  recipeComplete: {
    user_id: mockUsers.premium.id,
    event_type: 'recipe_complete',
    event_data: {
      recipe_id: mockRecipes.premium.id,
      cook_time_actual: 50,
      rating: 5,
    },
    xp_gained: 25,
    timestamp: new Date().toISOString(),
  },
};

export const mockIngredients = {
  pasta: {
    id: 'ing-pasta-123',
    name: 'Pasta',
    category: 'grains',
    confidence: 0.95,
    fdc_id: '123456',
    nutrients: {
      calories: 220,
      protein: 8,
      carbs: 44,
      fat: 1,
    },
  },
  tomato: {
    id: 'ing-tomato-456',
    name: 'Tomato',
    category: 'vegetables',
    confidence: 0.88,
    fdc_id: '789012',
    nutrients: {
      calories: 18,
      protein: 1,
      carbs: 4,
      fat: 0,
    },
  },
};

export const mockGamificationData = {
  userProgress: {
    user_id: mockUsers.free.id,
    total_xp: 150,
    level: 2,
    xp_to_next_level: 50,
    current_streak: 3,
    longest_streak: 7,
    badges_unlocked: ['first_recipe', 'streak_3'],
    achievements: [
      {
        id: 'first_recipe',
        name: 'First Recipe',
        description: 'Complete your first recipe',
        unlocked_at: '2024-01-02T00:00:00Z',
      },
    ],
  },
  leaderboard: [
    {
      user_id: mockUsers.creator.id,
      email: mockUsers.creator.email,
      total_xp: 2500,
      level: 15,
      rank: 1,
    },
    {
      user_id: mockUsers.premium.id,
      email: mockUsers.premium.email,
      total_xp: 1200,
      level: 8,
      rank: 2,
    },
    {
      user_id: mockUsers.free.id,
      email: mockUsers.free.email,
      total_xp: 150,
      level: 2,
      rank: 3,
    },
  ],
};

export const mockStripeEvents = {
  subscriptionCreated: {
    id: 'evt_test_webhook',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_new',
        customer: 'cus_test_123',
        status: 'active',
        items: {
          data: [{
            price: {
              id: 'price_premium_monthly',
              unit_amount: 999,
              currency: 'usd',
            },
          }],
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
  subscriptionCanceled: {
    id: 'evt_test_webhook_cancel',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_canceled',
        customer: 'cus_test_456',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
};

export const mockIAPReceipts = {
  valid: {
    transactionId: 'txn_test_123',
    productId: 'premium_monthly',
    purchaseDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    originalTransactionId: 'orig_txn_123',
  },
  expired: {
    transactionId: 'txn_test_expired',
    productId: 'premium_monthly',
    purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    expirationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    originalTransactionId: 'orig_txn_expired',
  },
};

export const mockUSDAFoodData = {
  searchResult: {
    foods: [
      {
        fdcId: 123456,
        description: 'Pasta, cooked',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1008, value: 220 }, // Calories
          { nutrientId: 1003, value: 8 },   // Protein
          { nutrientId: 1005, value: 44 },  // Carbs
          { nutrientId: 1004, value: 1 },   // Fat
        ],
      },
    ],
    totalHits: 1,
  },
  nutrientDetails: {
    fdcId: 123456,
    description: 'Pasta, cooked',
    foodNutrients: [
      {
        nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' },
        amount: 220,
      },
      {
        nutrient: { id: 1003, name: 'Protein', unitName: 'g' },
        amount: 8,
      },
    ],
  },
};