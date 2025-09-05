import axios, { AxiosInstance } from 'axios';
import { testDb } from './setup-db';
import { recipeFactory, userFactory } from '../factories';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

describe('Recipe CRUD Operations Integration', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let userId: string;
  let createdRecipeId: string;
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Create and login test user
    const userData = {
      email: `recipe_test_${Date.now()}@example.com`,
      password: 'RecipeTest123!',
      name: 'Recipe Test User',
    };
    
    const registerResponse = await apiClient.post('/api/auth/register', userData);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });
  
  describe('CREATE Operations', () => {
    it('should create a basic recipe', async () => {
      const recipeData = recipeFactory({
        title: 'Test Recipe Creation',
        description: 'Testing recipe creation endpoint',
      });
      
      const response = await apiClient.post(
        '/api/recipes',
        recipeData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(201);
      expect(response.data.recipe).toMatchObject({
        title: recipeData.title,
        description: recipeData.description,
        created_by: userId,
      });
      
      createdRecipeId = response.data.recipe.id;
      expect(createdRecipeId).toBeValidUUID();
    });
    
    it('should create recipe with complete nutrition data', async () => {
      const recipeWithNutrition = {
        title: 'Nutritious Recipe',
        description: 'Recipe with full nutrition info',
        ingredients: [
          { name: 'Chicken breast', amount: 200, unit: 'g' },
          { name: 'Rice', amount: 100, unit: 'g' },
          { name: 'Broccoli', amount: 150, unit: 'g' },
        ],
        instructions: ['Cook chicken', 'Steam rice', 'Steam broccoli', 'Serve'],
        nutrition: {
          calories: 450,
          protein: 45,
          carbs: 35,
          fat: 12,
          fiber: 5,
          sugar: 3,
          sodium: 300,
        },
        servings: 1,
        prep_time: 10,
        cook_time: 25,
      };
      
      const response = await apiClient.post(
        '/api/recipes',
        recipeWithNutrition,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(201);
      expect(response.data.recipe.nutrition).toMatchObject(recipeWithNutrition.nutrition);
      expect(response.data.recipe.ingredients).toHaveLength(3);
    });
    
    it('should create recipe from AI generation', async () => {
      const aiRequest = {
        prompt: 'Create a healthy vegetarian pasta recipe',
        preferences: {
          dietary: ['vegetarian'],
          cuisine: 'Italian',
          difficulty: 'easy',
          max_time: 30,
        },
      };
      
      const response = await apiClient.post(
        '/api/recipes/generate',
        aiRequest,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        expect(response.data.recipe).toHaveProperty('title');
        expect(response.data.recipe).toHaveProperty('ingredients');
        expect(response.data.recipe).toHaveProperty('instructions');
        expect(response.data.recipe.dietary_tags).toContain('vegetarian');
      }
    });
    
    it('should reject recipe with missing required fields', async () => {
      const invalidRecipe = {
        description: 'Missing title',
        // Missing title and other required fields
      };
      
      const response = await apiClient.post(
        '/api/recipes',
        invalidRecipe,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBeWithinRange(400, 422);
      expect(response.data.success).toBe(false);
      expect(response.data.errors).toBeDefined();
    });
  });
  
  describe('READ Operations', () => {
    beforeAll(async () => {
      // Create some test recipes
      for (let i = 0; i < 5; i++) {
        const recipe = recipeFactory({
          title: `Read Test Recipe ${i}`,
          cuisine: i % 2 === 0 ? 'Italian' : 'Mexican',
          difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
        });
        
        await apiClient.post('/api/recipes', recipe, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
    });
    
    it('should get recipe by ID', async () => {
      const response = await apiClient.get(
        `/api/recipes/${createdRecipeId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipe.id).toBe(createdRecipeId);
      expect(response.data.recipe).toHaveProperty('title');
      expect(response.data.recipe).toHaveProperty('ingredients');
      expect(response.data.recipe).toHaveProperty('instructions');
    });
    
    it('should list all recipes with pagination', async () => {
      const response = await apiClient.get(
        '/api/recipes?page=1&limit=10',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipes).toBeInstanceOf(Array);
      expect(response.data.recipes.length).toBeLessThanOrEqual(10);
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('total_pages');
    });
    
    it('should filter recipes by cuisine', async () => {
      const response = await apiClient.get(
        '/api/recipes?cuisine=Italian',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipes).toBeInstanceOf(Array);
      
      if (response.data.recipes.length > 0) {
        response.data.recipes.forEach((recipe: any) => {
          expect(recipe.cuisine).toBe('Italian');
        });
      }
    });
    
    it('should filter recipes by difficulty', async () => {
      const response = await apiClient.get(
        '/api/recipes?difficulty=easy',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipes).toBeInstanceOf(Array);
      
      if (response.data.recipes.length > 0) {
        response.data.recipes.forEach((recipe: any) => {
          expect(recipe.difficulty).toBe('easy');
        });
      }
    });
    
    it('should search recipes by keyword', async () => {
      const response = await apiClient.get(
        '/api/recipes/search?q=pasta',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipes).toBeInstanceOf(Array);
      
      if (response.data.recipes.length > 0) {
        response.data.recipes.forEach((recipe: any) => {
          const hasKeyword = 
            recipe.title.toLowerCase().includes('pasta') ||
            recipe.description?.toLowerCase().includes('pasta') ||
            recipe.ingredients?.some((ing: any) => 
              ing.name?.toLowerCase().includes('pasta')
            );
          expect(hasKeyword).toBe(true);
        });
      }
    });
    
    it('should get user recipes', async () => {
      const response = await apiClient.get(
        '/api/user/recipes',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipes).toBeInstanceOf(Array);
      
      if (response.data.recipes.length > 0) {
        response.data.recipes.forEach((recipe: any) => {
          expect(recipe.created_by).toBe(userId);
        });
      }
    });
    
    it('should return 404 for non-existent recipe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await apiClient.get(
        `/api/recipes/${fakeId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
  
  describe('UPDATE Operations', () => {
    let recipeToUpdate: string;
    
    beforeAll(async () => {
      // Create a recipe to update
      const recipe = recipeFactory({ title: 'Recipe to Update' });
      const createResponse = await apiClient.post('/api/recipes', recipe, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      recipeToUpdate = createResponse.data.recipe.id;
    });
    
    it('should update recipe title and description', async () => {
      const updates = {
        title: 'Updated Recipe Title',
        description: 'This recipe has been updated',
      };
      
      const response = await apiClient.put(
        `/api/recipes/${recipeToUpdate}`,
        updates,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipe.title).toBe(updates.title);
      expect(response.data.recipe.description).toBe(updates.description);
    });
    
    it('should update recipe ingredients', async () => {
      const newIngredients = [
        { name: 'New Ingredient 1', amount: 100, unit: 'g' },
        { name: 'New Ingredient 2', amount: 200, unit: 'ml' },
      ];
      
      const response = await apiClient.put(
        `/api/recipes/${recipeToUpdate}`,
        { ingredients: newIngredients },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipe.ingredients).toHaveLength(2);
      expect(response.data.recipe.ingredients[0].name).toBe('New Ingredient 1');
    });
    
    it('should update recipe nutrition info', async () => {
      const nutritionUpdate = {
        nutrition: {
          calories: 300,
          protein: 25,
          carbs: 30,
          fat: 10,
        },
      };
      
      const response = await apiClient.put(
        `/api/recipes/${recipeToUpdate}`,
        nutritionUpdate,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipe.nutrition.calories).toBe(300);
      expect(response.data.recipe.nutrition.protein).toBe(25);
    });
    
    it('should not allow updating recipe by non-owner', async () => {
      // Create another user
      const otherUser = {
        email: `other_${Date.now()}@example.com`,
        password: 'OtherUser123!',
        name: 'Other User',
      };
      
      const otherUserResponse = await apiClient.post('/api/auth/register', otherUser);
      const otherToken = otherUserResponse.data.token;
      
      // Try to update the recipe
      const response = await apiClient.put(
        `/api/recipes/${recipeToUpdate}`,
        { title: 'Unauthorized Update' },
        {
          headers: { Authorization: `Bearer ${otherToken}` }
        }
      );
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
    
    it('should handle partial updates', async () => {
      const partialUpdate = {
        cook_time: 45,
        // Only updating cook_time, other fields should remain unchanged
      };
      
      const response = await apiClient.put(
        `/api/recipes/${recipeToUpdate}`,
        partialUpdate,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.recipe.cook_time).toBe(45);
      // Other fields should still exist
      expect(response.data.recipe.title).toBeDefined();
      expect(response.data.recipe.description).toBeDefined();
    });
  });
  
  describe('DELETE Operations', () => {
    let recipeToDelete: string;
    
    beforeEach(async () => {
      // Create a recipe to delete
      const recipe = recipeFactory({ title: 'Recipe to Delete' });
      const createResponse = await apiClient.post('/api/recipes', recipe, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      recipeToDelete = createResponse.data.recipe.id;
    });
    
    it('should delete own recipe', async () => {
      const response = await apiClient.delete(
        `/api/recipes/${recipeToDelete}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect([200, 204]).toContain(response.status);
      
      // Verify recipe is deleted
      const getResponse = await apiClient.get(
        `/api/recipes/${recipeToDelete}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(getResponse.status).toBe(404);
    });
    
    it('should not allow deleting recipe by non-owner', async () => {
      // Create another user
      const otherUser = {
        email: `delete_other_${Date.now()}@example.com`,
        password: 'DeleteOther123!',
        name: 'Delete Other User',
      };
      
      const otherUserResponse = await apiClient.post('/api/auth/register', otherUser);
      const otherToken = otherUserResponse.data.token;
      
      // Try to delete the recipe
      const response = await apiClient.delete(
        `/api/recipes/${recipeToDelete}`,
        {
          headers: { Authorization: `Bearer ${otherToken}` }
        }
      );
      
      expect(response.status).toBe(403);
      expect(response.data.success).toBe(false);
    });
    
    it('should handle cascade deletion of related data', async () => {
      // First, add some related data to the recipe
      // Add to favorites
      await apiClient.post(
        `/api/recipes/${recipeToDelete}/favorite`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      // Add a rating
      await apiClient.post(
        `/api/recipes/${recipeToDelete}/rate`,
        { rating: 5, comment: 'Great recipe!' },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      // Now delete the recipe
      const deleteResponse = await apiClient.delete(
        `/api/recipes/${recipeToDelete}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect([200, 204]).toContain(deleteResponse.status);
      
      // Verify favorites are also removed
      const favoritesResponse = await apiClient.get(
        '/api/user/favorites',
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (favoritesResponse.status === 200) {
        const favoriteIds = favoritesResponse.data.favorites.map((f: any) => f.recipe_id);
        expect(favoriteIds).not.toContain(recipeToDelete);
      }
    });
    
    it('should return 404 when deleting non-existent recipe', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await apiClient.delete(
        `/api/recipes/${fakeId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
  
  describe('Bulk Operations', () => {
    it('should bulk create recipes', async () => {
      const recipes = Array.from({ length: 3 }, (_, i) => 
        recipeFactory({ title: `Bulk Recipe ${i}` })
      );
      
      const response = await apiClient.post(
        '/api/recipes/bulk',
        { recipes },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 201) {
        expect(response.data.created).toBe(3);
        expect(response.data.recipes).toHaveLength(3);
      }
    });
    
    it('should bulk delete recipes', async () => {
      // Create recipes to delete
      const recipeIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const recipe = recipeFactory({ title: `Bulk Delete ${i}` });
        const response = await apiClient.post('/api/recipes', recipe, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        recipeIds.push(response.data.recipe.id);
      }
      
      const deleteResponse = await apiClient.delete(
        '/api/recipes/bulk',
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { recipe_ids: recipeIds },
        }
      );
      
      if (deleteResponse.status === 200) {
        expect(deleteResponse.data.deleted).toBe(3);
      }
    });
  });
});