// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import {
  getEmojiForIngredient,
  getConfidenceColor,
  getSmartIncrement,
  getMockIngredients,
  getMysteryRewards,
  getFallbackIngredients,
  getSimulatedIngredients,
} from '../../data/ingredientReviewData';
import { Ingredient } from '../../types/ingredientReview';

describe('ingredientReviewData', () => {
  describe('getEmojiForIngredient', () => {
    it('should return correct emoji for known ingredients', () => {
      expect(getEmojiForIngredient('tomato')).toBe('🍅');
      expect(getEmojiForIngredient('tomatoes')).toBe('🍅');
      expect(getEmojiForIngredient('onion')).toBe('🧅');
      expect(getEmojiForIngredient('garlic')).toBe('🧄');
      expect(getEmojiForIngredient('cheese')).toBe('🧀');
      expect(getEmojiForIngredient('chicken')).toBe('🐔');
      expect(getEmojiForIngredient('beef')).toBe('🥩');
      expect(getEmojiForIngredient('fish')).toBe('🐟');
      expect(getEmojiForIngredient('rice')).toBe('🍚');
      expect(getEmojiForIngredient('pasta')).toBe('🍝');
      expect(getEmojiForIngredient('bread')).toBe('🍞');
      expect(getEmojiForIngredient('milk')).toBe('🥛');
      expect(getEmojiForIngredient('egg')).toBe('🥚');
      expect(getEmojiForIngredient('apple')).toBe('🍎');
      expect(getEmojiForIngredient('banana')).toBe('🍌');
    });

    it('should be case insensitive', () => {
      expect(getEmojiForIngredient('TOMATO')).toBe('🍅');
      expect(getEmojiForIngredient('Tomato')).toBe('🍅');
      expect(getEmojiForIngredient('ToMaTo')).toBe('🍅');
    });

    it('should return default emoji for unknown ingredients', () => {
      expect(getEmojiForIngredient('unknown')).toBe('🥘');
      expect(getEmojiForIngredient('random ingredient')).toBe('🥘');
      expect(getEmojiForIngredient('')).toBe('🥘');
    });

    it('should handle compound ingredients', () => {
      expect(getEmojiForIngredient('olive oil')).toBe('🫒');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return green for high confidence (>=0.85)', () => {
      expect(getConfidenceColor(1.0)).toBe('#4CAF50');
      expect(getConfidenceColor(0.95)).toBe('#4CAF50');
      expect(getConfidenceColor(0.85)).toBe('#4CAF50');
    });

    it('should return yellow for medium confidence (0.7-0.85)', () => {
      expect(getConfidenceColor(0.84)).toBe('#FFB800');
      expect(getConfidenceColor(0.75)).toBe('#FFB800');
      expect(getConfidenceColor(0.7)).toBe('#FFB800');
    });

    it('should return red for low confidence (<0.7)', () => {
      expect(getConfidenceColor(0.69)).toBe('#FF3B30');
      expect(getConfidenceColor(0.5)).toBe('#FF3B30');
      expect(getConfidenceColor(0.1)).toBe('#FF3B30');
      expect(getConfidenceColor(0)).toBe('#FF3B30');
    });

    it('should handle edge cases', () => {
      expect(getConfidenceColor(-0.1)).toBe('#FF3B30');
      expect(getConfidenceColor(1.5)).toBe('#4CAF50');
    });
  });

  describe('getSmartIncrement', () => {
    it('should return whole increments for whole items', () => {
      const egg: Ingredient = { id: '1', name: 'Egg', confidence: 0.9, emoji: '🥚' };
      expect(getSmartIncrement(egg)).toEqual({ increment: 1, minValue: 1 });

      const avocado: Ingredient = { id: '2', name: 'Avocado', confidence: 0.9, emoji: '🥑' };
      expect(getSmartIncrement(avocado)).toEqual({ increment: 1, minValue: 1 });

      const onion: Ingredient = { id: '3', name: 'Onion', confidence: 0.9, emoji: '🧅' };
      expect(getSmartIncrement(onion)).toEqual({ increment: 1, minValue: 1 });

      const potato: Ingredient = { id: '4', name: 'Potato', confidence: 0.9, emoji: '🥔' };
      expect(getSmartIncrement(potato)).toEqual({ increment: 1, minValue: 1 });
    });

    it('should return small increments for meat and protein', () => {
      const chicken: Ingredient = { id: '1', name: 'Chicken', confidence: 0.9, emoji: '🐔' };
      expect(getSmartIncrement(chicken)).toEqual({ increment: 0.25, minValue: 0.25 });

      const beef: Ingredient = { id: '2', name: 'Beef', confidence: 0.9, emoji: '🥩' };
      expect(getSmartIncrement(beef)).toEqual({ increment: 0.25, minValue: 0.25 });

      const fish: Ingredient = { id: '3', name: 'Fish', confidence: 0.9, emoji: '🐟' };
      expect(getSmartIncrement(fish)).toEqual({ increment: 0.25, minValue: 0.25 });
    });

    it('should return tiny increments for spices and oils', () => {
      const salt: Ingredient = { id: '1', name: 'Salt', confidence: 0.9, emoji: '🧂' };
      expect(getSmartIncrement(salt)).toEqual({ increment: 0.1, minValue: 0.1 });

      const pepper: Ingredient = { id: '2', name: 'Black Pepper', confidence: 0.9, emoji: '🌶️' };
      expect(getSmartIncrement(pepper)).toEqual({ increment: 0.1, minValue: 0.1 });

      const oil: Ingredient = { id: '3', name: 'Olive Oil', confidence: 0.9, emoji: '🫒' };
      expect(getSmartIncrement(oil)).toEqual({ increment: 0.1, minValue: 0.1 });
    });

    it('should use unit-based increments when unit is specified', () => {
      const piecesItem: Ingredient = { 
        id: '1', 
        name: 'Generic Item', 
        unit: 'pieces',
        confidence: 0.9, 
        emoji: '🥘' 
      };
      expect(getSmartIncrement(piecesItem)).toEqual({ increment: 1, minValue: 1 });

      const poundItem: Ingredient = { 
        id: '2', 
        name: 'Generic Item', 
        unit: 'lb',
        confidence: 0.9, 
        emoji: '🥘' 
      };
      expect(getSmartIncrement(poundItem)).toEqual({ increment: 0.25, minValue: 0.25 });

      const tspItem: Ingredient = { 
        id: '3', 
        name: 'Generic Item', 
        unit: 'tsp',
        confidence: 0.9, 
        emoji: '🥘' 
      };
      expect(getSmartIncrement(tspItem)).toEqual({ increment: 0.1, minValue: 0.1 });
    });

    it('should return default increments for unknown items', () => {
      const unknown: Ingredient = { 
        id: '1', 
        name: 'Unknown Item', 
        confidence: 0.9, 
        emoji: '🥘' 
      };
      expect(getSmartIncrement(unknown)).toEqual({ increment: 0.5, minValue: 0.25 });
    });

    it('should be case insensitive', () => {
      const upperCase: Ingredient = { id: '1', name: 'CHICKEN', confidence: 0.9, emoji: '🐔' };
      expect(getSmartIncrement(upperCase)).toEqual({ increment: 0.25, minValue: 0.25 });

      const mixedCase: Ingredient = { id: '2', name: 'ChIcKeN', confidence: 0.9, emoji: '🐔' };
      expect(getSmartIncrement(mixedCase)).toEqual({ increment: 0.25, minValue: 0.25 });
    });
  });

  describe('getMockIngredients', () => {
    it('should return array of mock ingredients', () => {
      const ingredients = getMockIngredients();
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
      
      ingredients.forEach(ingredient => {
        expect(ingredient).toHaveProperty('id');
        expect(ingredient).toHaveProperty('name');
        expect(ingredient).toHaveProperty('confidence');
        expect(ingredient).toHaveProperty('emoji');
        expect(typeof ingredient.confidence).toBe('number');
        expect(ingredient.confidence).toBeGreaterThanOrEqual(0);
        expect(ingredient.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should return diverse confidence values', () => {
      const ingredients = getMockIngredients();
      const confidences = ingredients.map(i => i.confidence);
      const uniqueConfidences = new Set(confidences);
      
      // Should have varied confidence values
      expect(uniqueConfidences.size).toBeGreaterThan(1);
    });
  });

  describe('getMysteryRewards', () => {
    it('should return array of mystery rewards', () => {
      const rewards = getMysteryRewards();
      
      expect(Array.isArray(rewards)).toBe(true);
      expect(rewards.length).toBeGreaterThan(0);
      
      rewards.forEach(reward => {
        expect(reward).toHaveProperty('id');
        expect(reward).toHaveProperty('emoji');
        expect(reward).toHaveProperty('label');
        expect(reward).toHaveProperty('subLabel');
        expect(reward).toHaveProperty('rarity');
        expect(['common', 'rare', 'epic', 'legendary']).toContain(reward.rarity);
      });
    });

    it('should have different rarity levels', () => {
      const rewards = getMysteryRewards();
      const rarities = rewards.map(r => r.rarity);
      const uniqueRarities = new Set(rarities);
      
      // Should have at least 2 different rarity levels
      expect(uniqueRarities.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getFallbackIngredients', () => {
    it('should return fallback ingredients', () => {
      const ingredients = getFallbackIngredients();
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
      
      ingredients.forEach(ingredient => {
        expect(ingredient).toHaveProperty('id');
        expect(ingredient).toHaveProperty('name');
        expect(ingredient).toHaveProperty('confidence');
        expect(ingredient).toHaveProperty('emoji');
      });
    });

    it('should have consistent confidence for fallback', () => {
      const ingredients = getFallbackIngredients();
      
      ingredients.forEach(ingredient => {
        // Fallback ingredients should have lower confidence
        expect(ingredient.confidence).toBeLessThanOrEqual(0.85);
      });
    });
  });

  describe('getSimulatedIngredients', () => {
    it('should return array of ingredient names', () => {
      const names = getSimulatedIngredients();
      
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      
      names.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should return common ingredients', () => {
      const names = getSimulatedIngredients();
      const commonIngredients = ['tomato', 'onion', 'garlic', 'chicken', 'beef'];
      
      // At least some common ingredients should be present
      const hasCommon = names.some(name => 
        commonIngredients.some(common => 
          name.toLowerCase().includes(common)
        )
      );
      
      expect(hasCommon).toBe(true);
    });
  });
});