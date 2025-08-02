import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: { id: '1', email: body.email, level: 5, xp: 1250 }
      });
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('*/api/auth/refresh', () => {
    return HttpResponse.json({ token: 'new-mock-token' });
  }),

  http.post('*/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // User endpoints
  http.get('*/api/user', ({ request }) => {
    const auth = request.headers.get('authorization');
    
    if (!auth) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      level: 5,
      xp: 1250,
      streak: 7,
      achievements: ['first_recipe', 'week_streak']
    });
  }),

  // Recipes endpoints
  http.get('*/api/recipes', ({ request }) => {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '10';
    
    return HttpResponse.json({
      recipes: [
        { id: '1', title: 'Recipe 1', calories: 350, cookTime: 30 },
        { id: '2', title: 'Recipe 2', calories: 450, cookTime: 45 }
      ],
      total: 2,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  }),

  http.get('*/api/recipes/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: `Recipe ${params.id}`,
      description: 'A delicious recipe',
      ingredients: ['ingredient 1', 'ingredient 2'],
      instructions: ['step 1', 'step 2'],
      calories: 350,
      cookTime: 30
    });
  }),

  http.post('*/api/recipes', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: '3', ...body },
      { status: 201 }
    );
  }),

  http.put('*/api/recipes/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: params.id,
      ...body,
      updatedAt: new Date().toISOString()
    });
  }),

  http.delete('*/api/recipes/:id', ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Scan endpoints
  http.post('*/api/scan', async ({ request }) => {
    const body = await request.json() as { image: string };
    
    if (!body.image) {
      return HttpResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      ingredients: ['tomato', 'lettuce', 'cheese'],
      confidence: 0.95
    });
  }),

  // Gamification endpoints
  http.get('*/api/user/stats', () => {
    return HttpResponse.json({
      level: 5,
      xp: 1250,
      xpToNextLevel: 250,
      totalRecipes: 42,
      streak: 7,
      achievements: 12
    });
  }),

  http.post('*/api/user/xp', async ({ request }) => {
    const body = await request.json() as { amount: number; action: string };
    return HttpResponse.json({
      xpAdded: body.amount,
      totalXp: 1250 + body.amount,
      levelUp: false
    });
  }),

  // Error test endpoints
  http.get('*/api/error/500', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  http.get('*/api/error/404', () => {
    return HttpResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }),

  http.get('*/api/timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    return HttpResponse.json({ data: 'Should timeout' });
  }),
];

export const server = setupServer(...handlers);